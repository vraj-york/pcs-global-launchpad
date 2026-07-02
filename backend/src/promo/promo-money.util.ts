import { Prisma, type PromoCode } from '@prisma/client';
import { STRIPE_ZERO_DECIMAL } from './stripe-zero-decimal-currencies.const';
import type { PromoDiscountTerms } from './promo.types';

/** Converts UI major units (e.g. USD dollars) to Stripe minor units for `amount_off`. */
export function majorUnitsToMinorUnits(
  major: number,
  currency: string,
): number {
  const c = currency.trim().toLowerCase();
  if (STRIPE_ZERO_DECIMAL.has(c)) {
    return Math.round(major);
  }
  return Math.round(major * 100);
}

/** Inverse of {@link majorUnitsToMinorUnits} for fixed-amount promos from DB. */
export function minorUnitsToMajorUnits(
  minor: number | null | undefined,
  currency: string | null | undefined,
): number {
  if (minor == null) {
    return 0;
  }
  const c = (currency ?? 'usd').trim().toLowerCase();
  if (STRIPE_ZERO_DECIMAL.has(c)) {
    return minor;
  }
  return minor / 100;
}

export function roundCurrencyToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Expresses stored promo discount in API DTO form (`discountValue`). */
export function discountMajorFromRow(
  row: Pick<
    PromoCode,
    'discountType' | 'percentOff' | 'amountOffMinor' | 'currency'
  >,
): number {
  if (row.discountType === 'percent') {
    return Number(row.percentOff ?? 0);
  }
  return minorUnitsToMajorUnits(row.amountOffMinor, row.currency);
}

/** Dollar discount from plan price and promo terms (mirrors Plan & Seats UI). */
export function computePromoDiscountAmountFromPlanPrice(
  planPrice: Prisma.Decimal | number | string,
  promo: PromoDiscountTerms,
): Prisma.Decimal {
  const priceNum = Number(new Prisma.Decimal(planPrice.toString()).toString());
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    return new Prisma.Decimal(0);
  }

  if (promo.discountType === 'percent') {
    const pct = Number(promo.percentOff ?? 0);
    return new Prisma.Decimal(
      roundCurrencyToTwoDecimals((priceNum * pct) / 100),
    );
  }

  const fixedMajor = minorUnitsToMajorUnits(
    promo.amountOffMinor,
    promo.currency,
  );
  return new Prisma.Decimal(
    roundCurrencyToTwoDecimals(Math.min(priceNum, fixedMajor)),
  );
}
