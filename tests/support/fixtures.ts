import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { authenticate, validateSessionToken } from "@/server/sessions";

export const PASSWORD = "Prueba-Segura-2026";
let hash: Promise<string> | undefined;
const pwHash = () => (hash ??= hashPassword(PASSWORD));

/** Inicia sesión de verdad y devuelve el actor resultante. */
export async function login(email: string, password = PASSWORD) {
  const r = await authenticate(email, password, "vitest");
  if (!r.ok) throw new Error(`login falló para ${email}: ${r.reason}`);
  const actor = await validateSessionToken(r.token);
  if (!actor) throw new Error("sesión inválida");
  return { actor, token: r.token };
}

/** Empresa con un administrador, una sede y un empleado con contrato y horario L–V 8–5. */
export async function makeCompany(tag: string, opts: { maxEmployees?: number } = {}) {
  const u = randomUUID().slice(0, 8);
  const passwordHash = await pwHash();
  const company = await db.company.create({ data: { name: `Empresa ${tag}`, slug: `${tag}-${u}`, maxEmployees: opts.maxEmployees } });
  const admin = await db.user.create({
    data: { companyId: company.id, email: `admin-${tag}-${u}@test.local`, name: `Admin ${tag}`, passwordHash, role: "COMPANY_ADMIN" },
  });
  const site = await db.site.create({
    data: { companyId: company.id, name: `Sede ${tag}`, address: "Dir", city: "Ciudad", latitude: 4.14, longitude: -73.62 },
  });
  const empUser = await db.user.create({
    data: { companyId: company.id, email: `emp-${tag}-${u}@test.local`, name: `Ana ${tag}`, passwordHash, role: "EMPLOYEE" },
  });
  const employee = await db.employee.create({
    data: {
      companyId: company.id, userId: empUser.id, documentType: "CC", documentNumber: `D${u}`, firstName: "Ana", lastName: tag,
      position: "Cajera", defaultSiteId: site.id, hireDate: new Date("2026-01-01T00:00:00Z"),
    },
  });
  await db.employeeContract.create({
    data: {
      companyId: company.id, employeeId: employee.id, contractType: "INDEFINIDO", monthlySalary: 2_000_000, weeklyHours: 42,
      payFrequency: "QUINCENAL", startDate: new Date("2026-01-01T00:00:00Z"),
    },
  });
  const template = await db.shiftTemplate.create({ data: { companyId: company.id, name: "Diurno", startMin: 480, endMin: 1020, breakMinutes: 60 } });
  await db.schedulePattern.create({
    data: {
      companyId: company.id, employeeId: employee.id, name: "Base", cycleDays: 7,
      anchorDate: new Date("2026-10-05T00:00:00Z"), effectiveFrom: new Date("2026-10-05T00:00:00Z"),
      days: { create: [0, 1, 2, 3, 4].map((dayIndex) => ({ dayIndex, templateId: template.id, siteId: site.id })) },
    },
  });
  return { company, admin, site, empUser, employee };
}

export const newEmployeeInput = (siteId: string, over: Record<string, unknown> = {}) => ({
  firstName: "Carlos",
  lastName: "Nuevo",
  email: `carlos-${randomUUID().slice(0, 8)}@test.local`,
  documentType: "CC",
  documentNumber: `N${randomUUID().slice(0, 8)}`,
  phone: "3001234567",
  position: "Auxiliar",
  defaultSiteId: siteId,
  hireDate: "2026-10-01",
  contractType: "INDEFINIDO",
  salaryType: "ORDINARIO",
  monthlySalary: "1900000",
  weeklyHours: "42",
  payFrequency: "QUINCENAL",
  arlRiskClass: "I",
  startDate: "2026-10-01",
  ...over,
});
