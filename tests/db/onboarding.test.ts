/** Autoregistro de empresas y asistente de configuración inicial. */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { shiftsOn } from "@/lib/schedule";
import { AppError } from "@/server/errors";
import { getEmployeeSchedule } from "@/server/schedules";
import {
  assignWeeklySchedule,
  completeOnboarding,
  createEmployeesBulk,
  createPresetTemplates,
  getOnboardingStatus,
  needsOnboarding,
  parseEmployeeLines,
  registerCompany,
  SELF_SIGNUP_LIMITS,
  SIGNUP_PER_IP_PER_HOUR,
} from "@/server/onboarding";
import { createSite } from "@/server/sites";
import { authenticate, validateSessionToken } from "@/server/sessions";
import { makeCompany } from "../support/fixtures";

const PW = "Clave-Segura-2026";
const signup = (over: Record<string, unknown> = {}) => ({
  companyName: "Ferretería La Llave",
  nit: "901.234.567-8",
  adminName: "Marta Gómez",
  adminEmail: `marta-${randomUUID().slice(0, 8)}@test.local`,
  password: PW,
  confirm: PW,
  accept: "on",
  ...over,
});
const ip = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
};

async function newCompany() {
  const input = signup();
  const r = await registerCompany(input, { ip: ip(), userAgent: "vitest" });
  const actor = (await validateSessionToken(r.token))!;
  return { r, actor, input };
}

const siteInput = { name: "Principal", address: "Calle 1 # 2-3", city: "Villavicencio", latitude: "4.142", longitude: "-73.626", radiusMeters: "80", opens: "06:00", closes: "20:00", days: [1, 2, 3, 4, 5, 6] };

