import type { Metadata } from "next";
import { ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireActor } from "@/server/current";
import { employeeActivity } from "@/server/modules";

export const metadata: Metadata = { title: "Solicitudes" };

export default async function MyRequestsPage() {
  const actor = await requireActor({ roles: ["EMPLOYEE"] });
  const a = await employeeActivity(actor);
  return (
    <section className="animate-fade-up">
      <h1 className="text-2xl font-semibold tracking-tight">Solicitudes</h1>
      <p className="mt-1 mb-6 text-sm text-fg-muted">Horas extra, permisos y vacaciones.</p>
      <Card>
        <EmptyState
          icon={ListChecks}
          title={a.overtime + a.novelties === 0 ? "No tienes solicitudes" : `${a.overtime + a.novelties} solicitudes`}
          description="Pronto podrás pedir permisos y ver el estado de tus horas extra desde aquí."
        />
      </Card>
    </section>
  );
}
