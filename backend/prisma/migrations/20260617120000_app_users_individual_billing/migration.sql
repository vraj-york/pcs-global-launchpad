-- Individual B2C user billing fields (Stripe checkout + payment status on app_users).
ALTER TABLE "app_users" ADD COLUMN "stripe_customer_id" VARCHAR(255);
ALTER TABLE "app_users" ADD COLUMN "payment_status" VARCHAR(50);
ALTER TABLE "app_users" ADD COLUMN "pricing_plan_id" TEXT;
ALTER TABLE "app_users" ADD COLUMN "promo_code_id" TEXT;
ALTER TABLE "app_users" ADD COLUMN "paid_at" TIMESTAMP(3);
ALTER TABLE "app_users" ADD COLUMN "last_checkout_session_id" VARCHAR(255);

CREATE UNIQUE INDEX "app_users_stripe_customer_id_key" ON "app_users"("stripe_customer_id");

ALTER TABLE "app_users" ADD CONSTRAINT "app_users_pricing_plan_id_fkey" FOREIGN KEY ("pricing_plan_id") REFERENCES "pricing_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "app_users_pricing_plan_id_idx" ON "app_users"("pricing_plan_id");
CREATE INDEX "app_users_promo_code_id_idx" ON "app_users"("promo_code_id");
CREATE INDEX "app_users_payment_status_idx" ON "app_users"("payment_status");
