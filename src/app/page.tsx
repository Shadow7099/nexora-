import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  Fingerprint,
  Lock,
  MapPin,
  Minus,
  QrCode,
  Scale,
  Smartphone,
  Timer,
  Wallet,
  X,
} from "lucide-react";
import { ChatWidget } from "@/components/landing/chat-widget";
import { LeadForm } from "@/components/landing/lead-form";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "Nexora · Control de asistencia con QR y pre-nómina para pymes colombianas" },
  description:
    "Tus empleados marcan entrada y salida con un QR desde su celular. Tú ves quién llegó, las horas extra y cuánto te cuesta la nómina, con las reglas laborales colombianas. Sin comprar equipos.",
  openGraph: {
    title: "Nexora · Control inteligente. Empresas eficientes.",
    description: "Asistencia con QR desde el celular, horas extra con aprobación y pre-nómina estimada para pymes colombianas.",
    locale: "es_CO",
    type: "website",
  },
};

const nav = [
  ["#como-funciona", "Cómo funciona"],
  ["#funciones", "Funciones"],
  ["#precios", "Precios"],
  ["#preguntas", "Preguntas"],
] as const;

const pains = [
  { icon: ClipboardList, title: "Planillas que nadie revisa", text: "Horas escritas a mano, tachones y firmas de favor. Al final de la quincena, nadie sabe cuánto se trabajó." },
  { icon: Scale, title: "Recargos que cambian", text: "Nocturno desde las 7 p. m., dominical que sube cada año, jornada de 42 horas. Un error y pagas de más o te reclaman." },
  { icon: MapPin, title: "Sedes que no puedes ver", text: "Si tienes varios locales, no sabes quién abrió a tiempo ni quién se fue antes, salvo que estés ahí." },
];

const steps = [
  { icon: QrCode, title: "Pega un QR en cada sede", text: "Lo imprimes desde Nexora. No compras relojes ni lectores de huella." },
  { icon: Smartphone, title: "El empleado marca con su celular", text: "Escanea, confirma con su huella y listo. Nexora verifica que esté en la sede y que sea su propio celular." },
  { icon: BarChart3, title: "Tú ves todo y estimas la nómina", text: "Asistencia en tiempo real, horas extra para aprobar y la pre-nómina de la quincena lista para tu contador." },
];

const features = [
  { icon: Fingerprint, title: "Nadie marca por otro", text: "Celular vinculado a cada empleado y huella o Face ID en cada marcación. Nexora no guarda la huella ni el rostro." },
  { icon: MapPin, title: "Solo en la sede", text: "La ubicación se toma únicamente al marcar y se compara con el área de la sede. Sin rastreo." },
  { icon: Clock, title: "Hora del servidor", text: "La hora la pone Nexora, no el celular. No se puede adelantar ni atrasar." },
  { icon: CalendarClock, title: "Turnos reales", text: "Madrugada, nocturnos que pasan la medianoche, turnos partidos y rotativos de 14 días." },
  { icon: Timer, title: "Horas extra con aprobación", text: "Se detectan solas. Tú decides cuántas autorizas; el tiempo registrado nunca se borra." },
  { icon: Wallet, title: "Pre-nómina explicada", text: "Salario, recargos, extras, aportes y prestaciones, cada línea con su cálculo y la norma que la sustenta." },
  { icon: FileSpreadsheet, title: "Reportes para el contador", text: "Asistencia, horas extra, novedades y pre-nómina en Excel, CSV o PDF." },
  { icon: Lock, title: "Registros inalterables", text: "Las marcaciones no se pueden editar ni borrar. Las correcciones quedan aparte, con autor y motivo." },
];

type Cell = "yes" | "no" | "partial" | string;
const comparison: { row: string; sheet: Cell; clock: Cell; nexora: Cell }[] = [
  { row: "Equipos que debes comprar", sheet: "Ninguno", clock: "Un reloj por sede", nexora: "Ninguno: un QR impreso" },
  { row: "Evita que otro marque por el empleado", sheet: "no", clock: "yes", nexora: "yes" },
  { row: "Verifica que esté en la sede", sheet: "no", clock: "yes", nexora: "yes" },
  { row: "Ves la asistencia de todas las sedes en tiempo real", sheet: "no", clock: "partial", nexora: "yes" },
  { row: "Detecta horas extra y te pide aprobarlas", sheet: "no", clock: "partial", nexora: "yes" },
  { row: "Aplica los recargos colombianos según la fecha", sheet: "no", clock: "partial", nexora: "yes" },
  { row: "Registros que no se pueden alterar", sheet: "no", clock: "partial", nexora: "yes" },
];

