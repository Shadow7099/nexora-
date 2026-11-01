import "server-only";
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
