"use client";

import { useActionState, useState } from "react";
import { saveTemplateAction, setTemplateActiveAction } from "@/app/admin/gestion-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type TemplateRow = { id: string; name: string; start: string; end: string; breakMinutes: number; breakPaid: boolean; color: string; active: boolean; uses: number; label: string };

/** Formulario compacto de plantilla de turno (crear o editar). */
export function TemplateForm({ template, onDone }: { template?: TemplateRow; onDone?: () => void }) {
  const [state, action] = useActionState(async (s: Parameters<typeof saveTemplateAction>[1], fd: FormData) => {
    const r = await saveTemplateAction(template?.id ?? null, s, fd);
    if (r?.ok) onDone?.();
    return r;
  }, null);
  const err = state?.fieldErrors ?? {};
  const v = state?.ok === false && state.data ? state.data : template ? { ...template, breakMinutes: String(template.breakMinutes) } : { start: "08:00", end: "17:00", breakMinutes: "60", color: "blue" };
  return (
    <form action={action} className="grid gap-3 rounded-lg border border-border p-3" noValidate>
      <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
        <label className="grid gap-1 text-xs text-fg-muted">Nombre<Input name="name" defaultValue={v.name as string} placeholder="Diurno 8–5" aria-invalid={!!err.name || undefined} /></label>
        <label className="grid gap-1 text-xs text-fg-muted">Inicio<Input name="start" type="time" defaultValue={v.start as string} /></label>
        <label className="grid gap-1 text-xs text-fg-muted">Fin<Input name="end" type="time" defaultValue={v.end as string} /></label>
        <label className="grid gap-1 text-xs text-fg-muted">Descanso (min)<Input name="breakMinutes" inputMode="numeric" defaultValue={v.breakMinutes as string} aria-invalid={!!err.breakMinutes || undefined} /></label>
        <label className="grid gap-1 text-xs text-fg-muted">Color
          <Select name="color" defaultValue={v.color as string}>
            {["blue", "violet", "amber", "indigo", "teal", "rose"].map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="breakPaid" defaultChecked={template?.breakPaid} className="size-4 accent-[var(--primary)]" /> Descanso pagado</label>
      <FormAlert message={state?.ok ? undefined : (err.name ?? err.breakMinutes ?? err.start ?? err.end ?? state?.message)} />
      <div className="flex justify-end gap-2">
        {onDone && <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancelar</Button>}
        <SubmitButton size="sm">{template ? "Guardar" : "Crear plantilla"}</SubmitButton>
      </div>
    </form>
  );
}

export function TemplateList({ templates }: { templates: TemplateRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <div className="grid gap-2">
      {templates.map((t) =>
        editing === t.id ? (
          <TemplateForm key={t.id} template={t} onDone={() => setEditing(null)} />
        ) : (
          <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <span className={`font-medium ${t.active ? "" : "text-fg-subtle line-through"}`}>{t.name}</span>
            <span className="tabular text-fg-muted">{t.label}</span>
            <span className="text-xs text-fg-subtle">· descanso {t.breakMinutes} min{t.breakPaid ? " (pagado)" : ""} · usado en {t.uses} días de horario</span>
            {!t.active && <Badge>Inactiva</Badge>}
            <span className="ml-auto flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(t.id)}>Editar</Button>
              <ToggleActive id={t.id} active={t.active} />
            </span>
          </div>
        ),
      )}
      {creating ? <TemplateForm onDone={() => setCreating(false)} /> : <Button variant="secondary" size="sm" className="justify-self-start" onClick={() => setCreating(true)}>Nueva plantilla</Button>}
    </div>
  );
}

function ToggleActive({ id, active }: { id: string; active: boolean }) {
  const [, action] = useActionState(setTemplateActiveAction.bind(null, id, !active), null);
  return (
    <form action={action}>
      <SubmitButton size="sm" variant="ghost">{active ? "Desactivar" : "Activar"}</SubmitButton>
    </form>
  );
}
