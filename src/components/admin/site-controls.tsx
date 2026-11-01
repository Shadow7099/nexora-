"use client";

import { Power, RefreshCw } from "lucide-react";
import { useActionState } from "react";
import { rotateQrAction, setSiteActiveAction } from "@/app/admin/gestion-actions";
import { FormAlert, SubmitButton } from "@/components/ui/form";

export function SiteControls({ id, active }: { id: string; active: boolean }) {
  const [rotateState, rotate] = useActionState(rotateQrAction.bind(null, id), null);
  const [activeState, toggle] = useActionState(setSiteActiveAction.bind(null, id, !active), null);
  return (
    <div className="grid gap-3">
      <form action={rotate} onSubmit={(e) => { if (!confirm("¿Rotar el QR? El código impreso actual dejará de funcionar de inmediato.")) e.preventDefault(); }}>
        <SubmitButton variant="secondary" className="w-full"><RefreshCw /> Rotar QR</SubmitButton>
      </form>
      <FormAlert message={rotateState?.message} tone={rotateState?.ok ? "success" : "danger"} />
      <form action={toggle} onSubmit={(e) => { if (active && !confirm("¿Desactivar la sede? Su QR dejará de registrar asistencia.")) e.preventDefault(); }}>
        <SubmitButton variant={active ? "ghost" : "secondary"} className="w-full"><Power /> {active ? "Desactivar sede" : "Activar sede"}</SubmitButton>
      </form>
      <FormAlert message={activeState?.message} tone={activeState?.ok ? "success" : "danger"} />
    </div>
  );
}
