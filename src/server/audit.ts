import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export type AuditEntry = {
  companyId: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  userAgent?: string | null;
};

/** Registro de auditoría (tabla de solo inserción). Acepta la transacción en curso. */
export async function audit(entry: AuditEntry, tx: Tx = db) {
  await tx.auditLog.create({
    data: {
      companyId: entry.companyId,
      actorUserId: entry.actorUserId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      before: entry.before,
      after: entry.after,
      userAgent: entry.userAgent?.slice(0, 300),
    },
  });
}
