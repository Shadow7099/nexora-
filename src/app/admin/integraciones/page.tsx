import type { Metadata } from "next";
import { IntegrationsList } from "@/components/admin/integrations-list";
import { PageHeader } from "@/components/layout/admin-shell";
import { requireActor } from "@/server/current";
import { listIntegrations } from "@/server/integrations";

export const metadata: Metadata = { title: "Integraciones" };

/** Integraciones de la empresa: cada negocio conecta sus propias cuentas. */
export default async function CompanyIntegrationsPage() {
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  const { items, encryptionReady, databaseReady } = await listIntegrations(actor, "company");
  return (
    <>
      <PageHeader
        title="Integraciones"
        description="Conecta las cuentas de tu negocio: Facebook e Instagram, TikTok, WhatsApp, facturación electrónica, correo y la llave de Claude para el asistente."
      />
      <IntegrationsList scope="company" items={items} encryptionReady={encryptionReady} databaseReady={databaseReady} />
    </>
  );
}
