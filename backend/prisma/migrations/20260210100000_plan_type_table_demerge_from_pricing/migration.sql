-- CreateTable
CREATE TABLE "plan_types" (
    "id" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_types_pkey" PRIMARY KEY ("id")
);

-- Insert the three plan types (id = code used in pricing_plans.plan_type)
INSERT INTO "plan_types" ("id", "name", "created_at", "updated_at") VALUES
  ('monthly', 'BSP Blueprint', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('annual', 'BSP Assessment Annual', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('one_time', 'BSP Assessment Individual', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add plan_type_id to pricing_plans
ALTER TABLE "pricing_plans" ADD COLUMN "plan_type_id" VARCHAR(20);

-- Backfill from existing plan_type
UPDATE "pricing_plans" SET "plan_type_id" = "plan_type";

-- Make plan_type_id NOT NULL
ALTER TABLE "pricing_plans" ALTER COLUMN "plan_type_id" SET NOT NULL;

-- Add foreign key
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_plan_type_id_fkey" FOREIGN KEY ("plan_type_id") REFERENCES "plan_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old columns
ALTER TABLE "pricing_plans" DROP COLUMN "plan_type";
ALTER TABLE "pricing_plans" DROP COLUMN "plan_name";

-- Replace index: old was on plan_type, new on plan_type_id
DROP INDEX IF EXISTS "pricing_plans_plan_type_customer_type_employee_range_min_em_idx";
CREATE INDEX "pricing_plans_plan_type_id_customer_type_employee_range_mi_idx" ON "pricing_plans"("plan_type_id", "customer_type", "employee_range_min", "employee_range_max");
