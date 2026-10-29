import { logoutAction } from "@/app/(auth)/actions";
import { AdminShell } from "@/components/layout/admin-shell";
import { requireActor } from "@/server/current";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // La verificación se repite en cada página y en cada acción: el layout no se vuelve a ejecutar al navegar.
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  return (
    <AdminShell user={{ name: actor.name, companyName: actor.companyName ?? "" }} logout={logoutAction}>
      {children}
    </AdminShell>
  );
}
