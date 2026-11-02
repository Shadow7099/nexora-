import { NextResponse, type NextRequest } from "next/server";
import { reportFileName, toCsv } from "@/lib/report-table";
import { getCurrentActor } from "@/server/current";
import { AppError } from "@/server/errors";
import { toPdf, toXlsx } from "@/server/export";
import { assertReportKey, buildReport } from "@/server/reports";

/**
 * Descarga de un reporte: /admin/reportes/descargar/asistencia?formato=xlsx&desde=…&hasta=…&sede=…&empleado=…
 * Verifica sesión y rol en cada descarga; los datos son solo de la empresa del administrador.
 */
const TYPES = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const;

export async function GET(req: NextRequest, { params }: RouteContext<"/admin/reportes/descargar/[tipo]">) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.redirect(new URL(`/ingresar?next=${encodeURIComponent("/admin/reportes")}`, req.url));
  if (actor.role !== "COMPANY_ADMIN" || actor.mustChangePassword || !actor.hasConsent) return new NextResponse("No autorizado", { status: 403 });
  const { tipo } = await params;
  const format = req.nextUrl.searchParams.get("formato") ?? "xlsx";
  if (!(format in TYPES)) return new NextResponse("Formato no válido", { status: 400 });
  try {
    assertReportKey(tipo);
    const table = await buildReport(actor, tipo, Object.fromEntries(req.nextUrl.searchParams));
    const body = format === "csv" ? toCsv(table) : format === "pdf" ? toPdf(table) : await toXlsx(table);
    return new NextResponse(new Uint8Array(typeof body === "string" ? Buffer.from(body, "utf8") : body), {
      headers: {
        "Content-Type": TYPES[format as keyof typeof TYPES],
        "Content-Disposition": `attachment; filename="${reportFileName(table, format)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") return new NextResponse(e.message, { status: 404 });
    throw e;
  }
}
