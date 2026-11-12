import type { Metadata } from "next";
import Link from "next/link";
import { QrCode } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { PunchCard } from "@/components/employee/punch-card";
import { PunchPanel } from "@/components/employee/punch-panel";
import { EmployeeShell } from "@/components/layout/employee-shell";
import { buttonVariants } from "@/components/ui/button";
import { formatTime, greeting } from "@/lib/utils";
import { qrContext } from "@/server/attendance";
import { redirect } from "next/navigation";
import { getDeviceToken, requireActor } from "@/server/current";
import { employeeHome } from "@/server/overview";

export const metadata: Metadata = { title: "Marcar asistencia" };

/** Página que abre el QR impreso en la sede. Solo para empleados con sesión. */
export default async function QrPage({ params }: PageProps<"/m/[code]">) {
  const { code } = await params;
  const actor = await requireActor({ allowPending: true });
  // Pasos pendientes (clave temporal, autorización de datos): al terminarlos, vuelve a este QR.
  const back = encodeURIComponent(`/m/${code}`);
  if (actor.mustChangePassword) redirect(`/cambiar-clave?next=${back}`);
  if (!actor.hasConsent) redirect(`/autorizacion?next=${back}`);
  if (actor.role !== "EMPLOYEE") {
    return (
      <EmployeeShell logout={logoutAction}>
        <Message title="Este QR es para los empleados" text="Ingresa con la cuenta de un empleado para marcar asistencia." />
      </EmployeeShell>
    );
  }
  const now = new Date();
  const [ctx, home] = await Promise.all([qrContext(actor, code, await getDeviceToken()), employeeHome(actor, now)]);
  if (!ctx.valid) {
    return (
      <EmployeeShell logout={logoutAction}>
        <Message title="Código QR no válido" text={ctx.message} />
      </EmployeeShell>
    );
  }
  const schedule = home.shift ? `${formatTime(home.shift.start, ctx.timezone)} – ${formatTime(home.shift.end, ctx.timezone)}` : "Hoy no tienes turno programado";
  return (
    <EmployeeShell logout={logoutAction}>
      <PunchCard
        greeting={greeting(now, ctx.timezone)}
        firstName={ctx.firstName}
        siteName={ctx.siteName}
        schedule={schedule}
        state={ctx.openSince ? { kind: "working", since: formatTime(ctx.openSince, ctx.timezone) } : { kind: "pending-in" }}
        action={
          <PunchPanel
            publicCode={code}
            next={ctx.next}
            timezone={ctx.timezone}
            requireDevice={ctx.requireDevice}
            device={ctx.device}
            passkeyRequired={ctx.passkeyRequired}
            canRelink={ctx.canRelink}
            hasOtherDevice={ctx.hasOtherDevice}
            needsPasskeySetup={ctx.needsPasskeySetup}
          />
        }
      />
      {ctx.openSiteName && ctx.openSiteName !== ctx.siteName && (
        <p className="mt-3 text-center text-xs text-warning">Tu entrada fue en {ctx.openSiteName}. La salida en otra sede queda para revisión.</p>
      )}
    </EmployeeShell>
  );
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-bg-subtle text-fg-muted ring-1 ring-border">
        <QrCode className="size-6" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-xs text-sm text-fg-muted">{text}</p>
      <Link href="/app" className={buttonVariants({ variant: "secondary", className: "mt-6" })}>Ir al inicio</Link>
    </div>
  );
}
