import { Prisma } from '@prisma/client';
import {
  computeOneTimePlanDisplayInvoiceAmount,
  majorUnitsToInvoiceCents,
} from './company-plan-invoice.util';

describe('company-plan-invoice.util', () => {
  const baseSeat = {
    planPrice: new Prisma.Decimal('195'),
    discount: new Prisma.Decimal('19.5'),
    invoiceAmount: new Prisma.Decimal('175.5'),
  };

  it('multiplies unit price by assessment quantity for percent promo', () => {
    expect(computeOneTimePlanDisplayInvoiceAmount(baseSeat, 10)).toBe(1755);
    expect(majorUnitsToInvoiceCents(1755)).toBe(175500);
  });

  it('applies fixed promo once against subtotal', () => {
    const seat = {
      ...baseSeat,
      discount: new Prisma.Decimal('50'),
      invoiceAmount: new Prisma.Decimal('145'),
    };
    expect(computeOneTimePlanDisplayInvoiceAmount(seat, 10)).toBe(1900);
  });

  it('falls back to stored per-unit invoice when quantity is missing', () => {
    expect(computeOneTimePlanDisplayInvoiceAmount(baseSeat, null)).toBe(175.5);
  });
});
