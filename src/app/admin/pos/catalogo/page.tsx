import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CategoryForm, FamilyForm, HideCategoryButton, YarnShopLoader } from "@/components/pos/catalog-admin";
import { CategoryArt } from "@/components/pos/art";
import { PageHeader } from "@/components/layout/admin-shell";
import { ModulePending } from "@/components/layout/module-pending";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActor } from "@/server/current";
import { isMissingTable } from "@/server/errors";
import { posCatalog } from "@/server/pos";

export const metadata: Metadata = { title: "Catálogo del punto de venta" };

export default async function PosCatalogPage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  let catalog: Awaited<ReturnType<typeof posCatalog>> | null = null;
  try {
    catalog = await posCatalog(actor);
  } catch (e) {
    if (!isMissingTable(e)) throw e;
  }
  if (!catalog) return <ModulePending name="El catálogo del punto de venta" />;
  const parents = catalog.categories.filter((c) => !c.parentId);
  const subs = catalog.categories.filter((c) => c.parentId).map((c) => ({ ...c, parentName: parents.find((p) => p.id === c.parentId)?.name ?? "" }));
  const count = (subId: string) => catalog.products.filter((p) => p.posCategoryId === subId).length;
  return (
    <>
      <Link href="/admin/pos" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Punto de venta</Link>
      <PageHeader title="Catálogo del punto de venta" description="Categorías y subcategorías con su dibujo, y productos con sus gramajes y colores. Cada variante queda en el inventario con su propio stock." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="grid content-start gap-6">
          {parents.length === 0 && (
            <Card><CardHeader><CardTitle>Empezar rápido</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm"><p className="text-fg-muted">Carga una tienda de hilos completa (hilos de crochet, para bordar y de coser, lanas y accesorios, con gramajes, colores, precios y stock) y ajústala después.</p><YarnShopLoader /></CardContent></Card>
          )}
          <Card>
            <CardHeader><CardTitle>Categorías</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              {parents.length === 0 ? <p className="text-sm text-fg-muted">Aún no hay categorías.</p> : (
                <ul className="grid gap-3">
                  {parents.map((p) => (
                    <li key={p.id} className="rounded-xl border border-border p-3">
                      <p className="flex items-center gap-3 font-semibold"><CategoryArt icon={p.icon} color={p.color} className="block size-10" /><span className="flex-1">{p.name}</span><HideCategoryButton id={p.id} name={p.name} /></p>
                      <ul className="mt-2 grid gap-1 pl-12 text-sm">
                        {subs.filter((s) => s.parentId === p.id).map((s) => (
                          <li key={s.id} className="flex items-center gap-2"><CategoryArt icon={s.icon} color={s.color} className="block size-7" /><span className="flex-1">{s.name} <span className="text-fg-subtle">· {count(s.id)} variantes</span></span><HideCategoryButton id={s.id} name={s.name} /></li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
              <details className="rounded-xl border border-dashed border-border p-3">
                <summary className="cursor-pointer font-medium">Nueva categoría o subcategoría</summary>
                <div className="mt-3"><CategoryForm parents={parents} /></div>
              </details>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Nuevo producto con sus variantes</CardTitle></CardHeader>
          <CardContent><FamilyForm subs={subs} /></CardContent>
        </Card>
      </div>
    </>
  );
}
