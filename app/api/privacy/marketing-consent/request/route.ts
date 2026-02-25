import { NextRequest } from "next/server";
import { z } from "zod";
import { MessageChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { sendMessage } from "@/lib/sms";
import { registerAudit } from "@/lib/audit";
import { CONSENT_CODE_TTL_MINUTES, generateConsentCode, hashConsentCode } from "@/lib/consent";

const requestSchema = z.object({
  customerId: z.string().min(1),
  channel: z.nativeEnum(MessageChannel).optional()
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados inválidos para solicitação de consentimento.");
  }

  const channel = parsed.data.channel ?? MessageChannel.WHATSAPP;
  const customer = await prisma.customer.findUnique({
    where: { id: parsed.data.customerId },
    select: { id: true, name: true, phone: true }
  });

  if (!customer) {
    return fail("Cliente não encontrado.", 404);
  }

  const code = generateConsentCode();
  const expiresAt = new Date(Date.now() + CONSENT_CODE_TTL_MINUTES * 60 * 1000);

  await prisma.marketingConsentRequest.updateMany({
    where: {
      customerId: customer.id,
      status: "PENDING"
    },
    data: {
      status: "CANCELED"
    }
  });

  const consentRequest = await prisma.marketingConsentRequest.create({
    data: {
      customerId: customer.id,
      channel,
      codeHash: hashConsentCode(code),
      expiresAt
    }
  });

  const result = await sendMessage({
    channel,
    to: customer.phone,
    body: `PetShop: confirme ofertas com o código ${code}. Expira em ${CONSENT_CODE_TTL_MINUTES} minutos. Se não solicitou, ignore.`
  });

  await prisma.messageLog.create({
    data: {
      customerId: customer.id,
      channel,
      purpose: "TRANSACTIONAL",
      toPhone: customer.phone,
      body: "Solicitação de confirmação de consentimento de marketing.",
      provider: result.provider,
      providerRef: result.providerRef,
      status: result.status === "SENT" ? "SENT" : "FAILED",
      errorMessage: result.errorMessage
    }
  });

  await registerAudit({
    action: "MARKETING_CONSENT_REQUESTED",
    entity: "MarketingConsentRequest",
    entityId: consentRequest.id,
    details: `Solicitação via ${channel} para customerId=${customer.id}`
  });

  if (result.status === "FAILED") {
    return fail(result.errorMessage ?? "Falha ao enviar código de confirmação.", 502);
  }

  return ok({
    requestId: consentRequest.id,
    expiresAt: consentRequest.expiresAt.toISOString()
  });
}
