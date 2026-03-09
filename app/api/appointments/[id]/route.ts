import { NextRequest } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { registerAudit } from "@/lib/audit";
import { getActiveCompanyId } from "@/lib/company-context";

const updateAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus)
});

const allowedTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELED],
  CONFIRMED: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELED],
  COMPLETED: [],
  CANCELED: []
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const companyId = await getActiveCompanyId().catch(() => null);
  if (!companyId) {
    return fail("Empresa ativa não configurada.", 503);
  }

  const body = await request.json().catch(() => null);
  const parsed = updateAppointmentStatusSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Status de agendamento inválido.");
  }

  const params = await context.params;
  const appointmentId = params.id;

  const current = await prisma.appointment.findFirst({
    where: { id: appointmentId, companyId },
    select: { id: true, status: true }
  });

  if (!current) {
    return fail("Agendamento não encontrado.", 404);
  }

  if (current.status === parsed.data.status) {
    return fail("O agendamento já está com este status.");
  }

  const isTransitionAllowed = allowedTransitions[current.status].includes(parsed.data.status);
  if (!isTransitionAllowed) {
    return fail("Transição de status não permitida para este agendamento.", 409);
  }

  await prisma.appointment.updateMany({
    where: { id: appointmentId, companyId },
    data: {
      status: parsed.data.status
    }
  });

  const updated = await prisma.appointment.findFirst({
    where: { id: appointmentId, companyId },
    include: {
      pet: { include: { customer: true } },
      service: true
    }
  });

  if (!updated) {
    return fail("Agendamento não encontrado.", 404);
  }

  await registerAudit({
    companyId,
    action: "APPOINTMENT_STATUS_UPDATED",
    entity: "Appointment",
    entityId: updated.id,
    details: `Status alterado de ${current.status} para ${updated.status}`
  });

  return ok(updated);
}
