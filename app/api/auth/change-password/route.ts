import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { registerAudit } from "@/lib/audit";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return fail("Não autenticado.", 401);
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return fail("Sessão inválida ou expirada.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Dados inválidos. A nova senha deve ter ao menos 8 caracteres.", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: session.username },
    select: { id: true, email: true, passwordHash: true, status: true }
  });

  if (!user || user.status !== "ACTIVE") {
    return fail("Usuário não encontrado ou inativo.", 404);
  }

  if (!user.passwordHash || !verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
    return fail("Senha atual inválida.", 401);
  }

  if (verifyPassword(parsed.data.newPassword, user.passwordHash)) {
    return fail("A nova senha deve ser diferente da senha atual.", 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(parsed.data.newPassword)
    }
  });

  await registerAudit({
    companyId: session.companyId,
    userId: user.id,
    action: "USER_PASSWORD_CHANGED",
    entity: "User",
    entityId: user.id,
    details: `Senha alterada pelo usuário ${user.email}`,
    actor: session.username
  });

  return ok({ success: true });
}
