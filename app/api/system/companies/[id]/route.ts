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

const companyUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  slug: z.string().trim().min(2).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).optional(),
  planId: z.string().nullable().optional(),
  logoDataUrl: logoSchema.nullable().optional()
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await requireSystemAdmin();
  if (!actor) {
    return fail("Acesso restrito ao admin do sistema.", 403);
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = companyUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de empresa inválidos.");
  }

  try {
    const company = await prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: { id },
        data: {
          name: parsed.data.name,
          slug: parsed.data.slug,
          status: parsed.data.status,
          planId: parsed.data.planId
        }
      });

      if (parsed.data.logoDataUrl !== undefined) {
        const currentSettings = await tx.companySettings.findUnique({
          where: { companyId: id },
          select: { branding: true }
        });
        const currentBranding = parseCompanyBranding(currentSettings?.branding);
        await tx.companySettings.upsert({
          where: { companyId: id },
          update: {
            branding: serializeCompanyBranding({
              note: currentBranding.note,
              logoDataUrl: parsed.data.logoDataUrl
            })
          },
          create: {
            companyId: id,
            branding: serializeCompanyBranding({
              note: currentBranding.note,
              logoDataUrl: parsed.data.logoDataUrl
            })
          }
        });
      }

      const settings = await tx.companySettings.findUnique({
        where: { companyId: id },
        select: { branding: true }
      });

      return {
        ...updated,
        logoDataUrl: parseCompanyBranding(settings?.branding).logoDataUrl
      };
    });

    return ok(company);
  } catch (error) {
    const message =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
        ? "Já existe uma empresa com esse identificador."
        : "Não foi possível atualizar a empresa.";
    return fail(message, 400);
  }
}
