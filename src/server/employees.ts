import "server-only";
import { randomInt } from "node:crypto";
import * as z from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { contractSchema, employeeSchema, fieldErrors } from "@/lib/validation";
import { Prisma } from "@/generated/prisma/client";
import { audit } from "@/server/audit";
import { requireCompanyAdmin } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import { revokeUserSessions, type Actor } from "@/server/sessions";

/** Contraseña temporal legible (sin caracteres ambiguos), p. ej. "kq7m-x2pt-9hcw". */
export function temporaryPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const pick = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return `${pick()}-${pick()}-${pick()}`;
}

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

export async function listEmployees(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  return db.employee.findMany({
    where: { companyId },
    orderBy: [{ status: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      documentType: true,
      documentNumber: true,
      position: true,
      status: true,
      defaultSite: { select: { id: true, name: true } },
      user: { select: { email: true, lastLoginAt: true } },
    },
  });
}

export async function getEmployee(actor: Actor, id: string) {
  const companyId = requireCompanyAdmin(actor);
  if (!z.uuid().safeParse(id).success) throw notFound("El empleado");
  const employee = await db.employee.findFirst({
    where: { id, companyId },
    include: {
      user: { select: { email: true, lastLoginAt: true, mustChangePassword: true } },
      defaultSite: { select: { id: true, name: true } },
      contracts: { orderBy: { startDate: "desc" } },
    },
  });
  if (!employee) throw notFound("El empleado");
  return employee;
}

export async function listSiteOptions(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  return db.site.findMany({ where: { companyId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}

/** Comprueba que la sede pertenece a la empresa del actor. */
async function assertSite(companyId: string, siteId: string, tx: Prisma.TransactionClient = db) {
  const site = await tx.site.findFirst({ where: { id: siteId, companyId, active: true }, select: { id: true } });
  if (!site) throw new AppError("VALIDATION", "Revisa los datos.", { defaultSiteId: "Elige una sede válida." });
}

function uniqueViolation(e: unknown): AppError | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    // Con adaptador de driver (Prisma 7) el nombre de la restricción viene en driverAdapterError;
    // no se usa e.message porque incluye el código fuente de la llamada.
    const meta = e.meta as { target?: unknown; driverAdapterError?: { cause?: { constraint?: { index?: string; fields?: string[] } } } };
    const c = meta?.driverAdapterError?.cause?.constraint;
    const target = [c?.index, ...(c?.fields ?? []), meta?.target].filter(Boolean).join(" ");
    if (target.includes("email")) return new AppError("CONFLICT", "Revisa los datos.", { email: "Ese correo ya está registrado." });
    if (target.includes("document")) return new AppError("CONFLICT", "Revisa los datos.", { documentNumber: "Ya existe un empleado con ese documento." });
    return new AppError("CONFLICT", "Ya existe un registro con esos datos.");
  }
  return null;
}

export async function createEmployee(actor: Actor, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const parsed = employeeSchema.extend(contractSchema.shape).safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(parsed.error));
  const v = parsed.data;

  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { maxEmployees: true } });
  if (company.maxEmployees != null) {
    const active = await db.employee.count({ where: { companyId, status: "ACTIVE" } });
    if (active >= company.maxEmployees) {
      throw new AppError("LIMIT", `Tu plan permite ${company.maxEmployees} empleados activos. Desactiva uno o amplía el plan.`);
    }
  }

  const password = temporaryPassword();
  const passwordHash = await hashPassword(password);
  try {
    const employee = await db.$transaction(async (tx) => {
      await assertSite(companyId, v.defaultSiteId, tx);
      const user = await tx.user.create({
        data: { companyId, email: v.email, name: `${v.firstName} ${v.lastName}`, passwordHash, role: "EMPLOYEE", mustChangePassword: true },
      });
      const employee = await tx.employee.create({
        data: {
          companyId,
          userId: user.id,
          documentType: v.documentType,
          documentNumber: v.documentNumber,
          firstName: v.firstName,
          lastName: v.lastName,
          phone: v.phone || null,
          position: v.position,
          defaultSiteId: v.defaultSiteId,
          hireDate: d(v.hireDate),
        },
      });
      await tx.employeeContract.create({
        data: {
          companyId,
          employeeId: employee.id,
          contractType: v.contractType,
          salaryType: v.salaryType,
          monthlySalary: v.monthlySalary,
          weeklyHours: v.weeklyHours,
          payFrequency: v.payFrequency,
          arlRiskClass: v.arlRiskClass,
          startDate: d(v.startDate),
        },
      });
      await audit(
        {
          companyId,
          actorUserId: actor.userId,
          action: "employee.create",
          entityType: "employee",
          entityId: employee.id,
          // Sin salario en la auditoría general: es dato sensible y ya queda en el contrato versionado.
          after: { name: user.name, email: v.email, position: v.position, siteId: v.defaultSiteId },
        },
        tx,
      );
      return employee;
    });
    return { employeeId: employee.id, temporaryPassword: password };
  } catch (e) {
    throw uniqueViolation(e) ?? e;
  }
}

