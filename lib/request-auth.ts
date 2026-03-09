import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { MembershipRole } from "@prisma/client";

export type RequestSession = {
  username: string;
  role: MembershipRole | "ADMIN";
  companyId: string;
  companySlug: string;
};

export async function getRequestSession(): Promise<RequestSession | null> {
  const h = await headers();
  const username = h.get("x-auth-user")?.trim();
  const role = h.get("x-auth-role")?.trim() as MembershipRole | "ADMIN" | undefined;
  const companyId = h.get("x-company-id")?.trim();
  const companySlug = h.get("x-company-slug")?.trim();

  if (!username || !role || !companyId || !companySlug) {
    return null;
  }

  return { username, role, companyId, companySlug };
}

export async function requireSystemAdmin() {
  const session = await getRequestSession();
  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.username },
    select: { id: true, isSystemAdmin: true }
  });

  if (!user?.isSystemAdmin) {
    return null;
  }

  return {
    userId: user.id,
    session
  };
}
