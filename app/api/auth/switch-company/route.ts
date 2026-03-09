import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/http";
import { AUTH_COOKIE_NAME, createSessionToken, sessionMaxAgeSeconds, verifySessionToken } from "@/lib/auth-session";

const switchSchema = z.object({
  companyId: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return fail("Não autenticado.", 401);
  }

  const currentSession = await verifySessionToken(token);
  if (!currentSession) {
    return fail("Sessão inválida.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = switchSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Empresa inválida.", 400);
  }

  const company = await prisma.company.findFirst({
    where: { id: parsed.data.companyId, status: "ACTIVE" },
    select: { id: true, slug: true, name: true }
  });

  if (!company) {
    return fail("Empresa não encontrada ou inativa.", 404);
  }

  const user = await prisma.user.findUnique({
    where: { email: currentSession.username },
    select: { id: true, isSystemAdmin: true }
  });

  if (!user) {
    return fail("Usuário não encontrado.", 404);
  }

  let role: "ADMIN" | "ATTENDANT" | "PROFESSIONAL" = "ADMIN";

  if (!user.isSystemAdmin) {
    const membership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        companyId: company.id,
        status: "ACTIVE"
      },
      select: { role: true }
    });

    if (!membership) {
      return fail("Usuário sem acesso a esta empresa.", 403);
    }

    role = membership.role;
  }

  const newToken = await createSessionToken({
    username: currentSession.username,
    role,
    companyId: company.id,
    companySlug: company.slug,
    isSystemAdmin: user.isSystemAdmin
  });

  const response = NextResponse.json({ data: { company, role } }, { status: 200 });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: newToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds()
  });

  return response;
}
