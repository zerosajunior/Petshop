import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { PetType } from "@prisma/client";
import { z } from "zod";

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

  return ok(pet, 201);
}
