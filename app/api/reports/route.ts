import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/http";
import { AppointmentStatus, MessageStatus } from "@prisma/client";
import { getActiveCompanyId } from "@/lib/company-context";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export async function GET() {
  const companyId = await getActiveCompanyId();
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
        companyId,
        startsAt: { gte: dayStart, lte: dayEnd },
        status: { not: AppointmentStatus.CANCELED }
      },
      select: {
        chargedPriceCents: true,
        service: {
          select: {
            priceCents: true
          }
        }
      }
    }),
    prisma.appointment.findMany({
      where: {
        companyId,
        startsAt: { gte: monthStart, lte: monthEnd },
        status: AppointmentStatus.COMPLETED
      },
      select: {
        chargedPriceCents: true,
        service: {
          select: {
            name: true,
            priceCents: true
          }
        }
      }
    }),
    prisma.product.findMany({
      where: { companyId },
      select: {
        currentStock: true,
        priceCents: true
      }
    }),
    prisma.messageLog.count({
      where: {
        companyId,
        status: MessageStatus.SENT,
        createdAt: { gte: last24h }
      }
    }),
    prisma.campaign.count({
      where: {
        companyId,
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now }
      }
    })
  ]);

  const projectedRevenueTodayCents = appointmentsToday.reduce(
    (total, appointment) => total + (appointment.chargedPriceCents ?? appointment.service.priceCents),
    0
  );

  const realizedRevenueMonthCents = completedMonth.reduce(
    (total, appointment) => total + (appointment.chargedPriceCents ?? appointment.service.priceCents),
    0
  );

  const completedCountMonth = completedMonth.length;
  const averageTicketMonthCents =
    completedCountMonth > 0 ? Math.round(realizedRevenueMonthCents / completedCountMonth) : 0;

  const stockValueCents = products.reduce(
    (total, product) => total + product.currentStock * product.priceCents,
    0
  );

  const serviceCountMap = new Map<string, { completed: number; revenueCents: number }>();

  for (const appointment of completedMonth) {
    const serviceName = appointment.service.name;
    const current = serviceCountMap.get(serviceName) ?? { completed: 0, revenueCents: 0 };
    const price = appointment.chargedPriceCents ?? appointment.service.priceCents;
    serviceCountMap.set(serviceName, {
      completed: current.completed + 1,
      revenueCents: current.revenueCents + price
    });
  }

  const topServicesMonth = Array.from(serviceCountMap.entries())
    .map(([serviceName, summary]) => ({
      serviceName,
      completed: summary.completed,
      revenueCents: summary.revenueCents
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
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
