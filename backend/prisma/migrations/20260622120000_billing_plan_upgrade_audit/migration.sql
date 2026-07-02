-- Extend billing_subscription_actions for plan upgrade audit trail
ALTER TABLE "billing_subscription_actions" ADD COLUMN "previous_pricing_plan_id" TEXT;
ALTER TABLE "billing_subscription_actions" ADD COLUMN "new_pricing_plan_id" TEXT;
ALTER TABLE "billing_subscription_actions" ADD COLUMN "previous_plan_level" VARCHAR(255);
ALTER TABLE "billing_subscription_actions" ADD COLUMN "new_plan_level" VARCHAR(255);
ALTER TABLE "billing_subscription_actions" ADD COLUMN "adjustment_amount_cents" INTEGER;