describe("autoregistro", () => {
  it("crea la empresa en prueba, su administrador con la clave elegida y la sesión, sin pasos pendientes", async () => {
    const { r, actor, input } = await newCompany();
    expect(actor.role).toBe("COMPANY_ADMIN");
    expect(actor.companyId).toBe(r.companyId);
    expect(actor.mustChangePassword).toBe(false);
    expect(actor.hasConsent).toBe(true);

    const c = await db.company.findUniqueOrThrow({ where: { id: r.companyId } });
    expect(c).toMatchObject({ status: "TRIAL", selfSignup: true, onboardingCompletedAt: null, maxEmployees: SELF_SIGNUP_LIMITS.maxEmployees, maxSites: SELF_SIGNUP_LIMITS.maxSites });
    expect((await authenticate(input.adminEmail, PW)).ok).toBe(true);
    expect(await db.auditLog.count({ where: { companyId: r.companyId, action: "company.self_signup" } })).toBe(1);
    expect(await needsOnboarding(actor)).toBe(true);
  });

  it("rechaza correo repetido, contraseñas distintas y registro sin autorización", async () => {
    const { input } = await newCompany();
    await expect(registerCompany(signup({ adminEmail: input.adminEmail.toUpperCase() }), { ip: ip() })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(registerCompany(signup({ confirm: "Otra-Clave-2026" }), { ip: ip() })).rejects.toMatchObject({ fieldErrors: { confirm: expect.any(String) } });
    await expect(registerCompany(signup({ accept: undefined }), { ip: ip() })).rejects.toMatchObject({ fieldErrors: { accept: expect.any(String) } });
    await expect(registerCompany(signup({ password: "corta1" }), { ip: ip() })).rejects.toMatchObject({ fieldErrors: { password: expect.any(String) } });
  });

  it("limita los registros desde una misma red", async () => {
    const same = ip();
    for (let i = 0; i < SIGNUP_PER_IP_PER_HOUR; i++) await registerCompany(signup(), { ip: same });
    expect(await code(registerCompany(signup(), { ip: same }))).toBe("LIMIT");
  });
});

describe("asistente de configuración inicial", () => {
  it("lleva la empresa de cero a empleados con cuenta y horario", async () => {
    const { actor } = await newCompany();
    let s = await getOnboardingStatus(actor);
    expect(s.next).toBe("sede");

    const site = await createSite(actor, siteInput);
    expect((await getOnboardingStatus(actor)).next).toBe("turnos");

    expect((await createPresetTemplates(actor, ["diurno", "nocturno"])).created).toBe(2);
    expect((await createPresetTemplates(actor, ["diurno"])).created).toBe(0); // no duplica
    s = await getOnboardingStatus(actor);
    expect(s.templates.map((t) => t.name)).toEqual(["Diurno", "Nocturno"]);
    expect(s.next).toBe("empleados");

    const lines = [
      "Nombres;Apellidos;Cédula;Correo;Cargo;Salario",
      `Juan;Pérez;1.020.304;juan-${randomUUID().slice(0, 6)}@test.local;Panadero;$ 1.750.905`,
      `Laura\tRíos\t52123456\tlaura-${randomUUID().slice(0, 6)}@test.local\tCajera\t1800000\t3001234567`,
      "Pedro;Sin Correo;7777777;no-es-correo;Aux;1500000",
    ].join("\n");
    const bulk = await createEmployeesBulk(actor, lines, { defaultSiteId: site.id, hireDate: "2026-11-04" });
    expect(bulk.created.map((c) => c.name)).toEqual(["Juan Pérez", "Laura Ríos"]);
    expect(bulk.created.every((c) => /^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/.test(c.password))).toBe(true);
    expect(bulk.failed).toEqual([{ line: 4, text: expect.stringContaining("Pedro"), error: expect.stringContaining("Correo") }]);

    // Cada empleado puede ingresar con su contraseña temporal y debe cambiarla.
    const login = await authenticate(bulk.created[0]!.email, bulk.created[0]!.password);
    expect(login.ok && login.mustChangePassword).toBe(true);
    const juan = await db.employee.findFirstOrThrow({ where: { companyId: actor.companyId!, firstName: "Juan" }, include: { contracts: true } });
    expect(juan.documentNumber).toBe("1020304");
    expect(Number(juan.contracts[0]!.monthlySalary)).toBe(1_750_905);

    s = await getOnboardingStatus(actor);
    expect(s.next).toBe("horarios");
    const diurno = s.templates.find((t) => t.name === "Diurno")!;
    // Miércoles 4 de noviembre de 2026: lunes a viernes.
    const now = new Date("2026-11-04T15:00:00Z");
    const r = await assignWeeklySchedule(actor, { templateId: diurno.id, weekdays: [1, 2, 3, 4, 5], employeeIds: s.employees.map((e) => e.id) }, now);
    expect(r).toEqual({ assigned: 2, from: "2026-11-04" });

    const sched = await getEmployeeSchedule(actor, juan.id);
    const patterns = sched.patterns.map((p) => ({ ...p, days: p.days.map((d) => ({ ...d, template: diurno })) }));
    const dates = ["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09"];
    const worked = dates.filter((d) => shiftsOn(patterns as never, d).length > 0);
    expect(worked).toEqual(["2026-11-04", "2026-11-05", "2026-11-06", "2026-11-09"]); // mié, jue, vie, lun

    s = await getOnboardingStatus(actor);
    expect(s.done).toMatchObject({ sede: true, turnos: true, empleados: true, horarios: true, listo: false });
    await completeOnboarding(actor);
    expect(await needsOnboarding(actor)).toBe(false);
  });

  it("respeta el límite de empleados del plan en la carga en lote", async () => {
    const { actor } = await newCompany();
    await db.company.update({ where: { id: actor.companyId! }, data: { maxEmployees: 1 } });
    const site = await createSite(actor, siteInput);
    const lines = [1, 2, 3].map((i) => `Ana${i};Prueba;${9000 + i}00;ana${i}-${randomUUID().slice(0, 6)}@test.local;Aux;1500000`).join("\n");
    const r = await createEmployeesBulk(actor, lines, { defaultSiteId: site.id, hireDate: "2026-11-04" });
    expect(r.created).toHaveLength(1);
    expect(r.failed).toHaveLength(1); // se detiene al llegar al límite
    expect(r.failed[0]!.error).toContain("plan");
  });

  it("no permite usar sedes ni empleados de otra empresa", async () => {
    const { actor } = await newCompany();
    const other = await makeCompany("onb-x");
    const line = `Eva;Ajena;55555;eva-${randomUUID().slice(0, 6)}@test.local;Aux;1500000`;
    const r = await createEmployeesBulk(actor, line, { defaultSiteId: other.site.id, hireDate: "2026-11-04" });
    expect(r.created).toHaveLength(0);
    expect(r.failed[0]!.error).toContain("sede");

    await createSite(actor, siteInput);
    await createPresetTemplates(actor, ["diurno"]);
    const t = (await getOnboardingStatus(actor)).templates[0]!;
    expect(await code(assignWeeklySchedule(actor, { templateId: t.id, weekdays: [1], employeeIds: [other.employee.id] }))).toBe("VALIDATION");
  });

  it("las empresas existentes no ven el asistente", async () => {
    const { company } = await makeCompany("onb-old");
    const admin = await db.user.findFirstOrThrow({ where: { companyId: company.id, role: "COMPANY_ADMIN" } });
    expect((await db.company.findUniqueOrThrow({ where: { id: company.id } })).onboardingCompletedAt).not.toBeNull();
    expect(admin).toBeTruthy();
  });
});

describe("lectura de la lista pegada", () => {
  it("acepta tabuladores, punto y coma o comas, e ignora el encabezado y líneas vacías", () => {
    const rows = parseEmployeeLines("Nombres\tApellidos\tCédula\tCorreo\n\nA\tB\t1.234.567\ta@x.co\tCargo\t1.500.000\n C , D , 99 , c@x.co , Aux , 2000000 ");
    expect(rows.map((r) => r.row)).toEqual([
      { firstName: "A", lastName: "B", documentNumber: "1234567", email: "a@x.co", position: "Cargo", monthlySalary: "1500000", phone: "" },
      { firstName: "C", lastName: "D", documentNumber: "99", email: "c@x.co", position: "Aux", monthlySalary: "2000000", phone: "" },
    ]);
    expect(rows.map((r) => r.line)).toEqual([3, 4]);
  });
});
