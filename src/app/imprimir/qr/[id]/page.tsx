import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { PrintButton } from "@/components/print-button";
import { qrSvg } from "@/lib/qr";
import { requireActor } from "@/server/current";
import { AppError } from "@/server/errors";
import { getSiteForAdmin } from "@/server/sites";

export const metadata: Metadata = { title: "Imprimir QR" };

/** Hoja para imprimir y pegar en la entrada de la sede (tamaño carta / A4). */
export default async function PrintQrPage({ params }: PageProps<"/imprimir/qr/[id]">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const { id } = await params;
  let site;
  try {
    site = await getSiteForAdmin(actor, id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  if (!site.qr) notFound();
  const qr = await qrSvg(site.qr.publicCode);
  return (
    <div className="min-h-dvh bg-white text-[#0b1020]">
      <div className="mx-auto flex max-w-xl flex-col items-center px-8 py-12 text-center print:py-6">
        <div className="mb-8 flex w-full items-center justify-between print:hidden">
          <Logo />
          <PrintButton />
        </div>
        <p className="text-sm font-medium tracking-widest text-[#4a5168] uppercase">{actor.companyName}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{site.name}</h1>
        <p className="mt-6 text-2xl font-semibold">Registra tu entrada y salida</p>
        <div className="mt-6 size-80 border-8 border-white" dangerouslySetInnerHTML={{ __html: qr.svg }} />
        <ol className="mt-8 space-y-2 text-left text-lg">
          <li><b>1.</b> Abre la cámara de tu celular y apunta a este código.</li>
          <li><b>2.</b> Toca el enlace que aparece.</li>
          <li><b>3.</b> Presiona el botón para registrar.</li>
        </ol>
        <p className="mt-8 text-xs text-[#6b7287]">Solo funciona desde el celular vinculado de cada empleado y dentro de la sede. QR versión {site.qr.version}.</p>
      </div>
    </div>
  );
}
