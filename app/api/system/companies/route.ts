import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { requireSystemAdmin } from "@/lib/request-auth";
import { parseCompanyBranding, serializeCompanyBranding } from "@/lib/company-branding";

const logoSchema = z
  .string()
  .trim()
  .max(1_500_000)
  .refine((value) => value.startsWith("data:image/"), "Logotipo inválido.");

const companySchema = z.object({
  name: z.string().trim().min(2),
  slug: z.string().trim().min(2).regex(/^[a-z0-9-]+$/),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).optional(),
  planId: z.string().optional().nullable(),
  logoDataUrl: logoSchema.optional().nullable()
});

export async function GET() {
  const actor = await requireSystemAdmin();
  if (!actor) {
    return fail("Acesso restrito ao admin do sistema.", 403);
  }

  const companies = await prisma.company.findMany({
    include: {
      settings: {
        select: { branding: true }
      },
      plan: true,
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { plan: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return ok(
    companies.map((company) => {
      const { settings, ...companyBase } = company;
      return {
        ...companyBase,
        logoDataUrl: parseCompanyBranding(settings?.branding).logoDataUrl
      };
    })
  );
}

export async function POST(request: NextRequest) {
  const actor = await requireSystemAdmin();
  if (!actor) {
    return fail("Acesso restrito ao admin do sistema.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = companySchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de empresa inválidos.");
  }

  try {
    const company = await prisma.company.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        status: parsed.data.status ?? "ACTIVE",
        planId: parsed.data.planId ?? null,
        ...(parsed.data.logoDataUrl
          ? {
              settings: {
                create: {
                  branding: serializeCompanyBranding({ logoDataUrl: parsed.data.logoDataUrl })
                }
              }
            }
          : {})
      },
      include: {
        settings: {
          select: { branding: true }
        }
      }
    });

    const { settings, ...companyBase } = company;

    return ok(
      {
        ...companyBase,
        logoDataUrl: parseCompanyBranding(settings?.branding).logoDataUrl
      },
      201
    );
  } catch (error) {
    const message =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
        ? "Já existe uma empresa com esse identificador."
        : "Não foi possível criar a empresa.";
    return fail(message, 400);
  }
}
