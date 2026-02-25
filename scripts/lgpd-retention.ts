import { prisma } from "@/lib/prisma";

const MESSAGE_RETENTION_DAYS = 180;
const AUDIT_RETENTION_DAYS = 365;

async function main() {
  const now = new Date();
  const messageLimit = new Date(now.getTime() - MESSAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const auditLimit = new Date(now.getTime() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const anonymizedMessages = await prisma.messageLog.updateMany({
    where: {
      createdAt: { lt: messageLimit }
    },
    data: {
      customerId: null,
      toPhone: "***",
      body: "[ANONIMIZADO POR RETENCAO]"
    }
  });

  const deletedAuditLogs = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: auditLimit }
    }
  });

  console.log(
    `[LGPD] Mensagens anonimizadas: ${anonymizedMessages.count} | Logs de auditoria removidos: ${deletedAuditLogs.count}`
  );
}

main()
  .catch((error) => {
    console.error("[LGPD] Falha na rotina de retenção", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
