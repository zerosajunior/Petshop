import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export class CompanyContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanyContextError";
  }
}

export async function getActiveCompanyId() {
  const requestHeaders = await headers();
  const fromSession = requestHeaders.get("x-company-id")?.trim();
  if (fromSession) {
    return fromSession;
  }

  const desiredSlug = process.env.DEFAULT_COMPANY_SLUG?.trim();

  const company = desiredSlug
    ? await prisma.company.findFirst({
        where: {
          slug: desiredSlug,
          status: "ACTIVE"
        },
        select: { id: true }
      })
    : await prisma.company.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: { id: true }
      });

  if (!company) {
    throw new CompanyContextError(
      "Nenhuma empresa ativa encontrada. Crie uma empresa e configure DEFAULT_COMPANY_SLUG."
    );
  }

  return company.id;
}
