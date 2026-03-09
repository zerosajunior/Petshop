import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Role = "ADMIN" | "ATTENDANT" | "GROOMER";

type AuthUser = {
  username: string;
  password: string;
  role: Role;
};

const REALM = "Petshop";

function unauthorized() {
  return new NextResponse("Autenticação obrigatória.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`
    }
  });
}

function forbidden(isApi: boolean) {
  if (isApi) {
    return NextResponse.json(
      { error: "Você não tem permissão para esta ação." },
      { status: 403 }
    );
  }

  return new NextResponse("Acesso negado.", { status: 403 });
}

function parseUsers(raw: string | undefined): AuthUser[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const username = String((item as Record<string, unknown>).username ?? "").trim();
        const password = String((item as Record<string, unknown>).password ?? "");
        const role = String((item as Record<string, unknown>).role ?? "").trim().toUpperCase();

        if (!username || !password) {
          return null;
        }

        if (role !== "ADMIN" && role !== "ATTENDANT" && role !== "GROOMER") {
          return null;
        }

        return { username, password, role: role as Role };
      })
      .filter((item): item is AuthUser => Boolean(item));
  } catch {
    return [];
  }
}

function extractBasicCredentials(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Basic ")) {
    return null;
  }

  const encoded = header.slice(6).trim();
  if (!encoded) {
    return null;
  }

  try {
    const decoded = atob(encoded);
    const separator = decoded.indexOf(":");
    if (separator === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1)
    };
  } catch {
    return null;
  }
}

function hasPermission(role: Role, pathname: string, method: string) {
  if (role === "ADMIN") {
    return true;
  }

  if (pathname.startsWith("/api/privacy") || pathname.startsWith("/privacidade")) {
    return false;
  }

  if (pathname.startsWith("/api") && method === "DELETE") {
    return false;
  }

  if (role === "GROOMER") {
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

  const users = parseUsers(process.env.AUTH_USERS_JSON);
  if (users.length === 0) {
    return new NextResponse(
      "Configuração de autenticação ausente. Defina AUTH_USERS_JSON no ambiente.",
      { status: 503 }
    );
  }

  const credentials = extractBasicCredentials(request);
  if (!credentials) {
    return unauthorized();
  }

  const user = users.find(
    (item) =>
      item.username === credentials.username && item.password === credentials.password
  );

  if (!user) {
    return unauthorized();
  }

  if (!hasPermission(user.role, pathname, request.method)) {
    return forbidden(isApi);
  }

  const response = NextResponse.next();
  response.headers.set("x-auth-user", user.username);
  response.headers.set("x-auth-role", user.role);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"
  ]
};
