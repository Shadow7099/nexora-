/**
 * Pruebas obligatorias 5 y 6 del plan:
 * - un empleado no puede consultar información ajena;
 * - un administrador de una empresa no puede acceder a otra.
 */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getCompanySettings, listCompanies, updateCompanySettings } from "@/server/company";
import {
  addContractVersion, createEmployee, getEmployee, listEmployees, resetEmployeePassword, setEmployeeStatus, updateEmployee,
} from "@/server/employees";
import { adminOverview, employeeHome } from "@/server/overview";
import { AppError } from "@/server/errors";
import { login, makeCompany, newEmployeeInput } from "../support/fixtures";

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
};

describe("aislamiento entre empresas", () => {
  it("un administrador solo ve los empleados de su empresa", async () => {
    const a = await makeCompany("tA");
    const b = await makeCompany("tB");
    const { actor } = await login(a.admin.email);
    const list = await listEmployees(actor);
    expect(list.map((e) => e.id)).toEqual([a.employee.id]);
    expect(list.some((e) => e.id === b.employee.id)).toBe(false);
  });

  it("no puede leer, editar, desactivar ni resetear empleados de otra empresa (responde 'no existe')", async () => {
    const a = await makeCompany("tC");
    const b = await makeCompany("tD");
    const { actor } = await login(a.admin.email);
    expect(await code(getEmployee(actor, b.employee.id))).toBe("NOT_FOUND");
    expect(await code(updateEmployee(actor, b.employee.id, newEmployeeInput(a.site.id)))).toBe("NOT_FOUND");
    expect(await code(setEmployeeStatus(actor, b.employee.id, "INACTIVE"))).toBe("NOT_FOUND");
    expect(await code(resetEmployeePassword(actor, b.employee.id))).toBe("NOT_FOUND");
    expect(await code(addContractVersion(actor, b.employee.id, newEmployeeInput(a.site.id, { startDate: "2026-12-01" })))).toBe("NOT_FOUND");
    const untouched = await db.employee.findUniqueOrThrow({ where: { id: b.employee.id }, include: { user: true } });
    expect(untouched.status).toBe("ACTIVE");
    expect(untouched.user.mustChangePassword).toBe(false);
  });

  it("no puede asignar a su empleado una sede de otra empresa", async () => {
    const a = await makeCompany("tE");
    const b = await makeCompany("tF");
    const { actor } = await login(a.admin.email);
    expect(await code(createEmployee(actor, newEmployeeInput(b.site.id)))).toBe("VALIDATION");
    expect(await db.employee.count({ where: { defaultSiteId: b.site.id, companyId: a.company.id } })).toBe(0);
  });

  it("el resumen y la configuración solo muestran su empresa", async () => {
    const a = await makeCompany("tG");
    await makeCompany("tH");
    const { actor } = await login(a.admin.email);
    const o = await adminOverview(actor, new Date("2026-10-27T15:00:00Z"));
    expect(o.roster.map((r) => r.id)).toEqual([a.employee.id]);
    expect(o.activeSites).toBe(1);
    await updateCompanySettings(actor, { lateToleranceMin: 10, geoMaxAccuracyM: 80, requireDeviceBinding: true });
    expect((await getCompanySettings(actor)).lateToleranceMin).toBe(10);
  });
});

describe("permisos por rol", () => {
  it("un empleado no puede usar funciones de administrador", async () => {
    const a = await makeCompany("rA");
    const { actor } = await login(a.empUser.email);
    expect(await code(listEmployees(actor))).toBe("FORBIDDEN");
    expect(await code(getEmployee(actor, a.employee.id))).toBe("FORBIDDEN");
    expect(await code(createEmployee(actor, newEmployeeInput(a.site.id)))).toBe("FORBIDDEN");
    expect(await code(adminOverview(actor))).toBe("FORBIDDEN");
    expect(await code(updateCompanySettings(actor, { lateToleranceMin: 0, geoMaxAccuracyM: 1000, requireDeviceBinding: false }))).toBe("FORBIDDEN");
  });

  it("un empleado solo ve su propia pantalla, con su horario", async () => {
    const a = await makeCompany("rB");
    const { actor } = await login(a.empUser.email);
    const home = await employeeHome(actor, new Date("2026-10-27T12:00:00Z")); // martes 7 a. m. Bogotá
    expect(home.firstName).toBe("Ana");
    expect(home.shift?.templateName).toBe("Diurno");
    expect(home.siteName).toBe("Sede rB");
  });

  it("solo el superadministrador lista empresas", async () => {
    const a = await makeCompany("rC");
    const { actor } = await login(a.admin.email);
    expect(await code(listCompanies(actor))).toBe("FORBIDDEN");
    const sa = await db.user.create({
      data: { email: `sa-${a.company.id}@test.local`, name: "SA", passwordHash: (await db.user.findUniqueOrThrow({ where: { id: a.admin.id } })).passwordHash, role: "SUPERADMIN" },
    });
    const { actor: superadmin } = await login(sa.email);
    expect((await listCompanies(superadmin)).some((c) => c.id === a.company.id)).toBe(true);
  });
});

