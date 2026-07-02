-- Adds onsite training selector to company_plan_seats and the implementation-fee charge timestamp
-- on corporation_companies. Fee amounts themselves are not stored: at Stripe Checkout we resolve
-- the implementation fee Price ID and a single per-day onsite training Price ID from environment
-- configuration so amounts always come from Stripe Products & Prices. The chosen onsite option
-- (`1_day` or `2_days`) is sent to Stripe as the line-item quantity (1 or 2).

ALTER TABLE "company_plan_seats"
ADD COLUMN IF NOT EXISTS "onsite_training_option" VARCHAR(20) NOT NULL DEFAULT 'off';

ALTER TABLE "corporation_companies"
ADD COLUMN IF NOT EXISTS "implementation_fee_charged_at" TIMESTAMP(3);
