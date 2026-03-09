import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";
import type { AuthRole } from "@/lib/auth-users";

function forbidden(isApi: boolean) {
  if (isApi) {
    return NextResponse.json(
      { error: "Você não tem permissão para esta ação." },
      { status: 403 }
    );
  }

  return new NextResponse("Acesso negado.", { status: 403 });
}

function hasPermission(
  role: AuthRole,
  pathname: string,
  method: string,
  isSystemAdmin: boolean | undefined
) {
  if (pathname.startsWith("/admin/sistema") || pathname.startsWith("/api/system/")) {
    return Boolean(isSystemAdmin);
  }

  if (role === "ADMIN") {
    return true;
  }

  if (pathname.startsWith("/api/privacy") || pathname.startsWith("/privacidade")) {
    return false;
  }

  if (pathname.startsWith("/api") && method === "DELETE") {
    return false;
  }

  if (role === "PROFESSIONAL") {
    if (pathname.startsWith("/api/appointments")) {
      return method === "GET" || method === "PATCH";
    }

    return pathname.startsWith("/agenda") || pathname.startsWith("/api/dashboard");
  }

  return true;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith("/api");
  const isLoginPage = pathname === "/login";
  const isAuthApi = pathname.startsWith("/api/auth/");

  if (isLoginPage || isAuthApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return verifySessionToken(token).then((session) => {
    if (!session) {
      if (isApi) {
        return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    if (!hasPermission(session.role, pathname, request.method, session.isSystemAdmin)) {
      return forbidden(isApi);
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-auth-user", session.username);
    requestHeaders.set("x-auth-role", session.role);
    requestHeaders.set("x-company-id", session.companyId);
    requestHeaders.set("x-company-slug", session.companySlug);
    requestHeaders.set("x-is-system-admin", session.isSystemAdmin ? "1" : "0");

    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"
  ]
};
