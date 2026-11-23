"use client";

import { ArrowLeft, Banknote, Check, CreditCard, Minus, Plus, Receipt, ShoppingBasket, Smartphone, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { checkoutAction } from "@/app/admin/pos/actions";
import { CategoryArt, YarnBall } from "@/components/pos/art";
import { cn } from "@/lib/utils";
import type { PosCatalog } from "@/server/pos";

/**
 * Punto de venta por cuadros grandes, pensado para personas mayores: un toque
 * por paso (Categoría → Tipo → Producto → Gramaje → Color), letras grandes,
 * colores reales y la venta siempre a la vista. Tocar un color lo agrega.
 */

type Product = PosCatalog["products"][number];
type Screen =
  | { kind: "categories" }
  | { kind: "subs"; catId: string }
  | { kind: "groups"; subId: string }
  | { kind: "sizes"; subId: string; group: string }
  | { kind: "colors"; subId: string; group: string; size: string | null };

const cop = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const METHODS = [
  { id: "CASH", label: "Efectivo", icon: Banknote },
  { id: "TRANSFER", label: "Nequi / Transferencia", icon: Smartphone },
  { id: "CARD", label: "Tarjeta", icon: CreditCard },
] as const;

export function PosTerminal({ catalog }: { catalog: PosCatalog }) {
  const router = useRouter();
  const [stack, setStack] = useState<Screen[]>([{ kind: "categories" }]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [flash, setFlash] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [paying, setPaying] = useState(false);
  const screen = stack.at(-1)!;
  const byId = useMemo(() => new Map(catalog.products.map((p) => [p.id, p])), [catalog.products]);
  const cats = catalog.categories;
  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);

  const productsOf = (subId: string) => catalog.products.filter((p) => p.posCategoryId === subId);
  const groupsOf = (subId: string) => [...new Set(productsOf(subId).map((p) => p.posGroup ?? p.name))];
  // Gramajes en orden: 50 g, 100 g, 125 g (por el número), luego el texto.
  const num = (s: string) => Number.parseFloat(s.replace(",", ".")) || Number.POSITIVE_INFINITY;
  const sizesOf = (subId: string, group: string) => [...new Set(productsOf(subId).filter((p) => (p.posGroup ?? p.name) === group).map((p) => p.variantSize ?? ""))].sort((a, b) => num(a) - num(b) || a.localeCompare(b, "es"));

  // Avanzar saltando los pasos con una sola opción (menos toques).
  const go = (next: Screen) => {
    let s = next;
    for (;;) {
      if (s.kind === "groups") {
        const g = groupsOf(s.subId);
        if (g.length === 1) { s = { kind: "sizes", subId: s.subId, group: g[0]! }; continue; }
      }
      if (s.kind === "sizes") {
        const z = sizesOf(s.subId, s.group);
        if (z.length === 1) { s = { kind: "colors", subId: s.subId, group: s.group, size: z[0] || null }; continue; }
      }
      break;
    }
    setStack((st) => [...st, s]);
  };
  const back = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
  const home = () => setStack([{ kind: "categories" }]);

  const add = (p: Product) => {
    const inCart = cart[p.id] ?? 0;
    if (p.stock != null && inCart + 1 > p.stock) {
      setFlash(p.stock <= 0 ? `«${p.name}» está agotado` : `Solo quedan ${p.stock} de «${p.name}»`);
      return;
    }
    setCart((c) => ({ ...c, [p.id]: inCart + 1 }));
    setFlash(`✓ Agregado: ${p.name}`);
  };
  const setQty = (id: string, q: number) => {
    const p = byId.get(id);
    if (p?.stock != null && q > p.stock) { setFlash(`Solo quedan ${p.stock}`); return; }
    setCart((c) => {
      const n = { ...c };
      if (q <= 0) delete n[id];
      else n[id] = q;
      return n;
    });
  };
  const lines = Object.entries(cart).map(([id, q]) => ({ p: byId.get(id)!, q })).filter((l) => l.p);
  const total = lines.reduce((a, l) => a + l.p.finalPrice * l.q, 0);
  const count = lines.reduce((a, l) => a + l.q, 0);

  // Título y migas de pan del paso actual.
  const crumbs: string[] = [];
  let title = "¿Qué busca el cliente?";
  if (screen.kind !== "categories") {
    const sub = screen.kind === "subs" ? null : catById.get(screen.subId);
    const cat = screen.kind === "subs" ? catById.get(screen.catId) : sub ? catById.get(sub.parentId ?? "") : null;
    if (cat) crumbs.push(cat.name);
    if (sub) crumbs.push(sub.name);
    if (screen.kind === "sizes" || screen.kind === "colors") crumbs.push(screen.group);
    if (screen.kind === "colors" && screen.size) crumbs.push(screen.size);
    title = screen.kind === "subs" ? "Elija el tipo" : screen.kind === "groups" ? "Elija el producto" : screen.kind === "sizes" ? "Elija el gramaje o tamaño" : "Toque el color para agregarlo";
  }

  const tile = "group relative grid min-h-44 place-items-center gap-2 rounded-3xl border-4 border-transparent bg-surface p-4 text-center shadow-card transition active:scale-[0.97] hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-label="Productos" className="grid min-w-0 content-start gap-4 pb-28 lg:pb-0">
        {/* Encabezado: atrás, pasos y sede */}
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {stack.length > 1 && (
              <button type="button" onClick={back} className="inline-flex h-16 shrink-0 items-center gap-2 rounded-2xl bg-fg px-6 text-xl font-semibold text-bg shadow-card active:scale-[0.97]">
                <ArrowLeft className="size-7" aria-hidden /> Atrás
              </button>
            )}
            {crumbs.length > 0 && (
              <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 text-lg text-fg-muted">
                <button type="button" onClick={home} className="underline-offset-4 hover:underline">Inicio</button>
                {crumbs.map((c) => <span key={c}>› {c}</span>)}
              </p>
            )}
            {catalog.sites.length > 1 && stack.length === 1 && (
              <label className="ml-auto flex items-center gap-2 text-base">
                <span className="text-fg-muted">Sede</span>
                <select value={catalog.site?.id} onChange={(e) => router.push(`/admin/pos?sede=${e.target.value}`)} className="h-12 rounded-xl border-2 border-border bg-surface px-3 text-lg font-medium">
                  {catalog.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            )}
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
        </div>

        {flash && (
          <p role="status" className={cn("flex items-center justify-between gap-3 rounded-2xl px-5 py-4 text-xl font-semibold", flash.startsWith("✓") ? "bg-success-soft text-success" : "bg-warning-soft text-fg")}>
            {flash}
            <button type="button" onClick={() => setFlash(null)} aria-label="Cerrar aviso" className="grid size-10 place-items-center rounded-xl hover:bg-black/5"><X className="size-6" /></button>
          </p>
        )}

        {/* Cuadros */}
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(11.5rem,1fr))]">
          {screen.kind === "categories" && cats.filter((c) => !c.parentId).map((c) => (
            <li key={c.id}>
              <button type="button" className={cn(tile, "w-full")} style={{ backgroundColor: `${c.color}1A` }} onClick={() => go({ kind: "subs", catId: c.id })}>
                <CategoryArt icon={c.icon} color={c.color} className="block size-24" />
                <span className="text-xl leading-tight font-bold break-words sm:text-2xl">{c.name}</span>
              </button>
            </li>
          ))}
          {screen.kind === "subs" && cats.filter((c) => c.parentId === screen.catId).map((c) => (
            <li key={c.id}>
              <button type="button" className={cn(tile, "w-full")} style={{ backgroundColor: `${c.color}1A` }} onClick={() => go({ kind: "groups", subId: c.id })}>
                <CategoryArt icon={c.icon} color={c.color} className="block size-24" />
                <span className="text-xl leading-tight font-bold break-words sm:text-2xl">{c.name}</span>
                <span className="text-base text-fg-muted">{groupsOf(c.id).length} producto{groupsOf(c.id).length === 1 ? "" : "s"}</span>
              </button>
            </li>
          ))}
          {screen.kind === "groups" && groupsOf(screen.subId).map((g) => {
            const sub = catById.get(screen.subId)!;
            const items = productsOf(screen.subId).filter((p) => (p.posGroup ?? p.name) === g);
            const from = Math.min(...items.map((p) => p.finalPrice));
            const swatch = items.find((p) => p.variantHex)?.variantHex;
            return (
              <li key={g}>
                <button type="button" className={cn(tile, "w-full")} onClick={() => go({ kind: "sizes", subId: screen.subId, group: g })}>
                  {swatch ? <YarnBall hex={swatch} className="size-24" /> : <CategoryArt icon={sub.icon} color={sub.color} className="block size-24" />}
                  <span className="text-xl leading-tight font-bold break-words sm:text-2xl">{g}</span>
                  <span className="text-lg text-fg-muted">desde {cop(from)}</span>
                </button>
              </li>
            );
          })}
          {screen.kind === "sizes" && sizesOf(screen.subId, screen.group).map((z) => {
            const items = productsOf(screen.subId).filter((p) => (p.posGroup ?? p.name) === screen.group && (p.variantSize ?? "") === z);
            return (
              <li key={z || "unico"}>
                <button type="button" className={cn(tile, "w-full")} onClick={() => go({ kind: "colors", subId: screen.subId, group: screen.group, size: z || null })}>
                  <span className="text-4xl font-black tracking-tight whitespace-nowrap sm:text-5xl">{z || "Único"}</span>
                  <span className="text-2xl font-semibold text-primary">{cop(items[0]!.finalPrice)}</span>
                  <span className="text-base text-fg-muted">{items.filter((p) => p.variantColor).length ? `${items.length} colores` : ""}</span>
                </button>
              </li>
            );
          })}
          {screen.kind === "colors" && productsOf(screen.subId).filter((p) => (p.posGroup ?? p.name) === screen.group && (p.variantSize ?? null) === screen.size).map((p) => {
            const out = p.stock != null && p.stock <= 0;
            const sub = catById.get(screen.subId)!;
            return (
              <li key={p.id}>
                <button type="button" disabled={out} aria-label={`${p.name}, ${cop(p.finalPrice)}${out ? ", agotado" : ""}`} className={cn(tile, "w-full disabled:opacity-40", cart[p.id] && "border-success")} onClick={() => add(p)}>
                  {cart[p.id] ? <span className="absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-success text-xl font-bold text-white">{cart[p.id]}</span> : null}
                  {p.variantHex ? <YarnBall hex={p.variantHex} className="size-28" /> : <CategoryArt icon={sub.icon} color={sub.color} className="block size-24" />}
                  <span className="text-xl leading-tight font-bold break-words sm:text-2xl">{p.variantColor ?? p.name}</span>
                  <span className="text-xl font-semibold text-primary">{cop(p.finalPrice)}</span>
                  <span className={cn("text-base", out ? "font-bold text-danger" : "text-fg-muted")}>{out ? "Agotado" : p.stock == null ? "" : `Quedan ${p.stock}`}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {screen.kind === "categories" && cats.length === 0 && (
          <div className="grid justify-items-center gap-3 rounded-3xl border-2 border-dashed border-border p-10 text-center">
            <ShoppingBasket className="size-14 text-fg-subtle" aria-hidden />
            <p className="text-2xl font-semibold">Aún no hay productos en el punto de venta</p>
            <Link href="/admin/pos/catalogo" className="rounded-2xl bg-primary px-6 py-4 text-xl font-semibold text-primary-fg">Armar el catálogo</Link>
          </div>
        )}
      </section>

      {/* Venta actual */}
      <aside aria-label="Venta actual" className={cn("fixed inset-0 z-40 bg-bg p-4 lg:static lg:z-auto lg:block lg:p-0", showCart ? "block" : "hidden")}>
        <div className="flex h-full flex-col gap-3 rounded-3xl border-2 border-border bg-surface p-4 shadow-card lg:sticky lg:top-20 lg:h-[calc(100dvh-7rem)]">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Venta actual</h2>
            <button type="button" onClick={() => setShowCart(false)} className="grid size-12 place-items-center rounded-xl lg:hidden" aria-label="Seguir eligiendo"><X className="size-7" /></button>
          </div>
          {lines.length === 0 ? (
            <p className="grid flex-1 place-items-center text-center text-xl text-fg-muted">Toque un color para agregarlo aquí.</p>
          ) : (
            <ul className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1">
              {lines.map(({ p, q }) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-bg-subtle p-3">
                  {p.variantHex ? <YarnBall hex={p.variantHex} className="size-12 shrink-0" /> : <span className="size-12 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-lg leading-tight font-semibold">{p.name}</p>
                    <p className="text-base text-fg-muted">{cop(p.finalPrice * q)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setQty(p.id, q - 1)} className="grid size-12 place-items-center rounded-xl border-2 border-border bg-surface" aria-label={`Quitar uno de ${p.name}`}>{q === 1 ? <Trash2 className="size-6 text-danger" /> : <Minus className="size-6" />}</button>
                    <span className="w-9 text-center text-2xl font-bold tabular-nums">{q}</span>
                    <button type="button" onClick={() => setQty(p.id, q + 1)} className="grid size-12 place-items-center rounded-xl border-2 border-border bg-surface" aria-label={`Agregar uno de ${p.name}`}><Plus className="size-6" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 border-t-2 border-border pt-3">
            <p className="flex items-baseline justify-between text-2xl font-semibold">Total <span className="text-4xl font-black tabular-nums">{cop(total)}</span></p>
            <button type="button" disabled={!lines.length} onClick={() => setPaying(true)} className="h-20 rounded-2xl bg-success text-3xl font-bold text-white shadow-card active:scale-[0.98] disabled:opacity-40">
              Cobrar
            </button>
            {lines.length > 0 && <button type="button" onClick={() => confirm("¿Borrar toda la venta?") && setCart({})} className="text-lg text-fg-muted underline">Borrar venta</button>}
          </div>
        </div>
      </aside>

      {/* Barra inferior en celular y tableta */}
      {!showCart && (
        <button type="button" onClick={() => setShowCart(true)} className="fixed inset-x-3 bottom-3 z-30 flex h-20 items-center justify-between rounded-2xl bg-fg px-5 text-bg shadow-xl lg:hidden">
          <span className="flex items-center gap-2 text-xl font-semibold"><ShoppingBasket className="size-7" aria-hidden /> {count} en la venta</span>
          <span className="text-2xl font-black tabular-nums">{cop(total)} ›</span>
        </button>
      )}

      {paying && (
        <Checkout
          total={total}
          siteId={catalog.site?.id ?? ""}
          items={lines.map((l) => ({ productId: l.p.id, quantity: l.q }))}
          onClose={() => setPaying(false)}
          onDone={() => {
            setCart({});
            setPaying(false);
            setShowCart(false);
            setFlash(null);
            home();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function Checkout({ total, siteId, items, onClose, onDone }: { total: number; siteId: string; items: { productId: string; quantity: number }[]; onClose: () => void; onDone: () => void }) {
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("CASH");
  const [received, setReceived] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; label: string; change: number | null } | null>(null);
  const bills = [...new Set([total, ...[10_000, 20_000, 50_000, 100_000].map((b) => Math.ceil(total / b) * b)])].sort((a, b) => a - b).slice(0, 4);
  const change = method === "CASH" && received != null ? received - total : null;
  const canPay = method !== "CASH" || (received != null && received >= total);

  return (
    <div role="dialog" aria-modal="true" aria-label="Cobrar" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-3">
      <div className="grid max-h-[95dvh] w-full max-w-2xl gap-5 overflow-y-auto rounded-3xl bg-surface p-6 shadow-xl">
        {done ? (
          <div className="grid justify-items-center gap-4 py-6 text-center">
            <span className="grid size-24 place-items-center rounded-full bg-success text-white"><Check className="size-14" aria-hidden /></span>
            <p className="text-4xl font-black">¡Venta lista!</p>
            <p className="text-2xl">{done.label} · {cop(total)}</p>
            {done.change != null && done.change > 0 && <p className="rounded-2xl bg-warning-soft px-6 py-4 text-3xl font-bold">Devuelta: {cop(done.change)}</p>}
            <div className="flex flex-wrap justify-center gap-3">
              <a href={`/admin/ventas/${done.id}/comprobante`} target="_blank" rel="noreferrer" className="inline-flex h-16 items-center gap-2 rounded-2xl border-2 border-border px-6 text-xl font-semibold"><Receipt className="size-6" aria-hidden /> Comprobante</a>
              <button type="button" onClick={onDone} className="h-16 rounded-2xl bg-primary px-8 text-2xl font-bold text-primary-fg">Nueva venta</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-semibold">Total a cobrar</p>
              <button type="button" onClick={onClose} className="grid size-12 place-items-center rounded-xl" aria-label="Volver a la venta"><X className="size-7" /></button>
            </div>
            <p className="text-center text-6xl font-black tabular-nums">{cop(total)}</p>
            <fieldset className="grid gap-3">
              <legend className="mb-2 text-xl font-semibold">¿Cómo paga?</legend>
              <div className="grid grid-cols-3 gap-3">
                {METHODS.map((m) => (
                  <button key={m.id} type="button" aria-pressed={method === m.id} onClick={() => { setMethod(m.id); setReceived(null); }} className={cn("grid min-h-28 place-items-center gap-1 rounded-2xl border-4 p-3 text-lg font-semibold", method === m.id ? "border-primary bg-primary-soft" : "border-border")}>
                    <m.icon className="size-9" aria-hidden /> {m.label}
                  </button>
                ))}
              </div>
            </fieldset>
            {method === "CASH" && (
              <fieldset className="grid gap-3">
                <legend className="mb-2 text-xl font-semibold">¿Con cuánto paga?</legend>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {bills.map((b) => (
                    <button key={b} type="button" aria-pressed={received === b} onClick={() => setReceived(b)} className={cn("h-20 rounded-2xl border-4 text-2xl font-bold tabular-nums", received === b ? "border-primary bg-primary-soft" : "border-border")}>
                      {b === total ? "Exacto" : cop(b)}
                    </button>
                  ))}
                </div>
                <label className="grid gap-1 text-lg">
                  Otro valor
                  <input type="number" inputMode="numeric" min={0} step={1000} value={received ?? ""} onChange={(e) => setReceived(e.target.value ? Number(e.target.value) : null)} className="h-16 rounded-2xl border-2 border-border px-4 text-2xl" />
                </label>
                {change != null && (
                  <p className={cn("rounded-2xl px-5 py-4 text-center text-3xl font-bold", change >= 0 ? "bg-warning-soft" : "bg-danger-soft text-danger")}>
                    {change >= 0 ? `Devuelta: ${cop(change)}` : `Faltan ${cop(-change)}`}
                  </p>
                )}
              </fieldset>
            )}
            {error && <p role="alert" className="rounded-2xl bg-danger-soft px-5 py-4 text-xl text-danger">{error}</p>}
            <button
              type="button"
              disabled={!canPay || pending || !siteId}
              onClick={() => start(async () => {
                setError(null);
                const r = await checkoutAction({ siteId, method, items, received: method === "CASH" ? received ?? undefined : undefined });
                if (!r.ok) return setError(r.message);
                setDone({ id: r.id, label: r.label, change: r.change });
              })}
              className="h-20 rounded-2xl bg-success text-3xl font-bold text-white disabled:opacity-40"
            >
              {pending ? "Cobrando…" : "Terminar venta"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
