"use client";

import { CheckCircle2, CircleAlert, ExternalLink, KeyRound, Plug, Unplug } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { removeIntegrationAction, saveIntegrationAction, testIntegrationAction } from "@/app/integration-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import type { IntegrationProvider } from "@/lib/integration-catalog";
import type { ActionState } from "@/server/errors";

export type IntegrationState = {
  connected: boolean;
  status: "UNTESTED" | "CONNECTED" | "ERROR" | null;
  config: Record<string, string>;
  savedSecrets: string[];
  lastError: string | null;
  testedAt: string | null;
};

const STATUS = {
  CONNECTED: <Badge tone="success" dot>Conectada</Badge>,
  ERROR: <Badge tone="danger" dot>Con error</Badge>,
  UNTESTED: <Badge tone="warning" dot>Sin probar</Badge>,
};
const when = (iso: string) => new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }).format(new Date(iso));

/**
 * Una integración: formulario (los secretos nunca se muestran; un campo vacío
 * conserva el guardado), probar conexión y desconectar.
 */
export function IntegrationCard({ scope, provider: p, state, disabled }: { scope: "company" | "platform"; provider: IntegrationProvider; state: IntegrationState; disabled?: boolean }) {
  const [saveState, save] = useActionState(saveIntegrationAction.bind(null, scope, p.id), null);
  const [result, setResult] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  const err = saveState?.fieldErrors ?? {};
  const message = result ?? saveState;
  const id = (k: string) => `${p.id}-${k}`;

  return (
    <Card className="p-5" role="region" aria-labelledby={id("title")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={id("title")} className="flex items-center gap-2 font-semibold">
            <Plug className="size-4 text-primary" aria-hidden /> {p.name}
          </h3>
          <p className="mt-1 text-sm text-fg-muted">{p.description}</p>
        </div>
        {state.status ? STATUS[state.status] : <Badge>Sin conectar</Badge>}
      </div>

      <details className="mt-3 rounded-lg bg-bg-subtle px-4 py-2 text-sm text-fg-muted">
        <summary className="cursor-pointer font-medium text-fg">¿Dónde consigo estos datos?</summary>
        <ol className="mt-2 grid list-decimal gap-1 pl-5">
          {p.howTo.map((h) => <li key={h}>{h}</li>)}
        </ol>
        <a href={p.docsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:underline">
          Documentación oficial <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </details>

      <form action={save} className="mt-4 grid gap-4" autoComplete="off" onSubmit={() => setResult(null)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {p.fields.map((f) => {
            const saved = f.secret && state.savedSecrets.includes(f.key);
            return (
              <Field key={f.key} id={id(f.key)} label={`${f.label}${f.optional && !f.label.includes("opcional") ? " (opcional)" : ""}`} hint={f.help} error={err[f.key]}>
                <div className="relative">
                  {f.secret && <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />}
                  <Input
                    id={id(f.key)}
                    name={f.key}
                    type={f.secret ? "password" : "text"}
                    autoComplete={f.secret ? "new-password" : "off"}
                    spellCheck={false}
                    defaultValue={f.secret ? "" : (state.config[f.key] ?? "")}
                    placeholder={saved ? "Guardado · escribe solo para reemplazarlo" : f.placeholder}
                    aria-invalid={!!err[f.key] || undefined}
                    className={f.secret ? "pl-9" : undefined}
                    disabled={disabled}
                  />
                </div>
              </Field>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton pendingText="Guardando…" disabled={disabled}>Guardar</SubmitButton>
          <Button
            type="button"
            variant="secondary"
            disabled={!state.connected || pending || disabled}
            loading={pending}
            onClick={() => start(async () => setResult(await testIntegrationAction(scope, p.id)))}
          >
            Probar conexión
          </Button>
          {state.connected && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                if (!confirm(`¿Desconectar ${p.name}? Se borran los datos y tokens guardados.`)) return;
                start(async () => setResult(await removeIntegrationAction(scope, p.id)));
              }}
            >
              <Unplug aria-hidden /> Desconectar
            </Button>
          )}
        </div>
        <FormAlert message={message?.message} tone={message?.ok ? "success" : "danger"} />
      </form>

      {state.testedAt && (
        <p className="mt-3 flex items-start gap-2 text-xs text-fg-muted">
          {state.status === "CONNECTED" ? <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden /> : <CircleAlert className="size-4 shrink-0 text-danger" aria-hidden />}
          <span>
            Última prueba: {when(state.testedAt)}
            {state.lastError ? ` · ${state.lastError}` : ""}
          </span>
        </p>
      )}
    </Card>
  );
}
