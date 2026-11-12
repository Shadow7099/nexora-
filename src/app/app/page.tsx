import type { Metadata } from "next";
import { Fingerprint } from "lucide-react";
import { PunchCard, type PunchState } from "@/components/employee/punch-card";
import { PunchPanel } from "@/components/employee/punch-panel";
import { QrScanButton } from "@/components/employee/qr-scanner";
import { formatMinutes, formatTime, greeting } from "@/lib/utils";
import { employeeDeviceContext, employeeToday } from "@/server/attendance";
import { getDeviceToken, requireActor } from "@/server/current";
import { employeeHome } from "@/server/overview";

export const metadata: Metadata = { title: "Inicio" };

/**
 * Inicio del empleado: marca aquí mismo, sin escanear el QR (el QR solo hace
 * falta la primera vez para entrar). Pide ubicación y huella o Face ID.
 */
export default async function EmployeeHomePage() {
  const actor = await requireActor({ roles: ["EMPLOYEE"] });
  const now = new Date();
  const [h, today, ctx] = await Promise.all([employeeHome(actor, now), employeeToday(actor, now), employeeDeviceContext(actor, await getDeviceToken())]);
  const tz = h.timezone;
  const schedule = h.shift ? `${formatTime(h.shift.start, tz)} – ${formatTime(h.shift.end, tz)}` : "Hoy no tienes turno programado";

  const state: PunchState = today.open
    ? { kind: "working", since: formatTime(today.open.startAt, tz) }
    : today.lastClosed?.endAt
      ? {
          kind: "done",
          inAt: formatTime(today.lastClosed.startAt, tz),
          outAt: formatTime(today.lastClosed.endAt, tz),
          worked: formatMinutes(Math.round((today.lastClosed.endAt.getTime() - today.lastClosed.startAt.getTime()) / 60000)),
        }
      : { kind: "pending-in" };

  return (
    <>
      <PunchCard
        greeting={greeting(now, tz)}
        firstName={h.firstName}
        siteName={h.siteName}
        schedule={schedule}
        state={state}
        action={
          <div className="grid gap-3">
            <PunchPanel
              timezone={ctx.timezone}
              next={ctx.next}
              requireDevice={ctx.requireDevice}
              device={ctx.device}
              passkeyRequired={ctx.passkeyRequired}
              canRelink={ctx.canRelink}
              hasOtherDevice={ctx.hasOtherDevice}
              needsPasskeySetup={ctx.needsPasskeySetup}
            />
            <QrScanButton working={ctx.next === "OUT"} compact />
          </div>
        }
      />
      {h.todayShifts.length > 1 && (
        <p className="mt-3 text-sm text-fg-muted">
          Hoy tienes turno partido: {h.todayShifts.map((s) => `${formatTime(s.start, tz)}–${formatTime(s.end, tz)}`).join(" y ")}
        </p>
      )}
      {ctx.device?.status === "ACTIVE" && ctx.passkeyRequired && (
        <p className="mt-6 flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success" role="status">
          <Fingerprint className="size-4" aria-hidden /> Huella o Face ID activado en este celular. Te lo pediremos al marcar.
        </p>
      )}
    </>
  );
}
