import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-bg-subtle text-fg-muted ring-1 ring-border">
        <SearchX className="size-6" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Esta página no existe</h1>
      <p className="mt-2 text-sm text-fg-muted">Revisa la dirección o vuelve al inicio.</p>
      <Link href="/ingresar" className={buttonVariants({ className: "mt-6" })}>Ir al ingreso</Link>
    </div>
  );
}
