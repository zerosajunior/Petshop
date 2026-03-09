import { PrismaClient, MembershipRole } from "@prisma/client";
import { hashPassword } from "@/lib/password";

const prisma = new PrismaClient();

async function ensureCompany(slug: string, name: string) {
  const existing = await prisma.company.findFirst({
    where: { slug },
    select: { id: true }
  });

  if (existing) {
    return existing.id;
  }

  const company = await prisma.company.create({
    data: {
      slug,
      name,
      status: "ACTIVE"
    },
    select: { id: true }
  });

  return company.id;
}

async function ensureUser(params: {
  name: string;
  email: string;
  password: string;
  isSystemAdmin?: boolean;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: params.email },
    select: { id: true }
  });

  const passwordHash = hashPassword(params.password);

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: params.name,
        isSystemAdmin: params.isSystemAdmin ?? false,
        status: "ACTIVE",
        passwordHash
      }
    });
    return existing.id;
  }

  const user = await prisma.user.create({
    data: {
      name: params.name,
      email: params.email,
      isSystemAdmin: params.isSystemAdmin ?? false,
      status: "ACTIVE",
      passwordHash
    },
    select: { id: true }
  });

  return user.id;
}

async function ensureMembership(userId: string, companyId: string, role: MembershipRole) {
  await prisma.membership.upsert({
    where: { userId_companyId: { userId, companyId } },
    update: {
      role,
      status: "ACTIVE"
    },
    create: {
      userId,
      companyId,
      role,
      status: "ACTIVE"
    }
  });
}

async function main() {
  const defaultSlug = process.env.DEFAULT_COMPANY_SLUG?.trim() || "default";
  const companyName = process.env.DEFAULT_COMPANY_NAME?.trim() || "Petshop Base";
  const companyId = await ensureCompany(defaultSlug, companyName);

  const systemAdminEmail = process.env.SYSTEM_ADMIN_EMAIL?.trim() || "admin@petshop.local";
  const systemAdminPassword = process.env.SYSTEM_ADMIN_PASSWORD?.trim() || "admin123";

  const adminEmail = process.env.COMPANY_ADMIN_EMAIL?.trim() || "empresa.admin@petshop.local";
  const adminPassword = process.env.COMPANY_ADMIN_PASSWORD?.trim() || "empresa123";

  const attendantEmail = process.env.ATTENDANT_EMAIL?.trim() || "atendente@petshop.local";
  const attendantPassword = process.env.ATTENDANT_PASSWORD?.trim() || "atendente123";

  const professionalEmail = process.env.PROFESSIONAL_EMAIL?.trim() || "profissional@petshop.local";
  const professionalPassword = process.env.PROFESSIONAL_PASSWORD?.trim() || "profissional123";

  const systemAdminId = await ensureUser({
    name: "Admin Sistema",
    email: systemAdminEmail,
    password: systemAdminPassword,
    isSystemAdmin: true
  });

  const companyAdminId = await ensureUser({
    name: "Admin Empresa",
    email: adminEmail,
    password: adminPassword
  });

  const attendantId = await ensureUser({
    name: "Atendente",
    email: attendantEmail,
    password: attendantPassword
  });

  const professionalId = await ensureUser({
    name: "Profissional",
    email: professionalEmail,
    password: professionalPassword
  });

  await ensureMembership(companyAdminId, companyId, "ADMIN");
  await ensureMembership(attendantId, companyId, "ATTENDANT");
  await ensureMembership(professionalId, companyId, "PROFESSIONAL");

  console.log("Auth bootstrap concluído", {
    companySlug: defaultSlug,
    systemAdminEmail,
    users: [adminEmail, attendantEmail, professionalEmail],
    systemAdminId
  });
}

main()
  .catch((error) => {
    console.error("Falha no bootstrap de autenticação", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
