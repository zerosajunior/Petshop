import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { getRequestSession } from "@/lib/request-auth";
import { getActiveCompanyId } from "@/lib/company-context";
import { parseCompanyBranding, serializeCompanyBranding } from "@/lib/company-branding";

const settingsSchema = z.object({
  timezone: z.string().trim().min(3).optional(),
  workingHours: z.string().trim().max(1000).optional().nullable(),
  branding: z.string().trim().max(3000).optional().nullable(),
  logoDataUrl: z
    .string()
    .trim()
    .max(1_500_000)
    .refine((value) => value.startsWith("data:image/"), "Logotipo inválido.")
    .optional()
    .nullable(),
  notifications: z.string().trim().max(1000).optional().nullable()
});

export async function GET() {
  const session = await getRequestSession();
  if (!session) {
    return fail("Não autenticado.", 401);
  }

  const companyId = await getActiveCompanyId();
  const settings = await prisma.companySettings.findUnique({
    where: { companyId }
  });

  const branding = parseCompanyBranding(settings?.branding);

  return ok(
    settings
      ? {
          ...settings,
          branding: branding.note,
          logoDataUrl: branding.logoDataUrl
        }
      : null
  );
}

export async function PATCH(request: NextRequest) {
  const session = await getRequestSession();
  if (!session) {
    return fail("Não autenticado.", 401);
  }

  if (session.role !== "ADMIN") {
    return fail("Apenas administradores podem alterar configurações.", 403);
  }

  const companyId = await getActiveCompanyId();
  const body = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de configuração inválidos.");
  }

  const currentSettings = await prisma.companySettings.findUnique({
    where: { companyId },
    select: { branding: true }
  });
  const currentBranding = parseCompanyBranding(currentSettings?.branding);
  const nextBranding = serializeCompanyBranding({
    note: parsed.data.branding === undefined ? currentBranding.note : parsed.data.branding,
    logoDataUrl:
      parsed.data.logoDataUrl === undefined ? currentBranding.logoDataUrl : parsed.data.logoDataUrl
  });

  const updated = await prisma.companySettings.upsert({
    where: { companyId },
    update: {
      timezone: parsed.data.timezone,
      workingHours: parsed.data.workingHours,
      branding: nextBranding,
      notifications: parsed.data.notifications
    },
    create: {
      companyId,
      timezone: parsed.data.timezone ?? "America/Sao_Paulo",
      workingHours: parsed.data.workingHours,
      branding: nextBranding,
      notifications: parsed.data.notifications
    }
  });

  const branding = parseCompanyBranding(updated.branding);

  return ok({
    ...updated,
    branding: branding.note,
    logoDataUrl: branding.logoDataUrl
  });
}
