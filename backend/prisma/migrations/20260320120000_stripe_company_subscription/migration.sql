-- Stripe billing: one Stripe Customer per company; optional Price ID per catalog row.
ALTER TABLE "corporation_companies" ADD COLUMN "stripe_customer_id" VARCHAR(255);
ALTER TABLE "corporation_companies" ADD COLUMN "stripe_subscription_id" VARCHAR(255);
ALTER TABLE "corporation_companies" ADD COLUMN "subscription_status" VARCHAR(50);

CREATE UNIQUE INDEX "corporation_companies_stripe_customer_id_key" ON "corporation_companies"("stripe_customer_id");
CREATE UNIQUE INDEX "corporation_companies_stripe_subscription_id_key" ON "corporation_companies"("stripe_subscription_id");

-- Optional Stripe Price id per catalog row; many rows (tiers) may share the same price_… id.
ALTER TABLE "pricing_plans" ADD COLUMN "stripe_price_id" VARCHAR(255);
CREATE INDEX "pricing_plans_stripe_price_id_idx" ON "pricing_plans"("stripe_price_id");
