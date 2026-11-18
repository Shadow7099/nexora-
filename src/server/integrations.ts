import "server-only";
import { randomBytes } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { INTEGRATIONS, integrationById, type IntegrationProvider } from "@/lib/integration-catalog";
import { decryptSecret, encryptSecret, SecretsKeyMissing, secretsConfigured } from "@/lib/secrets";
import { audit } from "@/server/audit";
import { requireCompanyAdmin, requireSuperadmin } from "@/server/authz";
import { AppError, notFound } from "@/server/errors";
import type { Actor } from "@/server/sessions";

/**
 * Integraciones: cada empresa conecta sus propias cuentas (marca blanca,
 * autogestionable) y la plataforma tiene las suyas (llave de Claude del
 * asistente de la página de inicio).
 *
 * - Los tokens se cifran (src/lib/secrets.ts) y nunca vuelven al navegador:
 *   la pantalla solo sabe qué campos secretos están guardados.
 * - «Probar conexión» llama a la API real de cada plataforma con una lectura
 *   inofensiva y guarda el resultado (conectada / con error).
 * - Todo queda en la auditoría, sin el valor de los secretos.
 */

export type IntegrationScope = "company" | "platform";
type Fetch = typeof fetch;

const META_VERSION = "v21.0";
const MAX_LEN = 4000;

function owner(actor: Actor, scope: IntegrationScope): string | null {
  return scope === "platform" ? (requireSuperadmin(actor), null) : requireCompanyAdmin(actor);
}

function providerFor(scope: IntegrationScope, id: string): IntegrationProvider {
  const p = integrationById(id);
  if (!p || (scope === "platform" ? p.scope === "company" : p.scope === "platform")) throw notFound("La integración");
  return p;
}

const associated = (companyId: string | null, provider: string) => `${companyId ?? "platform"}|${provider}`;

async function findRow(companyId: string | null, provider: string) {
  return db.integration.findFirst({ where: { companyId, provider } });
}

function readSecrets(row: { secretCipher: string | null; companyId: string | null; provider: string }): Record<string, string> {
  if (!row.secretCipher) return {};
  return JSON.parse(decryptSecret(row.secretCipher, associated(row.companyId, row.provider))) as Record<string, string>;
}

/** Estado de cada integración para la pantalla (sin secretos). */
export async function listIntegrations(actor: Actor, scope: IntegrationScope) {
  const companyId = owner(actor, scope);
  let rows: Awaited<ReturnType<typeof db.integration.findMany>>;
  try {
    rows = await db.integration.findMany({ where: { companyId } });
  } catch (e) {
    // La migración de integraciones aún no se aplicó en esta base: la pantalla lo explica en vez de fallar.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") return { encryptionReady: secretsConfigured(), databaseReady: false, items: [] };
    throw e;
  }
  const providers = INTEGRATIONS.filter((p) => (scope === "platform" ? p.scope !== "company" : p.scope !== "platform"));
  return {
    encryptionReady: secretsConfigured(),
    databaseReady: true,
    items: providers.map((p) => {
      const r = rows.find((x) => x.provider === p.id);
      return {
        id: p.id,
        connected: !!r,
        status: r?.status ?? null,
        config: (r?.config ?? {}) as Record<string, string>,
        savedSecrets: r?.secretKeys ?? [],
        lastError: r?.lastError ?? null,
        testedAt: r?.testedAt ?? null,
        updatedAt: r?.updatedAt ?? null,
        webhookToken: r?.webhookToken ?? null,
      };
    }),
  };
}

/**
 * Guarda los datos de una integración. Los campos secretos vacíos conservan el
 * valor guardado; los que se escriben lo reemplazan. Queda «sin probar».
 */
