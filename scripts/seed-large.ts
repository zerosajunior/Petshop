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

const CUSTOMER_COUNT = 50;
const PRODUCT_COUNT = 80;
const CAMPAIGN_COUNT = 20;
const MESSAGE_COUNT = 200;

const firstNames = [
  "Ana",
  "Bruno",
  "Carla",
  "Daniel",
  "Eduarda",
  "Felipe",
  "Giovana",
  "Henrique",
  "Isabela",
  "Joao",
  "Kamila",
  "Lucas",
  "Mariana",
  "Nicolas",
  "Otavio",
  "Patricia",
  "Rafael",
  "Sabrina",
  "Tiago",
  "Vanessa"
];

const lastNames = [
  "Costa",
  "Lima",
  "Souza",
  "Oliveira",
  "Pereira",
  "Rodrigues",
  "Ferreira",
  "Almeida",
  "Carvalho",
  "Melo"
];

const dogNames = ["Thor", "Nina", "Bob", "Luna", "Mel", "Pipoca", "Duke", "Toby", "Luke"];
const catNames = ["Mia", "Lili", "Simba", "Tom", "Bidu", "Lua", "Chico", "Nala", "Pingo"];
const birdNames = ["Piu", "Kiwi", "Azul", "Loro", "Pena"];
const productCategories = ["Higiene", "Alimentacao", "Acessorios", "Saude", "Brinquedos"];
const movementReasons = [
  "[seed-load] ajuste inicial",
  "[seed-load] reposicao",
  "[seed-load] venda balcão",
  "[seed-load] perdas operacionais"
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne<T>(items: T[]) {
  return items[randomInt(0, items.length - 1)];
}

function randomPetType() {
  const types: PetType[] = [PetType.DOG, PetType.CAT, PetType.BIRD, PetType.OTHER];
  return pickOne(types);
}

function petNameByType(type: PetType) {
  if (type === PetType.DOG) return pickOne(dogNames);
  if (type === PetType.CAT) return pickOne(catNames);
  if (type === PetType.BIRD) return pickOne(birdNames);
  return `Pet-${randomInt(100, 999)}`;
}

function startsAtFromNow(offsetHours: number) {
  return new Date(Date.now() + offsetHours * 60 * 60 * 1000);
}

async function ensureServices() {
  const companyId = await ensureDefaultCompany();
  const serviceSeeds = [
    { id: "srv_banho_tosa", name: "Banho e tosa", durationMin: 90, priceCents: 9000 },
    { id: "srv_consulta", name: "Consulta rápida", durationMin: 45, priceCents: 12000 },
    { id: "srv_hidratacao", name: "Hidratação premium", durationMin: 60, priceCents: 15000 },
    { id: "srv_unhas", name: "Corte de unhas", durationMin: 25, priceCents: 4500 },
    { id: "srv_ouvido", name: "Limpeza de ouvido", durationMin: 30, priceCents: 5000 }
  ];

  for (const service of serviceSeeds) {
    await prisma.service.upsert({
      where: { id: service.id },
      update: {
        companyId,
        name: service.name,
        description: "[seed-load] serviço de teste",
        durationMin: service.durationMin,
        priceCents: service.priceCents
      },
      create: {
        id: service.id,
        companyId,
        name: service.name,
        description: "[seed-load] serviço de teste",
        durationMin: service.durationMin,
        priceCents: service.priceCents
      }
    });
  }

  return prisma.service.findMany({
    where: { companyId, description: { contains: "[seed-load]" } }
  });
}

async function cleanupPreviousLoad() {
  const companyId = await ensureDefaultCompany();
  await prisma.stockMovement.deleteMany({
    where: { companyId, reason: { contains: "[seed-load]" } }
  });

  await prisma.messageLog.deleteMany({
    where: { companyId, provider: "mock-load" }
  });

  await prisma.campaign.deleteMany({
    where: { companyId, title: { startsWith: "[seed-load]" } }
  });

  await prisma.appointment.deleteMany({
    where: { companyId, notes: { contains: "[seed-load]" } }
  });

  await prisma.product.deleteMany({
    where: { companyId, description: { contains: "[seed-load]" } }
  });

  await prisma.pet.deleteMany({
    where: { companyId, notes: { contains: "[seed-load]" } }
  });

  await prisma.customer.deleteMany({
    where: { companyId, notes: { contains: "[seed-load]" } }
  });
}

async function main() {
  const companyId = await ensureDefaultCompany();
  await cleanupPreviousLoad();
  const services = await ensureServices();

  const customers = [];
  for (let i = 1; i <= CUSTOMER_COUNT; i++) {
    const fullName = `${pickOne(firstNames)} ${pickOne(lastNames)}`;
    const phone = `+55119${String(70000000 + i).padStart(8, "0")}`;
    const email = `cliente.load.${i}@exemplo.com`;
    const preferredChannel =
      Math.random() < 0.6 ? MessageChannel.WHATSAPP : MessageChannel.SMS;

    const customer = await prisma.customer.create({
      data: {
        companyId,
        name: `${fullName} ${i}`,
        phone,
        zipCode: `0400${String(1000 + (i % 9000)).padStart(4, "0")}`.slice(0, 8),
        email,
        preferredChannel,
        notes: "[seed-load]",
        marketingConsent: i % 3 === 0,
        marketingConsentAt: i % 3 === 0 ? new Date() : null,
        privacyPolicyAcceptedAt: new Date()
      }
    });

    customers.push(customer);
  }

  const pets = [];
  for (const customer of customers) {
    const petCount = randomInt(1, 3);
    for (let i = 0; i < petCount; i++) {
      const type = randomPetType();
      const pet = await prisma.pet.create({
        data: {
          companyId,
          customerId: customer.id,
          name: `${petNameByType(type)} ${randomInt(1, 99)}`,
          type,
          breed: type === PetType.DOG ? "SRD" : null,
          notes: "[seed-load]"
        }
      });
      pets.push(pet);
    }
  }

  const products = [];
  for (let i = 1; i <= PRODUCT_COUNT; i++) {
    const currentStock = randomInt(0, 45);
    const minStock = randomInt(4, 18);
    const product = await prisma.product.create({
      data: {
        companyId,
        name: `Produto Demo ${String(i).padStart(3, "0")}`,
        sku: `LOAD-${String(i).padStart(4, "0")}`,
        category: pickOne(productCategories),
        description: "[seed-load] produto fictício para testes",
        currentStock,
        minStock,
        priceCents: randomInt(1500, 35900)
      }
    });

    products.push(product);

    const stockEntries = randomInt(1, 3);
    for (let j = 0; j < stockEntries; j++) {
      await prisma.stockMovement.create({
        data: {
          companyId,
          productId: product.id,
          type: pickOne([MovementType.IN, MovementType.OUT, MovementType.ADJUSTMENT]),
          quantity: randomInt(1, 12),
          reason: pickOne(movementReasons)
        }
      });
    }
  }

  for (let i = 0; i < 120; i++) {
    const pet = pickOne(pets);
    const service = pickOne(services);
    const startsAt = startsAtFromNow(randomInt(-72, 120));
    const endsAt = new Date(startsAt.getTime() + service.durationMin * 60 * 1000);
    const status = pickOne([
      AppointmentStatus.SCHEDULED,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.COMPLETED,
      AppointmentStatus.CANCELED
    ]);

    await prisma.appointment.create({
      data: {
        companyId,
        petId: pet.id,
        serviceId: service.id,
        startsAt,
        endsAt,
        status,
        notes: "[seed-load] agenda em volume"
      }
    });
  }

  for (let i = 1; i <= CAMPAIGN_COUNT; i++) {
    const startsAt = startsAtFromNow(randomInt(-96, 24));
    const endsAt = startsAtFromNow(randomInt(24, 240));
    await prisma.campaign.create({
      data: {
        companyId,
        title: `[seed-load] Campanha ${String(i).padStart(2, "0")}`,
        content: "Campanha fictícia para testes de listagem e filtro.",
        startsAt,
        endsAt,
        isActive: Math.random() > 0.25,
        segmentPetType: pickOne([PetType.DOG, PetType.CAT, PetType.BIRD, PetType.OTHER, null])
      }
    });
  }

  for (let i = 0; i < MESSAGE_COUNT; i++) {
    const customer = pickOne(customers);
    const status = Math.random() > 0.12 ? MessageStatus.SENT : MessageStatus.FAILED;
    const purpose = Math.random() > 0.7 ? MessagePurpose.MARKETING : MessagePurpose.TRANSACTIONAL;

    await prisma.messageLog.create({
      data: {
        companyId,
        customerId: customer.id,
        channel: pickOne([MessageChannel.SMS, MessageChannel.WHATSAPP]),
        purpose,
        toPhone: customer.phone,
        body:
          purpose === MessagePurpose.MARKETING
            ? "[seed-load] Oferta especial para teste."
            : "[seed-load] Lembrete de agendamento.",
        provider: "mock-load",
        providerRef: `load-${Date.now()}-${i}`,
        status,
        errorMessage: status === MessageStatus.FAILED ? "Falha simulada de operadora" : null,
        createdAt: startsAtFromNow(randomInt(-120, 0))
      }
    });
  }

  console.log("Seed em volume concluído", {
    customers: customers.length,
    pets: pets.length,
    services: services.length,
    products: products.length,
    appointments: 120,
    campaigns: CAMPAIGN_COUNT,
    messages: MESSAGE_COUNT
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