export async function updateEmployee(actor: Actor, id: string, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(parsed.error));
  const v = parsed.data;
  const before = await getEmployee(actor, id);

  try {
    await db.$transaction(async (tx) => {
      await assertSite(companyId, v.defaultSiteId, tx);
      await tx.employee.update({
        where: { id: before.id },
        data: {
          documentType: v.documentType,
          documentNumber: v.documentNumber,
          firstName: v.firstName,
          lastName: v.lastName,
          phone: v.phone || null,
          position: v.position,
          defaultSiteId: v.defaultSiteId,
          hireDate: d(v.hireDate),
        },
      });
      await tx.user.update({ where: { id: before.userId }, data: { email: v.email, name: `${v.firstName} ${v.lastName}` } });
      await audit(
        {
          companyId,
          actorUserId: actor.userId,
          action: "employee.update",
          entityType: "employee",
          entityId: before.id,
          before: { name: `${before.firstName} ${before.lastName}`, email: before.user.email, position: before.position, siteId: before.defaultSiteId },
          after: { name: `${v.firstName} ${v.lastName}`, email: v.email, position: v.position, siteId: v.defaultSiteId },
        },
        tx,
      );
    });
  } catch (e) {
    throw uniqueViolation(e) ?? e;
  }
}

/**
 * Nuevas condiciones contractuales a partir de una fecha. El contrato anterior
 * no se modifica salvo su fecha de fin: la pre-nómina de períodos pasados sigue
 * usando las condiciones que estaban vigentes.
 */
export async function addContractVersion(actor: Actor, id: string, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const parsed = contractSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(parsed.error));
  const v = parsed.data;
  const employee = await getEmployee(actor, id);
  const start = d(v.startDate);
  const current = employee.contracts.find((c) => !c.endDate || c.endDate >= start);
  if (current && start <= current.startDate) {
    throw new AppError("VALIDATION", "Revisa los campos marcados.", {
      startDate: "Debe ser posterior al inicio del contrato vigente.",
    });
  }

  await db.$transaction(async (tx) => {
    if (current) {
      await tx.employeeContract.update({ where: { id: current.id }, data: { endDate: new Date(start.getTime() - 86_400_000) } });
    }
    const created = await tx.employeeContract.create({
      data: {
        companyId,
        employeeId: employee.id,
        contractType: v.contractType,
        salaryType: v.salaryType,
        monthlySalary: v.monthlySalary,
        weeklyHours: v.weeklyHours,
        payFrequency: v.payFrequency,
        arlRiskClass: v.arlRiskClass,
        startDate: start,
      },
    });
    await audit(
      {
        companyId,
        actorUserId: actor.userId,
        action: "employee.contract_change",
        entityType: "employee_contract",
        entityId: created.id,
        after: { employeeId: employee.id, startDate: v.startDate, contractType: v.contractType },
      },
      tx,
    );
  });
}

export async function setEmployeeStatus(actor: Actor, id: string, status: "ACTIVE" | "INACTIVE") {
  const companyId = requireCompanyAdmin(actor);
  const employee = await getEmployee(actor, id);
  if (employee.status === status) return;
  if (status === "ACTIVE") {
    const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { maxEmployees: true } });
    const active = await db.employee.count({ where: { companyId, status: "ACTIVE" } });
    if (company.maxEmployees != null && active >= company.maxEmployees) {
      throw new AppError("LIMIT", `Tu plan permite ${company.maxEmployees} empleados activos.`);
    }
  }
  await db.$transaction(async (tx) => {
    await tx.employee.update({ where: { id: employee.id }, data: { status } });
    await tx.user.update({ where: { id: employee.userId }, data: { active: status === "ACTIVE" } });
    await audit(
      {
        companyId,
        actorUserId: actor.userId,
        action: status === "ACTIVE" ? "employee.reactivate" : "employee.deactivate",
        entityType: "employee",
        entityId: employee.id,
      },
      tx,
    );
  });
  // Un empleado desactivado pierde el acceso de inmediato en todos sus dispositivos.
  if (status === "INACTIVE") await revokeUserSessions(employee.userId);
}

export async function resetEmployeePassword(actor: Actor, id: string) {
  const companyId = requireCompanyAdmin(actor);
  const employee = await getEmployee(actor, id);
  const password = temporaryPassword();
  await db.user.update({
    where: { id: employee.userId },
    data: { passwordHash: await hashPassword(password), mustChangePassword: true, failedLogins: 0, lockedUntil: null },
  });
  await revokeUserSessions(employee.userId);
  await audit({ companyId, actorUserId: actor.userId, action: "employee.password_reset", entityType: "employee", entityId: employee.id });
  return password;
}
