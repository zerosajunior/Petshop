import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { requireSystemAdmin } from "@/lib/request-auth";
import { hashPassword } from "@/lib/password";

const userUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().email().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  isSystemAdmin: z.boolean().optional(),
  newPassword: z.string().min(6).optional()
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
  const parsed = userUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de usuário inválidos.");
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        status: parsed.data.status,
        isSystemAdmin: parsed.data.isSystemAdmin,
        passwordHash: parsed.data.newPassword ? hashPassword(parsed.data.newPassword) : undefined
      }
    });

    return ok(user);
  } catch (error) {
    const message =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
        ? "Já existe um usuário com esse e-mail."
        : "Não foi possível atualizar o usuário.";
    return fail(message, 400);
  }
}
