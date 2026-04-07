import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";
import { registerAudit } from "@/lib/audit";
import { CompanyContextError, getActiveCompanyId } from "@/lib/company-context";
import { enforceAppointmentLimit } from "@/lib/plan-limits";

const appointmentSchema = z.object({
  petId: z.string().min(1),
  serviceId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  chargedPriceCents: z.number().int().nonnegative().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  notes: z.string().optional()
});

export async function GET() {
  try {
    const companyId = await getActiveCompanyId();
    const appointments = await prisma.appointment.findMany({
      where: { companyId },
      include: {
        pet: { include: { customer: true } },
        service: true
      },
      orderBy: { startsAt: "asc" }
    });

    return ok(appointments);
  } catch (error) {
    if (error instanceof CompanyContextError) {
      return fail(error.message, 503);
    }
    return fail("Falha ao carregar agendamentos.", 500);
  }
}

export async function POST(request: NextRequest) {
  const companyId = await getActiveCompanyId().catch(() => null);
  if (!companyId) {
    return fail("Empresa ativa não configurada.", 503);
  }

  const body = await request.json().catch(() => null);
  const parsed = appointmentSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de agendamento inválidos");
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return fail("Data/hora inválida para o agendamento.");
  }

  if (endsAt <= startsAt) {
    return fail("O horário de fim deve ser posterior ao início.");
  }

  const [pet, service] = await Promise.all([
    prisma.pet.findFirst({
      where: { id: parsed.data.petId, companyId },
      select: { id: true, isDeceased: true }
    }),
    prisma.service.findFirst({
      where: { id: parsed.data.serviceId, companyId },
      select: { id: true, priceCents: true }
    })
  ]);

  if (!pet) {
    return fail("Pet não encontrado para a empresa ativa.", 404);
  }
  if (pet.isDeceased) {
    return fail("Este pet está marcado como falecido e não pode ser agendado.", 409);
  }

  if (!service) {
    return fail("Serviço não encontrado para a empresa ativa.", 404);
  }

  const conflict = await prisma.appointment.findFirst({
    where: {
      companyId,
      petId: parsed.data.petId,
      status: {
        not: AppointmentStatus.CANCELED
      },
      startsAt: {
        lt: endsAt
      },
      endsAt: {
        gt: startsAt
      }
    },
    select: {
      id: true
    }
  });

  if (conflict) {
    return fail("Conflito de horário: o pet já possui agendamento neste período.", 409);
  }

  try {
    await enforceAppointmentLimit(companyId);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Limite do plano atingido para agendamentos.",
      409
    );
  }

  const appointment = await prisma.appointment.create({
    data: {
      ...parsed.data,
      companyId,
      startsAt,
      endsAt,
      chargedPriceCents: parsed.data.chargedPriceCents ?? service.priceCents
    }
  });

  await registerAudit({
    companyId,
    action: "APPOINTMENT_CREATED",
    entity: "Appointment",
    entityId: appointment.id,
    details: `Agendamento criado para petId=${appointment.petId}`
  });

  return ok(appointment, 201);
}
