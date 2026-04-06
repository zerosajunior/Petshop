import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { registerAudit } from "@/lib/audit";
import { consumeRateLimit, getRequestIp } from "@/lib/rate-limit";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

export async function POST(request: NextRequest) {
  const ip = getRequestIp(request.headers);
  const ipWindow = consumeRateLimit({
    key: `auth:change-password:ip:${ip}`,
    max: 20,
    windowMs: 10 * 60 * 1000
  });
  if (!ipWindow.allowed) {
    return fail(`Muitas tentativas. Tente novamente em ${ipWindow.retryAfterSeconds}s.`, 429);
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return fail("Não autenticado.", 401);
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return fail("Sessão inválida ou expirada.", 401);
  }

  const userWindow = consumeRateLimit({
    key: `auth:change-password:user:${session.username.toLowerCase()}:ip:${ip}`,
    max: 6,
    windowMs: 10 * 60 * 1000
  });
  if (!userWindow.allowed) {
    return fail(`Muitas tentativas para este usuário. Aguarde ${userWindow.retryAfterSeconds}s.`, 429);
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
