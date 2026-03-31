import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { requireSystemAdmin } from "@/lib/request-auth";
import { hashPassword } from "@/lib/password";

const userSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  isSystemAdmin: z.boolean().optional()
});

export async function GET() {
  const actor = await requireSystemAdmin();
  if (!actor) {
    return fail("Acesso restrito ao admin do sistema.", 403);
  }

  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          company: {
            select: { id: true, name: true, slug: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return ok(users);
}

export async function POST(request: NextRequest) {
  const actor = await requireSystemAdmin();
  if (!actor) {
    return fail("Acesso restrito ao admin do sistema.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = userSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de usuário inválidos.");
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: hashPassword(parsed.data.password),
        status: "ACTIVE",
        isSystemAdmin: parsed.data.isSystemAdmin ?? false
      }
    });

    return ok(user, 201);
  } catch (error) {
    const message =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
        ? "Já existe um usuário com esse e-mail."
        : "Não foi possível criar o usuário.";
    return fail(message, 400);
  }
}
