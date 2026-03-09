import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { registerAudit } from "@/lib/audit";
import { getActiveCompanyId } from "@/lib/company-context";

const productSchema = z.object({
  name: z.string().trim().min(2),
  sku: z.string().trim().min(2).max(30),
  category: z.string().trim().optional(),
  description: z.string().trim().max(220).optional(),
  imageDataUrl: z.string().startsWith("data:image/").max(2_000_000).optional(),
  imageDataUrls: z.array(z.string().startsWith("data:image/").max(2_000_000)).max(8).optional(),
  currentStock: z.number().int().nonnegative().default(0),
  minStock: z.number().int().nonnegative().default(0),
  priceCents: z.number().int().positive()
});

export async function GET(request: NextRequest) {
  const companyId = await getActiveCompanyId().catch(() => null);
  if (!companyId) {
    return fail("Empresa ativa não configurada.", 503);
  }

  const status = request.nextUrl.searchParams.get("status") ?? "active";
  const where =
    status === "deleted"
      ? { companyId, archivedAt: { not: null } }
      : status === "all"
        ? { companyId }
        : { companyId, archivedAt: null };

  const products = await prisma.product.findMany({
    include: {
      images: {
        orderBy: {
          position: "asc"
        }
      }
    },
    where,
    orderBy: { name: "asc" }
  });

  return ok(products);
}

export async function POST(request: NextRequest) {
  const companyId = await getActiveCompanyId().catch(() => null);
  if (!companyId) {
    return fail("Empresa ativa não configurada.", 503);
  }

  const body = await request.json().catch(() => null);
  const parsed = productSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de produto inválidos");
  }

  try {
    const product = await prisma.product.create({
      data: {
        name: parsed.data.name,
        companyId,
        sku: parsed.data.sku.toUpperCase(),
        category: parsed.data.category,
        description: parsed.data.description,
        imageDataUrl: parsed.data.imageDataUrl,
        currentStock: parsed.data.currentStock,
        minStock: parsed.data.minStock,
        priceCents: parsed.data.priceCents,
        images: parsed.data.imageDataUrls?.length
          ? {
              create: parsed.data.imageDataUrls.map((dataUrl, index) => ({
                dataUrl,
                position: index,
                companyId
              }))
            }
          : undefined
      }
    });

    await registerAudit({
      companyId,
      action: "PRODUCT_CREATED",
      entity: "Product",
      entityId: product.id,
      details: `Produto ${product.name} (${product.sku}) criado`
    });

    return ok(product, 201);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return fail("Já existe um produto com esse código interno (SKU).");
    }

    return fail("Não foi possível salvar o produto.", 500);
  }
}
