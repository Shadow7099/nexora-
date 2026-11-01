import type { Metadata } from "next";
import Link from "next/link";
import { Clock, MapPin, Plus, Printer, Radius, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { qrSvg } from "@/lib/qr";
import { minutesToClock } from "@/lib/utils";
import { requireActor } from "@/server/current";
import { listSites } from "@/server/modules";

export const metadata: Metadata = { title: "Sedes y QR" };

const dayShort = ["", "L", "M", "X", "J", "V", "S", "D"];

export default async function SitesPage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const sites = await listSites(actor);
  const qrs = await Promise.all(sites.map((s) => (s.qrCodes[0] ? qrSvg(s.qrCodes[0].publicCode) : null)));

  return (
    <>
      <PageHeader
        title="Sedes y QR"
        description={`${sites.filter((s) => s.active).length} sedes activas`}
        actions={<Link href="/admin/sedes/nueva" className={buttonVariants()}><Plus /> Nueva sede</Link>}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sites.map((s, i) => {
          const qr = qrs[i];
          const lat = Number(s.latitude);
          const lng = Number(s.longitude);
          const hours = s.openingHours[0];
          const sameEveryDay = s.openingHours.every((h) => h.opensMin === hours?.opensMin && h.closesMin === hours?.closesMin);
          return (
            <Card key={s.id} className={`flex flex-col gap-4 p-5 sm:flex-row ${s.active ? "" : "opacity-70"}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/admin/sedes/${s.id}`} className="font-semibold tracking-tight hover:underline">{s.name}</Link>
                  {s.active ? <Badge tone="success" dot>Activa</Badge> : <Badge>Inactiva</Badge>}
                </div>
                <ul className="mt-3 grid gap-2 text-sm text-fg-muted">
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
                    <span>
                      {s.address}, {s.city}
                      <a className="block text-xs text-primary hover:underline" href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer">
                        {lat.toFixed(5)}, {lng.toFixed(5)} · ver en el mapa
                      </a>
                    </span>
                  </li>
                  <li className="flex items-center gap-2"><Radius className="size-4 text-fg-subtle" aria-hidden /> Radio permitido: {s.radiusMeters} m</li>
                  <li className="flex items-start gap-2">
                    <Clock className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
                    {hours ? (
                      <span>
                        {sameEveryDay ? s.openingHours.map((h) => dayShort[h.weekday]).join(" ") : s.openingHours.map((h) => `${dayShort[h.weekday]} ${minutesToClock(h.opensMin)}–${minutesToClock(h.closesMin)}`).join(" · ")}
                        {sameEveryDay && `, ${minutesToClock(hours.opensMin)} – ${minutesToClock(hours.closesMin)}${hours.closesMin > 1440 ? " (día siguiente)" : ""}`}
                      </span>
                    ) : (
                      <span>Sin horario registrado</span>
                    )}
                  </li>
                  <li className="flex items-center gap-2"><Users className="size-4 text-fg-subtle" aria-hidden /> {s._count.employeesDefault} empleados con esta sede habitual</li>
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/admin/sedes/${s.id}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>Editar</Link>
                  {qr && <Link href={`/imprimir/qr/${s.id}`} target="_blank" className={buttonVariants({ variant: "ghost", size: "sm" })}><Printer /> Imprimir QR</Link>}
                </div>
              </div>
              {qr ? (
                <figure className="flex shrink-0 flex-col items-center gap-2">
                  <div className="size-36 overflow-hidden rounded-lg border border-border bg-white p-1" aria-label={`Código QR de ${s.name}`} role="img" dangerouslySetInnerHTML={{ __html: qr.svg }} />
                  <figcaption className="text-center text-xs text-fg-subtle">QR v{s.qrCodes[0]!.version}</figcaption>
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
