import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { z } from "zod";

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  priceCents: z.number().int().positive(),
  durationMin: z.number().int().positive()
});

export async function GET() {
  const services = await prisma.service.findMany({
    orderBy: { name: "asc" }
  });

  return ok(services);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = serviceSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de serviço inválidos");
  }

  const service = await prisma.service.create({
    data: parsed.data
  });

  return ok(service, 201);
}
