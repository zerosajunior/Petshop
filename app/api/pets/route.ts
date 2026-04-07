import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { PetSize, PetType } from "@prisma/client";
import { z } from "zod";
import { CompanyContextError, getActiveCompanyId } from "@/lib/company-context";
import { registerAudit } from "@/lib/audit";

const petSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(2),
  type: z.nativeEnum(PetType),
  breed: z.string().optional(),
  size: z.nativeEnum(PetSize).optional(),
  isDeceased: z.boolean().optional(),
  notes: z.string().optional()
});

export async function GET() {
  try {
    const companyId = await getActiveCompanyId();
    const pets = await prisma.pet.findMany({
      where: { companyId },
      include: { customer: true },
      orderBy: { createdAt: "desc" }
    });

    return ok(pets);
  } catch (error) {
    if (error instanceof CompanyContextError) {
      return fail(error.message, 503);
    }
    return fail("Falha ao carregar pets.", 500);
  }
}

export async function POST(request: NextRequest) {
  const companyId = await getActiveCompanyId().catch(() => null);
  if (!companyId) {
    return fail("Empresa ativa não configurada.", 503);
  }

  const body = await request.json().catch(() => null);
  const parsed = petSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de pet inválidos");
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: parsed.data.customerId,
      companyId
    },
    select: { id: true }
  });

  if (!customer) {
    return fail("Cliente não encontrado para a empresa ativa.", 404);
  }

  const pet = await prisma.pet.create({
    data: {
      ...parsed.data,
      isDeceased: parsed.data.isDeceased ?? false,
      deceasedAt: parsed.data.isDeceased ? new Date() : null,
      companyId
    }
  });

  await registerAudit({
    action: "PET_CREATED",
    entity: "Pet",
    entityId: pet.id,
    details: `Pet criado para customerId=${pet.customerId}`
  });

  return ok(pet, 201);
}
