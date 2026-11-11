"use client";

import { useActionState } from "react";
import { setLeadStatusAction } from "@/app/plataforma/empresas-actions";
import { SubmitButton } from "@/components/ui/form";

const NEXT: Record<string, { status: string; label: string }[]> = {
  NEW: [{ status: "CONTACTED", label: "Contactada" }, { status: "INVITED", label: "Invitada" }, { status: "DISCARDED", label: "Descartar" }],
  CONTACTED: [{ status: "INVITED", label: "Invitada" }, { status: "DISCARDED", label: "Descartar" }],
  INVITED: [],
  DISCARDED: [{ status: "NEW", label: "Reabrir" }],
};

export function LeadStatusButtons({ id, status }: { id: string; status: string }) {
  return <div className="flex flex-wrap gap-2">{NEXT[status]?.map((n) => <One key={n.status} id={id} status={n.status} label={n.label} />)}</div>;
}

function One({ id, status, label }: { id: string; status: string; label: string }) {
  const [state, action] = useActionState(setLeadStatusAction.bind(null, id, status), null);
  return (
    <form action={action}>
      <SubmitButton variant={status === "DISCARDED" ? "ghost" : "secondary"} size="sm" pendingText="…">{label}</SubmitButton>
      {state?.message && !state.ok && <span className="ml-2 text-xs text-danger" role="alert">{state.message}</span>}
    </form>
  );
}
