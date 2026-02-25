import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { registerAudit } from "@/lib/audit";
import { z } from "zod";

const consentSchema = z.object({
  marketingConsent: z.boolean()
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const body = await request.json().catch(() => null);
  const parsed = consentSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de consentimento inválidos.");
  }

  const params = await context.params;
  const customerId = params.id;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true }
  });

  if (!customer) {
    return fail("Cliente não encontrado.", 404);
  }

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      marketingConsent: parsed.data.marketingConsent,
      marketingConsentAt: parsed.data.marketingConsent ? new Date() : null
    }
  });

  await registerAudit({
    action: parsed.data.marketingConsent
      ? "CUSTOMER_MARKETING_OPT_IN"
      : "CUSTOMER_MARKETING_OPT_OUT",
    entity: "Customer",
    entityId: customerId,
    details: "Preferência de marketing atualizada."
  });

  return ok(updated);
}
