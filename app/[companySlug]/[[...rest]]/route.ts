import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  sessionMaxAgeSeconds,
  verifySessionToken
} from "@/lib/auth-session";

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

function buildTargetPath(rest: string[] | undefined, search: string) {
  const basePath = rest && rest.length > 0 ? `/${rest.join("/")}` : "/";
  return `${basePath}${search}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ companySlug: string; rest?: string[] }> }
) {
  const { companySlug, rest } = await context.params;

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return redirectToLogin(request);
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return redirectToLogin(request);
  }

  const company = await prisma.company.findFirst({
    where: {
      slug: companySlug,
      status: "ACTIVE"
    },
    select: {
      id: true,
      slug: true
    }
  });

  if (!company) {
    return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.username },
    select: { id: true, isSystemAdmin: true }
  });

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
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
      return NextResponse.json({ error: "Usuário sem acesso a esta empresa." }, { status: 403 });
    }

    role = membership.role;
  }

  const nextToken = await createSessionToken({
    username: session.username,
    role,
    companyId: company.id,
    companySlug: company.slug,
    isSystemAdmin: user.isSystemAdmin
  });

  const targetPath = buildTargetPath(rest, request.nextUrl.search);
  const response = NextResponse.redirect(new URL(targetPath, request.url));

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: nextToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds()
  });

  return response;
}
