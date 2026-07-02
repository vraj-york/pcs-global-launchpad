-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "entity_id" VARCHAR(255),
ADD COLUMN     "ip_address" VARCHAR(45);

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");

-- RenameIndex
ALTER INDEX "pricing_plans_plan_type_id_customer_type_employee_range_mi_idx" RENAME TO "pricing_plans_plan_type_id_customer_type_employee_range_min_idx";
