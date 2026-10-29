import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/layout/admin-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auditActionLabel } from "@/lib/labels";
import { formatDate, formatTime } from "@/lib/utils";
import { getCompanySettings, recentAudit } from "@/server/company";
import { requireActor } from "@/server/current";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const [s, activity] = await Promise.all([getCompanySettings(actor), recentAudit(actor, 30)]);
  return (
    <>
      <PageHeader title="Configuración" description={s.legalName ?? s.name} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Reglas de asistencia</CardTitle>
                <CardDescription>Aplican a todas las sedes. Cada cambio queda en la auditoría.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <SettingsForm values={{ lateToleranceMin: s.lateToleranceMin, geoMaxAccuracyM: s.geoMaxAccuracyM, requireDeviceBinding: s.requireDeviceBinding }} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Tu cuenta</CardTitle>
                <CardDescription>{actor.email}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Link href="/cambiar-clave" className={buttonVariants({ variant: "secondary" })}>
                <KeyRound /> Cambiar contraseña
              </Link>
            </CardContent>
          </Card>
        </div>
        <Card id="actividad">
          <CardHeader>
            <div>
              <CardTitle>Auditoría</CardTitle>
              <CardDescription>Últimas 30 acciones. Este registro no se puede editar ni borrar.</CardDescription>
            </div>
          </CardHeader>
          <ul className="grid gap-3 p-5 pt-4 text-sm">
            {activity.map((a) => (
              <li key={a.id}>
                <p className="text-fg">{auditActionLabel[a.action] ?? a.action}</p>
                <p className="text-xs text-fg-subtle">{a.actor?.name ?? "Sistema"} · {formatTime(a.occurredAt)}, {formatDate(a.occurredAt)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
