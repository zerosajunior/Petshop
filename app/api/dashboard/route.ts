import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/http";
import { AppointmentStatus, MessageStatus } from "@prisma/client";

export async function GET() {
  const now = new Date();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    appointmentsToday,
    appointmentsTodayItems,
    pendingConfirmations,
    smsSentLast24h,
    smsSentLast24hItems,
    products,
    activeCampaignItems
  ] = await Promise.all([
    prisma.appointment.count({
      where: {
        startsAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    }),
    prisma.appointment.findMany({
      where: {
        startsAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        pet: {
          include: {
            customer: true
          }
        },
        service: true
      },
      orderBy: {
        startsAt: "asc"
      },
      take: 8
    }),
    prisma.appointment.count({
      where: {
        startsAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: AppointmentStatus.SCHEDULED
      }
    }),
    prisma.messageLog.count({
      where: {
        status: MessageStatus.SENT,
        createdAt: {
          gte: last24h
        }
      }
    }),
    prisma.messageLog.findMany({
      where: {
        status: MessageStatus.SENT,
        createdAt: {
          gte: last24h
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 8
    }),
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        currentStock: true,
        minStock: true
      }
    }),
    prisma.campaign.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now }
      },
      orderBy: {
        startsAt: "desc"
      },
      take: 8
    })
  ]);

  const lowStockProductsItems = products.filter(
    (product) => product.currentStock < product.minStock
  );
  const lowStockProducts = lowStockProductsItems.length;
  const activeCampaigns = activeCampaignItems.length;

  return ok({
    appointmentsToday,
    appointmentsTodayItems: appointmentsTodayItems.map((item) => ({
      id: item.id,
      petName: item.pet.name,
      customerName: item.pet.customer.name,
      serviceName: item.service.name,
      startsAt: item.startsAt.toISOString(),
      status: item.status
    })),
    pendingConfirmations,
    smsSentLast24h,
    smsSentLast24hItems: smsSentLast24hItems.map((item) => ({
      id: item.id,
      channel: item.channel,
      toPhone: item.toPhone,
      body: item.body,
      createdAt: item.createdAt.toISOString()
    })),
    lowStockProducts,
    lowStockProductsItems,
    activeCampaigns,
    activeCampaignItems: activeCampaignItems.map((item) => ({
      id: item.id,
      title: item.title,
      startsAt: item.startsAt.toISOString(),
      endsAt: item.endsAt.toISOString(),
      segmentPetType: item.segmentPetType
    }))
  });
}
