import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { sendMessage } from "@/lib/sms";
import { MessageChannel, MessagePurpose, MessageStatus } from "@prisma/client";
import { z } from "zod";
import { registerAudit } from "@/lib/audit";

const messageSchema = z.object({
  channel: z.enum(["SMS", "WHATSAPP"]).optional(),
  purpose: z.enum(["TRANSACTIONAL", "MARKETING"]).optional(),
  customerId: z.string().optional(),
  toPhone: z.string().min(8),
  body: z.string().min(3)
});

export async function GET() {
  const messages = await prisma.messageLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return ok(messages);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de mensagem inválidos");
  }

  const channel = (parsed.data.channel ?? "SMS") as MessageChannel;
  const purpose = (parsed.data.purpose ?? "TRANSACTIONAL") as MessagePurpose;

  if (purpose === MessagePurpose.MARKETING) {
    if (!parsed.data.customerId) {
      return fail("Para mensagens de marketing, informe o cliente.", 400);
    }

    const customer = await prisma.customer.findUnique({
      where: { id: parsed.data.customerId },
      select: { id: true, phone: true, marketingConsent: true }
    });

    if (!customer) {
      return fail("Cliente não encontrado para o envio de marketing.", 404);
    }

    if (!customer.marketingConsent) {
      await registerAudit({
        action: "MARKETING_MESSAGE_BLOCKED_NO_CONSENT",
        entity: "Customer",
        entityId: customer.id,
        details: "Tentativa de envio de marketing sem consentimento."
      });
      return fail("Cliente sem consentimento de marketing (LGPD).", 403);
    }
  }

  const result = await sendMessage({
    channel,
    to: parsed.data.toPhone,
    body: parsed.data.body
  });

  const log = await prisma.messageLog.create({
    data: {
      customerId: parsed.data.customerId,
      channel,
      purpose,
      toPhone: parsed.data.toPhone,
      body: parsed.data.body,
      provider: result.provider,
      providerRef: result.providerRef,
      status: result.status === "SENT" ? MessageStatus.SENT : MessageStatus.FAILED,
      errorMessage: result.errorMessage
    }
  });

  if (result.status === "FAILED") {
    return fail(result.errorMessage ?? "Falha ao enviar SMS", 502);
  }

  await registerAudit({
    action:
      purpose === MessagePurpose.MARKETING ? "MARKETING_MESSAGE_SENT" : "TRANSACTIONAL_MESSAGE_SENT",
    entity: "MessageLog",
    entityId: log.id,
    details: `Canal=${channel}, cliente=${parsed.data.customerId ?? "não informado"}`
  });

  return ok(log, 201);
}
