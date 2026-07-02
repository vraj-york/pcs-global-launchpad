-- Super Admin promo codes (Stripe coupon + promotion code).
-- Single consolidated migration: plan_type_id defines applicable plan; no access_type / PromoAccessType.

-- CreateEnum
CREATE TYPE "PromoDiscountType" AS ENUM ('percent', 'fixed_amount');

-- CreateEnum
CREATE TYPE "PromoDuration" AS ENUM ('once', 'forever');

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "plan_type_id" VARCHAR(20) NOT NULL,
    "discount_type" "PromoDiscountType" NOT NULL,
    "percent_off" DECIMAL(7,4),
    "amount_off_minor" INTEGER,
    "currency" VARCHAR(3),
    "duration" "PromoDuration" NOT NULL,
    "expires_at" TIMESTAMP(3),
    "max_redemptions" INTEGER,
    "limit_to_assignment" BOOLEAN NOT NULL DEFAULT false,
    "corporation_id" TEXT,
    "company_id" TEXT,
    "stripe_coupon_id" VARCHAR(255) NOT NULL,
    "stripe_promotion_code_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- AddForeignKey
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_plan_type_id_fkey" FOREIGN KEY ("plan_type_id") REFERENCES "plan_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_corporation_id_fkey" FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "corporation_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "promo_codes_plan_type_id_idx" ON "promo_codes"("plan_type_id");
CREATE INDEX "promo_codes_corporation_id_idx" ON "promo_codes"("corporation_id");
CREATE INDEX "promo_codes_company_id_idx" ON "promo_codes"("company_id");
