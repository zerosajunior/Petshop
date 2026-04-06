import type { AuthRole } from "@/lib/auth-users";

export const AUTH_COOKIE_NAME = "petshop_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  username: string;
  role: AuthRole;
  companyId: string;
  companySlug: string;
  isSystemAdmin?: boolean;
  exp: number;
};

function base64UrlEncode(input: Uint8Array) {
  let binary = "";
  for (const byte of input) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importKey(secret: string) {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(data: string, secret: string) {
  const key = await importKey(secret);
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

async function verifySignature(data: string, signature: string, secret: string) {
  const key = await importKey(secret);
  const encoder = new TextEncoder();
  const signatureBytes = base64UrlDecode(signature);
  return crypto.subtle.verify("HMAC", key, signatureBytes, encoder.encode(data));
}

function readSecret() {
  const secret = process.env.AUTH_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SESSION_SECRET não configurado.");
  }
  return secret;
}

export function sessionMaxAgeSeconds() {
  return SESSION_TTL_SECONDS;
}

export async function createSessionToken(input: Omit<SessionPayload, "exp">) {
  const secret = readSecret();
  const payload: SessionPayload = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  };
  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await sign(body, secret);
  return `${body}.${sig}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  const secret = process.env.AUTH_SESSION_SECRET?.trim();
  if (!secret) {
    return null;
  }

  const [body, sig] = token.split(".");
  if (!body || !sig) {
    return null;
  }

  const validSignature = await verifySignature(body, sig, secret).catch(() => false);
  if (!validSignature) {
    return null;
  }

  try {
    const decoded = new TextDecoder().decode(base64UrlDecode(body));
    const payload = JSON.parse(decoded) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (!payload.username || !payload.role || !payload.companyId || !payload.companySlug) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
