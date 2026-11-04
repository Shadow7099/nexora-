/** Fase 8 · operación de la plataforma: alta de empresas, suspensión y recuperación del administrador. */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { AppError } from "@/server/errors";
import { createCompany, getCompanyForPlatform, resetCompanyAdminPassword, setCompanyStatus } from "@/server/platform";
import { authenticate, validateSessionToken } from "@/server/sessions";
import { login, makeCompany, PASSWORD } from "../support/fixtures";

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
};

async function superadmin(tag: string) {
  const email = `sa-${tag}-${Date.now()}@test.local`;
  await db.user.create({ data: { email, name: "SA", passwordHash: await hashPassword(PASSWORD), role: "SUPERADMIN" } });
  return (await login(email)).actor;
}

describe("fase 8 · plataforma", () => {
  it("crea la empresa en prueba con su administrador, que debe cambiar la contraseña temporal", async () => {
    const sa = await superadmin("p8a");
    const email = `admin-p8a-${Date.now()}@test.local`;
    const r = await createCompany(sa, { name: "Café Ñandú", nit: "900.123.456-7", maxSites: "2", maxEmployees: "10", adminName: "Rosa Díaz", adminEmail: email.toUpperCase() });
    const c = await getCompanyForPlatform(sa, r.companyId);
    expect(c).toMatchObject({ name: "Café Ñandú", status: "TRIAL", maxSites: 2, maxEmployees: 10, slug: expect.stringMatching(/^cafe-nandu-[0-9a-f]{6}$/) });
    expect(c.users).toEqual([expect.objectContaining({ email, mustChangePassword: true })]);
    const auth = await authenticate(email, r.temporaryPassword);
    expect(auth).toMatchObject({ ok: true, role: "COMPANY_ADMIN", mustChangePassword: true });
    expect(await db.auditLog.count({ where: { companyId: r.companyId, action: "company.create" } })).toBe(1);

    await expect(createCompany(sa, { name: "Otra", adminName: "Otro Admin", adminEmail: email })).rejects.toMatchObject({ code: "CONFLICT", fieldErrors: { adminEmail: expect.any(String) } });
    await expect(createCompany(sa, { name: "X", adminName: "Ab", adminEmail: "no", nit: "abc" })).rejects.toMatchObject({ code: "VALIDATION", fieldErrors: { name: expect.any(String), adminEmail: expect.any(String), nit: expect.any(String) } });
  });

  it("un plan del catálogo trae su límite de empleados y la prueba dura un mes; un límite escrito lo amplía", async () => {
    const sa = await superadmin("p8p");
    const a = await createCompany(sa, { name: "Panadería Sol", planCode: "Empresarial", adminName: "Luis Pérez", adminEmail: `admin-p8p-${Date.now()}@test.local` });
    const ca = await getCompanyForPlatform(sa, a.companyId);
    expect(ca).toMatchObject({ planCode: "empresarial", maxEmployees: 10, maxSites: null });
    expect(ca.trialEndsAt).toBeInstanceOf(Date);
    const b = await createCompany(sa, { name: "Panadería Luna", planCode: "basico", maxEmployees: "7", adminName: "Ana Ruiz", adminEmail: `admin-p8q-${Date.now()}@test.local` });
    expect(await getCompanyForPlatform(sa, b.companyId)).toMatchObject({ planCode: "basico", maxEmployees: 7 });
  });

  it("suspender cierra las sesiones y bloquea el ingreso; reactivar lo permite de nuevo", async () => {
    const sa = await superadmin("p8b");
    const f = await makeCompany("p8b");
    const admin = await login(f.admin.email);
    const emp = await login(f.empUser.email);
    await setCompanyStatus(sa, f.company.id, "SUSPENDED");
    expect(await validateSessionToken(admin.token)).toBeNull();
    expect(await validateSessionToken(emp.token)).toBeNull();
    expect(await authenticate(f.admin.email, PASSWORD)).toMatchObject({ ok: false });
    await setCompanyStatus(sa, f.company.id, "ACTIVE");
    expect(await authenticate(f.admin.email, PASSWORD)).toMatchObject({ ok: true });
    expect(await code(setCompanyStatus(sa, f.company.id, "BORRADA"))).toBe("VALIDATION");
  });

  it("recupera la cuenta del administrador: clave temporal, desbloqueo y cierre de sesiones", async () => {
    const sa = await superadmin("p8c");
    const f = await makeCompany("p8c");
    const old = await login(f.admin.email);
    await db.user.update({ where: { id: f.admin.id }, data: { lockedUntil: new Date(Date.now() + 600_000) } });
    const r = await resetCompanyAdminPassword(sa, f.company.id, f.admin.id);
    expect(await validateSessionToken(old.token)).toBeNull();
    expect(await authenticate(f.admin.email, r.temporaryPassword)).toMatchObject({ ok: true, mustChangePassword: true });
    // Solo administradores de ESA empresa; un empleado o un id de otra empresa = NOT_FOUND.
    expect(await code(resetCompanyAdminPassword(sa, f.company.id, f.empUser.id))).toBe("NOT_FOUND");
    const other = await makeCompany("p8d");
    expect(await code(resetCompanyAdminPassword(sa, f.company.id, other.admin.id))).toBe("NOT_FOUND");
  });

  it("solo el superadministrador opera la plataforma", async () => {
    const f = await makeCompany("p8e");
    const admin = await login(f.admin.email);
    expect(await code(createCompany(admin.actor, { name: "X", adminName: "Xyz", adminEmail: "x@test.local" }))).toBe("FORBIDDEN");
    expect(await code(setCompanyStatus(admin.actor, f.company.id, "ACTIVE"))).toBe("FORBIDDEN");
    expect(await code(resetCompanyAdminPassword(admin.actor, f.company.id, f.admin.id))).toBe("FORBIDDEN");
    expect(await code(getCompanyForPlatform(admin.actor, f.company.id))).toBe("FORBIDDEN");
  });
});
