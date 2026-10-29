"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { adminNav, CURRENT_PHASE, isActive, type NavItem } from "@/components/layout/nav";
import { cn } from "@/lib/utils";

type ShellUser = { name: string; companyName: string; roleLabel?: string };

export function AdminShell({
  user,
  logout,
  nav = adminNav,
  children,
}: {
  user: ShellUser;
  /** Acción de servidor para cerrar sesión (ausente en la vista previa del diseño). */
  logout?: () => Promise<void>;
  /** Secciones del menú (por defecto, las del administrador de empresa). */
  nav?: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Cierra el menú móvil con Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sidebar = (
    <nav aria-label="Principal" className="flex h-full flex-col gap-1 p-3">
      <div className="mb-4 flex items-center justify-between px-2 pt-1">
        <Logo />
        <button className="grid size-8 place-items-center rounded-md text-fg-muted hover:bg-bg-subtle lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú">
          <X className="size-4" />
        </button>
      </div>
      <p className="truncate px-2 pb-2 text-xs font-medium text-fg-subtle">{user.companyName}</p>
      {nav.map(({ href, label, icon: Icon, phase }) => {
        if (phase > CURRENT_PHASE) {
          return (
            <span key={href} className="flex h-8 cursor-not-allowed items-center gap-2.5 rounded-md px-2 text-sm text-fg-subtle/70" title={`Disponible en la fase ${phase}`}>
              <Icon className="size-4" aria-hidden />
              {label}
              <span className="ml-auto rounded bg-bg-subtle px-1.5 text-[10px] font-medium ring-1 ring-border">F{phase}</span>
            </span>
          );
        }
        const active = isActive(pathname, href, "/admin");
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg",
              active && "bg-surface font-medium text-fg shadow-card ring-1 ring-border",
            )}
          >
            <Icon className={cn("size-4", active ? "text-primary" : "text-fg-subtle")} aria-hidden />
            {label}
          </Link>
        );
      })}
      <div className="mt-auto flex items-center gap-2.5 rounded-lg border border-border bg-surface p-2">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">{user.name}</p>
          <p className="truncate text-xs text-fg-subtle">{user.roleLabel ?? "Administrador"}</p>
        </div>
        {logout && (
          <form action={logout}>
            <button type="submit" className="grid size-8 place-items-center rounded-md text-fg-subtle hover:bg-bg-subtle hover:text-fg" aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut className="size-4" />
            </button>
          </form>
        )}
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      {/* El fondo ocupa toda la columna; el menú queda fijo al desplazarse. */}
      <div className="hidden border-r border-border bg-bg-subtle/60 lg:block">
        <aside className="sticky top-0 h-dvh">{sidebar}</aside>
      </div>

      {/* Menú móvil */}
      <div className={cn("fixed inset-0 z-40 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
        <div className={cn("absolute inset-0 bg-black/30 transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border bg-bg shadow-pop transition-transform duration-200",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {sidebar}
        </aside>
      </div>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur-md sm:px-6">
          <button className="grid size-9 place-items-center rounded-md text-fg-muted hover:bg-bg-subtle lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open}>
            <Menu className="size-5" />
          </button>
          <span className="lg:hidden">
            <Logo withWordmark={false} />
          </span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