const rules = [
  ["7:00 p. m.", "inicia el recargo nocturno (35 %)", "Ley 2466 de 2025"],
  ["90 %", "recargo dominical y festivo desde el 1 de julio de 2026 (100 % desde julio de 2027)", "Ley 2466 de 2025"],
  ["42 h", "jornada máxima semanal desde el 15 de julio de 2026", "Ley 2101 de 2021"],
] as const;

const plans = [
  { name: "Básico", employees: "Hasta 5 empleados", price: "59.900", featured: false },
  { name: "Empresa", employees: "Hasta 15 empleados", price: "99.900", featured: true },
  { name: "Negocios", employees: "Hasta 30 empleados", price: "149.900", featured: false },
];
const planIncludes = ["Sedes y QR", "Marcación con celular y huella", "Horas extra y novedades", "Pre-nómina estimada", "Reportes Excel, CSV y PDF"];

const faqs = [
  ["¿Tengo que comprar algún equipo?", "No. Imprimes un código QR por sede desde Nexora y cada empleado marca con su propio celular. Funciona en el navegador: no hay que instalar ninguna app."],
  ["¿Y si un empleado no tiene celular o datos?", "Puedes desactivar la exigencia de celular vinculado, o el administrador registra esa jornada a mano con un motivo, que queda en la auditoría."],
  ["¿Pueden marcar desde la casa?", "No. Nexora compara la ubicación del celular con el área de la sede al momento de marcar. Si está lejos, la marcación se rechaza y tú ves el intento."],
  ["¿Reemplaza la nómina electrónica o a mi contador?", "No. Nexora estima la nómina con las reglas vigentes y te entrega el detalle explicado para que tu contador liquide. No hace la nómina electrónica ante la DIAN."],
  ["¿Qué pasa con los datos de mis empleados?", "Cada empleado autoriza el tratamiento de sus datos al primer ingreso. La ubicación solo se toma al marcar y la huella nunca sale de su celular. Cada empresa ve únicamente sus datos."],
  ["¿Cómo empiezo?", "Crea tu cuenta con el botón «Crear mi cuenta»: registras tu negocio en un minuto y una guía de primeros pasos te lleva por la configuración (sedes, turnos, empleados y horarios). Si prefieres que te ayudemos, déjanos tus datos en el formulario."],
] as const;

function Mark({ value }: { value: Cell }) {
  if (value === "yes") return <span className="inline-flex items-center gap-1 text-success"><Check className="size-4" aria-hidden /><span className="sr-only">Sí</span></span>;
  if (value === "no") return <span className="inline-flex items-center gap-1 text-fg-subtle"><X className="size-4" aria-hidden /><span className="sr-only">No</span></span>;
  if (value === "partial") return <span className="inline-flex items-center gap-1 text-fg-muted"><Minus className="size-4" aria-hidden /><span className="text-xs">Depende del software</span></span>;
  return <span className="text-sm">{value}</span>;
}

