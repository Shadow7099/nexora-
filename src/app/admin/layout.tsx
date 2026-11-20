import { logoutAction } from "@/app/(auth)/actions";
import { AdminShell } from "@/components/layout/admin-shell";
import { requireActor } from "@/server/current";
import { db } from "@/lib/db";

/** Avisos del menú: chats sin leer o que piden una persona, y comentarios por responder. */
async function menuBadges(companyId: string | null): Promise<Record<string, number>> {
  if (!companyId) return {};
  try {
    const [chats, comments] = await Promise.all([
      db.conversation.count({ where: { companyId, OR: [{ unread: { gt: 0 } }, { needsHuman: true }] } }),
      db.socialComment.count({ where: { companyId, status: "PENDING" } }),
    ]);
    return { "/admin/crm/mensajes": chats + comments };
  } catch {
    return {}; // Tablas aún sin crear en la base: el menú sigue funcionando.
  }
}

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // La verificación se repite en cada página y en cada acción: el layout no se vuelve a ejecutar al navegar.
  const actor = await requireActor({ roles: ["COMPANY_ADMIN"] });
  return (
    <AdminShell user={{ name: actor.name, companyName: actor.companyName ?? "" }} logout={logoutAction} badges={await menuBadges(actor.companyId)}>
      {children}
    </AdminShell>
  );
}
