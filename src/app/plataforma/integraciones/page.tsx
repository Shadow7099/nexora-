import type { Metadata } from "next";
import { logoutAction } from "@/app/(auth)/actions";
import { IntegrationsList } from "@/components/admin/integrations-list";
import { AdminShell, PageHeader } from "@/components/layout/admin-shell";
import { requireActor } from "@/server/current";
import { listIntegrations } from "@/server/integrations";

export const metadata: Metadata = { title: "Integraciones de la plataforma" };

/** Integraciones de Nexora: la llave de Claude del asistente de la página de inicio. */
export default async function PlatformIntegrationsPage() {
  const actor = await requireActor({ roles: ["SUPERADMIN"] });
  const { items, encryptionReady, databaseReady } = await listIntegrations(actor, "platform");
  return (
    <AdminShell user={{ name: actor.name, companyName: "Nexora · Plataforma", roleLabel: "Superadministrador" }} logout={logoutAction} nav="platform">
      <PageHeader
        title="Integraciones de la plataforma"
        description="La llave de Claude que usa el asistente de la página de inicio de Nexora. Cada empresa conecta las suyas en su propio panel."
      />
      <IntegrationsList scope="platform" items={items} encryptionReady={encryptionReady} databaseReady={databaseReady} />
    </AdminShell>
  );
}
