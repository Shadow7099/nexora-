"use server";

import { revalidatePath } from "next/cache";
import { answerGap, reanalyze, saveAiConfig, setConversationAiPaused } from "@/server/crm-ai";
import { requireActor } from "@/server/current";
import { toActionState, type ActionState } from "@/server/errors";
import { sendReply } from "@/server/messages";
import { createTemplate, deleteTemplate, sendTemplate, submitTemplate, syncTemplates } from "@/server/wa-templates";

/** Acciones de la bandeja de mensajes. Cada una vuelve a verificar sesión y rol; la empresa sale de la sesión. */
const admin = () => requireActor({ roles: ["COMPANY_ADMIN"] });
const refresh = () => revalidatePath("/admin/crm/mensajes");

export async function sendReplyAction(conversationId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await sendReply(await admin(), conversationId, fd.get("text"));
    refresh();
    return { ok: true, message: "Enviado." };
  } catch (e) {
    return { ...toActionState(e), data: { text: String(fd.get("text") ?? "") } };
  }
}

export async function reanalyzeAction(conversationId: string): Promise<ActionState> {
  try {
    const r = await reanalyze(await admin(), conversationId);
    refresh();
    if ("skipped" in r) {
      const why: Record<string, string> = {
        no_key: "Falta la llave de Claude en Integraciones.",
        nothing_to_answer: "El último mensaje no es del cliente: no hay nada que responder.",
        refusal: "La IA no quiso responder este chat; atiéndelo una persona.",
        disabled: "La IA está apagada.",
      };
      const error = "error" in r ? r.error : undefined;
      return { ok: false, message: error ?? why[String(r.skipped)] ?? "No se pudo analizar." };
    }
    return { ok: true, message: "Análisis actualizado." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function pauseAiAction(conversationId: string, paused: boolean): Promise<ActionState> {
  try {
    await setConversationAiPaused(await admin(), conversationId, paused);
    refresh();
    return { ok: true, message: paused ? "La IA no responderá sola en este chat." : "La IA vuelve a responder en este chat." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function saveAiConfigAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const data = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
  try {
    await saveAiConfig(await admin(), data);
    refresh();
    return { ok: true, message: "Configuración de la IA guardada." };
  } catch (e) {
    return { ...toActionState(e), data };
  }
}

export async function answerGapAction(id: string, dismiss: boolean, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await answerGap(await admin(), id, fd.get("answer"), dismiss);
    refresh();
    return { ok: true, message: dismiss ? "Marcado como «no aplica»." : "La IA ya lo sabe." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function createTemplateAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const data = { name: String(fd.get("name") ?? ""), category: String(fd.get("category") ?? ""), language: String(fd.get("language") ?? "es"), body: String(fd.get("body") ?? ""), examples: fd.getAll("examples").map(String), buttons: fd.getAll("buttons").map(String).filter((b) => b.trim()) };
  try {
    await createTemplate(await admin(), data);
    refresh();
    return { ok: true, message: "Plantilla guardada como borrador. Envíala a Meta para que la aprueben." };
  } catch (e) {
    return { ...toActionState(e), data: { name: data.name, category: data.category, language: data.language, body: data.body } };
  }
}

export async function submitTemplateAction(id: string): Promise<ActionState> {
  try {
    const r = await submitTemplate(await admin(), id);
    refresh();
    return { ok: true, message: r.status === "APPROVED" ? "Meta la aprobó." : "Enviada a Meta. Suele tardar de minutos a un día; el estado se actualiza solo." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function syncTemplatesAction(): Promise<ActionState> {
  try {
    const r = await syncTemplates(await admin());
    refresh();
    return { ok: true, message: `${r.updated} plantilla(s) sincronizadas con Meta.` };
  } catch (e) {
    return toActionState(e);
  }
}

export async function deleteTemplateAction(id: string): Promise<ActionState> {
  try {
    await deleteTemplate(await admin(), id);
    refresh();
    return { ok: true, message: "Plantilla borrada." };
  } catch (e) {
    return toActionState(e);
  }
}

export async function sendTemplateAction(conversationId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await sendTemplate(await admin(), conversationId, String(fd.get("templateId") ?? ""), fd.getAll("params").map(String));
    refresh();
    return { ok: true, message: "Plantilla enviada." };
  } catch (e) {
    return toActionState(e);
  }
}
