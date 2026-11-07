import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, PartyPopper } from "lucide-react";
import { PageHeader } from "@/components/layout/admin-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { setupProgress } from "@/server/onboarding";

export const metadata: Metadata = { title: "Primeros pasos" };

/** Guía para que el dueño configure su negocio solo. El avance sale de sus datos reales. */
export default async function SetupPage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const p = await setupProgress(actor);
  const next = p.steps.find((s) => !s.done);
  const pct = Math.round((p.done / p.total) * 100);
  return (
    <>
      <PageHeader title="Primeros pasos" description="Configura tu negocio en este orden. Cada paso se marca solo cuando está hecho." />

      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-medium">{p.complete ? "¡Todo listo! Tu negocio ya puede marcar asistencia." : `${p.done} de ${p.total} pasos completos`}</p>
          <span className="tabular text-sm text-fg-muted">{pct} %</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-subtle" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de la configuración">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      <ol className="grid gap-3">
        {p.steps.map((s, i) => {
          const current = s.key === next?.key;
          return (
            <li key={s.key}>
              <Card className={cn("flex flex-col gap-3 p-5 sm:flex-row sm:items-start", current && "ring-2 ring-primary/40")}>
                <div className="flex min-w-0 flex-1 gap-3">
                  {s.done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="Hecho" /> : <Circle className="mt-0.5 size-5 shrink-0 text-fg-subtle" aria-label="Pendiente" />}
                  <div className="min-w-0">
                    <p className={cn("font-medium", s.done && "text-fg-muted")}>{i + 1}. {s.title}</p>
                    <p className="mt-0.5 text-sm text-fg-muted">{s.text}</p>
                    {s.detail && <p className="mt-1 text-xs text-fg-subtle">{s.detail}</p>}
                  </div>
                </div>
                <Link href={s.href} className={cn(buttonVariants({ variant: current ? "primary" : "secondary", size: "sm" }), "self-start sm:shrink-0")}>{s.cta}</Link>
              </Card>
            </li>
          );
        })}
      </ol>

      {p.complete && (
        <Card className="mt-6 flex items-start gap-3 p-5">
          <PartyPopper className="mt-0.5 size-5 text-primary" aria-hidden />
          <div className="text-sm text-fg-muted">
            <p className="font-medium text-fg">Siguientes pasos</p>
            <p className="mt-1">Revisa cada día la <Link href="/admin/asistencia" className="text-primary hover:underline">Asistencia</Link>, aprueba las <Link href="/admin/solicitudes" className="text-primary hover:underline">Solicitudes</Link> y al cerrar cada quincena calcula la <Link href="/admin/pre-nomina" className="text-primary hover:underline">Pre-nómina</Link> para tu contador.</p>
          </div>
        </Card>
      )}
    </>
  );
}
