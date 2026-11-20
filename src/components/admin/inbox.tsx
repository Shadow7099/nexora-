"use client";

import { CalendarCheck, CalendarPlus, Check, EyeOff, FlaskConical, History, Lock, Pause, Play, RefreshCw, Send, Sparkles, Trash2, Undo2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import {
  appointmentStatusAction, autoLearnAction, bookAction, bookingConfigAction, learnNowAction, offerDaysAction, revertVersionAction,
  autoReplyAction, clearDemoAction, ignoreCommentAction, loadDemoAction, replyCommentAction, resolveHumanAction, simulateCustomerAction, suggestCommentAction,
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
        {paused && <span className="self-center text-xs text-warning">La IA no responde sola en este chat.</span>}
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

/** Ejecuta una acción del servidor y muestra su resultado debajo del botón. */
function useRun() {
  const [state, setState] = useState<ActionState>(null);
  const [pending, setPending] = useState(false);
  const run = (fn: () => Promise<ActionState>) => {
    setPending(true);
    startTransition(async () => {
      setState(await fn());
      setPending(false);
    });
  };
  return { state, pending, run };
}
const Result = ({ state }: { state: ActionState }) =>
  state?.message ? <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-xs text-success" : "text-xs text-danger"}>{state.message}</p> : null;

/** Interruptor general (como en Ámbar): la IA responde sola o solo sugiere. */
export function AutoReplyToggle({ on, claudeConnected }: { on: boolean; claudeConnected: boolean }) {
  const { state, pending, run } = useRun();
  return (
    <div className={cn("grid gap-2 rounded-xl border p-3 text-sm sm:flex sm:items-center sm:justify-between", on ? "border-success/40 bg-success-soft/50" : "border-border bg-surface")}>
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-medium"><Sparkles className="size-4 text-accent" aria-hidden /> Respuesta automática de la IA: <span className={on ? "text-success" : "text-fg-muted"}>{on ? "ENCENDIDA" : "APAGADA"}</span></p>
        <p className="mt-0.5 text-xs text-fg-muted">
          {on ? "La IA contesta sola los chats activos. Nunca responde sola los que piden una persona ni los que pausaste." : "La IA solo deja la respuesta sugerida; una persona la revisa y la envía."}
          {!claudeConnected && " Sin llave de Claude, la IA solo trabaja en los chats de demostración."}
        </p>
        <Result state={state} />
      </div>
      <Button size="sm" variant={on ? "secondary" : "primary"} loading={pending} onClick={() => (!on && !confirm("¿Encender la respuesta automática? La IA contestará sola en los chats que no estén en pausa.") ? undefined : run(() => autoReplyAction(!on)))}>
        {on ? "Apagar" : "Encender"}
      </Button>
    </div>
  );
}

/** En el encabezado del chat: «IA activa · Pausar» / «IA pausada · Reactivar». */
export function ChatAiToggle({ conversationId, paused }: { conversationId: string; paused: boolean }) {
  const { state, pending, run } = useRun();
  return (
    <div className="grid justify-items-end gap-1">
      <Button size="sm" variant={paused ? "secondary" : "primary"} loading={pending} onClick={() => run(() => pauseAiAction(conversationId, !paused))} title={paused ? "La IA no contesta sola en este chat" : "La IA contesta en este chat"}>
        {paused ? <><Play aria-hidden /> IA pausada · Reactivar</> : <><Pause aria-hidden /> IA activa · Pausar</>}
      </Button>
      <Result state={state} />
    </div>
  );
}

export function ResolveButton({ conversationId }: { conversationId: string }) {
  const { state, pending, run } = useRun();
  return (
    <span className="grid gap-1">
      <Button size="sm" loading={pending} onClick={() => run(() => resolveHumanAction(conversationId))}><Check aria-hidden /> Marcar resuelto</Button>
      <Result state={state} />
    </span>
  );
}

/** Cargar o borrar la demostración (chats, anuncios, comentarios e IA) para mostrar el CRM sin conectar nada. */
export function DemoControls({ hasDemo, compact = false }: { hasDemo: boolean; compact?: boolean }) {
  const { state, pending, run } = useRun();
  return (
    <div className={cn("grid gap-2", !compact && "justify-items-center text-center")}>
      <div className="flex flex-wrap gap-2">
        <Button size={compact ? "sm" : "md"} variant={hasDemo ? "secondary" : "primary"} loading={pending} onClick={() => run(loadDemoAction)}>
          <FlaskConical aria-hidden /> {hasDemo ? "Reiniciar demostración" : "Ver demostración"}
        </Button>
        {hasDemo && <Button size={compact ? "sm" : "md"} variant="ghost" disabled={pending} onClick={() => confirm("¿Borrar todos los chats y comentarios de demostración?") && run(clearDemoAction)}><Trash2 aria-hidden /> Borrar demostración</Button>}
      </div>
      <Result state={state} />
    </div>
  );
}

/** Solo en chats de demostración: escribir como el cliente para ver a la IA trabajar. */
export function SimulateCustomer({ conversationId }: { conversationId: string }) {
  const [state, dispatch, pending] = useActionState(simulateCustomerAction.bind(null, conversationId), null);
  const [text, setText] = useState("");
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) setText("");
  }
  return (
    <form onSubmit={submitWith(dispatch)} className="grid gap-2 rounded-xl border border-dashed border-accent/50 bg-accent-soft/30 p-3" aria-label="Demostración: escribir como el cliente">
      <p className="flex items-center gap-2 text-xs font-medium text-accent"><FlaskConical className="size-3.5" aria-hidden /> Demostración: escribe como si fueras el cliente</p>
      <div className="flex flex-wrap items-end gap-2">
        <label htmlFor={`sim-${conversationId}`} className="sr-only">Mensaje del cliente</label>
        <input id={`sim-${conversationId}`} name="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej.: ¿Cuánto vale el domicilio?" className={cn(textareaClass, "h-10 min-w-0 flex-1 basis-48")} />
        <SubmitButton size="sm" variant="secondary" loading={pending}>Enviar como cliente</SubmitButton>
      </div>
      <Result state={state} />
    </form>
  );
}

