import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth-session";

function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function POST() {
  const response = NextResponse.json({ data: { success: true } }, { status: 200 });
  clearSessionCookie(response);
  return response;
}

export async function GET() {
  return NextResponse.json(
    { error: "Método não permitido. Use POST para encerrar a sessão." },
    { status: 405 }
  );
}
