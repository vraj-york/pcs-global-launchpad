-- Make plan_id optional so company can be created at Step 1 without a plan (plan set in Step 3 or in corporation setup).
ALTER TABLE "corporation_companies" ALTER COLUMN "plan_id" DROP NOT NULL;