const TYPE_TONE: Record<string, string> = { interes: "text-success", elogio: "text-accent", negativo: "text-danger", otro: "text-fg-muted" };

/** Comentario de Facebook o Instagram con la respuesta sugerida por la IA. */
export function CommentCard({ c, typeLabel, canPrivate }: {
  c: { id: string; channel: string; authorName: string | null; body: string; postText: string | null; postUrl: string | null; at: string; status: string; aiType: string | null; aiSuggestion: string | null; aiPrivate: string | null; aiError: string | null; reply: string | null; demo: boolean };
  typeLabel: string | null; canPrivate: boolean;
}) {
  const [pub, dispatchPub, p1] = useActionState(replyCommentAction.bind(null, c.id, "publico"), null);
  const [priv, dispatchPriv, p2] = useActionState(replyCommentAction.bind(null, c.id, "privado"), null);
  const { state, pending, run } = useRun();
  const done = pub?.ok || priv?.ok;
  return (
    <article className="grid gap-2 rounded-xl border border-border bg-surface p-4 text-sm shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", c.channel === "FACEBOOK" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent")}>{c.channel === "FACEBOOK" ? "Facebook" : "Instagram"}</span>
          {c.authorName ?? "Persona"}
          {typeLabel && <span className={cn("text-xs", TYPE_TONE[c.aiType ?? "otro"])}>● {typeLabel}</span>}
          {c.demo && <span className="text-[11px] text-fg-subtle">Demostración</span>}
        </p>
        <span className="text-xs text-fg-subtle">{c.at}</span>
      </header>
      <p className="whitespace-pre-line">{c.body}</p>
      {(c.postText || c.postUrl) && <p className="text-xs text-fg-muted">En la publicación: {c.postText ? `«${c.postText.slice(0, 120)}»` : ""} {c.postUrl && <a href={c.postUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Ver publicación</a>}</p>}
      {c.status !== "PENDING" || done ? (
        <p className="rounded-lg bg-success-soft px-3 py-2 text-success" role="status">{done ? (pub ?? priv)?.message : c.status === "IGNORED" ? "Descartado." : `Respuesta: ${c.reply}`}</p>
      ) : (
        <>
          {c.aiError && <p className="text-xs text-warning">{c.aiError}</p>}
          <form onSubmit={submitWith(dispatchPub)} className="grid gap-1">
            <label htmlFor={`pub-${c.id}`} className="text-xs font-medium text-fg-muted">Respuesta pública <Sparkles className="inline size-3 text-accent" aria-label="sugerida por la IA" /></label>
            <textarea id={`pub-${c.id}`} name="text" rows={2} defaultValue={pub?.data?.text ?? c.aiSuggestion ?? ""} key={`pub-${c.aiSuggestion}`} className={textareaClass} />
            <SubmitButton size="sm" loading={p1} className="justify-self-start"><Send aria-hidden /> Responder en público</SubmitButton>
            {pub && !pub.ok && <p role="alert" className="text-xs text-danger">{pub.message}</p>}
          </form>
          <form onSubmit={submitWith(dispatchPriv)} className="grid gap-1">
            <label htmlFor={`priv-${c.id}`} className="text-xs font-medium text-fg-muted">Mensaje privado (abre el chat en Chats)</label>
            <textarea id={`priv-${c.id}`} name="text" rows={2} defaultValue={priv?.data?.text ?? c.aiPrivate ?? ""} key={`priv-${c.aiPrivate}`} placeholder="Opcional: primer mensaje directo a la persona" className={textareaClass} />
            <SubmitButton size="sm" variant="secondary" loading={p2} disabled={!canPrivate} className="justify-self-start" title={canPrivate ? undefined : "Pasaron más de 7 días: Meta ya no deja escribirle por privado."}><Lock aria-hidden /> Responder por privado</SubmitButton>
            {priv && !priv.ok && <p role="alert" className="text-xs text-danger">{priv.message}</p>}
          </form>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" loading={pending} onClick={() => run(() => suggestCommentAction(c.id))}><Sparkles aria-hidden /> Sugerir con IA</Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => ignoreCommentAction(c.id))}><EyeOff aria-hidden /> No responder</Button>
          </div>
          <Result state={state} />
        </>
      )}
    </article>
  );
}



/**
 * Botones que se enviaron con un mensaje (días u horas de la agenda). En los
 * chats de demostración se pueden tocar como si fueras el cliente.
 */
export function MessageButtons({ conversationId, buttons, demo }: { conversationId: string; buttons: { id: string; title: string }[]; demo: boolean }) {
  const [state, dispatch, pending] = useActionState(simulateCustomerAction.bind(null, conversationId), null);
  return (
    <span className="mt-2 grid gap-1">
      {buttons.map((b) => demo ? (
        <form key={b.id} onSubmit={submitWith(dispatch)}>
          <input type="hidden" name="text" value={b.title} />
          <input type="hidden" name="action" value={b.id} />
          <button type="submit" disabled={pending} className="w-full rounded-lg bg-surface/95 px-3 py-1.5 text-center text-xs font-medium text-primary shadow-card hover:bg-surface disabled:opacity-60" title="Demostración: tócalo como si fueras el cliente">{b.title}</button>
        </form>
      ) : (
        <span key={b.id} className="rounded-lg bg-surface/90 px-3 py-1.5 text-center text-xs font-medium text-primary">{b.title}</span>
      ))}
      {state && !state.ok && <span role="alert" className="text-[11px] text-danger">{state.message}</span>}
    </span>
  );
}

/** Agendar desde el chat: ofrecer horarios con botones (el cliente elige) o agendar uno directamente. */
export function BookingPanel({ conversationId, options, siteName, canReply, next }: { conversationId: string; options: { value: string; label: string }[]; siteName: string | null; canReply: boolean; next: string | null }) {
  const { state, pending, run } = useRun();
  const [book, dispatchBook, booking] = useActionState(bookAction.bind(null, conversationId), null);
  return (
    <details className="group rounded-xl border border-border bg-surface p-3 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
        <CalendarPlus className="size-4 text-primary" aria-hidden /> Agendar cita{siteName ? ` · ${siteName}` : ""}
        {next && <span className="ml-auto rounded-full bg-success-soft px-2 py-0.5 text-[11px] text-success">Próxima: {next}</span>}
      </summary>
      <div className="mt-3 grid gap-3">
        <div className="grid gap-1">
          <Button size="sm" variant="secondary" className="justify-self-start" loading={pending} disabled={!canReply} onClick={() => run(() => offerDaysAction(conversationId))}><CalendarCheck aria-hidden /> Enviar horarios con botones</Button>
          <p className="text-xs text-fg-muted">{canReply ? "El cliente toca el día y luego la hora; la cita queda creada sola." : "La ventana de 24 h está cerrada: agenda directamente abajo."}</p>
          <Result state={state} />
        </div>
        <form onSubmit={submitWith(dispatchBook)} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Field id={`slot-${conversationId}`} label="O agéndala tú">
            <Select id={`slot-${conversationId}`} name="startsAt" defaultValue="">
              <option value="" disabled>Elige un horario libre</option>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
          <SubmitButton size="sm" loading={booking} disabled={!options.length}>Agendar</SubmitButton>
          <FormAlert message={book?.message} tone={book?.ok ? "success" : "danger"} />
        </form>
      </div>
    </details>
  );
}

export function AppointmentActions({ id, status }: { id: string; status: string }) {
  const { state, pending, run } = useRun();
  const next: [string, string][] = status === "BOOKED" ? [["CONFIRMED", "Confirmar"], ["ATTENDED", "Asistió"], ["NO_SHOW", "No asistió"], ["CANCELLED", "Cancelar"]]
    : status === "CONFIRMED" ? [["ATTENDED", "Asistió"], ["NO_SHOW", "No asistió"], ["CANCELLED", "Cancelar"]]
    : [["BOOKED", "Reabrir"]];
  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap gap-1">
        {next.map(([s, l]) => <Button key={s} size="sm" variant={s === "ATTENDED" || s === "CONFIRMED" ? "secondary" : "ghost"} disabled={pending} onClick={() => run(() => appointmentStatusAction(id, s))}>{l}</Button>)}
      </div>
      <Result state={state} />
    </div>
  );
}

