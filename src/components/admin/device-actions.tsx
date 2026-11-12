"use client";

import { useActionState } from "react";
import { approveDeviceAction, passkeyExemptionAction, revokeDeviceAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/ui/form";

export function DeviceActions({ id, pending }: { id: string; pending: boolean }) {
  const [approveState, approve] = useActionState(approveDeviceAction.bind(null, id), null);
  const [revokeState, revoke] = useActionState(revokeDeviceAction.bind(null, id), null);
  const msg = approveState?.message ?? revokeState?.message;
  if (approveState?.ok || revokeState?.ok) {
    return (
      <p className="text-right text-sm text-success" role="status">
        {msg}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {pending && (
        <form action={approve}>
          <SubmitButton size="sm">Aprobar</SubmitButton>
        </form>
      )}
      <form
        action={revoke}
        onSubmit={(e) => {
          if (!confirm("¿Desvincular este celular? El empleado no podrá marcar desde él.")) e.preventDefault();
        }}
      >
        <SubmitButton size="sm" variant="ghost">{pending ? "Rechazar" : "Desvincular"}</SubmitButton>
      </form>
      {msg && <span className="w-full text-right text-xs text-fg-muted" role="status">{msg}</span>}
    </div>
  );
}

/**
 * Excepción de huella/Face ID para un celular activo sin ella (p. ej. un celular
 * viejo). Solo la ve el administrador en el detalle del empleado.
 */
export function PasskeyExemption({ id, exempt }: { id: string; exempt: boolean }) {
  const [state, action] = useActionState(passkeyExemptionAction.bind(null, id, !exempt), null);
  return (
    <form
      action={action}
      className="mt-2 grid gap-1"
      onSubmit={(e) => {
        if (!exempt && !confirm("¿Permitir que este celular marque sin huella ni Face ID? Úsalo solo si el celular no tiene ninguna de las dos.")) e.preventDefault();
      }}
    >
      <SubmitButton size="sm" variant="ghost" className="justify-self-start">
        {exempt ? "Volver a exigir huella o Face ID" : "Permitir marcar sin huella ni Face ID"}
      </SubmitButton>
      {state?.message && <span className={state.ok ? "text-xs text-success" : "text-xs text-danger"} role="status">{state.message}</span>}
    </form>
  );
}
