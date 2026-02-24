import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { MessageChannel } from "@prisma/client";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional(),
  notes: z.string().optional(),
  preferredChannel: z.nativeEnum(MessageChannel).optional()
});

export async function GET() {
  const customers = await prisma.customer.findMany({
    include: { pets: true },
    orderBy: { createdAt: "desc" }
  });

  return ok(customers);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = customerSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de cliente inválidos");
  }

  const customer = await prisma.customer.create({
    data: parsed.data
  });

  return ok(customer, 201);
}
