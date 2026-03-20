import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { requireSystemAdmin } from "@/lib/request-auth";

const companyUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  slug: z.string().trim().min(2).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).optional(),
  planId: z.string().nullable().optional()
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await requireSystemAdmin();
  if (!actor) {
    return fail("Acesso restrito ao admin do sistema.", 403);
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = companyUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de empresa inválidos.");
  }

  try {
    const company = await prisma.company.update({
      where: { id },
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        status: parsed.data.status,
        planId: parsed.data.planId
      }
    });
    return ok(company);
  } catch (error) {
    const message =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
        ? "Já existe uma empresa com esse identificador."
        : "Não foi possível atualizar a empresa.";
    return fail(message, 400);
  }
}
