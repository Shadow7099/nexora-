"use client";

import { Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { setPatternAction } from "@/app/admin/gestion-actions";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ActionState } from "@/server/errors";

type Opt = { id: string; name: string };
type Slot = { templateId: string; siteId: string };
const WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/** Editor del horario base: ciclo de 7 o 14 días, varios turnos por día (partido) y fecha de inicio. */
export function PatternEditor({
  employeeId,
  templates,
  sites,
  defaultSiteId,
  initial,
  defaultFrom,
}: {
  employeeId: string;
  templates: (Opt & { label: string })[];
  sites: Opt[];
  defaultSiteId: string;
  initial: { cycleDays: 7 | 14; days: { dayIndex: number; templateId: string; siteId: string }[] } | null;
  defaultFrom: string;
}) {
  const [cycle, setCycle] = useState<7 | 14>(initial?.cycleDays ?? 7);
  const [from, setFrom] = useState(defaultFrom);
  const [slots, setSlots] = useState<Slot[][]>(() => {
    const out: Slot[][] = Array.from({ length: 14 }, () => []);
    for (const d of initial?.days ?? []) out[d.dayIndex]?.push({ templateId: d.templateId, siteId: d.siteId });
    return out;
  });
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();

  const update = (day: number, i: number, patch: Partial<Slot>) =>
    setSlots((s) => s.map((list, d) => (d === day ? list.map((slot, j) => (j === i ? { ...slot, ...patch } : slot)) : list)));
  const add = (day: number) => setSlots((s) => s.map((list, d) => (d === day ? [...list, { templateId: templates[0]?.id ?? "", siteId: defaultSiteId }] : list)));
  const remove = (day: number, i: number) => setSlots((s) => s.map((list, d) => (d === day ? list.filter((_, j) => j !== i) : list)));

  function save() {
    const days = slots.slice(0, cycle).flatMap((list, dayIndex) => list.map((slot) => ({ dayIndex, ...slot })));
    start(async () => setState(await setPatternAction(employeeId, { cycleDays: cycle, effectiveFrom: from, days })));
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Ciclo</span>
          <Select value={cycle} onChange={(e) => setCycle(Number(e.target.value) as 7 | 14)} className="w-56">
            <option value={7}>Semanal (7 días)</option>
            <option value={14}>Rotativo (14 días)</option>
          </Select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Aplica desde</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        </label>
        <p className="max-w-sm text-xs text-fg-subtle">El horario anterior sigue valiendo hasta el día antes. Lo ya trabajado no cambia.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {Array.from({ length: cycle }, (_, day) => (
          <div key={day} className="rounded-lg border border-border p-2">
            <p className="mb-2 text-xs font-medium text-fg-muted">
              {WEEK[day % 7]}
              {cycle === 14 && <span className="text-fg-subtle"> · sem. {day < 7 ? 1 : 2}</span>}
            </p>
            {slots[day]!.length === 0 && <p className="mb-2 text-xs text-fg-subtle">Descanso</p>}
            <div className="grid gap-2">
              {slots[day]!.map((slot, i) => (
                <div key={i} className="grid gap-1 rounded-md bg-bg-subtle p-1.5">
                  <div className="flex items-center gap-1">
                    <Select aria-label={`Turno ${WEEK[day % 7]}`} value={slot.templateId} onChange={(e) => update(day, i, { templateId: e.target.value })} className="h-8 text-xs">
                      {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                    <button type="button" onClick={() => remove(day, i)} className="grid size-7 shrink-0 place-items-center rounded text-fg-subtle hover:text-danger" aria-label="Quitar turno"><X className="size-3.5" /></button>
                  </div>
                  <Select aria-label={`Sede ${WEEK[day % 7]}`} value={slot.siteId} onChange={(e) => update(day, i, { siteId: e.target.value })} className="h-8 text-xs">
                    {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => add(day)} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline" aria-label={`Agregar turno el ${WEEK[day % 7]}`}>
              <Plus className="size-3" /> {slots[day]!.length === 0 ? "Turno" : "Turno partido"}
            </button>
          </div>
        ))}
      </div>

      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
      <Button onClick={save} loading={pending} className="justify-self-end">Guardar horario</Button>
    </div>
  );
}
