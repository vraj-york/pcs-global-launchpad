import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  COMPANY_ADMIN_SUBMODULE_KEYS,
  COGNITO_GROUP_ROLE_CATEGORY_MAP,
  CORPORATION_ADMIN_SUBMODULE_KEYS,
  END_USER_SUBMODULE_KEYS,
  HIDDEN_ROLE_GRID_MODULE_NAMES,
  RBAC_MODULE_CATALOG,
  SUPER_ADMIN_SUBMODULE_KEYS,
} from '../src/auth/rbac/submodule.registry';
import { COGNITO_GROUP_NAMES } from '../src/user/cognito-groups.constants';
import { SUPER_ADMIN_ROLE_CATEGORY_NAME } from '../src/role/constants/role.messages';

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) return databaseUrl;
  throw new Error('Set DATABASE_URL in .env');
}

const pool = new Pool({ connectionString: getDatabaseUrl() });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function getNextSubmoduleCode(): Promise<number> {
  const existing = await prisma.submodule.findMany({ select: { code: true } });
  const maxNum = existing.reduce((max, { code }) => {
    const match = /^SM-(\d+)$/.exec(code);
    return match ? Math.max(max, Number.parseInt(match[1], 10)) : max;
  }, 0);
  return maxNum + 1;
}

async function seedModulesAndSubmodules(): Promise<Map<string, string>> {
  const keyToId = new Map<string, string>();
  let nextCode = await getNextSubmoduleCode();

  for (const moduleSeed of RBAC_MODULE_CATALOG) {
    const hidden =
      moduleSeed.hidden ??
      (HIDDEN_ROLE_GRID_MODULE_NAMES as readonly string[]).includes(
        moduleSeed.name,
      );
    const module = await prisma.module.upsert({
      where: { name: moduleSeed.name },
      update: {
        sortOrder: moduleSeed.sortOrder,
        hidden,
      },
      create: {
        name: moduleSeed.name,
        sortOrder: moduleSeed.sortOrder,
        hidden,
      },
    });

    for (let i = 0; i < moduleSeed.submodules.length; i++) {
      const sub = moduleSeed.submodules[i];
      const existing = await prisma.submodule.findUnique({
        where: { key: sub.key },
      });

      if (existing) {
        await prisma.submodule.update({
          where: { id: existing.id },
          data: { name: sub.name, sortOrder: i, moduleId: module.id },
        });
        keyToId.set(sub.key, existing.id);
      } else {
        const code = `SM-${String(nextCode).padStart(3, '0')}`;
        nextCode += 1;
        const created = await prisma.submodule.create({
          data: {
            code,
            key: sub.key,
            name: sub.name,
            moduleId: module.id,
            sortOrder: i,
          },
        });
        keyToId.set(sub.key, created.id);
      }
    }
  }

  return keyToId;
}

const DEPRECATED_SUBMODULE_KEYS = [
  'corporation_overview.edit',
  'company_overview.edit',
  'plans_pricing.view_billing',
  'plans_pricing.edit_billing',
  'plans_pricing.cancel_reinstate_subscription',
] as const;

async function retireDeprecatedSubmodules(): Promise<void> {
  const rows = await prisma.submodule.findMany({
    where: { key: { in: [...DEPRECATED_SUBMODULE_KEYS] } },
    select: { id: true },
  });
  if (rows.length === 0) return;

  const ids = rows.map((row) => row.id);
  await prisma.roleCategorySubmodule.deleteMany({
    where: { submoduleId: { in: ids } },
  });
  await prisma.submodule.deleteMany({ where: { id: { in: ids } } });
}

async function seedCognitoGroupRoleCategories(): Promise<void> {
  const requiredGroups = Object.keys(COGNITO_GROUP_ROLE_CATEGORY_MAP);
  for (const groupName of requiredGroups) {
    const categoryName = COGNITO_GROUP_ROLE_CATEGORY_MAP[groupName];
    const [group, category] = await Promise.all([
      prisma.cognitoUserGroup.findUnique({ where: { name: groupName } }),
      prisma.roleCategory.findFirst({ where: { name: categoryName } }),
    ]);
    if (!group || !category) {
      console.warn(
        `Skipping Cognito↔category map for ${groupName}: group or category "${categoryName}" missing`,
      );
      continue;
    }
    await prisma.cognitoUserGroup.update({
      where: { id: group.id },
      data: { roleCategoryId: category.id },
    });
  }
}

