import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatParamValue } from "@/lib/labor-parameter-info";
import type { listLaborParameters } from "@/server/payroll";

type Row = Awaited<ReturnType<typeof listLaborParameters>>[number];

const fmt = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const date = (d: Date) => fmt.format(d);

/** Tabla de parámetros laborales agrupada por tema, con vigencia, norma y estado de validación. */
export function ParameterTable({ rows, today, action }: { rows: Row[]; today: Date; action?: (row: Row) => React.ReactNode }) {
  const groups = [...new Set(rows.map((r) => r.group))];
  return (
    <div className="grid gap-6">
      {groups.map((g) => (
        <Card key={g} className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle>{g}</CardTitle>
          </CardHeader>
          <div className="relative overflow-x-auto border-t border-border">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle/60 text-left text-xs text-fg-subtle">
                  <th className="px-5 py-2 font-medium">Parámetro</th>
                  <th className="px-5 py-2 text-right font-medium">Valor</th>
                  <th className="px-5 py-2 font-medium">Vigencia</th>
                  <th className="px-5 py-2 font-medium">Norma</th>
                  <th className="px-5 py-2 font-medium">Estado</th>
                  {action && <th className="px-5 py-2"><span className="sr-only">Acciones</span></th>}
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((r) => r.group === g)
                  .map((r) => {
                    const current = r.validFrom <= today && (!r.validTo || r.validTo >= today);
                    const future = r.validFrom > today;
                    return (
                      <tr key={r.id} className={current ? "border-b border-border last:border-0" : "border-b border-border text-fg-muted last:border-0"}>
                        <td className="px-5 py-3 align-top">
                          <p className={current ? "font-medium" : ""}>{r.label}</p>
                          {r.companyId && <p className="text-xs text-primary">Valor propio de la empresa</p>}
                          {r.notes && <p className="mt-0.5 max-w-sm text-xs text-fg-subtle">{r.notes}</p>}
                        </td>
                        <td className="tabular px-5 py-3 text-right align-top whitespace-nowrap">{formatParamValue(r.unit, r.value)}</td>
                        <td className="px-5 py-3 align-top whitespace-nowrap">
                          {date(r.validFrom)} – {r.validTo ? date(r.validTo) : "sin fecha final"}
                          <div className="mt-1">{current ? <Badge tone="primary">Vigente</Badge> : future ? <Badge tone="accent">Futuro</Badge> : <Badge>Histórico</Badge>}</div>
                        </td>
                        <td className="max-w-xs px-5 py-3 align-top text-xs">
                          <p>{r.legalSource}</p>
                          {r.sourceUrl && (
                            <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-primary hover:underline">
                              Ver norma <ExternalLink className="size-3" aria-hidden />
                            </a>
                          )}
                        </td>
                        <td className="px-5 py-3 align-top whitespace-nowrap">
                          {r.verifiedAt ? <Badge tone="success" dot>Validado {date(r.verifiedAt)}</Badge> : <Badge tone="warning">Sin validar</Badge>}
                        </td>
                        {action && <td className="px-5 py-3 text-right align-top">{action(r)}</td>}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
