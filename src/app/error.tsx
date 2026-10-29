"use client"; // Los límites de error deben ser componentes de cliente

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-warning-soft text-warning">
        <TriangleAlert className="size-6" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Algo salió mal</h1>
      <p className="mt-2 text-sm text-fg-muted">
        No pudimos completar la solicitud. Intenta de nuevo; si el problema sigue, avísale al administrador.
      </p>
      <Button className="mt-6" variant="secondary" onClick={() => retry()}>
        <RefreshCw /> Intentar de nuevo
      </Button>
    </div>
  );
}
