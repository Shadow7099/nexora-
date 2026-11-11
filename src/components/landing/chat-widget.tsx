"use client";

import Link from "next/link";
import { ArrowUp, MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { chatAction } from "@/app/chat-actions";
import { STARTERS, type ChatLink } from "@/lib/chat-knowledge";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; links?: ChatLink[] };

const WELCOME: Msg = {
  role: "assistant",
  content: "¡Hola! Soy el asistente de Nexora. Pregúntame por precios, cómo marcan los empleados, la pre-nómina o cómo registrarte.",
};
const MAX_CHARS = 500;

/** Asistente flotante de la página de inicio. */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [suggestions, setSuggestions] = useState<string[]>(STARTERS);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = (text: string) => {
    const content = text.trim().slice(0, MAX_CHARS);
    if (!content || pending) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError(null);
    setSuggestions([]);
    start(async () => {
      // La bienvenida es local: al servidor solo va la conversación real.
      const history = next.slice(1).map(({ role, content }) => ({ role, content }));
      const r = await chatAction(history);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: r.reply, links: r.links }]);
      setSuggestions(r.suggestions);
    });
  };

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-label="Asistente de Nexora"
          className="fixed inset-x-3 bottom-20 z-50 flex max-h-[min(640px,calc(100dvh-7rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-md animate-fade-up sm:inset-x-auto sm:right-5 sm:w-[380px]"
        >
          <header className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-primary to-accent px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Asistente de Nexora</p>
              <p className="text-xs text-white/80">Responde al instante</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              className="grid size-8 place-items-center rounded-md hover:bg-white/15"
              aria-label="Cerrar el asistente"
            >
              <X className="size-4" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite" aria-relevant="additions">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line",
                    m.role === "user" ? "rounded-br-md bg-primary text-primary-fg" : "rounded-bl-md bg-bg-subtle text-fg",
                  )}
                >
                  <span className="sr-only">{m.role === "user" ? "Tú: " : "Asistente: "}</span>
                  {m.content}
                  {m.links && m.links.length > 0 && (
                    <span className="mt-2 flex flex-wrap gap-2">
                      {m.links.map((l) => (
                        <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-primary ring-1 ring-border hover:ring-primary">
                          {l.label}
                        </Link>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {pending && (
              <div className="flex justify-start" role="status">
                <span className="rounded-2xl rounded-bl-md bg-bg-subtle px-4 py-3 text-xs text-fg-muted">
                  <span className="sr-only">El asistente está escribiendo…</span>
                  <span aria-hidden className="inline-flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-fg-subtle [animation-delay:-0.2s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-fg-subtle [animation-delay:-0.1s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-fg-subtle" />
                  </span>
                </span>
              </div>
            )}
            {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">{error}</p>}
          </div>

          {suggestions.length > 0 && !pending && (
            <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg-muted hover:border-primary hover:text-primary">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 border-t border-border p-3"
          >
            <label htmlFor="chat-input" className="sr-only">Escribe tu pregunta</label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={MAX_CHARS}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Escribe tu pregunta…"
              className="max-h-28 min-h-9 flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || pending}
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-fg disabled:opacity-40"
              aria-label="Enviar"
            >
              <ArrowUp className="size-4" />
            </button>
          </form>
        </section>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Cerrar el asistente" : "Abrir el asistente de Nexora"}
        className="fixed right-4 bottom-4 z-50 flex h-12 items-center gap-2 rounded-full bg-gradient-to-br from-primary to-accent px-4 text-sm font-medium text-white shadow-md transition-transform hover:scale-105 sm:right-5 sm:bottom-5"
      >
        {open ? <X className="size-5" aria-hidden /> : <MessageCircle className="size-5" aria-hidden />}
        <span className={cn(open && "sr-only")}>¿Preguntas?</span>
      </button>
    </>
  );
}
