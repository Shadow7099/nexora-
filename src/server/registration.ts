import "server-only";
import { createHash, randomBytes } from "node:crypto";
import * as z from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { fieldErrors, passwordSchema } from "@/lib/validation";
import { audit } from "@/server/audit";
import { requireSuperadmin } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import { createSession, type Actor } from "@/server/sessions";

/**
 * Autogestión: el dueño de un negocio recibe un link de invitación, registra su
 * empresa y su cuenta de administrador, y luego configura todo él mismo
 * (sedes, QR, turnos, empleados, horarios) guiado por «Primeros pasos».
 *
 * - El link lleva un token aleatorio; en la BD solo se guarda su hash.
 * - Un solo uso, con vencimiento, y el superadministrador puede revocarlo.
 * - El registro abierto a cualquiera queda para después del piloto.
 */

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const tokenShape = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/);

const optionalInt = (max: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number({ error: "Escribe un número." }).int().min(1, { error: "Mínimo 1." }).max(max).optional());

export const invitationSchema = z.object({
  label: z.string().trim().min(3, { error: "Escribe para quién es (p. ej. el nombre del negocio)." }).max(120),
  planCode: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().trim().max(40).optional()),
  maxEmployees: optionalInt(10_000),
  maxSites: optionalInt(1_000),
  validDays: z.coerce.number().int().min(1, { error: "Mínimo 1 día." }).max(60, { error: "Máximo 60 días." }).default(14),
});

/** Crea la invitación y devuelve el token (se muestra una sola vez). */
export async function createInvitation(actor: Actor, input: unknown, now = new Date()) {
  requireSuperadmin(actor);
  const parsed = invitationSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(parsed.error));
  const v = parsed.data;
  const token = randomBytes(24).toString("base64url"); // 32 caracteres
  const inv = await db.companyInvitation.create({
    data: {
      tokenHash: hashToken(token), label: v.label, planCode: v.planCode ?? null, maxEmployees: v.maxEmployees ?? null, maxSites: v.maxSites ?? null,
      expiresAt: new Date(now.getTime() + v.validDays * 86_400_000), createdById: actor.userId,
    },
  });
  await audit({ companyId: null, actorUserId: actor.userId, action: "invitation.create", entityType: "company_invitation", entityId: inv.id, after: { label: v.label, validDays: v.validDays } });
  return { id: inv.id, token, expiresAt: inv.expiresAt };
}

export type InvitationState = "pending" | "used" | "expired" | "revoked";
const stateOf = (i: { usedAt: Date | null; revokedAt: Date | null; expiresAt: Date }, now: Date): InvitationState =>
  i.usedAt ? "used" : i.revokedAt ? "revoked" : i.expiresAt <= now ? "expired" : "pending";

export async function listInvitations(actor: Actor, now = new Date()) {
  requireSuperadmin(actor);
  const rows = await db.companyInvitation.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { company: { select: { id: true, name: true } } } });
  return rows.map((r) => ({ ...r, state: stateOf(r, now) }));
}

export async function revokeInvitation(actor: Actor, id: string) {
  requireSuperadmin(actor);
  if (!z.uuid().safeParse(id).success) throw notFound("La invitación");
  const r = await db.companyInvitation.updateMany({ where: { id, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
  if (r.count === 0) throw new AppError("CONFLICT", "La invitación ya fue usada o revocada.");
  await audit({ companyId: null, actorUserId: actor.userId, action: "invitation.revoke", entityType: "company_invitation", entityId: id });
}

/** Estado público de un link (sin revelar datos de otras invitaciones). */
export async function checkInvitation(token: string, now = new Date()) {
  if (!tokenShape.safeParse(token).success) return { ok: false as const, reason: "invalid" as const };
  const inv = await db.companyInvitation.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!inv) return { ok: false as const, reason: "invalid" as const };
  const state = stateOf(inv, now);
  if (state !== "pending") return { ok: false as const, reason: state };
  return { ok: true as const, label: inv.label, expiresAt: inv.expiresAt };
}

export const registrationSchema = z
  .object({
    companyName: z.string().trim().min(2, { error: "Escribe el nombre de tu negocio." }).max(120),
    legalName: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().trim().max(160).optional()),
    nit: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().trim().regex(/^[0-9.\-\s]{5,20}$/, { error: "NIT inválido (solo números, puntos y guion)." }).optional()),
    adminName: z.string().trim().min(3, { error: "Escribe tu nombre completo." }).max(120),
    email: z.email({ error: "Correo inválido." }).trim().toLowerCase().max(160),
    password: passwordSchema,
    confirm: z.string(),
    terms: z.literal(true, { error: "Debes aceptar para continuar." }),
  })
  .refine((v) => v.password === v.confirm, { error: "Las contraseñas no coinciden.", path: ["confirm"] });

const slugify = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "empresa";

/**
 * Registra la empresa (en prueba) y la cuenta del dueño como administrador con
 * la invitación. La invitación se marca usada en la misma transacción, así dos
 * envíos simultáneos no pueden crear dos empresas.
 */
export async function registerWithInvitation(token: string, input: unknown, userAgent?: string | null, now = new Date()) {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(parsed.error));
  const v = parsed.data;
  const check = await checkInvitation(token, now);
  if (!check.ok) throw new AppError("NOT_FOUND", "Este link de invitación no es válido, ya se usó o venció. Pide uno nuevo a Nexora.");
  if (await db.user.findFirst({ where: { email: { equals: v.email, mode: "insensitive" } } })) {
    throw new AppError("CONFLICT", "Ese correo ya tiene una cuenta en Nexora.", { email: "Ese correo ya está registrado. Ingresa con él o usa otro." });
  }
  const passwordHash = await hashPassword(v.password);
  const { company, user } = await db.$transaction(async (tx) => {
    const inv = await tx.companyInvitation.findUniqueOrThrow({ where: { tokenHash: hashToken(token) } });
    const company = await tx.company.create({
      data: {
        name: v.companyName, legalName: v.legalName ?? null, nit: v.nit ?? null, slug: `${slugify(v.companyName)}-${randomBytes(3).toString("hex")}`,
        status: "TRIAL", planCode: inv.planCode, maxEmployees: inv.maxEmployees, maxSites: inv.maxSites,
      },
    });
    // Toma la invitación solo si sigue pendiente (evita doble uso en paralelo).
    const taken = await tx.companyInvitation.updateMany({
      where: { id: inv.id, usedAt: null, revokedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now, companyId: company.id },
    });
    if (taken.count !== 1) throw new AppError("NOT_FOUND", "Este link de invitación ya se usó o venció. Pide uno nuevo a Nexora.");
    const user = await tx.user.create({ data: { companyId: company.id, email: v.email, name: v.adminName, passwordHash, role: "COMPANY_ADMIN", lastLoginAt: now } });
    await audit({ companyId: company.id, actorUserId: user.id, action: "company.self_register", entityType: "company", entityId: company.id, after: { name: v.companyName, invitation: inv.label }, userAgent }, tx);
    return { company, user };
  });
  const session = await createSession(user.id, "COMPANY_ADMIN", userAgent);
  return { companyId: company.id, ...session };
}
