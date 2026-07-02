-- AlterTable
ALTER TABLE "pricing_plans" ADD COLUMN "plan_name" VARCHAR(100) NOT NULL DEFAULT 'BSP Blueprint';

-- Backfill plan names by plan_type
UPDATE "pricing_plans" SET "plan_name" = CASE
  WHEN "plan_type" = 'monthly' THEN 'BSP Blueprint'
  WHEN "plan_type" = 'annual' THEN 'BSP Assessment Annual'
  WHEN "plan_type" = 'one_time' THEN 'BSP Assessment Individual'
  ELSE 'BSP Blueprint'
END;

-- Remove default so new rows must supply plan_name (seed/API will provide it)
ALTER TABLE "pricing_plans" ALTER COLUMN "plan_name" DROP DEFAULT;
