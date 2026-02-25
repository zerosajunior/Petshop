import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { registerAudit } from "@/lib/audit";
import { sameConsentCode } from "@/lib/consent";

const confirmSchema = z.object({
  customerId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/)
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = confirmSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Código de confirmação inválido.");
  }

  const now = new Date();

  await prisma.marketingConsentRequest.updateMany({
    where: {
      customerId: parsed.data.customerId,
      status: "PENDING",
      expiresAt: { lt: now }
    },
    data: {
      status: "EXPIRED"
    }
  });

  const pending = await prisma.marketingConsentRequest.findFirst({
    where: {
      customerId: parsed.data.customerId,
      status: "PENDING"
    },
    orderBy: { createdAt: "desc" }
  });

  if (!pending) {
    return fail("Não há solicitação pendente para este cliente.", 404);
  }

  if (pending.expiresAt < now) {
    await prisma.marketingConsentRequest.update({
      where: { id: pending.id },
      data: { status: "EXPIRED" }
    });
    return fail("Código expirado. Solicite um novo.", 410);
  }

  if (!sameConsentCode(parsed.data.code, pending.codeHash)) {
    await registerAudit({
      action: "MARKETING_CONSENT_CONFIRM_FAILED",
      entity: "MarketingConsentRequest",
      entityId: pending.id,
      details: "Tentativa com código inválido."
    });
    return fail("Código incorreto.", 401);
  }

  await prisma.$transaction(async (tx) => {
    await tx.marketingConsentRequest.update({
      where: { id: pending.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: now
      }
    });

    await tx.customer.update({
      where: { id: parsed.data.customerId },
      data: {
        marketingConsent: true,
        marketingConsentAt: now
      }
    });
  });

  await registerAudit({
    action: "CUSTOMER_MARKETING_OPT_IN_CONFIRMED",
    entity: "Customer",
    entityId: parsed.data.customerId,
    details: `Consentimento confirmado por código da solicitação ${pending.id}`
  });

  return ok({ success: true });
}
