import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { MovementType } from "@prisma/client";
import { z } from "zod";
import { CompanyContextError, getActiveCompanyId } from "@/lib/company-context";

const movementSchema = z
  .object({
    productId: z.string().min(1),
    type: z.nativeEnum(MovementType),
    quantity: z.number().int(),
    reason: z.string().trim().max(180).optional()
  })
  .superRefine((value, context) => {
    if (value.type === MovementType.ADJUSTMENT) {
      if (value.quantity === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Em ajuste, a quantidade não pode ser zero.",
          path: ["quantity"]
        });
      }
      return;
    }

    if (value.quantity <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A quantidade deve ser maior que zero.",
        path: ["quantity"]
      });
    }
  });

function getDelta(type: MovementType, quantity: number) {
  if (type === MovementType.IN) {
    return quantity;
  }

  if (type === MovementType.OUT) {
    return -quantity;
  }

  return quantity;
}

export async function GET() {
  try {
    const companyId = await getActiveCompanyId();
    const movements = await prisma.stockMovement.findMany({
      where: { companyId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 40
    });

    return ok(movements);
  } catch (error) {
    if (error instanceof CompanyContextError) {
      return fail(error.message, 503);
    }
    return fail("Falha ao carregar movimentações.", 500);
  }
}

export async function POST(request: NextRequest) {
  const companyId = await getActiveCompanyId().catch(() => null);
  if (!companyId) {
    return fail("Empresa ativa não configurada.", 503);
  }

  const body = await request.json().catch(() => null);
  const parsed = movementSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de movimentação inválidos");
  }

  const data = parsed.data;
  const delta = getDelta(data.type, data.quantity);

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: {
        id: data.productId,
        companyId
      }
    });

    if (!product) {
      return { error: "Produto não encontrado." } as const;
    }

    if (product.archivedAt) {
      return { error: "Produto arquivado não pode receber movimentações." } as const;
    }

    const nextStock = product.currentStock + delta;
    if (nextStock < 0) {
      return {
        error: `Estoque insuficiente. Estoque atual: ${product.currentStock}.`
      } as const;
    }

    const movement = await tx.stockMovement.create({
      data: {
        companyId,
        productId: data.productId,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true
          }
        }
      }
    });

    const updatedProduct = await tx.product.update({
      where: {
        id: data.productId
      },
      data: {
        currentStock: nextStock
      },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true
      }
    });

    return {
      movement,
      updatedProduct,
      nextStock
    } as const;
  });

  if ("error" in result) {
    return fail(result.error ?? "Não foi possível registrar a movimentação.");
  }

  return ok(result, 201);
}
