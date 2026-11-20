import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { learnAll } from "@/server/crm-learning";

/**
 * Aprendizaje diario de la IA de mensajes: Vercel Cron lo llama cada mañana
 * (vercel.json) con «Authorization: Bearer <CRON_SECRET>». Sin esa clave en
 * Vercel no hace nada.
 */
export const maxDuration = 300;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "Falta CRON_SECRET en Vercel" }, { status: 503 });
  if (!authorized(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const results = await learnAll();
  return NextResponse.json({ companies: results.length, ok: results.filter((r) => r.ok).length }, { headers: { "Cache-Control": "no-store" } });
}