async function upsertCategorySubmodules(
  categoryName: string,
  submoduleKeys: string[],
  keyToId: Map<string, string>,
  enabled: boolean,
): Promise<void> {
  const category = await prisma.roleCategory.findFirst({
    where: { name: categoryName },
  });
  if (!category) {
    console.warn(`Skipping category submodules: "${categoryName}" not found`);
    return;
  }

  const submoduleIds = submoduleKeys
    .map((key) => keyToId.get(key))
    .filter((id): id is string => Boolean(id));

  if (submoduleIds.length !== submoduleKeys.length) {
    console.warn(
      `Skipping category submodules for "${categoryName}": missing submodule keys`,
    );
    return;
  }

  await prisma.roleCategorySubmodule.deleteMany({
    where: { roleCategoryId: category.id },
  });
  await prisma.roleCategorySubmodule.createMany({
    data: submoduleIds.map((submoduleId) => ({
      roleCategoryId: category.id,
      submoduleId,
      enabled,
    })),
    skipDuplicates: true,
  });
}

async function seedSuperAdminCategorySubmodules(
  keyToId: Map<string, string>,
): Promise<void> {
  const category = await prisma.roleCategory.findFirst({
    where: { name: SUPER_ADMIN_ROLE_CATEGORY_NAME },
  });
  if (!category) {
    console.warn(
      `Skipping Super Admin submodules: "${SUPER_ADMIN_ROLE_CATEGORY_NAME}" not found`,
    );
    return;
  }

  const catalogSubmoduleIds = SUPER_ADMIN_SUBMODULE_KEYS.map((key) =>
    keyToId.get(key),
  ).filter((id): id is string => Boolean(id));

  if (catalogSubmoduleIds.length !== SUPER_ADMIN_SUBMODULE_KEYS.length) {
    const missing = SUPER_ADMIN_SUBMODULE_KEYS.filter((key) => !keyToId.has(key));
    console.warn(
      `Super Admin seed missing catalog submodule keys: ${missing.join(', ')}`,
    );
  }

  const allSubmoduleIds = (
    await prisma.submodule.findMany({ select: { id: true } })
  ).map((row) => row.id);

  const submoduleIds = [
    ...new Set([...catalogSubmoduleIds, ...allSubmoduleIds]),
  ];

  await prisma.roleCategorySubmodule.deleteMany({
    where: { roleCategoryId: category.id },
  });

  if (submoduleIds.length === 0) return;

  await prisma.roleCategorySubmodule.createMany({
    data: submoduleIds.map((submoduleId) => ({
      roleCategoryId: category.id,
      submoduleId,
      enabled: true,
    })),
    skipDuplicates: true,
  });
}

async function seedCategorySubmoduleDefaults(
  keyToId: Map<string, string>,
): Promise<void> {
  await seedSuperAdminCategorySubmodules(keyToId);
  await upsertCategorySubmodules(
    COGNITO_GROUP_ROLE_CATEGORY_MAP.User,
    END_USER_SUBMODULE_KEYS,
    keyToId,
    true,
  );
  await upsertCategorySubmodules(
    COGNITO_GROUP_ROLE_CATEGORY_MAP.CorporationAdmin,
    CORPORATION_ADMIN_SUBMODULE_KEYS,
    keyToId,
    true,
  );
  await upsertCategorySubmodules(
    COGNITO_GROUP_ROLE_CATEGORY_MAP.CompanyAdmin,
    COMPANY_ADMIN_SUBMODULE_KEYS,
    keyToId,
    true,
  );
}

async function ensureCognitoGroupsExist(): Promise<void> {
  const groups = [
    {
      name: COGNITO_GROUP_NAMES.SUPER_ADMIN,
      description: 'Super Admin group with full access',
    },
    {
      name: COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
      description: 'Corporation Administrator',
    },
    {
      name: COGNITO_GROUP_NAMES.COMPANY_ADMIN,
      description: 'Company Administrator',
    },
    {
      name: COGNITO_GROUP_NAMES.USER,
      description: 'Standard application user',
    },
  ];

  for (const g of groups) {
    await prisma.cognitoUserGroup.upsert({
      where: { name: g.name },
      update: { description: g.description },
      create: { name: g.name, description: g.description },
    });
  }
}

async function main() {
  await ensureCognitoGroupsExist();
  await retireDeprecatedSubmodules();
  const keyToId = await seedModulesAndSubmodules();
  await seedCognitoGroupRoleCategories();
  await seedCategorySubmoduleDefaults(keyToId);

  console.log(
    `Seeded ${RBAC_MODULE_CATALOG.length} modules, ${keyToId.size} submodules, and Cognito↔category mappings.`,
  );
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
