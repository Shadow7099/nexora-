import { FALLBACK, INTENTS, type Intent } from "@/lib/chat-knowledge";

/** minúsculas, sin tildes ni signos: «¿Cuánto CUESTA?» → «cuanto cuesta» */
export const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9ñ\s-]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Intención de un mensaje por palabras clave (las frases largas pesan más).
 * Sin coincidencias devuelve la respuesta de respaldo.
 */
export function matchIntent(message: string): Intent {
  const text = ` ${normalize(message)} `;
  let best: Intent = FALLBACK;
  let bestScore = 0;
  for (const intent of INTENTS) {
    let score = 0;
    for (const k of intent.keywords) {
      const kw = normalize(k);
      // Palabra completa o prefijo («registr» cubre registrarme, registro…).
      if (text.includes(` ${kw}`)) score += kw.split(" ").length * 2 + (text.includes(` ${kw} `) ? 1 : 0);
    }
    if (score > bestScore) [best, bestScore] = [intent, score];
  }
  return best;
}
