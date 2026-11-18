import { NextResponse, type NextRequest } from "next/server";
import { handleGenericLead, handleMetaEvent, handleWhatsappEvent, verifySubscription, type WebhookResult } from "@/server/crm-webhooks";

/**
 * Avisos externos que crean leads en el CRM de una empresa:
 *   /api/webhooks/meta/<token>      formularios de anuncios de Facebook e Instagram
 *   /api/webhooks/whatsapp/<token>  mensajes de WhatsApp Business
 *   /api/webhooks/leads/<token>     TikTok (vía Zapier o Make) y formularios web
 * El token es privado de cada empresa (Admin → Integraciones).
 */
const MAX_BODY = 256 * 1024;
const reply = (r: WebhookResult) => new NextResponse(r.body, { status: r.status, headers: { "Content-Type": r.contentType ?? "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

export async function GET(req: NextRequest, { params }: RouteContext<"/api/webhooks/[provider]/[token]">) {
  const { provider, token } = await params;
  if (provider !== "meta" && provider !== "whatsapp") return reply({ status: 405, body: "Método no permitido" });
  return reply(await verifySubscription(provider === "meta" ? "META" : "WHATSAPP", token, req.nextUrl.searchParams));
}

export async function POST(req: NextRequest, { params }: RouteContext<"/api/webhooks/[provider]/[token]">) {
  const { provider, token } = await params;
  const raw = await req.text();
  if (raw.length > MAX_BODY) return reply({ status: 413, body: "Demasiado grande" });
  try {
    const signature = req.headers.get("x-hub-signature-256");
    if (provider === "meta") return reply(await handleMetaEvent(token, raw, signature));
    if (provider === "whatsapp") return reply(await handleWhatsappEvent(token, raw, signature));
    if (provider === "leads") return reply(await handleGenericLead(token, raw));
    return reply({ status: 404, body: "No encontrado" });
  } catch (e) {
    console.error("webhook", provider, e instanceof Error ? e.message : e);
    return reply({ status: 500, body: "Error al procesar el aviso" });
  }
}
