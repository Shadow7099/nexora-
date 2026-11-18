/**
 * Integraciones: tokens cifrados que nunca vuelven al navegador ni quedan en
 * claro en la base o la auditoría; prueba de conexión contra la API real
 * (simulada aquí); aislamiento entre empresas; llave de Claude de la plataforma.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { AppError } from "@/server/errors";
import {
  integrationCredentials,
  listIntegrations,
  platformClaudeKey,
  removeIntegration,
  resetPlatformClaudeCache,
  saveIntegration,
  testIntegration,
} from "@/server/integrations";
import { login, makeCompany } from "../support/fixtures";

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
};
const TOKEN = "EAAG-token-de-prueba-que-no-debe-aparecer-en-claro";
const meta = { pageId: "123456789012345", instagramId: "", pageAccessToken: TOKEN, appSecret: "" };

async function setup(tag: string) {
  const f = await makeCompany(tag);
  return { ...f, admin: await login(f.admin.email), emp: await login(f.empUser.email) };
}

async function superadmin(tag: string) {
  const passwordHash = (await db.user.findFirstOrThrow({ where: { role: "COMPANY_ADMIN" } })).passwordHash;
  const email = `sa-int-${tag}-${Date.now()}@test.local`;
  await db.user.create({ data: { email, name: "SA", passwordHash, role: "SUPERADMIN" } });
  return login(email);
}

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  vi.unstubAllEnvs();
  resetPlatformClaudeCache();
});

describe("cifrado", () => {
  it("descifra solo con la misma clave y la misma fila; detecta cambios", () => {
    const c = encryptSecret("hola", "empresa-a|META");
    expect(c.startsWith("v1.")).toBe(true);
    expect(c).not.toContain("hola");
    expect(decryptSecret(c, "empresa-a|META")).toBe("hola");
    expect(() => decryptSecret(c, "empresa-b|META")).toThrow(); // copiado a otra empresa
    const parts = c.split(".");
    parts[3] = Buffer.from("otra cosa").toString("base64url");
    expect(() => decryptSecret(parts.join("."), "empresa-a|META")).toThrow(); // alterado
    expect(encryptSecret("hola", "x")).not.toBe(encryptSecret("hola", "x")); // IV aleatorio
  });
});

describe("integraciones de la empresa", () => {
  it("guarda cifrado, nunca devuelve el token y un campo vacío conserva el guardado", async () => {
    const s = await setup("int1");
    await expect(saveIntegration(s.admin.actor, "company", "META", { pageId: "abc", pageAccessToken: "" })).rejects.toMatchObject({
      code: "VALIDATION",
      fieldErrors: { pageId: expect.any(String), pageAccessToken: expect.any(String) },
    });
    await saveIntegration(s.admin.actor, "company", "META", meta);

    const row = await db.integration.findFirstOrThrow({ where: { companyId: s.company.id, provider: "META" } });
    expect(JSON.stringify(row)).not.toContain(TOKEN); // ni en la fila
    expect(row).toMatchObject({ status: "UNTESTED", secretKeys: ["pageAccessToken"], config: { pageId: meta.pageId } });
    const logs = await db.auditLog.findMany({ where: { companyId: s.company.id, entityType: "integration" } });
    expect(JSON.stringify(logs)).not.toContain(TOKEN); // ni en la auditoría
    expect(logs[0]!.after).toMatchObject({ provider: "META", secretsChanged: ["pageAccessToken"] });

    const list = await listIntegrations(s.admin.actor, "company");
    expect(JSON.stringify(list)).not.toContain(TOKEN); // ni hacia la pantalla
    expect(list.items.find((i) => i.id === "META")).toMatchObject({ connected: true, savedSecrets: ["pageAccessToken"] });
    expect(list.items.map((i) => i.id)).toEqual(["META", "TIKTOK", "WHATSAPP", "SIIGO", "ALEGRA", "RESEND", "CLAUDE"]);

    // Cambiar el ID sin reescribir el token: se conserva.
    await saveIntegration(s.admin.actor, "company", "META", { ...meta, pageId: "999999999999999", pageAccessToken: "" });
    expect(await integrationCredentials(s.company.id, "META")).toMatchObject({ config: { pageId: "999999999999999" }, secrets: { pageAccessToken: TOKEN } });

    await removeIntegration(s.admin.actor, "company", "META");
    expect(await integrationCredentials(s.company.id, "META")).toBeNull();
  });

  it("probar conexión llama a la plataforma con el token en la cabecera y guarda el resultado", async () => {
    const s = await setup("int2");
    expect(await code(testIntegration(s.admin.actor, "company", "META"))).toBe("CONFLICT"); // sin guardar
    await saveIntegration(s.admin.actor, "company", "META", meta);

    const calls: { url: string; auth: string | null }[] = [];
    const ok = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), auth: new Headers(init?.headers).get("authorization") });
      return reply(200, { name: "Panadería Rosa", instagram_business_account: { id: "1784", username: "panaderiarosa" } });
    });
    expect(await testIntegration(s.admin.actor, "company", "META", ok as unknown as typeof fetch)).toEqual({ ok: true, detail: "Página «Panadería Rosa» · Instagram @panaderiarosa" });
    expect(calls[0]!.url).toMatch(/^https:\/\/graph\.facebook\.com\/v\d+\.\d+\/999|^https:\/\/graph\.facebook\.com\/v\d+\.\d+\/123456789012345/);
    expect(calls[0]!.url).not.toContain(TOKEN); // nunca en la URL (quedaría en registros)
    expect(calls[0]!.auth).toBe(`Bearer ${TOKEN}`);
    expect(await db.integration.findFirstOrThrow({ where: { companyId: s.company.id, provider: "META" } })).toMatchObject({ status: "CONNECTED", lastError: null });

    const bad = vi.fn(async () => reply(400, { error: { message: "Invalid OAuth access token." } }));
    expect(await testIntegration(s.admin.actor, "company", "META", bad as unknown as typeof fetch)).toEqual({ ok: false, error: expect.stringContaining("Invalid OAuth access token") });
    const down = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await testIntegration(s.admin.actor, "company", "META", down as unknown as typeof fetch)).toEqual({ ok: false, error: expect.stringContaining("No se pudo conectar") });
    const row = await db.integration.findFirstOrThrow({ where: { companyId: s.company.id, provider: "META" } });
    expect(row.status).toBe("ERROR");
    expect(await db.auditLog.count({ where: { companyId: s.company.id, action: "integration.test" } })).toBe(3);
  });

  it("prueba cada plataforma contra su API oficial", async () => {
    const s = await setup("int3");
    const seen: string[] = [];
    const f = (async (url: string | URL | Request) => {
      const u = String(url);
      seen.push(u);
      if (u.includes("business-api.tiktok.com")) return reply(200, { code: 0, data: { list: [{ name: "Rosa Ads" }] } });
      if (u.includes("graph.facebook.com")) return reply(200, { display_phone_number: "+57 300 000 0000", verified_name: "Rosa" });
      if (u.includes("api.siigo.com/auth")) return reply(200, { access_token: "x" });
      if (u.includes("api.alegra.com")) return reply(200, { name: "Rosa SAS", identification: "900" });
      if (u.includes("api.resend.com")) return reply(200, { data: [{ name: "rosa.co", status: "verified" }] });
      if (u.includes("api.anthropic.com")) return reply(200, { data: [{ id: "claude-opus-5-5", type: "model", display_name: "Claude", created_at: "2026-01-01T00:00:00Z" }], has_more: false, first_id: "a", last_id: "a" });
      return reply(404, {});
    }) as typeof fetch;
    const cases: [string, Record<string, string>, string][] = [
      ["TIKTOK", { advertiserId: "7000000000000000000", accessToken: "tk" }, "Rosa Ads"],
      ["WHATSAPP", { phoneNumberId: "100000000000000", businessAccountId: "100000000000001", accessToken: "wa" }, "+57 300 000 0000"],
      ["SIIGO", { username: "f@rosa.co", partnerId: "Nexora", accessKey: "k" }, "f@rosa.co"],
      ["RESEND", { fromEmail: "hola@rosa.co", fromName: "Rosa", apiKey: "re_x" }, "rosa.co verificado"],
      ["CLAUDE", { apiKey: "sk-ant-x" }, "claude-opus-5-5"],
    ];
    for (const [p, input, expected] of cases) {
      await saveIntegration(s.admin.actor, "company", p, input);
      expect(await testIntegration(s.admin.actor, "company", p, f), p).toEqual({ ok: true, detail: expect.stringContaining(expected) });
    }
    expect(seen.some((u) => u.startsWith("https://api.anthropic.com/v1/models"))).toBe(true);
    // Un solo facturador electrónico a la vez.
    await expect(saveIntegration(s.admin.actor, "company", "ALEGRA", { email: "a@rosa.co", token: "t" })).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("Siigo") });
    await removeIntegration(s.admin.actor, "company", "SIIGO");
    await saveIntegration(s.admin.actor, "company", "ALEGRA", { email: "a@rosa.co", token: "t" });
    expect(await testIntegration(s.admin.actor, "company", "ALEGRA", f)).toEqual({ ok: true, detail: "Empresa «Rosa SAS» · NIT 900" });
  });

  it("aislamiento: otra empresa no ve ni toca las integraciones; un empleado no entra", async () => {
    const a = await setup("int4");
    const b = await setup("int5");
    await saveIntegration(a.admin.actor, "company", "META", meta);
    expect((await listIntegrations(b.admin.actor, "company")).items.every((i) => !i.connected)).toBe(true);
    expect(await integrationCredentials(b.company.id, "META")).toBeNull();
    await removeIntegration(b.admin.actor, "company", "META"); // no hace nada sobre la de A
    expect(await integrationCredentials(a.company.id, "META")).not.toBeNull();
    expect(await code(listIntegrations(a.emp.actor, "company"))).toBe("FORBIDDEN");
    expect(await code(saveIntegration(a.emp.actor, "company", "META", meta))).toBe("FORBIDDEN");
    expect(await code(listIntegrations(a.admin.actor, "platform"))).toBe("FORBIDDEN");
    expect(await code(saveIntegration(a.admin.actor, "company", "NO_EXISTE", {}))).toBe("NOT_FOUND");
  });

  it("sin clave de cifrado en el servidor no se guarda nada", async () => {
    const s = await setup("int6");
    vi.stubEnv("NEXORA_SECRETS_KEY", "");
    await expect(saveIntegration(s.admin.actor, "company", "META", meta)).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("NEXORA_SECRETS_KEY") });
    expect((await listIntegrations(s.admin.actor, "company")).encryptionReady).toBe(false);
  });
});

describe("llave de Claude de la plataforma (asistente de la página de inicio)", () => {
  it("la guardada tiene prioridad sobre la variable de entorno; al quitarla vuelve a la variable", async () => {
    const sa = await superadmin("cl");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-de-la-variable");
    expect(await platformClaudeKey()).toBe("sk-ant-de-la-variable");
    expect((await listIntegrations(sa.actor, "platform")).items.map((i) => i.id)).toEqual(["CLAUDE"]);
    expect(await code(saveIntegration(sa.actor, "platform", "META", meta))).toBe("NOT_FOUND"); // solo Claude en la plataforma

    await saveIntegration(sa.actor, "platform", "CLAUDE", { apiKey: "sk-ant-guardada" });
    expect(await platformClaudeKey()).toBe("sk-ant-guardada");
    await removeIntegration(sa.actor, "platform", "CLAUDE");
    expect(await platformClaudeKey()).toBe("sk-ant-de-la-variable");
  });
});
