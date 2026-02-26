import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";
import { registerAudit } from "@/lib/audit";

const appointmentSchema = z.object({
  petId: z.string().min(1),
  serviceId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  notes: z.string().optional()
});

export async function GET() {
  const appointments = await prisma.appointment.findMany({
    include: {
      pet: { include: { customer: true } },
      service: true
    },
    orderBy: { startsAt: "asc" }
  });

  return ok(appointments);
}

export async function POST(request: NextRequest) {
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

  const conflict = await prisma.appointment.findFirst({
    where: {
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

  const appointment = await prisma.appointment.create({
    data: {
      ...parsed.data,
      startsAt,
      endsAt
    }
  });

  await registerAudit({
    action: "APPOINTMENT_CREATED",
    entity: "Appointment",
    entityId: appointment.id,
    details: `Agendamento criado para petId=${appointment.petId}`
  });

  return ok(appointment, 201);
}
