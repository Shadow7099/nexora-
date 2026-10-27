"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { CURRENT_PHASE, employeeNav, isActive } from "@/components/layout/nav";
import { cn } from "@/lib/utils";

/** Diseñado primero para celular: barra superior mínima y pestañas abajo. */
export function EmployeeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex h-14 items-center justify-between px-4">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="flex-1 px-4 pb-28">{children}</main>
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <ul className="mx-auto grid max-w-md grid-cols-3">
          {employeeNav.map(({ href, label, icon: Icon, phase }) => {
            if (phase > CURRENT_PHASE) {
              return (
                <li key={href}>
                  <span className="flex h-16 flex-col items-center justify-center gap-1 text-xs text-fg-subtle/60" title={`Disponible en la fase ${phase}`}>
                    <Icon className="size-5" aria-hidden />
                    {label}
                  </span>
                </li>
              );
            }
            const active = isActive(pathname, href, "/app");
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex h-16 flex-col items-center justify-center gap-1 text-xs text-fg-subtle", active && "text-primary")}
                >
                  <Icon className="size-5" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
