import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { PetType } from "@prisma/client";
import { z } from "zod";
import { registerAudit } from "@/lib/audit";

const petSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(2),
  type: z.nativeEnum(PetType),
  breed: z.string().optional(),
  notes: z.string().optional()
});

export async function GET() {
  const pets = await prisma.pet.findMany({
    include: { customer: true },
    orderBy: { createdAt: "desc" }
  });

  return ok(pets);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = petSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de pet inválidos");
  }

  const pet = await prisma.pet.create({
    data: parsed.data
  });

  await registerAudit({
    action: "PET_CREATED",
    entity: "Pet",
    entityId: pet.id,
    details: `Pet criado para customerId=${pet.customerId}`
  });

  return ok(pet, 201);
}
