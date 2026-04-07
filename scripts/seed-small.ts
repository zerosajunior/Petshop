import {
  AppointmentStatus,
  MessageChannel,
  MessagePurpose,
  MessageStatus,
  MovementType,
  PetType,
  PrismaClient
} from "@prisma/client";

const prisma = new PrismaClient();

async function ensureDefaultCompany() {
  const slug = process.env.DEFAULT_COMPANY_SLUG?.trim() || "default";
  const existing = await prisma.company.findFirst({
    where: { slug },
    select: { id: true }
  });

  if (existing) {
    return existing.id;
  }

  const company = await prisma.company.create({
    data: {
      name: "Petshop Base",
      slug,
      status: "ACTIVE"
    },
    select: { id: true }
  });

  return company.id;
}

function atTime(base: Date, hour: number, minute = 0) {
  const date = new Date(base);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function clearAllData() {
  await prisma.appointment.deleteMany();
  await prisma.messageLog.deleteMany();
  await prisma.marketingConsentRequest.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.pet.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.service.deleteMany();
  await prisma.auditLog.deleteMany();
}

async function main() {
  const now = new Date();
  const companyId = await ensureDefaultCompany();
  await clearAllData();

  const services = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.service.create({
        data: {
          name: `Serviço ${String(i + 1).padStart(2, "0")}`,
          companyId,
          description: "[seed-small] serviço fictício",
          durationMin: 30 + i * 5,
          priceCents: 4500 + i * 700
        }
      })
    )
  );

  const customers = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.customer.create({
        data: {
          name: `Cliente ${String(i + 1).padStart(2, "0")}`,
          companyId,
          phone: `+55119999${String(1000 + i)}`,
          zipCode: `01001${String(100 + i).slice(-3)}`,
          email: `cliente${i + 1}@ficticio.local`,
          preferredChannel: i % 2 === 0 ? MessageChannel.WHATSAPP : MessageChannel.SMS,
          marketingConsent: i % 3 === 0,
          marketingConsentAt: i % 3 === 0 ? now : null,
          privacyPolicyAcceptedAt: now,
          notes: "[seed-small]"
        }
      })
    )
  );

  const pets = await Promise.all(
    customers.map((customer, i) =>
      prisma.pet.create({
        data: {
          customerId: customer.id,
          companyId,
          name: `Pet ${String(i + 1).padStart(2, "0")}`,
          type: [PetType.DOG, PetType.CAT, PetType.BIRD, PetType.OTHER][i % 4],
          breed: i % 2 === 0 ? "SRD" : null,
          notes: "[seed-small]"
        }
      })
    )
  );

  const products = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.product.create({
        data: {
          name: `Produto ${String(i + 1).padStart(2, "0")}`,
          companyId,
          sku: `SMALL-${String(i + 1).padStart(3, "0")}`,
          category: i % 2 === 0 ? "Higiene" : "Alimentação",
          description: "[seed-small] produto fictício",
          currentStock: 5 + i,
          minStock: 3 + (i % 4),
          priceCents: 1200 + i * 600
        }
      })
    )
  );

  await Promise.all(
    products.map((product, i) =>
      prisma.stockMovement.create({
        data: {
          productId: product.id,
          companyId,
          type: i % 2 === 0 ? MovementType.IN : MovementType.ADJUSTMENT,
          quantity: 1 + (i % 5),
          reason: "[seed-small] movimento fictício"
        }
      })
    )
  );

  // Máximo de 10 por dia: criamos exatamente 10 para hoje.
  await Promise.all(
    Array.from({ length: 10 }, (_, i) => {
      const startsAt = atTime(now, 8 + i, 0);
      const endsAt = atTime(now, 8 + i, 30);
      return prisma.appointment.create({
        data: {
          petId: pets[i].id,
          companyId,
          serviceId: services[i].id,
          startsAt,
          endsAt,
          status:
            i % 3 === 0
              ? AppointmentStatus.CONFIRMED
              : i % 4 === 0
                ? AppointmentStatus.COMPLETED
                : AppointmentStatus.SCHEDULED,
          notes: "[seed-small]"
        }
      });
    })
  );

  await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.campaign.create({
        data: {
          title: `[seed-small] Campanha ${String(i + 1).padStart(2, "0")}`,
          companyId,
          content: "Conteúdo fictício para validação da tela.",
          startsAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          endsAt: new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000),
          isActive: i < 6,
          segmentPetType: [PetType.DOG, PetType.CAT, PetType.BIRD, PetType.OTHER, null][i % 5]
        }
      })
    )
  );

  await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.messageLog.create({
        data: {
          customerId: customers[i].id,
          companyId,
          channel: i % 2 === 0 ? MessageChannel.WHATSAPP : MessageChannel.SMS,
          purpose: i % 3 === 0 ? MessagePurpose.MARKETING : MessagePurpose.TRANSACTIONAL,
          toPhone: customers[i].phone,
          body: "[seed-small] mensagem fictícia",
          provider: "mock-small",
          providerRef: `small-${i + 1}`,
          status: i % 5 === 0 ? MessageStatus.FAILED : MessageStatus.SENT,
          errorMessage: i % 5 === 0 ? "Falha simulada" : null
        }
      })
    )
  );

  console.log("Seed small concluído", {
    customers: 10,
    pets: 10,
    services: 10,
    products: 10,
    appointmentsPerDayMax: 10,
    campaigns: 10,
    messages: 10
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
