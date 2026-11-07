/** Autogestión: invitación → registro del dueño → «Primeros pasos» con su avance real. */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { AppError } from "@/server/errors";
import { setupProgress } from "@/server/onboarding";
import { checkInvitation, createInvitation, listInvitations, registerWithInvitation, revokeInvitation } from "@/server/registration";
import { validateSessionToken } from "@/server/sessions";
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
const form = (over: Record<string, unknown> = {}) => ({
  companyName: "Droguería La Salud", nit: "901.222.333-4", adminName: "Rosa Díaz", email: `rosa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`,
  password: "Rosa-Drogueria-2026", confirm: "Rosa-Drogueria-2026", terms: true, ...over,
});

describe("autogestión · invitaciones y registro", () => {
  it("el dueño registra su empresa con el link: queda en prueba, con su sesión y los límites de la invitación", async () => {
    const sa = await superadmin("r1");
    const inv = await createInvitation(sa, { label: "Droguería de Rosa", maxSites: "2", maxEmployees: "12", planCode: "piloto", validDays: "7" });
    expect(inv.token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(await db.companyInvitation.count({ where: { tokenHash: inv.token } })).toBe(0); // solo el hash
    expect(await checkInvitation(inv.token)).toMatchObject({ ok: true, label: "Droguería de Rosa" });

    const f = form();
    const r = await registerWithInvitation(inv.token, f, "vitest");
    const actor = await validateSessionToken(r.token);
    expect(actor).toMatchObject({ role: "COMPANY_ADMIN", companyId: r.companyId, mustChangePassword: false, hasConsent: false });
    const company = await db.company.findUniqueOrThrow({ where: { id: r.companyId } });
    expect(company).toMatchObject({ name: "Droguería La Salud", status: "TRIAL", maxSites: 2, maxEmployees: 12, planCode: "piloto" });
    expect(await db.auditLog.count({ where: { companyId: r.companyId, action: "company.self_register" } })).toBe(1);

    // Un solo uso.
    expect(await checkInvitation(inv.token)).toEqual({ ok: false, reason: "used" });
    expect(await code(registerWithInvitation(inv.token, form()))).toBe("NOT_FOUND");
    expect((await listInvitations(sa)).find((x) => x.id === inv.id)).toMatchObject({ state: "used", company: { id: r.companyId } });
  });

  it("dos registros simultáneos con el mismo link crean una sola empresa", async () => {
    const sa = await superadmin("r2");
    const inv = await createInvitation(sa, { label: "Doble clic" });
    const results = await Promise.allSettled([registerWithInvitation(inv.token, form({ companyName: "A uno" })), registerWithInvitation(inv.token, form({ companyName: "A dos" }))]);
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(await db.company.count({ where: { name: { in: ["A uno", "A dos"] } } })).toBe(1);
  });

  it("links vencidos, anulados o inventados no sirven; valida el formulario y el correo repetido", async () => {
    const sa = await superadmin("r3");
    const old = await createInvitation(sa, { label: "Vieja", validDays: "1" }, new Date(Date.now() - 3 * 86_400_000));
    expect(await checkInvitation(old.token)).toEqual({ ok: false, reason: "expired" });
    const rev = await createInvitation(sa, { label: "Anulada" });
    await revokeInvitation(sa, rev.id);
    expect(await checkInvitation(rev.token)).toEqual({ ok: false, reason: "revoked" });
    expect(await code(revokeInvitation(sa, rev.id))).toBe("CONFLICT");
    expect(await checkInvitation("x".repeat(32))).toEqual({ ok: false, reason: "invalid" });
    expect(await checkInvitation("../../etc")).toEqual({ ok: false, reason: "invalid" });

    const inv = await createInvitation(sa, { label: "Valida" });
    await expect(registerWithInvitation(inv.token, form({ password: "corta", confirm: "otra", terms: false, email: "no" }))).rejects.toMatchObject({
      code: "VALIDATION", fieldErrors: { password: expect.any(String), terms: expect.any(String), email: expect.any(String) },
    });
    const taken = await makeCompany("r3b");
    await expect(registerWithInvitation(inv.token, form({ email: taken.admin.email.toUpperCase() }))).rejects.toMatchObject({ code: "CONFLICT", fieldErrors: { email: expect.any(String) } });
    expect(await checkInvitation(inv.token)).toMatchObject({ ok: true }); // un error no consume el link
  });

  it("solo el superadministrador crea o anula invitaciones", async () => {
    const f = await makeCompany("r4");
    const admin = await login(f.admin.email);
    expect(await code(createInvitation(admin.actor, { label: "Intruso" }))).toBe("FORBIDDEN");
    expect(await code(listInvitations(admin.actor))).toBe("FORBIDDEN");
  });
});

describe("autogestión · primeros pasos", () => {
  it("el avance sale de los datos reales de la empresa", async () => {
    const sa = await superadmin("r5");
    const inv = await createInvitation(sa, { label: "Pasos" });
    const r = await registerWithInvitation(inv.token, form());
    const actor = (await validateSessionToken(r.token))!;
    let p = await setupProgress(actor);
    expect(p).toMatchObject({ done: 0, total: 6, complete: false });

    // Una empresa ya configurada (fixture: sede, turno, empleado con horario) solo debe la configuración y la marcación de prueba.
    const f = await makeCompany("r5b");
    p = await setupProgress((await login(f.admin.email)).actor);
    expect(p.steps.filter((s) => !s.done).map((s) => s.key)).toEqual(["settings", "qr"]);
  });
});
