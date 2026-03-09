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

function dateOffset(base: Date, days: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

function svgDataUrl(label: string, bgColor: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='800'><rect width='100%' height='100%' fill='${bgColor}'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#ffffff' font-size='52' font-family='Arial'>${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function clearData() {
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
  const companyId = await ensureDefaultCompany();
  await clearData();
  const now = new Date();

  const services = await Promise.all(
    [
      { name: "Banho", durationMin: 50, priceCents: 6500 },
      { name: "Tosa", durationMin: 60, priceCents: 8000 },
      { name: "Banho e tosa", durationMin: 90, priceCents: 12000 },
      { name: "Corte de unhas", durationMin: 25, priceCents: 3500 },
      { name: "Hidratação", durationMin: 45, priceCents: 7000 }
    ].map((service) =>
      prisma.service.create({
        data: {
          companyId,
          ...service,
          description: "[seed-demo] serviço fictício"
        }
      })
    )
  );

  const customers = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.customer.create({
        data: {
          companyId,
          name: `Cliente Demo ${String(i + 1).padStart(2, "0")}`,
          phone: `+55119888${String(1000 + i)}`,
          email: `demo${i + 1}@petshop.local`,
          preferredChannel: i % 2 === 0 ? MessageChannel.WHATSAPP : MessageChannel.SMS,
          marketingConsent: i % 3 !== 0,
          marketingConsentAt: i % 3 !== 0 ? now : null,
          privacyPolicyAcceptedAt: now,
          notes: "[seed-demo]"
        }
      })
    )
  );

  const pets = await Promise.all(
    customers.map((customer, i) =>
      prisma.pet.create({
        data: {
          companyId,
          customerId: customer.id,
          name: `Pet Demo ${String(i + 1).padStart(2, "0")}`,
          type: [PetType.DOG, PetType.CAT, PetType.BIRD, PetType.OTHER][i % 4],
          breed: i % 2 === 0 ? "SRD" : null,
          notes: "[seed-demo]"
        }
      })
    )
  );

  const productSeed = Array.from({ length: 10 }, (_, i) => ({
    name: `Produto Demo ${String(i + 1).padStart(2, "0")}`,
    sku: `DEMO-${String(i + 1).padStart(3, "0")}`,
    category: i % 2 === 0 ? "Higiene" : "Alimentação",
    description: "produto com múltiplas fotos",
    currentStock: 10 + i * 2,
    minStock: 4 + (i % 3),
    priceCents: 1990 + i * 550
  }));

  const products = [];
  for (let i = 0; i < productSeed.length; i++) {
    const base = productSeed[i];
    const product = await prisma.product.create({
      data: {
        companyId,
        ...base,
        imageDataUrl: svgDataUrl(`Produto ${i + 1} A`, "#4f7f7a")
      }
    });

    await prisma.productImage.createMany({
      data: [
        {
          productId: product.id,
          companyId,
          dataUrl: svgDataUrl(`Produto ${i + 1} A`, "#4f7f7a"),
          position: 0
        },
        {
          productId: product.id,
          companyId,
          dataUrl: svgDataUrl(`Produto ${i + 1} B`, "#7a6f4f"),
          position: 1
        },
        {
          productId: product.id,
          companyId,
          dataUrl: svgDataUrl(`Produto ${i + 1} C`, "#4f5f7f"),
          position: 2
        }
      ]
    });

    await prisma.stockMovement.createMany({
      data: [
        {
          productId: product.id,
          companyId,
          type: MovementType.IN,
          quantity: 8 + i,
          reason: "[seed-demo] entrada inicial"
        },
        {
          productId: product.id,
          companyId,
          type: MovementType.ADJUSTMENT,
          quantity: i % 2 === 0 ? 1 : -1,
          reason: "[seed-demo] ajuste inventário"
        }
      ]
    });

    products.push(product);
  }

  // 5 agendamentos por dia entre 5 dias atrás e 2 dias à frente.
  const dayOffsets = [-5, -4, -3, -2, -1, 0, 1, 2];
  const hours = [8, 10, 12, 14, 16];
  const appointmentData = [];

  for (const dayOffset of dayOffsets) {
    const baseDay = dateOffset(now, dayOffset);
    for (let i = 0; i < 5; i++) {
      const pet = pets[(dayOffsets.indexOf(dayOffset) * 5 + i) % pets.length];
      const service = services[i % services.length];
      const startsAt = atTime(baseDay, hours[i], 0);
      const endsAt = atTime(baseDay, hours[i], 30);
      const status =
        dayOffset < 0
          ? [AppointmentStatus.COMPLETED, AppointmentStatus.CONFIRMED][i % 2]
          : dayOffset === 0
            ? [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED][i % 2]
            : AppointmentStatus.SCHEDULED;

      appointmentData.push({
        companyId,
        petId: pet.id,
        serviceId: service.id,
        startsAt,
        endsAt,
        status,
        notes: "[seed-demo] agendamento diário"
      });
    }
  }

  await prisma.appointment.createMany({ data: appointmentData });

  await prisma.campaign.createMany({
    data: Array.from({ length: 6 }, (_, i) => ({
      companyId,
      title: `[seed-demo] Campanha ${i + 1}`,
      content: "Promoção fictícia para testes.",
      startsAt: dateOffset(now, -2),
      endsAt: dateOffset(now, 7 + i),
      isActive: i < 4,
      segmentPetType: [PetType.DOG, PetType.CAT, PetType.BIRD, PetType.OTHER, null][i % 5]
    }))
  });

  await prisma.messageLog.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      companyId,
      customerId: customers[i].id,
      channel: i % 2 === 0 ? MessageChannel.WHATSAPP : MessageChannel.SMS,
      purpose: i % 3 === 0 ? MessagePurpose.MARKETING : MessagePurpose.TRANSACTIONAL,
      toPhone: customers[i].phone,
      body: "[seed-demo] mensagem de teste",
      provider: "mock-demo",
      providerRef: `demo-${i + 1}`,
      status: i % 5 === 0 ? MessageStatus.FAILED : MessageStatus.SENT,
      errorMessage: i % 5 === 0 ? "Falha simulada" : null
    }))
  });

  const todayStart = atTime(now, 0, 0);
  const todayEnd = atTime(now, 23, 59);
  const appointmentsToday = await prisma.appointment.count({
    where: { companyId, startsAt: { gte: todayStart, lte: todayEnd } }
  });

  console.log("Seed demo concluído", {
    customers: 10,
    pets: 10,
    services: 5,
    products: 10,
    productImagesPerProduct: 3,
    appointmentsTotal: appointmentData.length,
    appointmentsToday,
    appointmentsPerDay: 5
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
