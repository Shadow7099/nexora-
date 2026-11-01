import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { notFound } from "next/navigation";
import { updateSiteAction } from "@/app/admin/gestion-actions";
import { SiteControls } from "@/components/admin/site-controls";
import { SiteForm } from "@/components/admin/site-form";
import { PageHeader } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormAlert } from "@/components/ui/form";
import { qrSvg } from "@/lib/qr";
import { requireActor } from "@/server/current";
import { AppError } from "@/server/errors";
import { getSiteForAdmin } from "@/server/sites";

export const metadata: Metadata = { title: "Sede" };
const hhmm = (min: number) => `${String(Math.floor((min % 1440) / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export default async function SitePage({ params, searchParams }: PageProps<"/admin/sedes/[id]">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const { id } = await params;
  const { creada } = await searchParams;
  let site;
  try {
    site = await getSiteForAdmin(actor, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const qr = site.qr ? await qrSvg(site.qr.publicCode) : null;
  const first = site.hours[0];
  return (
    <>
      <Link href="/admin/sedes" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> Sedes</Link>
      <PageHeader title={site.name} description={`${site.address}, ${site.city}`} actions={site.active ? <Badge tone="success" dot>Activa</Badge> : <Badge>Inactiva</Badge>} />
      {creada && <FormAlert tone="success" className="mb-6" message="Sede creada. Imprime su QR y pégalo en la entrada." />}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="min-w-0">
          <CardContent>
            <SiteForm
              action={updateSiteAction.bind(null, site.id)}
              submitLabel="Guardar cambios"
              values={{
                name: site.name, address: site.address, city: site.city, latitude: String(Number(site.latitude)), longitude: String(Number(site.longitude)),
                radiusMeters: String(site.radiusMeters), opens: first ? hhmm(first.opensMin) : "06:00", closes: first ? hhmm(first.closesMin) : "20:00",
              }}
              days={site.hours.map((h) => h.weekday)}
            />
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader><CardTitle>Código QR</CardTitle>{site.qr && <span className="text-xs text-fg-subtle">versión {site.qr.version}</span>}</CardHeader>
          <CardContent className="grid gap-4">
            {qr ? (
              <>
                <div className="mx-auto size-44 overflow-hidden rounded-lg border border-border bg-white p-1" role="img" aria-label={`Código QR de ${site.name}`} dangerouslySetInnerHTML={{ __html: qr.svg }} />
                <Link href={`/imprimir/qr/${site.id}`} target="_blank" className={buttonVariants({ className: "w-full" })}><Printer /> Imprimir QR</Link>
              </>
            ) : (
              <p className="text-sm text-warning">Sin QR vigente. Rótalo para generar uno.</p>
            )}
            <SiteControls id={site.id} active={site.active} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
