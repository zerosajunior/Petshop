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
  SCHEDULED: [AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS, AppointmentStatus.CANCELED],
  CONFIRMED: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.CANCELED],
  IN_PROGRESS: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELED],
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

  const updateData: {
    status: AppointmentStatus;
    startedAt?: Date;
    finishedAt?: Date;
  } = {
    status: parsed.data.status
  };

  if (parsed.data.status === AppointmentStatus.IN_PROGRESS) {
    updateData.startedAt = new Date();
    updateData.finishedAt = undefined;
  }
  if (parsed.data.status === AppointmentStatus.COMPLETED) {
    updateData.finishedAt = new Date();
    if (current.status !== AppointmentStatus.IN_PROGRESS) {
      updateData.startedAt = new Date();
    }
  }
  if (parsed.data.status === AppointmentStatus.CANCELED) {
    updateData.finishedAt = new Date();
  }

  await prisma.appointment.updateMany({
    where: { id: appointmentId, companyId },
    data: updateData
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