describe("gestión de empleados", () => {
  it("crea usuario + empleado + contrato, con clave temporal y auditoría", async () => {
    const a = await makeCompany("eA");
    const { actor } = await login(a.admin.email);
    const input = newEmployeeInput(a.site.id);
    const r = await createEmployee(actor, input);
    expect(r.temporaryPassword).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    const e = await getEmployee(actor, r.employeeId);
    expect(e.user.mustChangePassword).toBe(true);
    expect(e.contracts).toHaveLength(1);
    expect(Number(e.contracts[0]!.monthlySalary)).toBe(1_900_000);
    expect(await db.auditLog.count({ where: { entityId: r.employeeId, action: "employee.create" } })).toBe(1);
    const second = await login(input.email as string, r.temporaryPassword);
    expect(second.actor.mustChangePassword).toBe(true);
  });

  it("rechaza correo o documento repetido con mensaje por campo", async () => {
    const a = await makeCompany("eB");
    const { actor } = await login(a.admin.email);
    const dupEmail = createEmployee(actor, newEmployeeInput(a.site.id, { email: a.empUser.email }));
    await expect(dupEmail).rejects.toMatchObject({ code: "CONFLICT", fieldErrors: { email: expect.any(String) } });
    const dupDoc = createEmployee(actor, newEmployeeInput(a.site.id, { documentNumber: a.employee.documentNumber }));
    await expect(dupDoc).rejects.toMatchObject({ code: "CONFLICT", fieldErrors: { documentNumber: expect.any(String) } });
  });

  it("valida los campos y devuelve errores legibles", async () => {
    const a = await makeCompany("eC");
    const { actor } = await login(a.admin.email);
    await expect(createEmployee(actor, newEmployeeInput(a.site.id, { email: "no-es-correo", monthlySalary: "-5" }))).rejects.toMatchObject({
      code: "VALIDATION",
      fieldErrors: { email: expect.any(String), monthlySalary: expect.any(String) },
    });
  });

  it("respeta el límite de empleados del plan", async () => {
    const a = await makeCompany("eD", { maxEmployees: 1 });
    const { actor } = await login(a.admin.email);
    expect(await code(createEmployee(actor, newEmployeeInput(a.site.id)))).toBe("LIMIT");
  });

  it("un cambio de contrato crea una versión nueva y cierra la anterior", async () => {
    const a = await makeCompany("eE");
    const { actor } = await login(a.admin.email);
    await addContractVersion(actor, a.employee.id, newEmployeeInput(a.site.id, { monthlySalary: "2300000", startDate: "2026-11-01" }));
    const e = await getEmployee(actor, a.employee.id);
    expect(e.contracts).toHaveLength(2);
    expect(e.contracts[0]!.startDate.toISOString().slice(0, 10)).toBe("2026-11-01");
    expect(e.contracts[1]!.endDate?.toISOString().slice(0, 10)).toBe("2026-10-31");
    expect(await code(addContractVersion(actor, a.employee.id, newEmployeeInput(a.site.id, { startDate: "2026-10-15" })))).toBe("VALIDATION");
  });

  it("resetear la clave cierra sesiones y obliga a cambiarla", async () => {
    const a = await makeCompany("eF");
    const { actor } = await login(a.admin.email);
    const emp = await login(a.empUser.email);
    const temp = await resetEmployeePassword(actor, a.employee.id);
    const { validateSessionToken } = await import("@/server/sessions");
    expect(await validateSessionToken(emp.token)).toBeNull();
    expect((await login(a.empUser.email, temp)).actor.mustChangePassword).toBe(true);
  });
});