/** Agenda: sede, largo de cada cita y cupos por horario. */
export function BookingConfigForm({ sites, values }: { sites: { id: string; name: string }[]; values: { enabled: boolean; siteId: string | null; slotMinutes: number; capacity: number } }) {
  const [state, dispatch, pending] = useActionState(bookingConfigAction, null);
  return (
    <form onSubmit={submitWith(dispatch)} className="grid gap-3 text-sm">
      <label className="flex items-start gap-3"><input type="checkbox" name="enabled" defaultChecked={values.enabled} className="mt-0.5 size-4 accent-[var(--primary)]" /><span><span className="font-medium">Agenda por botones en el chat</span><span className="block text-fg-muted">La IA ofrece los horarios cuando el cliente quiere una cita (con la respuesta automática) y el equipo puede enviarlos desde el chat.</span></span></label>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="bk-site" label="Sede">
          <Select id="bk-site" name="siteId" defaultValue={values.siteId ?? ""}>
            <option value="">La primera con horario</option>
            {sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </Select>
        </Field>
        <Field id="bk-min" label="Duración de cada cita (min)"><Input id="bk-min" name="slotMinutes" type="number" min={10} max={480} step={5} defaultValue={values.slotMinutes} /></Field>
        <Field id="bk-cap" label="Citas a la misma hora"><Input id="bk-cap" name="capacity" type="number" min={1} max={50} defaultValue={values.capacity} /></Field>
      </div>
      <p className="text-xs text-fg-muted">Los horarios salen del horario de atención de la sede (Sedes). Si no tiene, se usa lunes a sábado de 8 a. m. a 6 p. m.</p>
      <SubmitButton size="sm" loading={pending} className="justify-self-start">Guardar agenda</SubmitButton>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
    </form>
  );
}

type Version = { id: string; source: string; at: string; summary: string | null; changes: { seccion: string; operacion: string; antes: string; despues: string; motivo: string; aplicado?: boolean }[] };

/** Aprendizaje diario: encendido/apagado, «Analizar ahora» e historial de versiones para volver atrás. */
export function LearningPanel({ autoLearn, lastLearnAt, versions, sourceLabel, sectionLabel }: { autoLearn: boolean; lastLearnAt: string | null; versions: Version[]; sourceLabel: Record<string, string>; sectionLabel: Record<string, string> }) {
  const { state, pending, run } = useRun();
  const latest = versions.find((v) => v.source === "learn");
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 text-sm [overflow-wrap:anywhere]">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={autoLearn ? "primary" : "secondary"} disabled={pending} onClick={() => run(() => autoLearnAction(!autoLearn))}>Aprende sola: {autoLearn ? "ENCENDIDO" : "APAGADO"}</Button>
        <Button size="sm" variant="secondary" loading={pending} onClick={() => run(learnNowAction)}><Sparkles aria-hidden /> Analizar la semana ahora</Button>
      </div>
      <p className="text-fg-muted">Cada mañana (7:40 a. m.) la IA revisa los chats de los últimos 7 días: compara los que terminaron en cita o venta con los que no y ajusta sola sus conocimientos e instrucciones para responder mejor y agendar más. Cada cambio queda en el historial y puedes volver atrás.{lastLearnAt ? ` Último análisis: ${lastLearnAt}` : ""}</p>
      <Result state={state} />
      {latest?.summary && (
        <div className="grid gap-2 rounded-xl border border-accent/30 bg-accent-soft/30 p-3">
          <p className="font-medium">Último informe · {latest.at}</p>
          <p className="whitespace-pre-line">{latest.summary}</p>
          {latest.changes.length > 0 && (
            <ul className="grid gap-2">
              {latest.changes.map((c, i) => (
                <li key={i} className="rounded-lg bg-surface p-2 text-xs">
                  <strong>{sectionLabel[c.seccion] ?? c.seccion} · {c.operacion === "agregar" ? "Agregó" : c.operacion === "quitar" ? "Quitó" : "Corrigió"}</strong> {c.aplicado === false && <span className="text-fg-subtle">(no se aplicó)</span>}
                  {c.antes && <span className="block text-danger line-through">{c.antes}</span>}
                  {c.despues && <span className="block text-success">{c.despues}</span>}
                  <span className="block text-fg-muted">{c.motivo}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {versions.length > 0 && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
          <p className="flex items-center gap-2 font-medium"><History className="size-4" aria-hidden /> Historial de versiones</p>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {versions.map((v, i) => (
              <li key={v.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1"><span className="font-medium">{sourceLabel[v.source] ?? v.source}</span> <span className="text-xs text-fg-subtle">· {v.at}</span>{v.summary && <span className="block truncate text-xs text-fg-muted">{v.summary}</span>}</span>
                {i > 0 && <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirm("¿Volver a esta versión? Lo que sabe la IA quedará como estaba entonces (también se puede deshacer).") && run(() => revertVersionAction(v.id))}><Undo2 aria-hidden /> Volver a esta</Button>}
                {i === 0 && <span className="text-xs text-success">Actual</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
