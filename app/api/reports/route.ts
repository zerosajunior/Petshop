import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/http";
import { AppointmentStatus, MessageStatus } from "@prisma/client";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export async function GET() {
  const now = new Date();

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [appointmentsToday, completedMonth, products, sentMessages24h, activeCampaigns] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: dayStart, lte: dayEnd },
        status: { not: AppointmentStatus.CANCELED }
      },
      select: {
        service: {
          select: {
            priceCents: true
          }
        }
      }
    }),
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: monthStart, lte: monthEnd },
        status: AppointmentStatus.COMPLETED
      },
      select: {
        service: {
          select: {
            name: true,
            priceCents: true
          }
        }
      }
    }),
    prisma.product.findMany({
      select: {
        currentStock: true,
        priceCents: true
      }
    }),
    prisma.messageLog.count({
      where: {
        status: MessageStatus.SENT,
        createdAt: { gte: last24h }
      }
    }),
    prisma.campaign.count({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now }
      }
    })
  ]);

  const projectedRevenueTodayCents = appointmentsToday.reduce(
    (total, appointment) => total + appointment.service.priceCents,
    0
  );

  const realizedRevenueMonthCents = completedMonth.reduce(
    (total, appointment) => total + appointment.service.priceCents,
    0
  );

  const completedCountMonth = completedMonth.length;
  const averageTicketMonthCents =
    completedCountMonth > 0 ? Math.round(realizedRevenueMonthCents / completedCountMonth) : 0;

  const stockValueCents = products.reduce(
    (total, product) => total + product.currentStock * product.priceCents,
    0
  );

  const serviceCountMap = new Map<string, number>();

  for (const appointment of completedMonth) {
    const serviceName = appointment.service.name;
    serviceCountMap.set(serviceName, (serviceCountMap.get(serviceName) ?? 0) + 1);
  }

  const topServicesMonth = Array.from(serviceCountMap.entries())
    .map(([serviceName, completed]) => ({ serviceName, completed }))
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 5);

  return ok({
    projectedRevenueTodayCents,
    realizedRevenueMonthCents,
    averageTicketMonthCents,
    stockValueCents,
    completedCountMonth,
    scheduledCountToday: appointmentsToday.length,
    sentMessages24h,
    activeCampaigns,
    topServicesMonth
  });
}
