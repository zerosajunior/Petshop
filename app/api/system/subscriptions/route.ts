import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { requireSystemAdmin } from "@/lib/request-auth";

const createSchema = z.object({
  companyId: z.string().min(1),
  planId: z.string().min(1),
  status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"]).optional()
});

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"])
});

export async function GET() {
  const actor = await requireSystemAdmin();
  if (!actor) {
    return fail("Acesso restrito ao admin do sistema.", 403);
  }

  const subscriptions = await prisma.subscription.findMany({
    include: {
      company: { select: { id: true, name: true, slug: true } },
      plan: true
    },
    orderBy: { createdAt: "desc" }
  });

  return ok(subscriptions);
}

export async function POST(request: NextRequest) {
  const actor = await requireSystemAdmin();
  if (!actor) {
    return fail("Acesso restrito ao admin do sistema.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de assinatura inválidos.");
  }

  const subscription = await prisma.subscription.create({
    data: {
      companyId: parsed.data.companyId,
      planId: parsed.data.planId,
      status: parsed.data.status ?? "ACTIVE"
    }
  });

  await prisma.company.update({
    where: { id: parsed.data.companyId },
    data: {
      planId: parsed.data.planId
    }
  });

  return ok(subscription, 201);
}

export async function PATCH(request: NextRequest) {
  const actor = await requireSystemAdmin();
  if (!actor) {
    return fail("Acesso restrito ao admin do sistema.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de atualização inválidos.");
  }

  const subscription = await prisma.subscription.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status }
  });

  return ok(subscription);
}
