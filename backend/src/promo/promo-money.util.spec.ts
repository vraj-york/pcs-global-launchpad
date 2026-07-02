import { Prisma } from '@prisma/client';
import { computePromoDiscountAmountFromPlanPrice } from './promo-money.util';

describe('computePromoDiscountAmountFromPlanPrice', () => {
  it('computes percent off from plan price', () => {
    const result = computePromoDiscountAmountFromPlanPrice(499, {
      discountType: 'percent',
      percentOff: new Prisma.Decimal(10),
      amountOffMinor: null,
      currency: null,
    });
    expect(result.toString()).toBe('49.9');
  });

  it('caps fixed amount at plan price', () => {
    const result = computePromoDiscountAmountFromPlanPrice(100, {
      discountType: 'fixed_amount',
      percentOff: null,
      amountOffMinor: 15000,
      currency: 'usd',
    });
    expect(result.toString()).toBe('100');
  });

  it('returns zero for non-positive plan price', () => {
    const result = computePromoDiscountAmountFromPlanPrice(0, {
      discountType: 'percent',
      percentOff: new Prisma.Decimal(10),
      amountOffMinor: null,
      currency: null,
    });
    expect(result.toString()).toBe('0');
  });
});
