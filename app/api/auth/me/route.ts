import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";
import { parseCompanyBranding } from "@/lib/company-branding";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return fail("Não autenticado.", 401);
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return fail("Sessão inválida ou expirada.", 401);
  }

  const user = await prisma.user.findUnique({
    where: { email: session.username },
    select: { id: true, isSystemAdmin: true }
  });

  if (!user) {
    return fail("Usuário não encontrado.", 404);
  }

  const companies = user.isSystemAdmin
    ? await prisma.company.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          settings: { select: { branding: true } }
        }
      })
    : (
        await prisma.membership.findMany({
          where: {
            userId: user.id,
            status: "ACTIVE",
            company: { status: "ACTIVE" }
          },
          orderBy: { company: { name: "asc" } },
          select: {
            role: true,
            company: {
              select: {
                id: true,
                slug: true,
                name: true,
                settings: { select: { branding: true } }
              }
            }
          }
        })
      ).map((item) => ({ ...item.company, role: item.role }));

  const companiesWithLogo = companies.map((company) => {
    const { settings, ...companyBase } = company;
    return {
      ...companyBase,
      logoDataUrl: parseCompanyBranding(settings?.branding).logoDataUrl
    };
  });
  const currentCompany = companiesWithLogo.find((company) => company.id === session.companyId) ?? null;

  return ok({
    username: session.username,
    role: session.role,
    companyId: session.companyId,
    companySlug: session.companySlug,
    isSystemAdmin: user.isSystemAdmin,
    currentCompany,
    companies: companiesWithLogo
  });
}
