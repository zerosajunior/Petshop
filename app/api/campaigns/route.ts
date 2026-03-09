import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { PetType } from "@prisma/client";
import { z } from "zod";
import { CompanyContextError, getActiveCompanyId } from "@/lib/company-context";

const campaignSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(3),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isActive: z.boolean().default(true),
  segmentPetType: z.nativeEnum(PetType).optional().nullable()
});

export async function GET() {
  try {
    const companyId = await getActiveCompanyId();
    const campaigns = await prisma.campaign.findMany({
      where: { companyId },
      orderBy: { startsAt: "desc" }
    });

    return ok(campaigns);
  } catch (error) {
    if (error instanceof CompanyContextError) {
      return fail(error.message, 503);
    }
    return fail("Falha ao carregar campanhas.", 500);
  }
}

export async function POST(request: NextRequest) {
  const companyId = await getActiveCompanyId().catch(() => null);
  if (!companyId) {
    return fail("Empresa ativa não configurada.", 503);
  }

  const body = await request.json().catch(() => null);
  const parsed = campaignSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de campanha inválidos");
  }

  const campaign = await prisma.campaign.create({
    data: {
      companyId,
      ...parsed.data,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt)
    }
  });

  return ok(campaign, 201);
}
