"use client";

import { Pause, Play, RefreshCw, Send, Sparkles, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import {
  answerGapAction, createTemplateAction, deleteTemplateAction, pauseAiAction, reanalyzeAction, saveAiConfigAction, sendReplyAction, sendTemplateAction, submitTemplateAction, syncTemplatesAction,
} from "@/app/admin/crm/mensajes/actions";
import { Button } from "@/components/ui/button";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/server/errors";

const textareaClass = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg shadow-card placeholder:text-fg-subtle focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none";
const submitWith = (dispatch: (fd: FormData) => void) => (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  startTransition(() => dispatch(fd));
};

/** Recarga la bandeja cada pocos segundos mientras la pestaña está visible (mensajes nuevos). */
export function AutoRefresh({ seconds = 8 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}

/** Baja al último mensaje al abrir la conversación o cuando llega uno nuevo. */
export function ScrollToEnd({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // Con llaves: en Chromium reciente scrollIntoView devuelve una promesa y React la tomaría como limpieza.
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [count]);
  return <div ref={ref} />;
}

/** Cuadro para escribir. «Usar respuesta» de la IA lo llena; Enter envía (Mayús+Enter: nueva línea). */
export function Composer({ conversationId, suggestion }: { conversationId: string; suggestion: string | null }) {
  const [state, dispatch, pending] = useActionState(sendReplyAction.bind(null, conversationId), null);
  const [text, setText] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  // Tras enviar: se limpia si salió bien; con error se conserva lo escrito.
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) setText("");
    else if (state?.data?.text) setText(state.data.text);
  }
  return (
    <form ref={formRef} onSubmit={submitWith(dispatch)} className="grid gap-2" aria-label="Responder">
      {suggestion && (
        <Button type="button" variant="secondary" size="sm" className="justify-self-start" onClick={() => setText(suggestion)}>
          <Sparkles aria-hidden /> Usar la respuesta de la IA
        </Button>
      )}
      <div className="flex items-end gap-2">
        <label htmlFor={`reply-${conversationId}`} className="sr-only">Escribe tu respuesta</label>
        <textarea
          id={`reply-${conversationId}`}
          name="text"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) formRef.current?.requestSubmit();
            }
          }}
          placeholder="Escribe tu respuesta…"
          className={cn(textareaClass, "max-h-40 min-h-11 flex-1 resize-y")}
        />
        <Button type="submit" size="icon" className="size-11" loading={pending} disabled={!text.trim()} aria-label="Enviar"><Send /></Button>
      </div>
      {state?.message && !state.ok && <p role="alert" className="text-xs text-danger">{state.message}</p>}
    </form>
  );
}

/** Acciones del panel de la IA en una conversación: volver a analizar, pausar o reactivar. */
export function AiPanelActions({ conversationId, paused }: { conversationId: string; paused: boolean }) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, setPending] = useState(false);
  const run = (fn: () => Promise<ActionState>) => {
    setPending(true);
    startTransition(async () => {
      setState(await fn());
      setPending(false);
    });
  };
  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="ghost" loading={pending} onClick={() => run(() => reanalyzeAction(conversationId))}><RefreshCw aria-hidden /> Volver a analizar</Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => run(() => pauseAiAction(conversationId, !paused))}>
          {paused ? <><Play aria-hidden /> Reactivar la IA en este chat</> : <><Pause aria-hidden /> Pausar la IA en este chat</>}
        </Button>
      </div>
      {state?.message && <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-xs text-success" : "text-xs text-danger"}>{state.message}</p>}
    </div>
  );
}

