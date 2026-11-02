import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Sheet } from "lucide-react";
import { PageHeader } from "@/components/layout/admin-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { displayCell, formatDateTime, formatIsoDate, isReportKey } from "@/lib/report-table";
import { requireActor } from "@/server/current";
import { AppError } from "@/server/errors";
import { buildReport } from "@/server/reports";

export const metadata: Metadata = { title: "Reporte" };

const PREVIEW_ROWS = 300;
const NUMERIC = new Set(["int", "hours", "money", "percent"]);

/** Vista previa en pantalla del mismo reporte que se descarga (mismos números). */
export default async function ReportPreviewPage({ params, searchParams }: PageProps<"/admin/reportes/[tipo]">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const { tipo } = await params;
  if (!isReportKey(tipo)) notFound();
  const sp = await searchParams;
  let t: Awaited<ReturnType<typeof buildReport>>;
  try {
    t = await buildReport(actor, tipo, sp);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const query = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string")).toString();
  const back = `/admin/reportes${query ? `?${query}` : ""}`;
  const dl = (formato: string) => `/admin/reportes/descargar/${tipo}?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(query)), formato })}`;

  return (
    <>
      <Link href={back} className="mb-3 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Volver a reportes</Link>
      <PageHeader
        title={t.title}
        description={`${t.meta.companyName} · ${formatIsoDate(t.meta.from)} a ${formatIsoDate(t.meta.to)}${t.meta.filters.length ? ` · ${t.meta.filters.join(" · ")}` : ""} · generado ${formatDateTime(t.meta.generatedAt, t.meta.timeZone)}`}
        actions={
          <>
            <a href={dl("xlsx")} className={buttonVariants({ variant: "secondary" })}><Sheet aria-hidden /> Excel</a>
            <a href={dl("csv")} className={buttonVariants({ variant: "secondary" })}>CSV</a>
            <a href={dl("pdf")} className={buttonVariants({ variant: "secondary" })}><FileText aria-hidden /> PDF</a>
          </>
        }
      />
      {t.notes.length > 0 && <div className="mb-4 grid gap-1 text-sm text-fg-muted">{t.notes.map((n) => <p key={n}>{n}</p>)}</div>}
      <Card className="overflow-hidden">
        {t.rows.length === 0 ? (
          <EmptyState icon={FileText} title="Sin datos para el período y los filtros elegidos" />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-bg-subtle/60 text-left text-xs text-fg-subtle">
                  {t.columns.map((c) => <th key={c.key} className={`px-4 py-2 font-medium ${NUMERIC.has(c.kind) ? "text-right" : ""}`}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {t.rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {t.columns.map((c) => <td key={c.key} className={`px-4 py-2 ${NUMERIC.has(c.kind) ? "tabular text-right" : ""}`}>{displayCell(r[c.key] ?? null, c.kind)}</td>)}
                  </tr>
                ))}
              </tbody>
              {Object.keys(t.totals).length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-bg-subtle/60 font-medium">
                    {t.columns.map((c, i) => (
                      <td key={c.key} className={`px-4 py-2 ${NUMERIC.has(c.kind) ? "tabular text-right" : ""}`}>{i === 0 ? "Total" : c.key in t.totals ? displayCell(t.totals[c.key]!, c.kind) : ""}</td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Card>
      {t.rows.length > PREVIEW_ROWS && <p className="mt-3 text-sm text-fg-muted">Se muestran {PREVIEW_ROWS} de {t.rows.length} filas. Descarga el archivo para verlas todas (los totales incluyen todas).</p>}
    </>
  );
}
