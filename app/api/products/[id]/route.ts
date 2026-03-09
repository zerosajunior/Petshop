import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { registerAudit } from "@/lib/audit";
import { getActiveCompanyId } from "@/lib/company-context";

const updateProductSchema = z.object({
  name: z.string().trim().min(2).optional(),
  sku: z.string().trim().min(2).max(30).optional(),
  category: z.string().trim().optional(),
  description: z.string().trim().max(220).optional(),
  imageDataUrls: z.array(z.string().startsWith("data:image/").max(2_000_000)).max(8).optional(),
  currentStock: z.number().int().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
  priceCents: z.number().int().positive().optional(),
  archived: z.boolean().optional()
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const companyId = await getActiveCompanyId().catch(() => null);
  if (!companyId) {
    return fail("Empresa ativa não configurada.", 503);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProductSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de produto inválidos.");
  }

  const params = await context.params;
  const productId = params.id;

  const current = await prisma.product.findFirst({
    where: { id: productId, companyId },
    select: { id: true, name: true, sku: true }
  });

  if (!current) {
    return fail("Produto não encontrado.", 404);
  }

  try {
    const data = parsed.data;
    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          name: data.name,
          sku: data.sku ? data.sku.toUpperCase() : undefined,
          category: data.category,
          description: data.description,
          currentStock: data.currentStock,
          minStock: data.minStock,
          priceCents: data.priceCents,
          archivedAt:
            typeof data.archived === "boolean" ? (data.archived ? new Date() : null) : undefined
        }
      });

      if (data.imageDataUrls) {
        await tx.productImage.deleteMany({
          where: { productId, companyId }
        });
        await tx.productImage.createMany({
          data: data.imageDataUrls.map((dataUrl, index) => ({
            productId,
            companyId,
            dataUrl,
            position: index
          }))
        });
      }

      return tx.product.findFirst({
        where: { id: product.id, companyId },
        include: {
          images: {
            orderBy: { position: "asc" }
          }
        }
      });
    });

    if (!updated) {
      return fail("Produto não encontrado.", 404);
    }

    await registerAudit({
      companyId,
      action: "PRODUCT_UPDATED",
      entity: "Product",
      entityId: productId,
      details: `Produto ${current.name} (${current.sku}) atualizado`
    });

    return ok(updated);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return fail("Já existe um produto com esse código interno (SKU).");
    }

    return fail("Não foi possível atualizar o produto.", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const companyId = await getActiveCompanyId().catch(() => null);
  if (!companyId) {
    return fail("Empresa ativa não configurada.", 503);
  }

  const params = await context.params;
  const productId = params.id;

  const current = await prisma.product.findFirst({
    where: { id: productId, companyId },
    select: { id: true, name: true, sku: true }
  });

  if (!current) {
    return fail("Produto não encontrado.", 404);
  }

  await prisma.product.deleteMany({
    where: { id: productId, companyId }
  });

  await registerAudit({
    companyId,
    action: "PRODUCT_DELETED",
    entity: "Product",
    entityId: productId,
    details: `Produto ${current.name} (${current.sku}) excluído`
  });

  return ok({ id: productId });
}