export async function saveIntegration(actor: Actor, scope: IntegrationScope, providerId: string, input: Record<string, unknown>) {
  const companyId = owner(actor, scope);
  const p = providerFor(scope, providerId);
  if (!secretsConfigured()) throw new AppError("CONFLICT", new SecretsKeyMissing().message);

  const existing = await findRow(companyId, p.id);
  if (p.exclusiveGroup && !existing) {
    const others = INTEGRATIONS.filter((x) => x.exclusiveGroup === p.exclusiveGroup && x.id !== p.id).map((x) => x.id);
    const other = await db.integration.findFirst({ where: { companyId, provider: { in: others } } });
    if (other) throw new AppError("CONFLICT", `Ya tienes conectado ${integrationById(other.provider)?.name}. Desconéctalo antes de usar ${p.name}.`);
  }
  const previousSecrets = existing ? readSecrets(existing) : {};
  const config: Record<string, string> = {};
  const secrets: Record<string, string> = { ...previousSecrets };
  const errors: Record<string, string> = {};

  for (const f of p.fields) {
    const raw = input[f.key];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value.length > MAX_LEN) errors[f.key] = "Es demasiado largo.";
    if (f.secret) {
      if (value) secrets[f.key] = value;
      if (!secrets[f.key] && !f.optional) errors[f.key] = "Pega aquí el valor.";
    } else {
      if (value) config[f.key] = value;
      else if (!f.optional) errors[f.key] = "Este dato es obligatorio.";
      if (value && /^\d/.test(f.placeholder ?? "") && !/^\d{3,30}$/.test(value)) errors[f.key] = "Debe ser un número (solo dígitos).";
    }
  }
  if (Object.keys(errors).length) throw new AppError("VALIDATION", "Revisa los campos marcados.", errors);

  const secretKeys = Object.keys(secrets).filter((k) => p.fields.some((f) => f.key === k && f.secret));
  const cipher = secretKeys.length ? encryptSecret(JSON.stringify(Object.fromEntries(secretKeys.map((k) => [k, secrets[k]!]))), associated(companyId, p.id)) : null;
  const changedSecrets = p.fields.filter((f) => f.secret && typeof input[f.key] === "string" && (input[f.key] as string).trim()).map((f) => f.key);

  await db.$transaction(async (tx) => {
    const data = { config, secretCipher: cipher, secretKeys, status: "UNTESTED" as const, lastError: null, testedAt: null, updatedById: actor.userId };
    const row = existing
      ? await tx.integration.update({ where: { id: existing.id }, data })
      : await tx.integration.create({ data: { ...data, companyId, provider: p.id, webhookToken: randomBytes(24).toString("base64url") } });
    // Solo los NOMBRES de los campos cambiados; nunca los valores secretos.
    await audit({ companyId, actorUserId: actor.userId, action: existing ? "integration.update" : "integration.create", entityType: "integration", entityId: row.id, after: { provider: p.id, config, secretsChanged: changedSecrets } }, tx);
  });
  if (p.id === "CLAUDE" && companyId === null) platformClaudeCache = null;
}

/** Desconecta: borra los datos y los tokens guardados. */
export async function removeIntegration(actor: Actor, scope: IntegrationScope, providerId: string) {
  const companyId = owner(actor, scope);
  const p = providerFor(scope, providerId);
  const row = await findRow(companyId, p.id);
  if (!row) return;
  await db.$transaction(async (tx) => {
    await tx.integration.delete({ where: { id: row.id } });
    await audit({ companyId, actorUserId: actor.userId, action: "integration.delete", entityType: "integration", entityId: row.id, after: { provider: p.id } }, tx);
  });
  if (p.id === "CLAUDE" && companyId === null) platformClaudeCache = null;
}

// ───────────────────────────── Probar conexión ─────────────────────────────

type TestResult = { ok: true; detail: string } | { ok: false; error: string };

async function json(r: Response) {
  return (await r.json().catch(() => ({}))) as Record<string, unknown>;
}
const msgOf = (d: Record<string, unknown>) => {
  const e = d.error as { message?: string } | string | undefined;
  return String((typeof e === "string" ? e : e?.message) ?? d.message ?? "").slice(0, 200);
};

