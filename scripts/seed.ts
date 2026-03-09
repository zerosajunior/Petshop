import {
  AppointmentStatus,
  MessageChannel,
  MessageStatus,
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

async function main() {
  const companyId = await ensureDefaultCompany();
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 26 * 60 * 60 * 1000);

  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: "srv_banho_tosa" },
      update: {
        companyId,
        name: "Banho e tosa",
        description: "Pacote padrão",
        priceCents: 9000,
        durationMin: 90
      },
      create: {
        id: "srv_banho_tosa",
        companyId,
        name: "Banho e tosa",
        description: "Pacote padrão",
        priceCents: 9000,
        durationMin: 90
      }
    }),
    prisma.service.upsert({
      where: { id: "srv_consulta" },
      update: {
        companyId,
        name: "Consulta rápida",
        description: "Avaliação geral",
        priceCents: 12000,
        durationMin: 45
      },
      create: {
        id: "srv_consulta",
        companyId,
        name: "Consulta rápida",
        description: "Avaliação geral",
        priceCents: 12000,
        durationMin: 45
      }
    }),
    prisma.service.upsert({
      where: { id: "srv_hidratacao" },
      update: {
        companyId,
        name: "Hidratação premium",
        description: "Tratamento de pelagem",
        priceCents: 15000,
        durationMin: 60
      },
      create: {
        id: "srv_hidratacao",
        companyId,
        name: "Hidratação premium",
        description: "Tratamento de pelagem",
        priceCents: 15000,
        durationMin: 60
      }
    })
  ]);

  const customersInput = [
    {
      name: "Ana Costa",
      phone: "+5511999999999",
      email: "ana@example.com",
      preferredChannel: MessageChannel.WHATSAPP
    },
    {
      name: "Bruno Lima",
      phone: "+5511988887777",
      email: "bruno@example.com",
      preferredChannel: MessageChannel.SMS
    },
    {
      name: "Carla Souza",
      phone: "+5511977776666",
      email: "carla@example.com",
      preferredChannel: MessageChannel.WHATSAPP
    }
  ];

  const customers = [];
  for (const customerInput of customersInput) {
    const existing = await prisma.customer.findFirst({
      where: { companyId, email: customerInput.email }
    });

    if (existing) {
      customers.push(
        await prisma.customer.update({
          where: { id: existing.id },
          data: { ...customerInput, companyId }
        })
      );
      continue;
    }

    customers.push(
      await prisma.customer.create({
        data: { ...customerInput, companyId }
      })
    );
  }

  const [ana, bruno, carla] = customers;

  const petsInput = [
    { customerId: ana.id, name: "Thor", type: PetType.DOG, breed: "Labrador" },
    { customerId: bruno.id, name: "Mia", type: PetType.CAT, breed: "Siamês" },
    { customerId: carla.id, name: "Nina", type: PetType.DOG, breed: "Shih-tzu" },
    { customerId: ana.id, name: "Pipoca", type: PetType.CAT, breed: "SRD" }
  ];

  const pets = [];
  for (const petInput of petsInput) {
    const existing = await prisma.pet.findFirst({
      where: {
        customerId: petInput.customerId,
        companyId,
        name: petInput.name
      }
    });

    if (existing) {
      pets.push(
        await prisma.pet.update({
          where: { id: existing.id },
          data: { ...petInput, companyId }
        })
      );
      continue;
    }

    pets.push(
      await prisma.pet.create({
        data: {
          ...petInput,
          companyId,
          notes: "[seed-demo]"
        }
      })
    );
  }

  await Promise.all([
    prisma.product.upsert({
      where: { companyId_sku: { companyId, sku: "SHAM-001" } },
      update: {
        companyId,
        name: "Shampoo Neutro",
        category: "Higiene",
        currentStock: 6,
        minStock: 10,
        priceCents: 3500
      },
      create: {
        companyId,
        name: "Shampoo Neutro",
        sku: "SHAM-001",
        category: "Higiene",
        currentStock: 6,
        minStock: 10,
        priceCents: 3500
      }
    }),
    prisma.product.upsert({
      where: { companyId_sku: { companyId, sku: "RAC-002" } },
      update: {
        companyId,
        name: "Ração Premium Cães 10kg",
        category: "Alimentação",
        currentStock: 12,
        minStock: 8,
        priceCents: 21990
      },
      create: {
        companyId,
        name: "Ração Premium Cães 10kg",
        sku: "RAC-002",
        category: "Alimentação",
        currentStock: 12,
        minStock: 8,
        priceCents: 21990
      }
    }),
    prisma.product.upsert({
      where: { companyId_sku: { companyId, sku: "ARE-003" } },
      update: {
        companyId,
        name: "Areia Higiênica 4kg",
        category: "Higiene",
        currentStock: 3,
        minStock: 6,
        priceCents: 4290
      },
      create: {
        companyId,
        name: "Areia Higiênica 4kg",
        sku: "ARE-003",
        category: "Higiene",
        currentStock: 3,
        minStock: 6,
        priceCents: 4290
      }
    }),
    prisma.product.upsert({
      where: { companyId_sku: { companyId, sku: "PET-004" } },
      update: {
        companyId,
        name: "Petisco Natural",
        category: "Alimentação",
        currentStock: 1,
        minStock: 5,
        priceCents: 1890
      },
      create: {
        companyId,
        name: "Petisco Natural",
        sku: "PET-004",
        category: "Alimentação",
        currentStock: 1,
        minStock: 5,
        priceCents: 1890
      }
    })
  ]);

  await prisma.appointment.deleteMany({
    where: {
      companyId,
      notes: { contains: "[seed-demo]" }
    }
  });

  await prisma.appointment.createMany({
    data: [
      {
        companyId,
        petId: pets[0].id,
        serviceId: services[0].id,
        startsAt: atTime(now, 9, 0),
        endsAt: atTime(now, 10, 30),
        status: AppointmentStatus.SCHEDULED,
        notes: "[seed-demo] confirmar com cliente"
      },
      {
        companyId,
        petId: pets[1].id,
        serviceId: services[1].id,
        startsAt: atTime(now, 11, 0),
        endsAt: atTime(now, 11, 45),
        status: AppointmentStatus.CONFIRMED,
        notes: "[seed-demo]"
      },
      {
        companyId,
        petId: pets[2].id,
        serviceId: services[2].id,
        startsAt: atTime(now, 14, 0),
        endsAt: atTime(now, 15, 0),
        status: AppointmentStatus.SCHEDULED,
        notes: "[seed-demo] aguardando confirmação"
      },
      {
        companyId,
        petId: pets[3].id,
        serviceId: services[0].id,
        startsAt: atTime(now, 16, 30),
        endsAt: atTime(now, 18, 0),
        status: AppointmentStatus.COMPLETED,
        notes: "[seed-demo]"
      },
      {
        companyId,
        petId: pets[0].id,
        serviceId: services[2].id,
        startsAt: atTime(tomorrow, 10, 0),
        endsAt: atTime(tomorrow, 11, 0),
        status: AppointmentStatus.SCHEDULED,
        notes: "[seed-demo] amanhã"
      }
    ]
  });

  await prisma.campaign.deleteMany({
    where: {
      companyId,
      title: { startsWith: "[seed-demo]" }
    }
  });

  await prisma.campaign.createMany({
    data: [
      {
        companyId,
        title: "[seed-demo] Banho para cães",
        content: "20% off para banho e tosa de cães até sexta.",
        startsAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        endsAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        isActive: true,
        segmentPetType: PetType.DOG
      },
      {
        companyId,
        title: "[seed-demo] Check-up felino",
        content: "Consulta com preço especial para gatos.",
        startsAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        endsAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        isActive: true,
        segmentPetType: PetType.CAT
      },
      {
        companyId,
        title: "[seed-demo] Campanha encerrada",
        content: "Exemplo de campanha antiga.",
        startsAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        endsAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        isActive: true,
        segmentPetType: null
      }
    ]
  });

  await prisma.messageLog.deleteMany({
    where: { companyId, provider: "mock-seed" }
  });

  await prisma.messageLog.createMany({
    data: [
      {
        companyId,
        customerId: ana.id,
        channel: MessageChannel.WHATSAPP,
        toPhone: ana.phone,
        body: "[seed-demo] Lembrete: agendamento confirmado.",
        provider: "mock-seed",
        providerRef: "seed-1",
        status: MessageStatus.SENT,
        createdAt: lastHour
      },
      {
        companyId,
        customerId: bruno.id,
        channel: MessageChannel.SMS,
        toPhone: bruno.phone,
        body: "[seed-demo] Promoção da semana.",
        provider: "mock-seed",
        providerRef: "seed-2",
        status: MessageStatus.SENT,
        createdAt: lastHour
      },
      {
        companyId,
        customerId: carla.id,
        channel: MessageChannel.WHATSAPP,
        toPhone: carla.phone,
        body: "[seed-demo] Confirme seu horário de hoje.",
        provider: "mock-seed",
        providerRef: "seed-3",
        status: MessageStatus.SENT,
        createdAt: now
      },
      {
        companyId,
        customerId: ana.id,
        channel: MessageChannel.SMS,
        toPhone: ana.phone,
        body: "[seed-demo] Mensagem antiga para histórico.",
        provider: "mock-seed",
        providerRef: "seed-4",
        status: MessageStatus.SENT,
        createdAt: yesterday
      },
      {
        companyId,
        customerId: bruno.id,
        channel: MessageChannel.SMS,
        toPhone: bruno.phone,
        body: "[seed-demo] Falha simulada.",
        provider: "mock-seed",
        providerRef: "seed-5",
        status: MessageStatus.FAILED,
        errorMessage: "Operadora indisponível",
        createdAt: now
      }
    ]
  });

  const appointmentsToday = await prisma.appointment.count({
    where: {
      companyId,
      startsAt: {
        gte: atTime(now, 0, 0),
        lte: atTime(now, 23, 59)
      }
    }
  });

  const pendingConfirmations = await prisma.appointment.count({
    where: {
      companyId,
      startsAt: {
        gte: atTime(now, 0, 0),
        lte: atTime(now, 23, 59)
      },
      status: AppointmentStatus.SCHEDULED
    }
  });

  console.log("Seed concluído", {
    customers: customers.length,
    pets: pets.length,
    services: services.length,
    appointmentsToday,
    pendingConfirmations
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
