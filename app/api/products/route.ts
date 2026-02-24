import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  category: z.string().optional(),
  currentStock: z.number().int().nonnegative().default(0),
  minStock: z.number().int().nonnegative().default(0),
  priceCents: z.number().int().positive()
});

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" }
  });

  return ok(products);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = productSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de produto inválidos");
  }

  const product = await prisma.product.create({
    data: parsed.data
  });

  return ok(product, 201);
}
