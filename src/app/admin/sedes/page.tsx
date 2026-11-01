import type { Metadata } from "next";
import { headers } from "next/headers";
import { Clock, MapPin, Radius, Users } from "lucide-react";
import QRCode from "qrcode";
import { PageHeader } from "@/components/layout/admin-shell";
import { PhaseNotice } from "@/components/layout/phase-notice";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { minutesToClock } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { listSites } from "@/server/modules";

export const metadata: Metadata = { title: "Sedes y QR" };

const dayShort = ["", "L", "M", "X", "J", "V", "S", "D"];

/** URL pública que contiene el QR impreso. Usa APP_URL si está definida; si no, el dominio actual. */
async function baseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

export default async function SitesPage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const [sites, base] = await Promise.all([listSites(actor), baseUrl()]);
  const qrs = await Promise.all(
    sites.map(async (s) => {
      const code = s.qrCodes[0];
      if (!code) return null;
      const url = `${base}/m/${code.publicCode}`;
      return { url, svg: await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b1020", light: "#ffffff" } }), version: code.version };
    }),
  );

  return (
    <>
      <PageHeader title="Sedes y QR" description={`${sites.filter((s) => s.active).length} sedes activas`} />
      <PhaseNotice phase={3}>
        Ya ves tus sedes reales con su QR vigente. Falta: crear y editar sedes, ajustar el radio en un mapa, imprimir y rotar el QR. El QR
        empieza a registrar asistencia en la fase 4.
      </PhaseNotice>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sites.map((s, i) => {
          const qr = qrs[i];
          const lat = Number(s.latitude);
          const lng = Number(s.longitude);
          const hours = s.openingHours[0];
          const sameEveryDay = s.openingHours.every((h) => h.opensMin === hours?.opensMin && h.closesMin === hours?.closesMin);
          return (
            <Card key={s.id} className="flex flex-col gap-4 p-5 sm:flex-row">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold tracking-tight">{s.name}</h2>
                  {s.active ? <Badge tone="success" dot>Activa</Badge> : <Badge>Inactiva</Badge>}
                </div>
                <ul className="mt-3 grid gap-2 text-sm text-fg-muted">
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
                    <span>
                      {s.address}, {s.city}
                      <a
                        className="block text-xs text-primary hover:underline"
                        href={`https://www.google.com/maps?q=${lat},${lng}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {lat.toFixed(5)}, {lng.toFixed(5)} · ver en el mapa
                      </a>
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Radius className="size-4 text-fg-subtle" aria-hidden /> Radio permitido: {s.radiusMeters} m
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
                    {hours ? (
                      sameEveryDay ? (
                        <span>Todos los días, {minutesToClock(hours.opensMin)} – {minutesToClock(hours.closesMin)}{hours.closesMin > 1440 ? " (día siguiente)" : ""}</span>
                      ) : (
                        <span>{s.openingHours.map((h) => `${dayShort[h.weekday]} ${minutesToClock(h.opensMin)}–${minutesToClock(h.closesMin)}`).join(" · ")}</span>
                      )
                    ) : (
                      <span>Sin horario registrado</span>
                    )}
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="size-4 text-fg-subtle" aria-hidden /> {s._count.employeesDefault} empleados con esta sede habitual
                  </li>
                </ul>
              </div>
              {qr ? (
                <figure className="flex shrink-0 flex-col items-center gap-2">
                  <div className="size-36 overflow-hidden rounded-lg border border-border bg-white p-1" aria-label={`Código QR de ${s.name}`} role="img"
                    dangerouslySetInnerHTML={{ __html: qr.svg }} />
                  <figcaption className="text-center text-xs text-fg-subtle">QR v{qr.version}</figcaption>
                </figure>
              ) : (
                <p className="text-sm text-warning">Sin QR vigente</p>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