const TESTERS: Record<string, (c: Record<string, string>, s: Record<string, string>, f: Fetch) => Promise<TestResult>> = {
  async META(c, s, f) {
    const url = `https://graph.facebook.com/${META_VERSION}/${encodeURIComponent(c.pageId!)}?fields=name,instagram_business_account{id,username}`;
    const r = await f(url, { headers: { Authorization: `Bearer ${s.pageAccessToken}` }, signal: AbortSignal.timeout(15_000) });
    const d = await json(r);
    if (!r.ok) return { ok: false, error: `Meta no aceptó el token o el ID de la página: ${msgOf(d) || r.status}` };
    const ig = d.instagram_business_account as { id?: string; username?: string } | undefined;
    if (c.instagramId && ig?.id && ig.id !== c.instagramId) return { ok: false, error: `La página tiene unida la cuenta @${ig.username} (ID ${ig.id}); corrige el ID de Instagram.` };
    return { ok: true, detail: `Página «${String(d.name ?? "")}»${ig?.username ? ` · Instagram @${ig.username}` : " · sin Instagram unido a la página"}` };
  },
  async TIKTOK(c, s, f) {
    const q = new URLSearchParams({ advertiser_ids: JSON.stringify([c.advertiserId]) });
    const r = await f(`https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?${q}`, { headers: { "Access-Token": s.accessToken! }, signal: AbortSignal.timeout(15_000) });
    const d = await json(r);
    const list = ((d.data as { list?: { name?: string }[] } | undefined)?.list ?? []) as { name?: string }[];
    if (!r.ok || d.code !== 0 || !list[0]) return { ok: false, error: `TikTok no aceptó el token o el ID de la cuenta: ${msgOf(d) || r.status}` };
    return { ok: true, detail: `Cuenta publicitaria «${list[0].name ?? c.advertiserId}»` };
  },
  async WHATSAPP(c, s, f) {
    const r = await f(`https://graph.facebook.com/${META_VERSION}/${encodeURIComponent(c.phoneNumberId!)}?fields=display_phone_number,verified_name,quality_rating`, {
      headers: { Authorization: `Bearer ${s.accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    const d = await json(r);
    if (!r.ok) return { ok: false, error: `Meta no aceptó el token o el ID del número: ${msgOf(d) || r.status}` };
    return { ok: true, detail: `Número ${String(d.display_phone_number ?? "")} · «${String(d.verified_name ?? "")}»${d.quality_rating ? ` · calidad ${String(d.quality_rating)}` : ""}` };
  },
  async SIIGO(c, s, f) {
    const r = await f("https://api.siigo.com/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Partner-Id": c.partnerId! },
      body: JSON.stringify({ username: c.username, access_key: s.accessKey }),
      signal: AbortSignal.timeout(15_000),
    });
    const d = await json(r);
    if (!r.ok || !d.access_token) {
      const errs = (d.Errors as { Message?: string }[] | undefined)?.map((e) => e.Message).join(" ");
      return { ok: false, error: `Siigo no aceptó las credenciales: ${errs || msgOf(d) || r.status}` };
    }
    return { ok: true, detail: `Credenciales válidas para ${c.username}` };
  },
  async ALEGRA(c, s, f) {
    const r = await f("https://api.alegra.com/api/v1/company", {
      headers: { Authorization: `Basic ${Buffer.from(`${c.email}:${s.token}`).toString("base64")}` },
      signal: AbortSignal.timeout(15_000),
    });
    const d = await json(r);
    if (!r.ok) return { ok: false, error: `Alegra no aceptó el correo o el token: ${msgOf(d) || r.status}` };
    return { ok: true, detail: `Empresa «${String(d.name ?? "")}»${d.identification ? ` · NIT ${String(d.identification)}` : ""}` };
  },
  async RESEND(c, s, f) {
    const r = await f("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${s.apiKey}` }, signal: AbortSignal.timeout(15_000) });
    const d = await json(r);
    if (!r.ok) return { ok: false, error: `Resend no aceptó la API key: ${msgOf(d) || r.status}` };
    const domain = c.fromEmail?.split("@")[1]?.toLowerCase();
    const found = ((d.data as { name: string; status: string }[] | undefined) ?? []).find((x) => x.name.toLowerCase() === domain);
    if (!found) return { ok: false, error: `El dominio ${domain} no está agregado en tu cuenta de Resend.` };
    if (found.status !== "verified") return { ok: false, error: `El dominio ${domain} aún no está verificado en Resend (estado: ${found.status}).` };
    return { ok: true, detail: `Dominio ${domain} verificado` };
  },
  async CLAUDE(_c, s, f) {
    try {
      const client = new Anthropic({ apiKey: s.apiKey, fetch: f, timeout: 15_000, maxRetries: 0 });
      const page = await client.models.list({ limit: 1 });
      return { ok: true, detail: `Llave válida${page.data[0] ? ` · modelos disponibles (p. ej. ${page.data[0].id})` : ""}` };
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) return { ok: false, error: "Anthropic no aceptó la API key." };
      if (e instanceof Anthropic.PermissionDeniedError) return { ok: false, error: "La API key no tiene permiso (revisa la organización en console.anthropic.com)." };
      if (e instanceof Anthropic.APIError) return { ok: false, error: `Anthropic respondió con error ${e.status ?? ""}.` };
      throw e;
    }
  },
};

