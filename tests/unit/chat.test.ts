/** Asistente de la landing: intención por palabras clave y modo con Claude (servidor simulado). */
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { matchIntent, normalize } from "@/lib/chat-match";

describe("intención del mensaje", () => {
  it.each([
    ["¿Cuánto cuesta?", "prices"],
    ["que precio tiene el plan para 10 empleados", "prices"],
    ["Cómo marcan la entrada mis empleados", "how"],
    ["¿Toca comprar un reloj biométrico?", "hardware"],
    ["¿pueden marcar desde la CASA?", "location"],
    ["un compañero puede marcar por otro?", "impersonation"],
    ["¿hace la nómina electrónica ante la DIAN?", "payroll"],
    ["cuánto es el recargo dominical", "rules"],
    ["quiero registrarme", "register"],
    ["necesito hablar con una persona", "contact"],
    ["olvidé mi contraseña", "login"],
    ["hola", "greeting"],
    ["¿cuál es la capital de Francia?", "fallback"],
  ])("«%s» → %s", (msg, key) => {
    expect(matchIntent(msg).key).toBe(key);
  });
  it("normaliza tildes y signos", () => expect(normalize("¿Cuánto CUESTA?")).toBe("cuanto cuesta"));
});

describe("respuesta del servidor", () => {
  let server: Server;
  let lastBody: Record<string, unknown> = {};
  let fail = false;
  beforeAll(async () => {
    server = createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        lastBody = JSON.parse(raw || "{}");
        if (fail) {
          res.writeHead(500, { "content-type": "application/json" });
          res.end(JSON.stringify({ type: "error", error: { type: "api_error", message: "falla simulada" } }));
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "end_turn", stop_sequence: null,
          content: [{ type: "text", text: "Respuesta redactada por Claude." }], usage: { input_tokens: 10, output_tokens: 5 },
        }));
      });
    });
    await new Promise<void>((r) => server.listen(0, r));
  });
  afterAll(() => server.close());

  it("sin llave de API responde con la base propia", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { answerChat } = await import("@/server/chat");
    const r = await answerChat([{ role: "user", content: "¿Cuánto cuesta?" }], "198.51.100.1");
    expect(r).toMatchObject({ source: "base", links: expect.arrayContaining([expect.objectContaining({ href: "/registro" })]) });
    expect(r.reply).toContain("$99.900");
  });

  it("con llave usa Claude con la base como contexto, y vuelve a la base si la API falla", async () => {
    const port = (server.address() as { port: number }).port;
    process.env.ANTHROPIC_API_KEY = "sk-ant-prueba";
    process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
    const { answerChat } = await import("@/server/chat");
    const r = await answerChat([{ role: "user", content: "¿Sirve para una ferretería con 3 locales?" }], "198.51.100.2");
    expect(r).toMatchObject({ source: "ai", reply: "Respuesta redactada por Claude." });
    expect(lastBody).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default", output_config: { effort: "low" } });
    expect(String(lastBody.system)).toContain("$59.900");

    fail = true;
    const r2 = await answerChat([{ role: "user", content: "¿Cuánto cuesta?" }], "198.51.100.3");
    expect(r2.source).toBe("base");
    fail = false;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_BASE_URL;
  });

  it("valida el historial y limita mensajes por red", async () => {
    const { answerChat, MAX_MESSAGES_PER_WINDOW } = await import("@/server/chat");
    await expect(answerChat([])).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(answerChat([{ role: "assistant", content: "hola" }])).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(answerChat([{ role: "user", content: "x".repeat(501) }])).rejects.toMatchObject({ code: "VALIDATION" });
    const ip = "203.0.113.200";
    const t = Date.now();
    for (let i = 0; i < MAX_MESSAGES_PER_WINDOW; i++) await answerChat([{ role: "user", content: "hola" }], ip, t + i);
    await expect(answerChat([{ role: "user", content: "hola" }], ip, t + 100)).rejects.toMatchObject({ code: "LIMIT" });
    expect((await answerChat([{ role: "user", content: "hola" }], ip, t + 11 * 60_000)).source).toBe("base");
  });
});
