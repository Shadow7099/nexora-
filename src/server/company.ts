import "server-only";
import { db } from "@/lib/db";
import { companySettingsSchema, fieldErrors } from "@/lib/validation";
import { audit } from "@/server/audit";
import { requireCompanyAdmin, requireSuperadmin } from "@/server/authz";
import { AppError } from "@/server/errors";
import type { Actor } from "@/server/sessions";

const settingsSelect = { name: true, legalName: true, nit: true, timezone: true, lateToleranceMin: true, geoMaxAccuracyM: true, requireDeviceBinding: true } as const;

export async function getCompanySettings(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  return db.company.findUniqueOrThrow({ where: { id: companyId }, select: settingsSelect });
}

export async function updateCompanySettings(actor: Actor, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const parsed = companySettingsSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(parsed.error));
  const before = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: settingsSelect });
  await db.$transaction(async (tx) => {
    await tx.company.update({ where: { id: companyId }, data: parsed.data });
    await audit(
      {
        companyId,
        actorUserId: actor.userId,
        action: "company.settings_update",
        entityType: "company",
        entityId: companyId,
        before: { lateToleranceMin: before.lateToleranceMin, geoMaxAccuracyM: before.geoMaxAccuracyM, requireDeviceBinding: before.requireDeviceBinding },
        after: parsed.data,
      },
      tx,
    );
  });
}

export async function recentAudit(actor: Actor, take = 15) {
  const companyId = requireCompanyAdmin(actor);
  return db.auditLog.findMany({
    where: { companyId },
    orderBy: { occurredAt: "desc" },
    take,
    select: { id: true, action: true, occurredAt: true, actor: { select: { name: true } } },
  });
}

/** Panel de plataforma: empresas registradas con su tamaño (sin datos personales). */
export async function listCompanies(actor: Actor) {
  requireSuperadmin(actor);
  const companies = await db.company.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      status: true,
      planCode: true,
      maxEmployees: true,
      maxSites: true,
      createdAt: true,
      _count: { select: { employees: { where: { status: "ACTIVE" } }, sites: { where: { active: true } } } },
    },
  });
  return companies;
}
