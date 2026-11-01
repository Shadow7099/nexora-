import "server-only";
import { randomBytes } from "node:crypto";
import * as z from "zod";
import { db } from "@/lib/db";
import { fieldErrors } from "@/lib/validation";
import { audit } from "@/server/audit";
import { requireCompanyAdmin } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import type { Actor } from "@/server/sessions";

const locationSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().int().min(10, { error: "Mínimo 10 m." }).max(2000, { error: "Máximo 2000 m." }),
});

/** Cambia la ubicación y el radio de una sede (con auditoría del valor anterior). */
export async function updateSiteLocation(actor: Actor, siteId: string, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  if (!z.uuid().safeParse(siteId).success) throw notFound("La sede");
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los datos.", fieldErrors(parsed.error));
  const site = await db.site.findFirst({ where: { id: siteId, companyId } });
  if (!site) throw notFound("La sede");
  const v = parsed.data;
  await db.$transaction(async (tx) => {
    await tx.site.update({ where: { id: site.id }, data: { latitude: v.latitude, longitude: v.longitude, radiusMeters: v.radiusMeters } });
    await audit(
      {
        companyId,
        actorUserId: actor.userId,
        action: "site.location_update",
        entityType: "site",
        entityId: site.id,
        before: { latitude: Number(site.latitude), longitude: Number(site.longitude), radiusMeters: site.radiusMeters },
        after: v,
      },
      tx,
    );
  });
}

// ───────────────────────── Fase 3: gestión completa de sedes ─────────────────────────

const timeHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Hora inválida (HH:MM)." });
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export const siteSchema = z.object({
  name: z.string().trim().min(2, { error: "Nombre muy corto." }).max(80),
  address: z.string().trim().min(4, { error: "Escribe la dirección." }).max(160),
  city: z.string().trim().min(2, { error: "Escribe la ciudad." }).max(80),
  latitude: z.coerce.number({ error: "Latitud inválida." }).min(-90).max(90),
  longitude: z.coerce.number({ error: "Longitud inválida." }).min(-180).max(180),
  radiusMeters: z.coerce.number().int().min(10, { error: "Mínimo 10 m." }).max(2000, { error: "Máximo 2000 m." }),
  opens: timeHHMM,
  closes: timeHHMM,
  days: z.array(z.coerce.number().int().min(1).max(7)).min(1, { error: "Elige al menos un día." }),
});

/** Horario de apertura: si cierra antes de abrir, cierra al día siguiente (p. ej. 22:00–06:00). */
function openingRows(v: { opens: string; closes: string; days: number[] }) {
  const opensMin = toMin(v.opens);
  let closesMin = toMin(v.closes);
  if (closesMin <= opensMin) closesMin += 1440;
  return [...new Set(v.days)].sort().map((weekday) => ({ weekday, opensMin, closesMin }));
}

function uniqueName(e: unknown) {
  const err = e as { code?: string };
  return err?.code === "P2002" ? new AppError("CONFLICT", "Revisa los datos.", { name: "Ya existe una sede con ese nombre." }) : null;
}

export async function createSite(actor: Actor, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const parsed = siteSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(parsed.error));
  const v = parsed.data;
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { maxSites: true } });
  if (company.maxSites != null && (await db.site.count({ where: { companyId, active: true } })) >= company.maxSites) {
    throw new AppError("LIMIT", `Tu plan permite ${company.maxSites} sedes activas.`);
  }
  try {
    return await db.$transaction(async (tx) => {
      const site = await tx.site.create({
        data: { companyId, name: v.name, address: v.address, city: v.city, latitude: v.latitude, longitude: v.longitude, radiusMeters: v.radiusMeters, openingHours: { create: openingRows(v) } },
      });
      await tx.siteQrCode.create({ data: { companyId, siteId: site.id, publicCode: newPublicCode(), version: 1 } });
      await audit({ companyId, actorUserId: actor.userId, action: "site.create", entityType: "site", entityId: site.id, after: { name: v.name, city: v.city } }, tx);
      return site;
    });
  } catch (e) {
    throw uniqueName(e) ?? e;
  }
}

