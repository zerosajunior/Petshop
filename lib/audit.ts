import { prisma } from "@/lib/prisma";

type AuditInput = {
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  actor?: string;
};

export async function registerAudit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        details: input.details,
        actor: input.actor ?? "system"
      }
    });
  } catch (error) {
    console.error("Falha ao registrar auditoria", error);
  }
}
