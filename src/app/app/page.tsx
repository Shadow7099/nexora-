import type { Metadata } from "next";
import { Fingerprint, QrCode, Smartphone } from "lucide-react";
import { PasskeySetup } from "@/components/employee/passkey-setup";
import { PunchCard, type PunchState } from "@/components/employee/punch-card";
import { db } from "@/lib/db";
import { formatMinutes, formatTime, greeting } from "@/lib/utils";
import { employeeToday } from "@/server/attendance";
import { getDeviceToken, requireActor } from "@/server/current";
import { findBinding } from "@/server/devices";
import { employeeHome } from "@/server/overview";

export const metadata: Metadata = { title: "Inicio" };

export default async function EmployeeHomePage() {
  const actor = await requireActor({ roles: ["EMPLOYEE"] });
  const now = new Date();
  const [h, today, binding] = await Promise.all([employeeHome(actor, now), employeeToday(actor, now), findBinding(actor.employeeId!, await getDeviceToken())]);
  const tz = h.timezone;
  const passkeys = binding?.status === "ACTIVE" ? await db.passkeyCredential.count({ where: { userId: actor.userId, deviceBindingId: binding.id } }) : 0;
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
          <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border-strong bg-surface p-5">
            <QrCode className="size-10 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-medium">{today.open ? "Para salir, escanea el QR de la sede" : "Para entrar, escanea el QR de tu sede"}</p>
              <p className="mt-0.5 text-sm text-fg-muted">Abre la cámara del celular y apunta al código pegado en la entrada.</p>
            </div>
          </div>
        }
      />
      {h.todayShifts.length > 1 && (
        <p className="mt-3 text-sm text-fg-muted">
          Hoy tienes turno partido: {h.todayShifts.map((s) => `${formatTime(s.start, tz)}–${formatTime(s.end, tz)}`).join(" y ")}
        </p>
      )}
      <div className="mt-6 grid gap-3">
        {binding?.status === "ACTIVE" && passkeys === 0 && <PasskeySetup />}
        {binding?.status === "ACTIVE" && passkeys > 0 && (
          <p className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success" role="status">
            <Fingerprint className="size-4" aria-hidden /> Huella activada en este celular. Te la pediremos al marcar.
          </p>
        )}
        {binding?.status === "PENDING" && (
          <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-fg">
            <Smartphone className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden /> Este celular está pendiente de aprobación por tu administrador.
          </p>
        )}
      </div>
    </>
  );
}
