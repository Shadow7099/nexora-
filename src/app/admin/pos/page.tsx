import type { Metadata } from "next";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { PosTerminal } from "@/components/pos/terminal";
import { ModulePending } from "@/components/layout/module-pending";
import { requireActor } from "@/server/current";
import { isMissingTable } from "@/server/errors";
import { posCatalog } from "@/server/pos";

export const metadata: Metadata = { title: "Punto de venta" };

export default async function PosPage({ searchParams }: PageProps<"/admin/pos">) {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const sp = (await searchParams) as Record<string, string | undefined>;
  let catalog: Awaited<ReturnType<typeof posCatalog>> | null = null;
  try {
    catalog = await posCatalog(actor, sp.sede);
  } catch (e) {
    if (!isMissingTable(e)) throw e;
  }
  if (!catalog) return <ModulePending name="El punto de venta" />;
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Punto de venta{catalog.site ? <span className="font-normal text-fg-muted"> · {catalog.site.name}</span> : null}</h1>
        <Link href="/admin/pos/catalogo" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg-muted hover:bg-bg-subtle hover:text-fg"><Settings2 className="size-4" aria-hidden /> Catálogo</Link>
      </div>
      <PosTerminal catalog={catalog} />
    </>
  );
}
