import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--primary-soft),transparent)] opacity-70" />
      <header className="relative flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Inicio">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main className="relative flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:pt-16">
        <div className="w-full max-w-sm animate-fade-up">{children}</div>
      </main>
    </div>
  );
}
