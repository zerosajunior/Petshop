import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { getActiveCompanyId } from "@/lib/company-context";

const updateServiceSchema = z.object({
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().optional(),
  durationMin: z.number().int().positive().optional(),
  priceCents: z.number().int().positive().optional()
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
  const parsed = updateServiceSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de serviço inválidos.");
  }

  const params = await context.params;
  const serviceId = params.id;

  const current = await prisma.service.findFirst({
    where: { id: serviceId, companyId },
    select: { id: true }
  });

  if (!current) {
    return fail("Serviço não encontrado.", 404);
  }

  const updated = await prisma.service.update({
    where: { id: serviceId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      durationMin: parsed.data.durationMin,
      priceCents: parsed.data.priceCents
    }
  });

  return ok(updated);
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
  const serviceId = params.id;

  const current = await prisma.service.findFirst({
    where: { id: serviceId, companyId },
    select: { id: true, name: true }
  });

  if (!current) {
    return fail("Serviço não encontrado.", 404);
  }

  try {
    await prisma.service.delete({
      where: { id: serviceId }
    });
    return ok({ id: serviceId });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return fail("Não é possível excluir serviço com agendamentos vinculados.", 409);
    }
    return fail("Não foi possível excluir o serviço.", 500);
  }
}

