import { prisma } from "@/lib/prisma";

async function resolvePlanForCompany(companyId: string) {
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      companyId,
      status: { in: ["TRIAL", "ACTIVE"] }
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" }
  });

  if (activeSubscription?.plan) {
    return activeSubscription.plan;
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { plan: true }
  });

  return company?.plan ?? null;
}

export async function enforceAppointmentLimit(companyId: string) {
  const plan = await resolvePlanForCompany(companyId);
  if (!plan?.maxAppointmentsMonth) {
    return;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const count = await prisma.appointment.count({
    where: {
      companyId,
      startsAt: { gte: monthStart, lte: monthEnd }
    }
  });

  if (count >= plan.maxAppointmentsMonth) {
    throw new Error(
      `Limite mensal do plano atingido (${plan.maxAppointmentsMonth} agendamentos).`
    );
  }
}

export async function enforceMaxUsersLimit(companyId: string) {
  const plan = await resolvePlanForCompany(companyId);
  if (!plan?.maxUsers) {
    return;
  }

  const count = await prisma.membership.count({
    where: {
      companyId,
      status: "ACTIVE"
    }
  });

  if (count >= plan.maxUsers) {
    throw new Error(`Limite de usuários do plano atingido (${plan.maxUsers} usuários).`);
  }
}
