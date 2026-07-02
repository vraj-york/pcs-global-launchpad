import { Prisma } from '@prisma/client';
import {
  majorUnitsToMinorUnits,
  roundCurrencyToTwoDecimals,
} from '../promo/promo-money.util';

const WHOLE_PERCENT_TOLERANCE = 0.001;

export type PlanSeatDecimalField = Prisma.Decimal | { toString(): string };

/** Plan seat monetary fields stored in major units (e.g. USD dollars). */
export type PlanSeatForDisplayInvoice = {
  planPrice: PlanSeatDecimalField;
  discount: PlanSeatDecimalField;
  invoiceAmount: PlanSeatDecimalField;
};

/**
 * Converts a Prisma Decimal to a number, returning 0 for invalid values.
 */
function parsePlanSeatAmount(value: PlanSeatDecimalField): number {
  const parsed = Number(new Prisma.Decimal(value.toString()).toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Checks if a quantity is a positive integer.
 */
function isPositiveIntegerQuantity(
  quantity: number | null | undefined,
): quantity is number {
  return quantity != null && Number.isInteger(quantity) && quantity > 0;
}

/**
 * When unit discount matches a whole-number percent of unit price, returns that percent.
 * Otherwise returns null (treated as a fixed per-unit discount).
 */
function resolveWholePercentDiscount(
  unitPlanPrice: number,
  unitDiscount: number,
): number | null {
  if (unitPlanPrice <= 0 || unitDiscount <= 0) {
    return null;
  }

  const impliedPercent = (unitDiscount / unitPlanPrice) * 100;
  const roundedPercent = Math.round(impliedPercent);
  const isWholePercentPromo =
    roundedPercent > 0 &&
    roundedPercent < 100 &&
    Math.abs(impliedPercent - roundedPercent) < WHOLE_PERCENT_TOLERANCE;

  return isWholePercentPromo ? roundedPercent : null;
}

/**
 * Computes the discount on a subtotal based on the unit plan price and unit discount.
 */
function computeDiscountOnSubtotal(
  subtotal: number,
  unitPlanPrice: number,
  unitDiscount: number,
): number {
  if (unitDiscount <= 0) {
    return 0;
  }

  const percent = resolveWholePercentDiscount(unitPlanPrice, unitDiscount);
  if (percent != null) {
    return roundCurrencyToTwoDecimals((subtotal * percent) / 100);
  }

  return roundCurrencyToTwoDecimals(Math.min(subtotal, unitDiscount));
}

/**
 * One-time invoice total in major units: (unit price × assessment qty) minus promo discount.
 * Falls back to stored per-unit invoice when quantity is absent.
 */
export function computeOneTimePlanDisplayInvoiceAmount(
  planSeat: PlanSeatForDisplayInvoice,
  assessmentQuantity: number | null | undefined,
): number {
  const unitPlanPrice = parsePlanSeatAmount(planSeat.planPrice);
  const unitDiscount = parsePlanSeatAmount(planSeat.discount);

  if (isPositiveIntegerQuantity(assessmentQuantity)) {
    const subtotal = roundCurrencyToTwoDecimals(
      unitPlanPrice * assessmentQuantity,
    );
    const discountAmount = computeDiscountOnSubtotal(
      subtotal,
      unitPlanPrice,
      unitDiscount,
    );
    return roundCurrencyToTwoDecimals(Math.max(0, subtotal - discountAmount));
  }

  const storedInvoice = parsePlanSeatAmount(planSeat.invoiceAmount);
  if (storedInvoice >= 0) {
    return roundCurrencyToTwoDecimals(storedInvoice);
  }

  return roundCurrencyToTwoDecimals(Math.max(0, unitPlanPrice - unitDiscount));
}

/** Converts a rounded major-unit invoice total to Stripe minor units (default USD). */
export function majorUnitsToInvoiceCents(
  dollars: number,
  currency = 'usd',
): number {
  return majorUnitsToMinorUnits(roundCurrencyToTwoDecimals(dollars), currency);
}
