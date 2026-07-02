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

const STRIPE_MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID ?? null;
const STRIPE_ANNUAL_PRICE_ID = process.env.STRIPE_ANNUAL_PRICE_ID ?? null;
const STRIPE_ONE_TIME_PRICE_ID = process.env.STRIPE_ONE_TIME_PRICE_ID ?? null;

if (
  !STRIPE_MONTHLY_PRICE_ID ||
  !STRIPE_ANNUAL_PRICE_ID ||
  !STRIPE_ONE_TIME_PRICE_ID
) {
  throw new Error(
    'Set STRIPE_MONTHLY_PRICE_ID, STRIPE_ANNUAL_PRICE_ID, and STRIPE_ONE_TIME_PRICE_ID in .env',
  );
}

async function main() {
  // Seed plan types first
  const planTypes = [
    { id: 'monthly', name: 'BSP Blueprint (Monthly)' },
    { id: 'annual', name: 'BSP Assessment (Annual)' },
    { id: 'one_time', name: 'BSP Assessment (Individual)' },
  ];
  for (const pt of planTypes) {
    await prisma.planType.upsert({
      where: { id: pt.id },
      update: { name: pt.name },
      create: pt,
    });
  }

  // Monthly subscription pricing
  const monthlyPlans = [
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 1,
      employeeRangeMax: 25,
      price: 199.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 26,
      employeeRangeMax: 50,
      price: 299.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 51,
      employeeRangeMax: 75,
      price: 399.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 76,
      employeeRangeMax: 100,
      price: 499.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 101,
      employeeRangeMax: 125,
      price: 599.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 126,
      employeeRangeMax: 150,
      price: 699.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 151,
      employeeRangeMax: 175,
      price: 799.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 176,
      employeeRangeMax: 200,
      price: 899.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 201,
      employeeRangeMax: 225,
      price: 999.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 226,
      employeeRangeMax: 250,
      price: 1099.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 251,
      employeeRangeMax: 275,
      price: 1299.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 276,
      employeeRangeMax: 300,
      price: 1399.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 301,
      employeeRangeMax: 325,
      price: 1499.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 326,
      employeeRangeMax: 350,
      price: 1599.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 351,
      employeeRangeMax: 375,
      price: 1699.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 376,
      employeeRangeMax: 400,
      price: 1799.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 401,
      employeeRangeMax: 425,
      price: 1899.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 426,
      employeeRangeMax: 450,
      price: 1999.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 451,
      employeeRangeMax: 475,
      price: 2099.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 476,
      employeeRangeMax: 500,
      price: 2199.0,
      stripePriceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      planTypeId: 'monthly',
      customerType: 'company',
      employeeRangeMin: 501,
      employeeRangeMax: null,
      price: 0.0,
      isCustomPricing: true,
    },
  ];

  // Annual subscription pricing
  const annualPlans = [
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 1,
      employeeRangeMax: 25,
      price: 716.4,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 26,
      employeeRangeMax: 50,
      price: 1076.4,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 51,
      employeeRangeMax: 75,
      price: 1436.4,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 76,
      employeeRangeMax: 100,
      price: 1796.4,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 101,
      employeeRangeMax: 125,
      price: 2084.52,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 126,
      employeeRangeMax: 150,
      price: 2432.52,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 151,
      employeeRangeMax: 175,
      price: 2780.52,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 176,
      employeeRangeMax: 200,
      price: 3128.52,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 201,
      employeeRangeMax: 225,
      price: 3356.64,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 226,
      employeeRangeMax: 250,
      price: 3692.64,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 251,
      employeeRangeMax: 275,
      price: 4364.64,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 276,
      employeeRangeMax: 300,
      price: 4700.64,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 301,
      employeeRangeMax: 325,
      price: 4856.76,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 326,
      employeeRangeMax: 350,
      price: 5180.76,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 351,
      employeeRangeMax: 375,
      price: 5504.76,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 376,
      employeeRangeMax: 400,
      price: 5828.76,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 401,
      employeeRangeMax: 425,
      price: 5924.88,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 426,
      employeeRangeMax: 450,
      price: 6236.88,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 451,
      employeeRangeMax: 475,
      price: 6548.88,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 476,
      employeeRangeMax: 500,
      price: 6860.88,
      stripePriceId: STRIPE_ANNUAL_PRICE_ID,
    },
    {
      planTypeId: 'annual',
      customerType: 'company',
      employeeRangeMin: 501,
      employeeRangeMax: null,
      price: 0.0,
      isCustomPricing: true,
    },
  ];

  // One-time assessment pricing
  const oneTimePlans = [
    {
      planTypeId: 'one_time',
      customerType: 'individual',
      employeeRangeMin: null,
      employeeRangeMax: null,
      price: 195.0,
      stripePriceId: STRIPE_ONE_TIME_PRICE_ID,
      isCustomPricing: false,
    },
  ];

  const allPlans = [...monthlyPlans, ...annualPlans, ...oneTimePlans];

  for (const plan of allPlans) {
    const data = {
      planTypeId: plan.planTypeId,
      customerType: plan.customerType,
      employeeRangeMin: plan.employeeRangeMin,
      employeeRangeMax: plan.employeeRangeMax,
      price: plan.price,
      isCustomPricing: plan.isCustomPricing ?? false,
    };
    const existing = await prisma.pricingPlan.findFirst({
      where: {
        planTypeId: data.planTypeId,
        customerType: data.customerType,
        employeeRangeMin: data.employeeRangeMin,
        employeeRangeMax: data.employeeRangeMax,
      },
    });
    if (existing) {
      await prisma.pricingPlan.update({
        where: { id: existing.id },
        data: {
          price: data.price,
          isCustomPricing: data.isCustomPricing,
          stripePriceId: plan.stripePriceId,
        },
      });
    } else {
      await prisma.pricingPlan.create({
        data: { ...data, stripePriceId: plan.stripePriceId },
      });
    }
  }

  console.log('Pricing plans seeded successfully');
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
