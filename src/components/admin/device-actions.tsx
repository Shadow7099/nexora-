"use client";

import { useActionState } from "react";
import { approveDeviceAction, revokeDeviceAction } from "@/app/admin/actions";
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