/** Retomar un chat con una plantilla aprobada (fuera de la ventana de 24 h). */
export function TemplateSender({ conversationId, templates, customerFirstName }: { conversationId: string; templates: { id: string; name: string; body: string; variables: number }[]; customerFirstName: string }) {
  const [state, dispatch, pending] = useActionState(sendTemplateAction.bind(null, conversationId), null);
  const [id, setId] = useState(templates[0]?.id ?? "");
  const t = templates.find((x) => x.id === id);
  if (templates.length === 0) return <p className="text-sm text-fg-muted">No tienes plantillas aprobadas. Créalas en la pestaña <strong>Plantillas</strong> y envíalas a Meta.</p>;
  return (
    <form onSubmit={submitWith(dispatch)} className="grid gap-2" aria-label="Enviar plantilla">
      <Field id={`tpl-${conversationId}`} label="Plantilla aprobada">
        <Select id={`tpl-${conversationId}`} name="templateId" value={id} onChange={(e) => setId(e.target.value)}>
          {templates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </Select>
      </Field>
      {t && <p className="rounded-lg bg-bg-subtle px-3 py-2 text-xs whitespace-pre-line text-fg-muted">{t.body}</p>}
      {t && Array.from({ length: t.variables }, (_, i) => (
        <Field key={`${t.id}-${i}`} id={`tpl-var-${i}`} label={`Variable {{${i + 1}}}`}>
          <Input id={`tpl-var-${i}`} name="params" defaultValue={i === 0 ? customerFirstName : ""} />
        </Field>
      ))}
      <SubmitButton loading={pending} variant="secondary" className="justify-self-start"><Send aria-hidden /> Enviar plantilla</SubmitButton>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
    </form>
  );
}

/** Configuración de la IA: activar, modo y lo que sabe del negocio. */
export function AiConfigForm({ values, claudeConnected }: { values: { enabled: boolean; mode: string; knowledge: string; instructions: string; escalation: string }; claudeConnected: boolean }) {
  const [state, dispatch, pending] = useActionState(saveAiConfigAction, null);
  const err = state?.fieldErrors ?? {};
  const v = state?.ok === false && state.data ? { ...values, ...state.data, enabled: state.data.enabled === "on" } : values;
  return (
    <form onSubmit={submitWith(dispatch)} className="grid gap-4" noValidate>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={v.enabled} className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" disabled={!claudeConnected && !v.enabled} />
        <span><span className="font-medium">Activar la IA de mensajes</span><span className="block text-fg-muted">Lee cada mensaje nuevo, lo etiqueta, lo resume y prepara la respuesta. {claudeConnected ? "" : "Primero guarda tu llave de Claude en Integraciones."}</span></span>
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">¿Qué hace con la respuesta?</legend>
        <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
          <input type="radio" name="mode" value="SUGGEST" defaultChecked={v.mode !== "AUTO"} className="mt-0.5 accent-[var(--primary)]" />
          <span><span className="font-medium">Sugerir</span><span className="block text-fg-muted">Deja la respuesta lista y una persona la revisa y la envía.</span></span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
          <input type="radio" name="mode" value="AUTO" defaultChecked={v.mode === "AUTO"} className="mt-0.5 accent-[var(--primary)]" />
          <span><span className="font-medium">Responder sola</span><span className="block text-fg-muted">Envía la respuesta al instante, salvo reclamos, pagos, excepciones o cuando el cliente pide una persona: esos chats quedan marcados para el equipo. Se puede pausar por chat.</span></span>
        </label>
      </fieldset>
      <Field id="ai-knowledge" label="Lo que la IA sabe de tu negocio" hint="Horarios, precios que no están en el inventario, domicilios, medios de pago, políticas, preguntas frecuentes… Tus productos, precios y sedes los toma solos de Nexora." error={err.knowledge}>
        <textarea id="ai-knowledge" name="knowledge" rows={8} defaultValue={v.knowledge} className={textareaClass} placeholder={"Ej.:\n- Domicilios en Villavicencio: $5.000, de 7 a. m. a 7 p. m.\n- Pagos: efectivo, Nequi y tarjeta.\n- Pedidos de tortas: con 2 días de anticipación."} />
      </Field>
      <Field id="ai-instructions" label="Cómo debe responder (opcional)" hint="Tono, qué debe buscar (cerrar el pedido, agendar una visita), cómo despedirse…" error={err.instructions}>
        <textarea id="ai-instructions" name="instructions" rows={3} defaultValue={v.instructions} className={textareaClass} />
      </Field>
      <Field id="ai-escalation" label="Cuándo pasar el chat a una persona (opcional)" hint="Además de las reglas fijas: reclamos, pagos, excepciones o cuando el cliente pide una persona." error={err.escalation}>
        <textarea id="ai-escalation" name="escalation" rows={3} defaultValue={v.escalation} className={textareaClass} placeholder="Ej.: pedidos de más de $500.000 o empresas que piden factura a crédito." />
      </Field>
      <SubmitButton loading={pending} className="justify-self-start">Guardar</SubmitButton>
    </form>
  );
}

/** Un dato que le falta a la IA: responderlo se lo enseña (o «No aplica»). */
export function GapItem({ id, missing, question, count }: { id: string; missing: string; question: string | null; count: number }) {
  const [answer, dispatchAnswer, p1] = useActionState(answerGapAction.bind(null, id, false), null);
  const [dismiss, dispatchDismiss, p2] = useActionState(answerGapAction.bind(null, id, true), null);
  const done = answer?.ok || dismiss?.ok;
  if (done) return <li className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success" role="status">{(answer ?? dismiss)?.message}</li>;
  return (
    <li className="grid gap-2 rounded-lg border border-warning/40 p-3 text-sm">
      <p className="flex flex-wrap justify-between gap-2"><strong>{missing}</strong><span className="text-xs text-warning">{count} {count === 1 ? "vez" : "veces"}</span></p>
      {question && <p className="text-xs text-fg-muted">Lo que preguntó el cliente: «{question}»</p>}
      <form onSubmit={submitWith(dispatchAnswer)} className="grid gap-2">
        <label htmlFor={`gap-${id}`} className="sr-only">Respuesta para la IA</label>
        <textarea id={`gap-${id}`} name="answer" rows={2} className={textareaClass} placeholder="Escribe la respuesta tal como quieres que la IA la sepa" />
        <div className="flex flex-wrap gap-2">
          <SubmitButton size="sm" loading={p1}>Enseñar a la IA</SubmitButton>
          <Button type="button" size="sm" variant="ghost" loading={p2} onClick={() => startTransition(() => dispatchDismiss(new FormData()))}>No aplica</Button>
        </div>
      </form>
      {(answer?.message || dismiss?.message) && <p role="alert" className="text-xs text-danger">{answer?.message ?? dismiss?.message}</p>}
    </li>
  );
}

/** Nueva plantilla de WhatsApp: las variables {{1}}, {{2}}… piden su ejemplo para Meta. */
export function TemplateForm() {
  const [state, dispatch, pending] = useActionState(createTemplateAction, null);
  const err = state?.fieldErrors ?? {};
  const [body, setBody] = useState(state?.data?.body ?? "");
  const vars = [...new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
  const formRef = useRef<HTMLFormElement>(null);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) setBody("");
  }
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} onSubmit={submitWith(dispatch)} className="grid gap-4" noValidate>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="tpl-name" label="Nombre" hint="Minúsculas y guion bajo: retomar_pedido" error={err.name}>
          <Input id="tpl-name" name="name" defaultValue={state?.data?.name} spellCheck={false} />
        </Field>
        <Field id="tpl-category" label="Categoría" error={err.category}>
          <Select id="tpl-category" name="category" defaultValue={state?.data?.category ?? "UTILITY"}>
            <option value="UTILITY">Utilidad (recordatorios, pedidos)</option>
            <option value="MARKETING">Marketing (promociones, retomar)</option>
          </Select>
        </Field>
        <Field id="tpl-language" label="Idioma">
          <Select id="tpl-language" name="language" defaultValue={state?.data?.language ?? "es"}>
            <option value="es">Español</option>
            <option value="es_CO">Español (Colombia)</option>
            <option value="en_US">Inglés</option>
          </Select>
        </Field>
      </div>
      <Field id="tpl-body" label="Mensaje" hint="Usa {{1}}, {{2}}… para lo que cambia (nombre, producto, fecha). No empieces ni termines con una variable." error={err.body}>
        <textarea id="tpl-body" name="body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} className={textareaClass} placeholder="Hola {{1}} 👋 ¿Seguimos con tu pedido de {{2}}? Responde este mensaje y te ayudamos." />
      </Field>
      {vars.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {vars.map((n) => (
            <Field key={n} id={`tpl-ex-${n}`} label={`Ejemplo para {{${n}}}`} error={n === 1 ? err.examples : undefined}>
              <Input id={`tpl-ex-${n}`} name="examples" placeholder={n === 1 ? "Ana" : "tortas"} />
            </Field>
          ))}
        </div>
      )}
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Botones de respuesta rápida (opcional, máximo 3)</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <Input key={i} name="buttons" aria-label={`Botón ${i + 1}`} placeholder={["Sí, quiero", "Más tarde", "No me interesa"][i]} maxLength={25} />)}
        </div>
        {err.buttons && <p className="text-xs text-danger" role="alert">{err.buttons}</p>}
      </fieldset>
      <SubmitButton loading={pending} className="justify-self-start">Guardar borrador</SubmitButton>
    </form>
  );
}

