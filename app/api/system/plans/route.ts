import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { requireSystemAdmin } from "@/lib/request-auth";

const schema = z.object({
  name: z.string().trim().min(2),
  priceCents: z.number().int().nonnegative(),
  maxUsers: z.number().int().positive().optional().nullable(),
  maxAppointmentsMonth: z.number().int().positive().optional().nullable()
});

export async function GET() {
  const actor = await requireSystemAdmin();
  if (!actor) {
    return fail("Acesso restrito ao admin do sistema.", 403);
  }

  const plans = await prisma.plan.findMany({
    orderBy: { priceCents: "asc" }
  });

  return ok(plans);
}

export async function POST(request: NextRequest) {
  const actor = await requireSystemAdmin();
  if (!actor) {
    return fail("Acesso restrito ao admin do sistema.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de plano inválidos.");
  }

  const plan = await prisma.plan.create({
    data: {
      name: parsed.data.name,
      priceCents: parsed.data.priceCents,
      maxUsers: parsed.data.maxUsers ?? null,
      maxAppointmentsMonth: parsed.data.maxAppointmentsMonth ?? null
    }
  });

  return ok(plan, 201);
}
