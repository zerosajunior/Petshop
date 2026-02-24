import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { PetType } from "@prisma/client";
import { z } from "zod";

const campaignSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(3),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isActive: z.boolean().default(true),
  segmentPetType: z.nativeEnum(PetType).optional().nullable()
});

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { startsAt: "desc" }
  });

  return ok(campaigns);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = campaignSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de campanha inválidos");
  }

  const campaign = await prisma.campaign.create({
    data: {
      ...parsed.data,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt)
    }
  });

  return ok(campaign, 201);
}
