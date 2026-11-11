import "server-only";
import * as z from "zod";
import { db } from "@/lib/db";
import { fieldErrors } from "@/lib/validation";
import { audit } from "@/server/audit";
import { requireSuperadmin } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import { hashIp, type Actor } from "@/server/sessions";

/**
 * Solicitudes de negocios interesados (formulario de la página pública).
 * Protecciones: campo trampa para robots, máximo de envíos por red (hash de
 * la IP) y validación estricta. Solo el superadministrador las ve.
 */

export const LEAD_EMPLOYEES = ["1-5", "6-15", "16-30", "31+"] as const;
export const MAX_LEADS_PER_IP_PER_HOUR = 5;

export const leadSchema = z.object({
  businessName: z.string().trim().min(2, { error: "Escribe el nombre del negocio." }).max(120),
  contactName: z.string().trim().min(3, { error: "Escribe tu nombre." }).max(120),
  email: z.email({ error: "Correo inválido." }).trim().toLowerCase().max(160),
  phone: z.string().trim().regex(/^[0-9+ ]{7,15}$/, { error: "Celular inválido (solo números)." }),
  city: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().trim().max(80).optional()),
  employees: z.enum(LEAD_EMPLOYEES, { error: "Elige cuántos empleados tienes." }),
  sites: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number({ error: "Escribe un número." }).int().min(1, { error: "Mínimo 1." }).max(500).optional()),
  message: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().trim().max(1000).optional()),
  consent: z.literal(true, { error: "Debes autorizar el contacto para enviar la solicitud." }),
});

/** Guarda la solicitud. `website` es un campo trampa: las personas no lo ven ni lo llenan. */
export async function submitLead(input: Record<string, unknown>, ip?: string | null, now = new Date()) {
  if (typeof input.website === "string" && input.website.trim() !== "") return { ok: true as const }; // robot: se ignora en silencio
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION", "Revisa los campos marcados.", fieldErrors(parsed.error));
  const ipHash = ip ? hashIp(ip) : null;
  if (ipHash) {
    const recent = await db.lead.count({ where: { ipHash, createdAt: { gte: new Date(now.getTime() - 3_600_000) } } });
    if (recent >= MAX_LEADS_PER_IP_PER_HOUR) throw new AppError("LIMIT", "Recibimos varias solicitudes desde tu red. Intenta de nuevo en una hora.");
  }
  const v = parsed.data;
  await db.lead.create({
    data: { businessName: v.businessName, contactName: v.contactName, email: v.email, phone: v.phone, city: v.city ?? null, employees: v.employees, sites: v.sites ?? null, message: v.message ?? null, ipHash },
  });
  return { ok: true as const };
}

export async function listLeads(actor: Actor) {
  requireSuperadmin(actor);
  return db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 200, omit: { ipHash: true } });
}

const statusSchema = z.enum(["NEW", "CONTACTED", "INVITED", "DISCARDED"]);

export async function setLeadStatus(actor: Actor, id: string, status: unknown) {
  requireSuperadmin(actor);
  const s = statusSchema.safeParse(status);
  if (!s.success) throw new AppError("VALIDATION", "Estado inválido.");
  if (!z.uuid().safeParse(id).success) throw notFound("La solicitud");
  const r = await db.lead.updateMany({ where: { id }, data: { status: s.data } });
  if (r.count === 0) throw notFound("La solicitud");
  await audit({ companyId: null, actorUserId: actor.userId, action: "lead.status", entityType: "lead", entityId: id, after: { status: s.data } });
}
