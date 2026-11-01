import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireActor } from "@/server/current";
import { employeeActivity } from "@/server/modules";

export const metadata: Metadata = { title: "Historial" };

export default async function HistoryPage() {
  const actor = await requireActor({ roles: ["EMPLOYEE"] });
  const a = await employeeActivity(actor);
  return (
    <section className="animate-fade-up">
      <h1 className="text-2xl font-semibold tracking-tight">Historial</h1>
      <p className="mt-1 mb-6 text-sm text-fg-muted">Tus jornadas y horas registradas. Solo tú y tu empresa las ven.</p>
      <Card>
        {a.sessions.length === 0 ? (
          <EmptyState icon={BarChart3} title="Aún no tienes jornadas registradas" description="Cuando marques con el QR de tu sede, aquí verás tus entradas, salidas y horas." />
        ) : null}
      </Card>
    </section>
  );
}
