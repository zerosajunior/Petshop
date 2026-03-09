import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

type AuditInput = {
  companyId?: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  actor?: string;
};

export async function registerAudit(input: AuditInput) {
  try {
    let requestHeaders: Awaited<ReturnType<typeof headers>> | null = null;
    try {
      requestHeaders = await headers();
    } catch {
      requestHeaders = null;
    }
    const actorEmail = requestHeaders?.get("x-auth-user")?.trim();
    const companyFromHeader = requestHeaders?.get("x-company-id")?.trim();
    const actorUser =
      actorEmail && !input.userId
        ? await prisma.user.findUnique({
            where: { email: actorEmail },
            select: { id: true }
          })
        : null;

    await prisma.auditLog.create({
      data: {
        companyId: input.companyId ?? companyFromHeader ?? undefined,
        userId: input.userId ?? actorUser?.id,
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