export async function updateSite(actor: Actor, siteId: string, input: unknown) {
  const companyId = requireCompanyAdmin(actor);
  const site = await getSite(companyId, siteId);
  const parsed = siteSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(parsed.error));
  const v = parsed.data;
  try {
    await db.$transaction(async (tx) => {
      await tx.site.update({ where: { id: site.id }, data: { name: v.name, address: v.address, city: v.city, latitude: v.latitude, longitude: v.longitude, radiusMeters: v.radiusMeters } });
      await tx.siteOpeningHours.deleteMany({ where: { siteId: site.id } });
      await tx.siteOpeningHours.createMany({ data: openingRows(v).map((r) => ({ ...r, siteId: site.id })) });
      await audit(
        {
          companyId, actorUserId: actor.userId, action: "site.update", entityType: "site", entityId: site.id,
          before: { name: site.name, address: site.address, latitude: Number(site.latitude), longitude: Number(site.longitude), radiusMeters: site.radiusMeters },
          after: { name: v.name, address: v.address, latitude: v.latitude, longitude: v.longitude, radiusMeters: v.radiusMeters },
        },
        tx,
      );
    });
  } catch (e) {
    throw uniqueName(e) ?? e;
  }
}

export async function setSiteActive(actor: Actor, siteId: string, active: boolean) {
  const companyId = requireCompanyAdmin(actor);
  const site = await getSite(companyId, siteId);
  if (active && !site.active) {
    const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { maxSites: true } });
    if (company.maxSites != null && (await db.site.count({ where: { companyId, active: true } })) >= company.maxSites) {
      throw new AppError("LIMIT", `Tu plan permite ${company.maxSites} sedes activas.`);
    }
  }
  await db.$transaction(async (tx) => {
    await tx.site.update({ where: { id: site.id }, data: { active } });
    await audit({ companyId, actorUserId: actor.userId, action: active ? "site.activate" : "site.deactivate", entityType: "site", entityId: site.id }, tx);
  });
}

/** Rota el QR: el anterior deja de funcionar de inmediato (por si se fotografió o se dañó). */
export async function rotateQr(actor: Actor, siteId: string) {
  const companyId = requireCompanyAdmin(actor);
  const site = await getSite(companyId, siteId);
  return db.$transaction(async (tx) => {
    const current = await tx.siteQrCode.findFirst({ where: { siteId: site.id, revokedAt: null } });
    const last = await tx.siteQrCode.findFirst({ where: { siteId: site.id }, orderBy: { version: "desc" }, select: { version: true } });
    if (current) await tx.siteQrCode.update({ where: { id: current.id }, data: { revokedAt: new Date() } });
    const qr = await tx.siteQrCode.create({ data: { companyId, siteId: site.id, publicCode: newPublicCode(), version: (last?.version ?? 0) + 1 } });
    await audit({ companyId, actorUserId: actor.userId, action: "site.qr_rotate", entityType: "site", entityId: site.id, after: { version: qr.version } }, tx);
    return qr;
  });
}

export async function getSiteForAdmin(actor: Actor, siteId: string) {
  const companyId = requireCompanyAdmin(actor);
  const site = await getSite(companyId, siteId);
  const [hours, qr] = await Promise.all([
    db.siteOpeningHours.findMany({ where: { siteId: site.id }, orderBy: { weekday: "asc" } }),
    db.siteQrCode.findFirst({ where: { siteId: site.id, revokedAt: null } }),
  ]);
  return { ...site, hours, qr };
}

async function getSite(companyId: string, siteId: string) {
  if (!z.uuid().safeParse(siteId).success) throw notFound("La sede");
  const site = await db.site.findFirst({ where: { id: siteId, companyId } });
  if (!site) throw notFound("La sede");
  return site;
}

function newPublicCode() {
  return randomBytes(9).toString("base64url");
}
