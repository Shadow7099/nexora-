import Link from "next/link";
import { ArrowRight, MapPin, QrCode, ShieldCheck, Wallet } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

const features = [
  { icon: QrCode, title: "Marcación con QR por sede", text: "El empleado escanea, confirma y listo. La hora la pone el servidor." },
  { icon: MapPin, title: "Ubicación y dispositivo", text: "Se valida que esté en la sede y en su celular vinculado, solo al marcar." },
  { icon: ShieldCheck, title: "Tiempo real intocable", text: "Las horas trabajadas nunca se borran; las aprobaciones van aparte." },
  { icon: Wallet, title: "Pre-nómina estimada", text: "Recargos y horas extra con parámetros legales versionados y citados." },
];

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[480px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--primary-soft),transparent)] opacity-80"
      />
      <header className="relative mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="relative mx-auto max-w-5xl px-4 pt-16 pb-24 sm:px-6 sm:pt-24">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg-muted shadow-card">
          <span className="size-1.5 rounded-full bg-accent" /> Versión piloto · Fase 1
        </p>
        <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-balance text-fg sm:text-5xl">
          Control inteligente. <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Empresas eficientes.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-pretty text-fg-muted">
          Asistencia con QR por sede, horarios, horas extra con aprobación y pre-nómina estimada para pymes colombianas.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/sistema" className={buttonVariants({ size: "lg" })}>
            Ver sistema de diseño <ArrowRight />
          </Link>
        </div>

        <ul className="mt-20 grid gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-xl border border-border bg-surface p-5 shadow-card">
              <Icon className="size-5 text-primary" aria-hidden />
              <p className="mt-3 font-medium text-fg">{title}</p>
              <p className="mt-1 text-sm text-fg-muted">{text}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
