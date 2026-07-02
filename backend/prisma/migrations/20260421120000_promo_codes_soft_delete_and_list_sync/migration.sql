-- Promo codes: soft-delete timestamp, Stripe active mirror, and redemption snapshot for list sort/filter.

-- AlterTable
ALTER TABLE "promo_codes" ADD COLUMN "stripe_promotion_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "promo_codes" ADD COLUMN "times_redeemed_snapshot" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "promo_codes" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "promo_codes_deleted_at_idx" ON "promo_codes"("deleted_at");

-- CreateIndex
CREATE INDEX "promo_codes_stripe_promotion_active_idx" ON "promo_codes"("stripe_promotion_active");
