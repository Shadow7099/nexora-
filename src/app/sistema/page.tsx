import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Clock, Inbox, Search, Timer, UserCheck, Users, Wallet } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { PunchButton, PunchCard } from "@/components/employee/punch-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";

export const metadata: Metadata = { title: "Sistema de diseño" };

const swatches = [
  ["Fondo", "bg-bg"],
  ["Superficie", "bg-surface"],
  ["Borde", "bg-border"],
  ["Texto", "bg-fg"],
  ["Primario", "bg-primary"],
  ["Acento", "bg-accent"],
  ["Éxito", "bg-success"],
  ["Advertencia", "bg-warning"],
  ["Peligro", "bg-danger"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xs font-semibold tracking-wider text-fg-subtle uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="Inicio">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <h1 className="mt-10 text-2xl font-semibold tracking-tight">Sistema de diseño</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Componentes base de Nexora. Los valores mostrados son de ejemplo, no datos reales.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/sistema/admin" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          Vista previa: panel administrador <ArrowRight />
        </Link>
        <Link href="/sistema/empleado" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          Vista previa: app del empleado <ArrowRight />
        </Link>
      </div>

      <Section title="Color">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-9">
          {swatches.map(([name, cls]) => (
            <div key={name}>
              <div className={`h-12 rounded-lg border border-border ${cls}`} />
              <p className="mt-1.5 text-xs text-fg-muted">{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografía">
        <Card className="space-y-2 p-5">
          <p className="text-3xl font-semibold tracking-tight">Control inteligente</p>
          <p className="text-xl font-semibold tracking-tight">Asistencia de la semana</p>
          <p className="text-sm text-fg-muted">Texto de apoyo para describir una sección o un dato.</p>
          <p className="tabular font-mono text-sm">08:02 · 17:31 · $ 1.750.905</p>
        </Card>
      </Section>

      <Section title="Botones y estados">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Aprobar</Button>
          <Button variant="secondary">Exportar</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="danger">Revocar dispositivo</Button>
          <Button loading>Guardando</Button>
          <Button disabled>Deshabilitado</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="success" dot>Presente</Badge>
          <Badge tone="warning" dot>Llegó tarde</Badge>
          <Badge tone="danger" dot>Ausente</Badge>
          <Badge tone="primary">Pendiente</Badge>
          <Badge tone="accent">Turno nocturno</Badge>
          <Badge>Descanso</Badge>
        </div>
      </Section>

      <Section title="Indicadores">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Presentes ahora" value="6 / 8" icon={UserCheck} delta={{ value: "+1", direction: "up" }} footnote="vs. ayer" />
          <StatCard label="Llegadas tarde" value="2" icon={Clock} goodWhen="down" delta={{ value: "−3", direction: "down" }} footnote="esta semana" />
          <StatCard label="Horas extra" value="11 h 20 min" icon={Timer} footnote="3 por aprobar" />
          <StatCard label="Costo estimado" value="$ 18.420.000" icon={Wallet} footnote="quincena en curso" />
        </div>
      </Section>

      <Section title="Formulario">
        <Card className="max-w-md">
          <CardHeader>
            <div>
              <CardTitle>Nueva sede</CardTitle>
              <CardDescription>Los errores se muestran junto al campo.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field id="f-name" label="Nombre" hint="Como aparecerá en el QR impreso.">
              <Input id="f-name" placeholder="Villavicencio Centro" aria-describedby="f-name-hint" />
            </Field>
            <Field id="f-radius" label="Radio permitido (metros)" error="Debe estar entre 10 y 2000 metros.">
              <Input id="f-radius" defaultValue="5" aria-invalid aria-describedby="f-radius-error" inputMode="numeric" />
            </Field>
          </CardContent>
        </Card>
      </Section>

      <Section title="Vacío y carga">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <EmptyState icon={Inbox} title="Sin solicitudes pendientes" description="Cuando un empleado supere su jornada, la solicitud aparecerá aquí." />
          </Card>
          <Card className="space-y-3 p-5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="flex items-center gap-2 pt-2 text-sm text-fg-muted">
              <Search className="size-4" /> Estado de carga
            </div>
          </Card>
        </div>
      </Section>

      <Section title="Pantalla del empleado">
        <div className="grid gap-6 md:grid-cols-3">
          {(
            [
              ["Antes de entrar", { kind: "pending-in" }, <PunchButton key="a" kind="in" type="button" />, undefined],
              ["Confirmación", { kind: "working", since: "7:58 a. m." }, null, { label: "Entrada registrada", time: "7:58 a. m." }],
              ["En jornada", { kind: "working", since: "7:58 a. m." }, <PunchButton key="b" kind="out" type="button" />, undefined],
            ] as const
          ).map(([label, state, action, confirmation]) => (
            <div key={label}>
              <p className="mb-2 text-xs text-fg-subtle">{label}</p>
              <Card className="p-5">
                <PunchCard
                  greeting="Buenos días"
                  firstName="Juan"
                  siteName="Villavicencio Centro"
                  schedule="8:00 a. m. – 5:00 p. m."
                  state={state}
                  action={action}
                  confirmation={confirmation}
                />
              </Card>
            </div>
          ))}
        </div>
      </Section>

      <footer className="mt-16 mb-6 flex items-center gap-2 text-xs text-fg-subtle">
        <Users className="size-3.5" /> Nexora · sistema de diseño v0.1
      </footer>
    </div>
  );
}