/** Vista ilustrativa de la app (datos de ejemplo). */
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden>
      <div className="rounded-2xl border border-border bg-surface p-4 pb-14 shadow-md sm:p-5 sm:pb-14 lg:ml-40 lg:pb-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Asistencia de hoy</p>
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">En vivo</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[["En jornada", "7"], ["Tarde", "1"], ["Ausentes", "0"], ["Horas", "52 h"]].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-bg-subtle px-3 py-2">
              <p className="text-[11px] text-fg-subtle">{k}</p>
              <p className="tabular text-lg font-semibold">{v}</p>
            </div>
          ))}
        </div>
        <ul className="mt-4 divide-y divide-border text-sm">
          {[["Laura G.", "Centro", "7:58 a. m.", "A tiempo"], ["Andrés R.", "Primavera", "5:56 a. m.", "A tiempo"], ["Diego M.", "Restrepo", "10:12 p. m.", "Tarde 12 min"]].map(([n, s, h, st]) => (
            <li key={n} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0 truncate"><span className="font-medium">{n}</span> <span className="text-fg-subtle">· {s}</span></span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="tabular text-fg-muted">{h}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", st === "A tiempo" ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>{st}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative mx-auto -mt-10 w-48 rounded-[1.6rem] border-4 border-fg/85 bg-surface p-3 shadow-md lg:absolute lg:top-1/2 lg:left-0 lg:mt-0 lg:w-44 lg:-translate-y-1/2">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />
        <div className="flex flex-col items-center rounded-xl bg-success-soft px-2 py-4 text-center">
          <CheckCircle2 className="size-7 text-success" />
          <p className="mt-1 text-[11px] font-medium">Entrada registrada</p>
          <p className="tabular text-xl font-semibold">7:58 a. m.</p>
          <p className="text-[10px] text-fg-muted">Sede Centro</p>
        </div>
        <ul className="mt-2 grid gap-1 text-[10px] text-fg-muted">
          {["QR vigente", "Su celular", "Huella confirmada", "En la sede · 23 m"].map((t) => (
            <li key={t} className="flex items-center gap-1"><BadgeCheck className="size-3 text-success" />{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 h-[560px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--primary-soft),transparent)] opacity-90" />

      <header className="sticky top-0 z-30 border-b border-transparent bg-bg/80 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Nexora, inicio"><Logo /></Link>
          <nav aria-label="Secciones" className="hidden items-center gap-6 text-sm text-fg-muted md:flex">
            {nav.map(([href, label]) => <a key={href} href={href} className="hover:text-fg">{label}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/ingresar" className={buttonVariants({ variant: "ghost", size: "sm" })}>Ingresar</Link>
            <Link href="/registro" className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}>Crear cuenta</Link>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-16 px-4 pt-12 pb-24 sm:px-6 sm:pt-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg-muted shadow-card">
              <span className="size-1.5 rounded-full bg-accent" /> Para pymes colombianas con una o varias sedes
            </p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance text-fg sm:text-5xl">
              Sabe quién trabajó, cuánto y cuánto te cuesta.{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Sin comprar equipos.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-pretty text-fg-muted">
              Tus empleados marcan entrada y salida escaneando un QR con su celular. Tú ves la asistencia de todas tus sedes en tiempo real,
              apruebas las horas extra y obtienes la pre-nómina con las reglas laborales colombianas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/registro" className={buttonVariants({ size: "lg" })}>Crear mi cuenta <ArrowRight /></Link>
              <a href="#como-funciona" className={buttonVariants({ variant: "secondary", size: "lg" })}>Ver cómo funciona</a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
              {["Funciona en el navegador", "Sin relojes biométricos", "Hecho para la ley colombiana"].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-success" aria-hidden />{t}</li>
              ))}
            </ul>
          </div>
          <HeroVisual />
        </section>

        {/* Problema */}
        <section className="border-y border-border bg-bg-subtle/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance">¿Todavía con planillas, Excel o «yo llegué temprano»?</h2>
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
              {pains.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-xl border border-border bg-surface p-5 shadow-card">
                  <Icon className="size-5 text-danger" aria-hidden />
                  <p className="mt-3 font-medium">{title}</p>
                  <p className="mt-1 text-sm text-fg-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <p className="text-sm font-medium text-primary">Cómo funciona</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-balance">Tres pasos y tu negocio queda andando</h2>
          <ol className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-fg shadow-card"><Icon className="size-5" aria-hidden /></span>
                  <span className="text-sm font-medium text-fg-subtle">Paso {i + 1}</span>
                </div>
                <p className="mt-4 text-lg font-medium">{title}</p>
                <p className="mt-1 text-fg-muted">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Funciones */}
        <section id="funciones" className="border-y border-border bg-bg-subtle/60">
          <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
            <p className="text-sm font-medium text-primary">Funciones</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-balance">Control serio, sin complicaciones</h2>
            <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-xl border border-border bg-surface p-5 shadow-card">
                  <Icon className="size-5 text-primary" aria-hidden />
                  <p className="mt-3 font-medium">{title}</p>
                  <p className="mt-1 text-sm text-fg-muted">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Comparación */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <p className="text-sm font-medium text-primary">La diferencia</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-balance">Lo mejor del reloj biométrico, sin el reloj</h2>
          <div className="relative mt-10 overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-subtle/60 text-xs text-fg-subtle">
                  <th className="px-5 py-3 font-medium"><span className="sr-only">Característica</span></th>
                  <th className="px-5 py-3 font-medium">Planilla o Excel</th>
                  <th className="px-5 py-3 font-medium">Reloj biométrico</th>
                  <th className="px-5 py-3 font-semibold text-primary">Nexora</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((c) => (
                  <tr key={c.row} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium">{c.row}</td>
                    <td className="px-5 py-3"><Mark value={c.sheet} /></td>
                    <td className="px-5 py-3"><Mark value={c.clock} /></td>
                    <td className="bg-primary-soft/40 px-5 py-3 font-medium"><Mark value={c.nexora} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Reglas colombianas */}
        <section className="border-y border-border bg-bg-subtle/60">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center">
            <div>
              <p className="text-sm font-medium text-primary">Hecho para Colombia</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance">Las reglas cambian. Nexora las aplica por fecha.</h2>
              <p className="mt-4 text-fg-muted">
                Cada minuto trabajado se calcula con la regla vigente ese día, y cada valor muestra la norma de donde sale. Si falta un dato, Nexora te
                avisa en lugar de inventar un número.
              </p>
            </div>
            <ul className="grid gap-3">
              {rules.map(([big, text, source]) => (
                <li key={big} className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-card">
                  <span className="tabular w-24 shrink-0 text-2xl font-semibold text-primary">{big}</span>
                  <span className="min-w-0">
                    <span className="block text-sm">{text}</span>
                    <span className="block text-xs text-fg-subtle">{source}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Precios */}
        <section id="precios" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <p className="text-sm font-medium text-primary">Precios</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-balance">Un precio fijo según tu tamaño</h2>
          <p className="mt-3 max-w-2xl text-fg-muted">Todas las funciones en todos los planes. Sin costo por sede ni equipos que comprar.</p>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((p) => (
              <div key={p.name} className={cn("relative flex flex-col rounded-2xl border bg-surface p-6 shadow-card", p.featured ? "border-primary ring-2 ring-primary/30" : "border-border")}>
                {p.featured && <span className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-fg">Más elegido</span>}
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-fg-muted">{p.employees}</p>
                <p className="mt-4"><span className="tabular text-3xl font-semibold">${p.price}</span> <span className="text-sm text-fg-muted">COP / mes</span></p>
                <ul className="mt-5 grid flex-1 gap-2 text-sm text-fg-muted">
                  {planIncludes.map((i) => <li key={i} className="flex items-center gap-2"><Check className="size-4 text-success" aria-hidden />{i}</li>)}
                </ul>
                <Link href="/registro" className={cn(buttonVariants({ variant: p.featured ? "primary" : "secondary" }), "mt-6")}>Empezar</Link>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-fg-subtle">Precios de lanzamiento en pesos colombianos. Empiezas en modo prueba. ¿Más de 30 empleados? Escríbenos en el formulario de abajo.</p>
        </section>

        {/* Preguntas */}
        <section id="preguntas" className="border-y border-border bg-bg-subtle/60">
          <div className="mx-auto max-w-3xl scroll-mt-20 px-4 py-24 sm:px-6">
            <p className="text-sm font-medium text-primary">Preguntas frecuentes</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Lo que suelen preguntarnos</h2>
            <div className="mt-10 grid gap-3">
              {faqs.map(([q, a]) => (
                <details key={q} className="group rounded-xl border border-border bg-surface px-5 py-4 shadow-card">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {q}
                    <span className="text-xl leading-none text-fg-subtle transition-transform group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <p className="mt-3 text-sm text-fg-muted">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Crear cuenta */}
        <section id="empezar" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-24 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-accent px-6 py-14 text-center text-white shadow-md sm:px-10">
            <h2 className="text-3xl font-semibold tracking-tight text-balance">Empieza hoy. Tu negocio, configurado en 20 minutos.</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">Crea tu cuenta, registra tus sedes e imprime el QR. Una guía de primeros pasos te acompaña en cada paso.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/registro" className={cn(buttonVariants({ size: "lg" }), "bg-white text-primary hover:bg-white/90")}>Crear mi cuenta <ArrowRight /></Link>
              <a href="#solicitar" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "text-white hover:bg-white/10 hover:text-white")}>Prefiero que me contacten</a>
            </div>
          </div>
        </section>

        {/* Contacto */}
        <section id="solicitar" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <div className="grid gap-10 rounded-3xl border border-border bg-surface p-6 shadow-md sm:p-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-balance">¿Prefieres que te ayudemos?</h2>
              <p className="mt-3 text-fg-muted">
                Déjanos tus datos y te contactamos para resolver tus dudas o acompañarte en la configuración.
              </p>
              <ul className="mt-6 grid gap-3 text-sm">
                {["Te explicamos cómo encaja en tu negocio", "Te acompañamos durante el piloto", "Tus datos y los de tus empleados, protegidos"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" aria-hidden />{t}</li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-fg-muted">¿Ya tienes cuenta? <Link href="/ingresar" className="font-medium text-primary hover:underline">Ingresa aquí</Link></p>
            </div>
            <LeadForm />
          </div>
        </section>
      </main>

      <ChatWidget />

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-10 pb-24 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pb-20">
          <div>
            <Logo />
            <p className="mt-2">Control inteligente. Empresas eficientes.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/ingresar" className="hover:text-fg">Ingresar</Link>
            <a href="#precios" className="hover:text-fg">Precios</a>
            <a href="#preguntas" className="hover:text-fg">Preguntas</a>
          </div>
          <p className="text-fg-subtle">© 2026 Nexora · Hecho en Colombia</p>
        </div>
      </footer>
    </div>
  );
}
