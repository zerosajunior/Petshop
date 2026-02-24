import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";

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

  const appointment = await prisma.appointment.create({
    data: {
      ...parsed.data,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt)
    }
  });

  return ok(appointment, 201);
}