/** Enviar a Meta / borrar una plantilla, y sincronizar todas. */
export function TemplateActions({ id, canSubmit, canDelete }: { id: string; canSubmit: boolean; canDelete: boolean }) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, setPending] = useState(false);
  const run = (fn: () => Promise<ActionState>) => {
    setPending(true);
    startTransition(async () => {
      setState(await fn());
      setPending(false);
    });
  };
  return (
    <div className="grid justify-items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {canSubmit && <Button size="sm" loading={pending} onClick={() => run(() => submitTemplateAction(id))}><Upload aria-hidden /> Enviar a Meta</Button>}
        {canDelete && <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirm("¿Borrar esta plantilla?") && run(() => deleteTemplateAction(id))} aria-label="Borrar plantilla"><Trash2 /></Button>}
      </div>
      {state?.message && <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-xs text-success" : "text-xs text-danger"}>{state.message}</p>}
    </div>
  );
}

export function SyncTemplatesButton() {
  const [state, setState] = useState<ActionState>(null);
  const [pending, setPending] = useState(false);
  return (
    <div className="grid gap-1">
      <Button variant="secondary" loading={pending} onClick={() => { setPending(true); startTransition(async () => { setState(await syncTemplatesAction()); setPending(false); }); }}>
        <RefreshCw aria-hidden /> Sincronizar con Meta
      </Button>
      {state?.message && <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-xs text-success" : "text-xs text-danger"}>{state.message}</p>}
    </div>
  );
}
