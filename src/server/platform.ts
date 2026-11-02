import "server-only";
import { randomBytes } from "node:crypto";
import * as z from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { fieldErrors } from "@/lib/validation";
import { audit } from "@/server/audit";
import { requireSuperadmin } from "@/server/authz";
import { temporaryPassword } from "@/server/employees";
import { AppError, notFound } from "@/server/errors";
import { revokeUserSessions, type Actor } from "@/server/sessions";

/**
 * Operación de la plataforma (superadministrador): alta de empresas con su
 * primer administrador, suspensión y recuperación de la cuenta del
 * administrador. El superadministrador NO ve datos de empleados.
 */

const optionalInt = (max: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number({ error: "Escribe un número." }).int().min(1, { error: "Mínimo 1." }).max(max).optional());
const optionalText = (max: number) => z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().trim().max(max).optional());

export const newCompanySchema = z.object({
  name: z.string().trim().min(2, { error: "Escribe el nombre comercial." }).max(120),
  legalName: optionalText(160),
  nit: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().trim().regex(/^[0-9.\-\s]{5,20}$/, { error: "NIT inválido (solo números, puntos y guion)." }).optional()),
  planCode: optionalText(40),
  maxEmployees: optionalInt(10_000),
  maxSites: optionalInt(1_000),
  adminName: z.string().trim().min(3, { error: "Escribe el nombre del administrador." }).max(120),
  adminEmail: z.email({ error: "Correo inválido." }).trim().toLowerCase().max(160),
});

const slugify = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "empresa";

/** Crea la empresa (en prueba) y su administrador con contraseña temporal (se muestra una sola vez). */
export async function createCompany(actor: Actor, input: unknown) {
  requireSuperadmin(actor);
  const parsed = newCompanySchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(parsed.error));
  const v = parsed.data;
  if (await db.user.findFirst({ where: { email: { equals: v.adminEmail, mode: "insensitive" } } })) {
    throw new AppError("CONFLICT", "Ese correo ya tiene una cuenta en Nexora.", { adminEmail: "Ese correo ya está registrado." });
  }
  const password = temporaryPassword();
  const passwordHash = await hashPassword(password);
  const company = await db.$transaction(async (tx) => {
    const c = await tx.company.create({
      data: {
        name: v.name, legalName: v.legalName ?? null, nit: v.nit ?? null, slug: `${slugify(v.name)}-${randomBytes(3).toString("hex")}`,
        status: "TRIAL", planCode: v.planCode ?? null, maxEmployees: v.maxEmployees ?? null, maxSites: v.maxSites ?? null,
      },
    });
    const admin = await tx.user.create({ data: { companyId: c.id, email: v.adminEmail, name: v.adminName, passwordHash, role: "COMPANY_ADMIN", mustChangePassword: true } });
    await audit({ companyId: c.id, actorUserId: actor.userId, action: "company.create", entityType: "company", entityId: c.id, after: { name: v.name, plan: v.planCode ?? null, admin: admin.email } }, tx);
    return c;
  });
  return { companyId: company.id, adminEmail: v.adminEmail, temporaryPassword: password };
}

/** Empresa con sus administradores (sin datos de empleados). */
export async function getCompanyForPlatform(actor: Actor, id: string) {
  requireSuperadmin(actor);
  if (!z.uuid().safeParse(id).success) throw notFound("La empresa");
  const c = await db.company.findUnique({
    where: { id },
    select: {
      id: true, name: true, legalName: true, nit: true, slug: true, status: true, planCode: true, maxEmployees: true, maxSites: true, createdAt: true,
      users: { where: { role: "COMPANY_ADMIN" }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, active: true, lastLoginAt: true, lockedUntil: true, mustChangePassword: true } },
      _count: { select: { employees: { where: { status: "ACTIVE" } }, sites: { where: { active: true } } } },
    },
  });
  if (!c) throw notFound("La empresa");
  return c;
}

const statusSchema = z.enum(["TRIAL", "ACTIVE", "SUSPENDED"]);

/** Cambia el estado. Suspender cierra al instante las sesiones de todos sus usuarios. */
export async function setCompanyStatus(actor: Actor, id: string, status: unknown) {
  requireSuperadmin(actor);
  const s = statusSchema.safeParse(status);
  if (!s.success) throw new AppError("VALIDATION", "Estado inválido.");
  const c = await getCompanyForPlatform(actor, id);
  if (c.status === s.data) return;
  await db.$transaction(async (tx) => {
    await tx.company.update({ where: { id }, data: { status: s.data } });
    if (s.data === "SUSPENDED") await tx.session.deleteMany({ where: { user: { companyId: id } } });
    await audit({ companyId: id, actorUserId: actor.userId, action: "company.status", entityType: "company", entityId: id, before: { status: c.status }, after: { status: s.data } }, tx);
  });
}

/**
 * Recuperación de cuenta del administrador de una empresa (olvidó la clave o
 * quedó bloqueado): nueva contraseña temporal, desbloqueo y cierre de sesiones.
 * La de los empleados la hace el administrador de su empresa.
 */
export async function resetCompanyAdminPassword(actor: Actor, companyId: string, userId: string) {
  requireSuperadmin(actor);
  if (!z.uuid().safeParse(userId).success) throw notFound("El administrador");
  const admin = await db.user.findFirst({ where: { id: userId, companyId, role: "COMPANY_ADMIN" } });
  if (!admin) throw notFound("El administrador");
  const password = temporaryPassword();
  await db.user.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(password), mustChangePassword: true, failedLogins: 0, lockedUntil: null } });
  await revokeUserSessions(admin.id);
  await audit({ companyId, actorUserId: actor.userId, action: "company.admin_password_reset", entityType: "user", entityId: admin.id });
  return { email: admin.email, temporaryPassword: password };
}
