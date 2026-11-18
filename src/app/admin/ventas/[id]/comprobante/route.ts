import { NextResponse, type NextRequest } from "next/server";
import { getCurrentActor } from "@/server/current";
import { AppError } from "@/server/errors";
import { toSalePdf } from "@/server/export";
import { getSale } from "@/server/sales";

/** Comprobante de venta en PDF. Verifica sesión y rol; solo ventas de la empresa del administrador. */
export async function GET(req: NextRequest, { params }: RouteContext<"/admin/ventas/[id]/comprobante">) {
  const actor = await getCurrentActor();
  if (!actor) return NextResponse.redirect(new URL(`/ingresar?next=${encodeURIComponent("/admin/ventas")}`, req.url));
  if (actor.role !== "COMPANY_ADMIN" || actor.mustChangePassword || !actor.hasConsent) return new NextResponse("No autorizado", { status: 403 });
  const { id } = await params;
  try {
    const sale = await getSale(actor, id);
    return new NextResponse(new Uint8Array(toSalePdf(sale, new Date())), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="nexora-venta-${sale.label}.pdf"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") return new NextResponse(e.message, { status: 404 });
    throw e;
  }
}
