import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return fail("Não autenticado.", 401);
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return fail("Sessão inválida.", 401);
  }

  const user = await prisma.user.findUnique({
    where: { email: session.username },
    select: { id: true, isSystemAdmin: true }
  });

  if (!user) {
    return fail("Usuário não encontrado.", 404);
  }

  if (user.isSystemAdmin) {
    const companies = await prisma.company.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true }
    });

    return ok({ companies, currentCompanyId: session.companyId });
  }

  const memberships = await prisma.membership.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
      company: { status: "ACTIVE" }
    },
    orderBy: { company: { name: "asc" } },
    select: {
      role: true,
      company: {
        select: { id: true, slug: true, name: true }
      }
    }
  });

  return ok({
    companies: memberships.map((item) => ({ ...item.company, role: item.role })),
    currentCompanyId: session.companyId
  });
}