/** Prueba la conexión con la plataforma y guarda el resultado. */
export async function testIntegration(actor: Actor, scope: IntegrationScope, providerId: string, f: Fetch = fetch): Promise<TestResult> {
  const companyId = owner(actor, scope);
  const p = providerFor(scope, providerId);
  const row = await findRow(companyId, p.id);
  if (!row) throw new AppError("CONFLICT", "Primero guarda los datos de la conexión.");
  let result: TestResult;
  try {
    result = await TESTERS[p.id]!(row.config as Record<string, string>, readSecrets(row), f);
  } catch (e) {
    result = { ok: false, error: e instanceof SecretsKeyMissing ? e.message : e instanceof Error && e.name === "TimeoutError" ? "La plataforma no respondió a tiempo. Intenta de nuevo." : "No se pudo conectar con la plataforma. Intenta de nuevo." };
  }
  await db.$transaction(async (tx) => {
    await tx.integration.update({
      where: { id: row.id },
      data: { status: result.ok ? "CONNECTED" : "ERROR", lastError: result.ok ? null : result.error.slice(0, 300), testedAt: new Date() },
    });
    await audit({ companyId, actorUserId: actor.userId, action: "integration.test", entityType: "integration", entityId: row.id, after: { provider: p.id, ok: result.ok } }, tx);
  });
  return result;
}

// ───────────────────────────── Uso interno ─────────────────────────────

/** Datos y tokens de una integración para que otro módulo la use (solo en el servidor). */
export async function integrationCredentials(companyId: string | null, providerId: string) {
  const row = await findRow(companyId, providerId);
  if (!row) return null;
  return { status: row.status, config: row.config as Record<string, string>, secrets: readSecrets(row), webhookToken: row.webhookToken };
}

let platformClaudeCache: { key: string | null; at: number } | null = null;

/**
 * Llave de Claude para el asistente de la página de inicio: la guardada en
 * Plataforma → Integraciones; si no hay, la variable ANTHROPIC_API_KEY.
 * Se recuerda un minuto para no consultar la base en cada mensaje.
 */
export async function platformClaudeKey(now = Date.now()): Promise<string | null> {
  if (platformClaudeCache && now - platformClaudeCache.at < 60_000) return platformClaudeCache.key ?? process.env.ANTHROPIC_API_KEY ?? null;
  let stored: string | null = null;
  try {
    const c = await integrationCredentials(null, "CLAUDE");
    stored = c?.secrets.apiKey ?? null;
  } catch {
    stored = null; // sin tabla, sin clave de cifrado o dato dañado: se usa la variable de entorno
  }
  platformClaudeCache = { key: stored, at: now };
  return stored ?? process.env.ANTHROPIC_API_KEY ?? null;
}

export function resetPlatformClaudeCache() {
  platformClaudeCache = null;
}
