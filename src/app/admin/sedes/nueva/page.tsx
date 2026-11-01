import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSiteAction } from "@/app/admin/gestion-actions";
import { SiteForm } from "@/components/admin/site-form";
import { PageHeader } from "@/components/layout/admin-shell";
import { Card, CardContent } from "@/components/ui/card";
import { requireActor } from "@/server/current";

export const metadata: Metadata = { title: "Nueva sede" };

export default async function NewSitePage() {
  await requireActor({ roles: ["COMPANY_ADMIN"] });
  return (
    <>
      <Link href="/admin/sedes" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> Sedes</Link>
      <PageHeader title="Nueva sede" description="Se crea con su código QR listo para imprimir." />
      <Card className="max-w-3xl">
        <CardContent>
          <SiteForm action={createSiteAction} submitLabel="Crear sede" values={{ radiusMeters: "80", opens: "06:00", closes: "20:00" }} days={[1, 2, 3, 4, 5, 6]} />
        </CardContent>
      </Card>
    </>
  );
}
