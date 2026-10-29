import type { Metadata } from "next";
import { PunchButton, PunchCard } from "@/components/employee/punch-card";
import { formatTime, greeting } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { employeeHome } from "@/server/overview";

export const metadata: Metadata = { title: "Inicio" };

export default async function EmployeeHomePage() {
  const actor = await requireActor({ roles: ["EMPLOYEE"] });
  const now = new Date();
  const h = await employeeHome(actor, now);
  const schedule = h.shift
    ? `${formatTime(h.shift.start, h.timezone)} – ${formatTime(h.shift.end, h.timezone)}`
    : "Hoy no tienes turno programado";

  return (
    <>
      <PunchCard
        greeting={greeting(now, h.timezone)}
        firstName={h.firstName}
        siteName={h.siteName}
        schedule={schedule}
        state={{ kind: "pending-in" }}
        action={<PunchButton kind="in" type="button" disabled aria-describedby="punch-note" />}
      />
      {h.todayShifts.length > 1 && (
        <p className="mt-3 text-sm text-fg-muted">
          Hoy tienes turno partido:{" "}
          {h.todayShifts.map((s) => `${formatTime(s.start, h.timezone)}–${formatTime(s.end, h.timezone)}`).join(" y ")}
        </p>
      )}
      <p id="punch-note" className="mt-4 text-center text-xs text-fg-subtle">
        La marcación con el QR de tu sede se activa en la siguiente fase del piloto.
      </p>
    </>
  );
}
