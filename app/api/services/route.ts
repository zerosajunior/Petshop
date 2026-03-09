import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { z } from "zod";
import { CompanyContextError, getActiveCompanyId } from "@/lib/company-context";

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  priceCents: z.number().int().positive(),
  durationMin: z.number().int().positive()
});

export async function GET() {
  try {
    const companyId = await getActiveCompanyId();
    const services = await prisma.service.findMany({
      where: { companyId },
      orderBy: { name: "asc" }
    });

    return ok(services);
  } catch (error) {
    if (error instanceof CompanyContextError) {
      return fail(error.message, 503);
    }
    return fail("Falha ao carregar serviços.", 500);
  }
}

export async function POST(request: NextRequest) {
  const companyId = await getActiveCompanyId().catch(() => null);
  if (!companyId) {
    return fail("Empresa ativa não configurada.", 503);
  }

  const body = await request.json().catch(() => null);
  const parsed = serviceSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de serviço inválidos");
  }

  const service = await prisma.service.create({
    data: {
      ...parsed.data,
      companyId
    }
  });

  return ok(service, 201);
}
