import { logoutAction } from "@/app/(auth)/actions";
import { AdminShell } from "@/components/layout/admin-shell";
import { planLabel, trialDaysLeft } from "@/lib/plans";
import { requireActor } from "@/server/current";
import { getTrialStatus } from "@/server/onboarding";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // La verificación se repite en cada página y en cada acción: el layout no se vuelve a ejecutar al navegar.
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const trial = await getTrialStatus(actor);
  return (
    <AdminShell user={{ name: actor.name, companyName: actor.companyName ?? "" }} logout={logoutAction}>
      {trial && <TrialBanner {...trial} />}
      {children}
    </AdminShell>
  );
}

function TrialBanner({ planCode, maxEmployees, endsAt, expired }: NonNullable<Awaited<ReturnType<typeof getTrialStatus>>>) {
  const date = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" }).format(endsAt);
  const days = trialDaysLeft(endsAt);
  const plan = `${planLabel(planCode)}${maxEmployees ? ` (hasta ${maxEmployees} empleados)` : ""}`;
  return (
    <div role="status" className={`mb-6 rounded-lg border p-3 text-sm ${expired ? "border-transparent bg-danger-soft text-danger" : "border-transparent bg-primary-soft text-primary"}`}>
      {expired ? (
        <>Tu prueba gratuita terminó el {date}. Contáctanos para activar el {plan} y seguir usando Nexora sin interrupciones.</>
      ) : (
        <>
          Prueba gratuita del {plan}: {days === 1 ? "te queda 1 día" : `te quedan ${days} días`} (hasta el {date}).
        </>
      )}
    </div>
  );
}
