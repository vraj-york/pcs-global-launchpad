import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) return databaseUrl;
  throw new Error('Set DATABASE_URL in .env');
}

const pool = new Pool({ connectionString: getDatabaseUrl() });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type RoleSeed = {
  roleName: string;
  categoryName: string;
  description: string;
  isPrivate: boolean;
  isExternal: boolean;
};

const ROLES: RoleSeed[] = [
  {
    roleName: 'Super Admin',
    categoryName: 'Super Admin',
    description:
      'Full control over the entire platform, settings, security, and tenants',
    isPrivate: true,
    isExternal: false,
  },
  {
    roleName: 'Corporation Admin',
    categoryName: 'Corporation Admin',
    description:
      'Manages multiple companies, governance, reporting, and billing',
    isPrivate: false,
    isExternal: true,
  },
  {
    roleName: 'Company Admin',
    categoryName: 'Company Admin',
    description:
      'Controls users, roles, settings, and subscriptions for a company',
    isPrivate: false,
    isExternal: true,
  },
  {
    roleName: 'Employee',
    categoryName: 'Employee (Gen. User/ Emp. Associate)',
    description: 'App user',
    isPrivate: false,
    isExternal: false,
  },
  {
    roleName: 'Coach',
    categoryName: 'Coach',
    description: 'Coach persona with session, calendar, and coaching tools access',
    isPrivate: false,
    isExternal: false,
  },
];

async function main() {
  const categoryNames = [...new Set(ROLES.map((r) => r.categoryName))];
  const categoryMap = new Map<string, string>();

  for (const name of categoryNames) {
    let cat = await prisma.roleCategory.findFirst({ where: { name } });
    if (!cat) {
      cat = await prisma.roleCategory.create({ data: { name } });
    }
    categoryMap.set(name, cat.id);
  }

  for (const r of ROLES) {
    const categoryId = categoryMap.get(r.categoryName);
    if (!categoryId) continue;

    const existing = await prisma.role.findFirst({
      where: { name: r.roleName, categoryId },
    });
    if (existing) {
      await prisma.role.update({
        where: { id: existing.id },
        data: {
          description: r.description,
          isPrivate: r.isPrivate,
          isExternal: r.isExternal,
        },
      });
    } else {
      await prisma.role.create({
        data: {
          name: r.roleName,
          categoryId,
          description: r.description,
          isPrivate: r.isPrivate,
          isExternal: r.isExternal,
        },
      });
    }
  }

  console.log('Roles and role categories seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
