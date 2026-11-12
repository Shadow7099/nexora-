import { NextResponse, type NextRequest } from "next/server";
import { getCurrentActor } from "@/server/current";
import { AppError } from "@/server/errors";
import { toPayslipPdf } from "@/server/export";
import { payslips } from "@/server/payroll";

/**
 * Comprobantes de pago en PDF: /admin/pre-nomina/comprobantes/<período>[?estimacion=<id>]
 * Sin `estimacion`, todos los empleados calculados del período (una página cada uno).
 * Verifica sesión y rol en cada descarga; solo datos de la empresa del administrador.
 */
export async function GET(req: NextRequest, { params }: RouteContext<"/admin/pre-nomina/comprobantes/[periodo]">) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.redirect(new URL(`/ingresar?next=${encodeURIComponent("/admin/pre-nomina")}`, req.url));
  if (actor.role !== "COMPANY_ADMIN" || actor.mustChangePassword || !actor.hasConsent) return new NextResponse("No autorizado", { status: 403 });
  const { periodo } = await params;
  const estimateId = req.nextUrl.searchParams.get("estimacion");
  try {
    const data = await payslips(actor, periodo, estimateId);
    const who = estimateId && data.slips[0] ? `-${data.slips[0].employee.firstName}-${data.slips[0].employee.lastName}`.normalize("NFD").replace(/[^\w-]+/g, "").toLowerCase() : "";
    const body = toPayslipPdf(data, new Date());
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nexora-comprobantes-${data.period.start}_${data.period.end}${who}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") return new NextResponse(e.message, { status: 404 });
    if (e instanceof AppError && e.code === "CONFLICT") return new NextResponse(e.message, { status: 409 });
    throw e;
  }
}
