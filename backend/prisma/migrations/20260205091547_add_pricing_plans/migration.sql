-- CreateTable
CREATE TABLE "pricing_plans" (
    "id" TEXT NOT NULL,
    "plan_type" VARCHAR(20) NOT NULL,
    "customer_type" VARCHAR(20) NOT NULL,
    "employee_range_min" INTEGER,
    "employee_range_max" INTEGER,
    "price" DECIMAL(10,2) NOT NULL,
    "is_custom_pricing" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pricing_plans_plan_type_customer_type_employee_range_min_em_idx" ON "pricing_plans"("plan_type", "customer_type", "employee_range_min", "employee_range_max");
