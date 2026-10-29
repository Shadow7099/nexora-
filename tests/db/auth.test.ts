import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { authenticate, changePassword, hashToken, LOCK_MINUTES, MAX_FAILED_LOGINS, validateSessionToken } from "@/server/sessions";
import { setEmployeeStatus } from "@/server/employees";
import { login, makeCompany, PASSWORD } from "../support/fixtures";

describe("inicio de sesión", () => {
  it("credenciales correctas crean una sesión con rol y empresa", async () => {
    const f = await makeCompany("auth1");
    const { actor, token } = await login(f.admin.email);
    expect(actor.role).toBe("COMPANY_ADMIN");
    expect(actor.companyId).toBe(f.company.id);
    // En la BD solo se guarda el hash del token, nunca el token.
    expect(await db.session.findUnique({ where: { id: token } })).toBeNull();
    expect(await db.session.findUnique({ where: { id: hashToken(token) } })).not.toBeNull();
  });

  it("acepta el correo sin distinguir mayúsculas", async () => {
    const f = await makeCompany("auth2");
    expect((await authenticate(f.admin.email.toUpperCase(), PASSWORD)).ok).toBe(true);
  });

  it("contraseña incorrecta y correo inexistente responden igual", async () => {
    const f = await makeCompany("auth3");
    expect(await authenticate(f.admin.email, "otra-clave-123")).toEqual({ ok: false, reason: "invalid" });
    expect(await authenticate("nadie@test.local", "otra-clave-123")).toEqual({ ok: false, reason: "invalid" });
  });

  it(`bloquea la cuenta tras ${MAX_FAILED_LOGINS} intentos fallidos, incluso con la clave correcta`, async () => {
    const f = await makeCompany("auth4");
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) expect((await authenticate(f.admin.email, "mala-clave-1")).ok).toBe(false);
    expect(await authenticate(f.admin.email, "mala-clave-1")).toEqual({ ok: false, reason: "locked", minutes: LOCK_MINUTES });
    expect((await authenticate(f.admin.email, PASSWORD)).ok).toBe(false);
    const logs = await db.auditLog.count({ where: { entityId: f.admin.id, action: "auth.locked" } });
    expect(logs).toBe(1);
  });

  it("una sesión vencida deja de ser válida y se elimina", async () => {
    const f = await makeCompany("auth5");
    const { token } = await login(f.admin.email);
    await db.session.update({ where: { id: hashToken(token) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await validateSessionToken(token)).toBeNull();
    expect(await db.session.count({ where: { id: hashToken(token) } })).toBe(0);
  });

  it("un empleado desactivado pierde sus sesiones y no puede volver a entrar", async () => {
    const f = await makeCompany("auth6");
    const { token } = await login(f.empUser.email);
    const { actor: admin } = await login(f.admin.email);
    await setEmployeeStatus(admin, f.employee.id, "INACTIVE");
    expect(await validateSessionToken(token)).toBeNull();
    expect((await authenticate(f.empUser.email, PASSWORD)).ok).toBe(false);
  });

  it("una empresa suspendida no puede usar la plataforma", async () => {
    const f = await makeCompany("auth7");
    const { token } = await login(f.admin.email);
    await db.company.update({ where: { id: f.company.id }, data: { status: "SUSPENDED" } });
    expect(await validateSessionToken(token)).toBeNull();
    expect((await authenticate(f.admin.email, PASSWORD)).ok).toBe(false);
  });
});

describe("cambio de contraseña", () => {
  it("exige la contraseña actual y cierra las demás sesiones", async () => {
    const f = await makeCompany("pw1");
    const a = await login(f.empUser.email);
    const b = await login(f.empUser.email); // otro dispositivo
    expect((await changePassword(a.actor, "incorrecta-123", "Nueva-Clave-2026")).ok).toBe(false);
    expect((await changePassword(a.actor, PASSWORD, "Nueva-Clave-2026")).ok).toBe(true);
    expect(await validateSessionToken(a.token)).not.toBeNull(); // la sesión actual sigue
    expect(await validateSessionToken(b.token)).toBeNull(); // la otra se cerró
    expect((await authenticate(f.empUser.email, "Nueva-Clave-2026")).ok).toBe(true);
  });
});
