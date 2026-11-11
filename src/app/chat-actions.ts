"use server";

import { answerChat, type ChatReply } from "@/server/chat";
import { getClientIp } from "@/server/current";
import { AppError } from "@/server/errors";

/** Mensaje del asistente de la página de inicio. */
export async function chatAction(history: { role: "user" | "assistant"; content: string }[]): Promise<ChatReply | { error: string }> {
  try {
    return await answerChat(history, await getClientIp());
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    console.error(e);
    return { error: "No pude responder en este momento. Intenta de nuevo o déjanos tus datos y te contactamos." };
  }
}
