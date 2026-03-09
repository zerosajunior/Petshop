import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { requireSystemAdmin } from "@/lib/request-auth";
import { enforceMaxUsersLimit } from "@/lib/plan-limits";

const createSchema = z.object({
  userId: z.string().min(1),
  companyId: z.string().min(1),
  role: z.enum(["ADMIN", "ATTENDANT", "PROFESSIONAL"])
});

const updateSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["ADMIN", "ATTENDANT", "PROFESSIONAL"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional()
});

export async function GET() {
  const actor = await requireSystemAdmin();
  if (!actor) {
    return fail("Acesso restrito ao admin do sistema.", 403);
  }

  const memberships = await prisma.membership.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      company: { select: { id: true, name: true, slug: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return ok(memberships);
}

export async function POST(request: NextRequest) {
  const actor = await requireSystemAdmin();
  if (!actor) {
    return fail("Acesso restrito ao admin do sistema.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de vínculo inválidos.");
  }

  try {
    await enforceMaxUsersLimit(parsed.data.companyId);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Limite de plano atingido.", 409);
  }

  const membership = await prisma.membership.upsert({
    where: {
      userId_companyId: {
        userId: parsed.data.userId,
        companyId: parsed.data.companyId
      }
    },
    update: {
      role: parsed.data.role,
      status: "ACTIVE"
    },
    create: {
      userId: parsed.data.userId,
      companyId: parsed.data.companyId,
      role: parsed.data.role,
      status: "ACTIVE"
    }
  });

  return ok(membership, 201);
}

export async function PATCH(request: NextRequest) {
  const actor = await requireSystemAdmin();
  if (!actor) {
    return fail("Acesso restrito ao admin do sistema.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de atualização inválidos.");
  }

  const membership = await prisma.membership.update({
    where: { id: parsed.data.id },
    data: {
      role: parsed.data.role,
      status: parsed.data.status
    }
  });

  return ok(membership);
}
