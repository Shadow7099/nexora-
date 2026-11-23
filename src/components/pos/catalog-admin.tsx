"use client";

import { Plus, Sparkles, Trash2, X } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { createFamilyAction, hideCategoryAction, loadYarnShopAction, saveCategoryAction } from "@/app/admin/pos/actions";
import { CategoryArt, YarnBall } from "@/components/pos/art";
import { Button } from "@/components/ui/button";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/server/errors";

type Cat = { id: string; parentId: string | null; name: string; color: string; icon: string };

export const PALETTE = [
  ["Blanco", "#FFFFFF"], ["Crudo", "#F3E9D2"], ["Beige", "#D6C4A8"], ["Gris", "#9CA3AF"], ["Negro", "#1F2937"], ["Café", "#92400E"],
  ["Rojo", "#DC2626"], ["Naranja", "#F97316"], ["Amarillo", "#FACC15"], ["Verde", "#16A34A"], ["Verde menta", "#6EE7B7"], ["Celeste", "#7DD3FC"],
  ["Azul rey", "#1D4ED8"], ["Lila", "#A78BFA"], ["Fucsia", "#C026D3"], ["Rosado", "#F472B6"],
] as const;
const ICONS = [["yarn", "Ovillo"], ["crochet", "Ganchillo"], ["needles", "Agujas"], ["embroidery", "Bordado"], ["accessories", "Accesorios"], ["box", "Caja"]] as const;
const CAT_COLORS = ["#EC4899", "#DB2777", "#9333EA", "#6366F1", "#0EA5E9", "#10B981", "#059669", "#F59E0B", "#D97706", "#EF4444", "#64748B"];

const run = (fn: () => Promise<ActionState>, set: (s: ActionState) => void, busy: (b: boolean) => void) => {
  busy(true);
  startTransition(async () => {
    set(await fn());
    busy(false);
  });
};

export function YarnShopLoader() {
  const [state, setState] = useState<ActionState>(null);
  const [pending, setPending] = useState(false);
  return (
    <div className="grid gap-2">
      <Button size="lg" loading={pending} onClick={() => run(loadYarnShopAction, setState, setPending)}><Sparkles aria-hidden /> Cargar la tienda de hilos de ejemplo</Button>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
    </div>
  );
}

