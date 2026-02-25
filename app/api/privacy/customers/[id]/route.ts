import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { registerAudit } from "@/lib/audit";

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) {
    return "***";
  }

  const suffix = digits.slice(-4);
  return `***${suffix}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const customerId = params.id;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      pets: {
        include: {
          appointments: {
            include: { service: true },
            orderBy: { startsAt: "desc" }
          }
        }
      },
      messages: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!customer) {
    return fail("Cliente não encontrado.", 404);
  }

  await registerAudit({
    action: "DATA_SUBJECT_EXPORT",
    entity: "Customer",
    entityId: customerId,
    details: "Exportação de dados do titular."
  });

  return ok(customer);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const customerId = params.id;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      pets: { select: { id: true } }
    }
  });

  if (!customer) {
    return fail("Cliente não encontrado.", 404);
  }

  const anonymizedName = `Titular anonimizado ${customer.id.slice(-6)}`;
  const anonymizedPhone = maskPhone(customer.phone);
  const petIds = customer.pets.map((pet) => pet.id);

  await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: customerId },
      data: {
        name: anonymizedName,
        phone: anonymizedPhone,
        email: null,
        notes: null,
        marketingConsent: false,
        marketingConsentAt: null
      }
    });

    if (petIds.length > 0) {
      await tx.pet.updateMany({
        where: { id: { in: petIds } },
        data: {
          name: "Pet anonimizado",
          breed: null,
          birthDate: null,
          weightKg: null,
          notes: null
        }
      });
    }

    await tx.messageLog.updateMany({
      where: { customerId },
      data: {
        customerId: null,
        toPhone: anonymizedPhone
      }
    });
  });

  await registerAudit({
    action: "DATA_SUBJECT_ANONYMIZED",
    entity: "Customer",
    entityId: customerId,
    details: "Dados pessoais anonimizados por solicitação do titular."
  });

  return ok({ success: true });
}
