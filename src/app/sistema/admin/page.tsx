import type { Metadata } from "next";
import { Building2, Clock, Download, Info, Timer, UserCheck, Wallet } from "lucide-react";
import { AdminShell, PageHeader } from "@/components/layout/admin-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";

export const metadata: Metadata = { title: "Vista previa · Administrador" };

// Datos de ejemplo SOLO para revisar el diseño. El panel real se conecta a la BD en fases posteriores.
const rows = [
  { name: "Juan Pérez", site: "Villavicencio Centro", shift: "8:00 a. m. – 5:00 p. m.", status: "present", last: "Entrada 7:58 a. m." },
  { name: "Laura Gómez", site: "Villavicencio Centro", shift: "8:00 a. m. – 5:00 p. m.", status: "late", last: "Entrada 8:17 a. m." },
  { name: "Andrés Rojas", site: "Primavera", shift: "6:00 a. m. – 2:00 p. m.", status: "present", last: "Entrada 5:55 a. m." },
  { name: "Camila Torres", site: "Acacías", shift: "Descanso", status: "rest", last: "—" },
  { name: "Diego Martínez", site: "Restrepo", shift: "10:00 p. m. – 6:00 a. m.", status: "absent", last: "Salida ayer 6:04 a. m." },
] as const;

const statusBadge = {
  present: <Badge tone="success" dot>Presente</Badge>,
  late: <Badge tone="warning" dot>Llegó tarde</Badge>,
  absent: <Badge tone="danger" dot>Sin marcar</Badge>,
  rest: <Badge>Descanso</Badge>,
};

export default function AdminPreview() {
  return (
    <AdminShell user={{ name: "María Fernanda Ruiz", companyName: "Panadería El Trigal S.A.S. (demo)" }}>
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary-soft px-3 py-2 text-sm text-primary">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Vista previa del diseño con datos de ejemplo. No está conectada a la base de datos.
      </div>

      <PageHeader
        title="Resumen"
        description="Hoy, todas las sedes"
        actions={
          <Button variant="secondary">
            <Download /> Exportar
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Presentes ahora" value="6 / 8" icon={UserCheck} delta={{ value: "+1", direction: "up" }} footnote="vs. ayer" />
        <StatCard label="Llegadas tarde" value="2" icon={Clock} goodWhen="down" delta={{ value: "−3", direction: "down" }} footnote="esta semana" />
        <StatCard label="Horas extra" value="11 h 20 min" icon={Timer} footnote="3 por aprobar" />
        <StatCard label="Sedes activas" value="4" icon={Building2} footnote="todas con QR vigente" />
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle>Empleados hoy</CardTitle>
          <Wallet className="size-4 text-fg-subtle" aria-hidden />
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm whitespace-nowrap">
            <thead>
              <tr className="border-y border-border bg-bg-subtle/60 text-left text-xs text-fg-subtle">
                <th className="px-5 py-2 font-medium">Empleado</th>
                <th className="px-5 py-2 font-medium">Sede</th>
                <th className="px-5 py-2 font-medium">Horario</th>
                <th className="px-5 py-2 font-medium">Estado</th>
                <th className="px-5 py-2 font-medium">Última marcación</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-b border-border last:border-0 hover:bg-bg-subtle/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.name} className="size-7" />
                      <span className="font-medium text-fg">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-fg-muted">{r.site}</td>
                  <td className="tabular px-5 py-3 text-fg-muted">{r.shift}</td>
                  <td className="px-5 py-3">{statusBadge[r.status]}</td>
                  <td className="tabular px-5 py-3 text-fg-muted">{r.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminShell>
  );
}