export function CategoryForm({ parents }: { parents: Cat[] }) {
  const [state, dispatch, pending] = useActionState(saveCategoryAction, null);
  const [color, setColor] = useState(CAT_COLORS[0]!);
  const [icon, setIcon] = useState<string>("yarn");
  return (
    <form action={dispatch} className="grid gap-4">
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="icon" value={icon} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="cat-name" label="Nombre"><Input id="cat-name" name="name" placeholder="Hilos de crochet" /></Field>
        <Field id="cat-parent" label="Va dentro de">
          <Select id="cat-parent" name="parentId" defaultValue="">
            <option value="">— Es una categoría principal —</option>
            {parents.map((p) => <option key={p.id} value={p.id}>{p.name} (subcategoría)</option>)}
          </Select>
        </Field>
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Dibujo</legend>
        <div className="flex flex-wrap gap-2">
          {ICONS.map(([k, l]) => (
            <button key={k} type="button" aria-pressed={icon === k} onClick={() => setIcon(k)} className={cn("grid w-24 justify-items-center gap-1 rounded-xl border-2 p-2 text-xs", icon === k ? "border-primary bg-primary-soft" : "border-border")}>
              <CategoryArt icon={k} color={color} className="block size-12" />{l}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Color del cuadro</legend>
        <div className="flex flex-wrap gap-2">
          {CAT_COLORS.map((c) => <button key={c} type="button" aria-label={`Color ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} className={cn("size-10 rounded-full border-4", color === c ? "border-fg" : "border-transparent")} style={{ backgroundColor: c }} />)}
        </div>
      </fieldset>
      <SubmitButton loading={pending} className="justify-self-start"><Plus aria-hidden /> Guardar categoría</SubmitButton>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
    </form>
  );
}

export function HideCategoryButton({ id, name }: { id: string; name: string }) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, setPending] = useState(false);
  return (
    <span className="grid justify-items-end">
      <Button size="sm" variant="ghost" disabled={pending} aria-label={`Quitar ${name}`} onClick={() => confirm(`¿Quitar «${name}» del punto de venta? Sus productos siguen en el inventario.`) && run(() => hideCategoryAction(id), setState, setPending)}><Trash2 aria-hidden /></Button>
      {state && !state.ok && <span className="text-xs text-danger">{state.message}</span>}
    </span>
  );
}

/** Producto con sus variantes: gramajes (cada uno con su precio) × colores. */
export function FamilyForm({ subs }: { subs: (Cat & { parentName: string })[] }) {
  const [subId, setSubId] = useState(subs[0]?.id ?? "");
  const [name, setName] = useState("");
  const [tax, setTax] = useState(19);
  const [sizes, setSizes] = useState<{ label: string; price: string }[]>([{ label: "50 g", price: "" }]);
  const [colors, setColors] = useState<{ name: string; hex: string }[]>([]);
  const [custom, setCustom] = useState({ name: "", hex: "#8B5CF6" });
  const [stock, setStock] = useState("10");
  const [state, setState] = useState<ActionState>(null);
  const [pending, setPending] = useState(false);
  const toggle = (c: { name: string; hex: string }) => setColors((l) => (l.some((x) => x.hex === c.hex && x.name === c.name) ? l.filter((x) => !(x.hex === c.hex && x.name === c.name)) : [...l, c]));
  const variants = sizes.length * Math.max(1, colors.length);

  const submit = () => run(async () => {
    const r = await createFamilyAction({
      subcategoryId: subId, name, taxRate: tax, initialStock: Number(stock) || 0, colors,
      // El precio se escribe con IVA incluido (lo que paga el cliente).
      sizes: sizes.map((s) => ({ label: s.label, price: Math.round((Number(s.price.replace(/\D/g, "")) || 0) / (1 + tax / 100)) })),
    });
    if (r?.ok) { setName(""); setColors([]); }
    return r;
  }, setState, setPending);

  if (!subs.length) return <p className="text-sm text-fg-muted">Primero crea una categoría y, dentro de ella, una subcategoría.</p>;
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="fam-sub" label="Subcategoría">
          <Select id="fam-sub" value={subId} onChange={(e) => setSubId(e.target.value)}>
            {subs.map((s) => <option key={s.id} value={s.id}>{s.parentName} › {s.name}</option>)}
          </Select>
        </Field>
        <Field id="fam-name" label="Nombre del producto"><Input id="fam-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Algodón mercerizado" /></Field>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Gramajes o tamaños y su precio (con IVA)</legend>
        {sizes.map((s, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
            <Input aria-label={`Gramaje ${i + 1}`} value={s.label} onChange={(e) => setSizes((l) => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="50 g" />
            <Input aria-label={`Precio ${i + 1}`} inputMode="numeric" value={s.price} onChange={(e) => setSizes((l) => l.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} placeholder="$ 6.500" />
            <Button variant="ghost" size="icon" aria-label="Quitar gramaje" disabled={sizes.length === 1} onClick={() => setSizes((l) => l.filter((_, j) => j !== i))}><X /></Button>
          </div>
        ))}
        <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => setSizes((l) => [...l, { label: "", price: "" }])}><Plus aria-hidden /> Otro gramaje</Button>
        <p className="text-xs text-fg-muted">Si no tiene gramaje ni tamaño, deja el nombre vacío y escribe solo el precio.</p>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Colores (toca para elegir; opcional)</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {PALETTE.map(([n, h]) => {
            const on = colors.some((c) => c.hex === h && c.name === n);
            return (
              <button key={n} type="button" aria-pressed={on} onClick={() => toggle({ name: n, hex: h })} className={cn("grid justify-items-center gap-1 rounded-xl border-2 p-1.5 text-[11px]", on ? "border-primary bg-primary-soft" : "border-border")}>
                <YarnBall hex={h} className="size-10" />{n}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Field id="fam-cname" label="Otro color"><Input id="fam-cname" value={custom.name} onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))} placeholder="Vino tinto" /></Field>
          <input type="color" aria-label="Elegir el color" value={custom.hex} onChange={(e) => setCustom((c) => ({ ...c, hex: e.target.value.toUpperCase() }))} className="h-10 w-14 rounded-lg border border-border" />
          <Button size="sm" variant="secondary" disabled={!custom.name.trim()} onClick={() => { toggle({ name: custom.name.trim(), hex: custom.hex.toUpperCase() }); setCustom({ name: "", hex: custom.hex }); }}><Plus aria-hidden /> Agregar color</Button>
        </div>
        {colors.length > 0 && <p className="flex flex-wrap gap-1 text-xs">{colors.map((c) => <span key={`${c.name}${c.hex}`} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5"><span className="size-3 rounded-full border border-border" style={{ backgroundColor: c.hex }} />{c.name}</span>)}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="fam-tax" label="IVA">
          <Select id="fam-tax" value={String(tax)} onChange={(e) => setTax(Number(e.target.value))}>
            <option value="19">19 %</option><option value="5">5 %</option><option value="0">Exento (0 %)</option>
          </Select>
        </Field>
        <Field id="fam-stock" label="Unidades iniciales de cada variante (primera sede)"><Input id="fam-stock" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} /></Field>
      </div>
      <Button size="lg" className="justify-self-start" loading={pending} disabled={!name.trim() || !subId} onClick={submit}><Plus aria-hidden /> Crear {variants} producto{variants === 1 ? "" : "s"}</Button>
      <FormAlert message={state?.message} tone={state?.ok ? "success" : "danger"} />
    </div>
  );
}
