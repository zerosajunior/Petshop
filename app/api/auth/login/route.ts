import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/http";
import { AUTH_COOKIE_NAME, createSessionToken, sessionMaxAgeSeconds } from "@/lib/auth-session";
import { verifyPassword } from "@/lib/password";
import type { MembershipRole } from "@prisma/client";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

async function resolveDefaultCompany() {
  const desiredSlug = process.env.DEFAULT_COMPANY_SLUG?.trim();

  if (desiredSlug) {
    const company = await prisma.company.findFirst({
      where: { slug: desiredSlug, status: "ACTIVE" },
      select: { id: true, slug: true, name: true }
    });

    if (company) {
      return company;
    }
  }

  return prisma.company.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { id: true, slug: true, name: true }
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Credenciais inválidas.", 400);
  }

  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: parsed.data.username }, { name: parsed.data.username }],
      status: "ACTIVE"
    },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      isSystemAdmin: true
    }
  });

  if (!dbUser?.passwordHash || !verifyPassword(parsed.data.password, dbUser.passwordHash)) {
    return fail("Usuário ou senha inválidos.", 401);
  }

  const defaultCompany = await resolveDefaultCompany();

  let sessionCompany: { id: string; slug: string; name: string } | null = null;
  let sessionRole: MembershipRole | "ADMIN" = "ADMIN";
  let companies: Array<{ id: string; slug: string; name: string; role: MembershipRole | "ADMIN" }> =
    [];

  if (dbUser.isSystemAdmin) {
    if (!defaultCompany) {
      return fail("Nenhuma empresa ativa encontrada para iniciar sessão.", 503);
    }
    sessionCompany = defaultCompany;
    sessionRole = "ADMIN";
    const allCompanies = await prisma.company.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true }
    });
    companies = allCompanies.map((item) => ({ ...item, role: "ADMIN" }));
  } else {
    const memberships = await prisma.membership.findMany({
      where: {
        userId: dbUser.id,
        status: "ACTIVE",
        company: { status: "ACTIVE" }
      },
      select: {
        role: true,
        company: {
          select: { id: true, slug: true, name: true }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    if (memberships.length === 0) {
      return fail("Usuário sem empresa ativa vinculada.", 403);
    }

    const fromDefault = defaultCompany
      ? memberships.find((item) => item.company.id === defaultCompany.id)
      : null;

    const selected = fromDefault ?? memberships[0];
    sessionCompany = selected.company;
    sessionRole = selected.role;
    companies = memberships.map((item) => ({ ...item.company, role: item.role }));
  }

  const token = await createSessionToken({
    username: dbUser.email,
    role: sessionRole,
    companyId: sessionCompany.id,
    companySlug: sessionCompany.slug,
    isSystemAdmin: dbUser.isSystemAdmin
  });

  const response = NextResponse.json(
    {
      data: {
        user: {
          username: dbUser.email,
          role: sessionRole,
          isSystemAdmin: dbUser.isSystemAdmin
        },
        company: sessionCompany,
        companies
      }
    },
    { status: 200 }
  );

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds()
  });

  return response;
}
