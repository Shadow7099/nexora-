import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Printer, QrCode, Smartphone } from "lucide-react";
import { SiteForm } from "@/components/admin/site-form";
import { PageHeader } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, minutesToClock } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { getOnboardingStatus, ONBOARDING_STEPS, SHIFT_PRESETS, type OnboardingStep } from "@/server/onboarding";
import { finishOnboardingAction, wizardSiteAction } from "./actions";
import { BulkEmployeesForm, BulkScheduleForm, PresetsForm } from "./wizard-forms";

export const metadata: Metadata = { title: "Configuración inicial" };

const today = () => new Date().toISOString().slice(0, 10);

export default async function OnboardingPage({ searchParams }: PageProps<"/admin/bienvenida">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const s = await getOnboardingStatus(actor);
  const { paso } = await searchParams;
  const step: OnboardingStep = ONBOARDING_STEPS.some((x) => x.key === paso) ? (paso as OnboardingStep) : s.next;
  const idx = ONBOARDING_STEPS.findIndex((x) => x.key === step);
  const nextKey = ONBOARDING_STEPS[idx + 1]?.key;
  const go = (k: OnboardingStep) => `/admin/bienvenida?paso=${k}`;

  return (
    <>
      <PageHeader
        title={`Bienvenido a Nexora, ${actor.name.split(" ")[0]}`}
        description={`Deja ${s.company.name} lista para marcar asistencia en cinco pasos. Puedes volver aquí cuando quieras.`}
        actions={
          !s.completed && (
            <form action={finishOnboardingAction}>
              <Button type="submit" variant="ghost">Omitir por ahora</Button>
            </form>
          )
        }
      />

      <ol className="mb-6 grid gap-2 sm:grid-cols-5" aria-label="Pasos">
        {ONBOARDING_STEPS.map((x, i) => {
          const current = x.key === step;
          return (
            <li key={x.key}>
              <Link
                href={go(x.key)}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex h-full items-start gap-3 rounded-xl border p-3 text-sm transition-colors",
                  current ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-bg-subtle",
                )}
              >
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold", s.done[x.key] ? "bg-success text-white" : current ? "bg-primary text-primary-fg" : "bg-bg-subtle text-fg-muted")}>
                  {s.done[x.key] ? <Check className="size-3.5" aria-label="Hecho" /> : i + 1}
                </span>
                <span>
                  <span className="block font-medium text-fg">{x.title}</span>
                  <span className="hidden text-xs text-fg-muted lg:block">{x.text}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {step === "sede" && (
        <Card className="max-w-3xl">
          <CardHeader>
            <div>
              <CardTitle>1. ¿Dónde trabaja tu equipo?</CardTitle>
              <CardDescription>Crea tu sede principal. Se genera su código QR para que los empleados marquen al llegar y al salir. Puedes agregar más sedes después.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {s.sites.length > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-fg-muted">Ya tienes:</span>
                {s.sites.map((x) => <Badge key={x.id} tone="success">{x.name}</Badge>)}
                {nextKey && <Link href={go(nextKey)} className={cn(buttonVariants({ size: "sm" }), "ml-auto")}>Continuar <ArrowRight /></Link>}
              </div>
            )}
            {s.sites.length < (s.company.maxSites ?? Infinity) ? (
              <SiteForm action={wizardSiteAction} submitLabel={s.sites.length ? "Agregar otra sede" : "Crear sede y continuar"} values={{ radiusMeters: "80", opens: "06:00", closes: "20:00" }} days={[1, 2, 3, 4, 5, 6]} />
            ) : (
              <p className="text-sm text-fg-muted">Llegaste al máximo de sedes de tu plan ({s.company.maxSites}).</p>
            )}
          </CardContent>
        </Card>
      )}

      {step === "turnos" && (
        <Card className="max-w-3xl">
          <CardHeader>
            <div>
              <CardTitle>2. ¿Qué turnos usa tu empresa?</CardTitle>
              <CardDescription>Marca las jornadas que usas; quedan creadas con su hora de descanso. Puedes ajustarlas o crear otras en Horarios.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            {s.templates.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-fg-muted">Ya tienes:</span>
                {s.templates.map((t) => <Badge key={t.id} tone="success">{t.name} · {minutesToClock(t.startMin)}–{minutesToClock(t.endMin % 1440)}</Badge>)}
                <Link href={go("empleados")} className={cn(buttonVariants({ size: "sm" }), "ml-auto")}>Continuar <ArrowRight /></Link>
              </div>
            )}
            <PresetsForm
              presets={Object.entries(SHIFT_PRESETS).map(([key, p]) => ({ key, ...p, exists: s.templates.some((t) => t.name.toLowerCase() === p.name.toLowerCase()) }))}
            />
            <p className="text-xs text-fg-subtle">¿Necesitas otro horario? <Link href="/admin/horarios" className="text-primary hover:underline">Crea un turno personalizado</Link>.</p>
          </CardContent>
        </Card>
      )}

      {step === "empleados" && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>3. Crea las cuentas de tus empleados</CardTitle>
              <CardDescription>
                Pega la lista desde Excel o escríbela: una persona por línea. Cada uno recibe una contraseña temporal para ingresar desde su celular; al entrar crea la suya.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {s.sites.length === 0 ? (
              <p className="text-sm text-fg-muted">Primero <Link href={go("sede")} className="text-primary hover:underline">crea una sede</Link>.</p>
            ) : (
              <BulkEmployeesForm sites={s.sites.map((x) => ({ id: x.id, name: x.name }))} today={today()} existing={s.employees.length} max={s.company.maxEmployees} />
            )}
          </CardContent>
        </Card>
      )}

      {step === "horarios" && (
        <Card className="max-w-3xl">
          <CardHeader>
            <div>
              <CardTitle>4. Asigna los horarios</CardTitle>
              <CardDescription>Elige un turno, los días y a quiénes aplica. Cada empleado queda en su sede habitual. Repite para los que tienen otro turno. Los rotativos se ajustan después en Horarios.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {s.templates.length === 0 || s.employees.length === 0 ? (
              <p className="text-sm text-fg-muted">
                Necesitas al menos un <Link href={go("turnos")} className="text-primary hover:underline">turno</Link> y un <Link href={go("empleados")} className="text-primary hover:underline">empleado</Link>.
              </p>
            ) : (
              <BulkScheduleForm
                templates={s.templates.map((t) => ({ id: t.id, label: `${t.name} · ${minutesToClock(t.startMin)} a ${minutesToClock(t.endMin % 1440)}` }))}
                employees={s.employees}
              />
            )}
          </CardContent>
        </Card>
      )}

      {step === "listo" && (
        <div className="grid max-w-3xl gap-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>5. ¡Tu empresa está casi lista!</CardTitle>
                <CardDescription>Revisa el resumen, imprime el QR y comparte las instrucciones con tu equipo.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ul className="grid gap-2 text-sm">
                {ONBOARDING_STEPS.filter((x) => x.key !== "listo").map((x) => (
                  <li key={x.key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                    <span>{x.title}</span>
                    {s.done[x.key] ? <Badge tone="success" dot>Hecho</Badge> : <Link href={go(x.key)} className="text-primary hover:underline">Completar</Link>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          {s.sites.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2"><QrCode className="size-4" aria-hidden /> QR de tus sedes</CardTitle>
                  <CardDescription>Imprímelo y pégalo en la entrada. Los empleados lo escanean con la cámara del celular para marcar.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {s.sites.map((x) => (
                  <Link key={x.id} href={`/imprimir/qr/${x.id}`} target="_blank" className={buttonVariants({ variant: "secondary" })}><Printer /> {x.name}</Link>
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2"><Smartphone className="size-4" aria-hidden /> Qué hace cada empleado el primer día</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-fg-muted">
                <li>Escanea el QR de la sede con la cámara de su celular.</li>
                <li>Ingresa con su correo y la contraseña temporal que le diste, y crea su propia contraseña.</li>
                <li>Acepta la autorización de datos y vincula su celular (tú lo apruebas en Empleados si la empresa lo exige).</li>
                <li>Marca su entrada. Desde ahí, solo escanea al llegar y al salir.</li>
              </ol>
            </CardContent>
          </Card>
          <form action={finishOnboardingAction} className="flex justify-end">
            <Button type="submit" size="lg">{s.completed ? "Ir al panel" : "Terminar y abrir el panel"} <ArrowRight /></Button>
          </form>
        </div>
      )}
    </>
  );
}
