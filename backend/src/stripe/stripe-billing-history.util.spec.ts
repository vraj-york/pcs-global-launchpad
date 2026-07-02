import type Stripe from 'stripe';
import {
  mapStripeEventToBillingHistory,
  type PlanByStripePriceId,
} from './stripe-billing-history.util';

const planByPriceId: PlanByStripePriceId = new Map([
  [
    'price_monthly',
    { planTypeId: 'monthly', planLabel: 'BSP Blueprint (Monthly)' },
  ],
]);

function invoiceEvent(
  type: 'invoice.paid' | 'invoice.finalized' | 'invoice.payment_failed',
  invoiceId: string,
): Stripe.Event {
  return {
    id: `evt_${invoiceId}`,
    type,
    created: 1_700_000_000,
    data: {
      object: {
        id: invoiceId,
        customer: 'cus_1',
        currency: 'usd',
        amount_paid: 79900,
        total: 79900,
        lines: {
          data: [{ price: { id: 'price_monthly' } }],
        },
      } as Stripe.Invoice,
    },
  } as Stripe.Event;
}

describe('mapStripeEventToBillingHistory', () => {
  it('includes stripeInvoiceId on invoice.paid events', () => {
    const row = mapStripeEventToBillingHistory(
      invoiceEvent('invoice.paid', 'in_paid_1'),
      planByPriceId,
    );
    expect(row).toMatchObject({
      eventType: 'payment_successful',
      stripeInvoiceId: 'in_paid_1',
    });
  });

  it('includes stripeInvoiceId on invoice.finalized events', () => {
    const row = mapStripeEventToBillingHistory(
      invoiceEvent('invoice.finalized', 'in_final_1'),
      planByPriceId,
    );
    expect(row).toMatchObject({
      eventType: 'invoice_generated',
      stripeInvoiceId: 'in_final_1',
    });
  });

  it('includes stripeInvoiceId on invoice.payment_failed events', () => {
    const row = mapStripeEventToBillingHistory(
      invoiceEvent('invoice.payment_failed', 'in_fail_1'),
      planByPriceId,
    );
    expect(row).toMatchObject({
      eventType: 'payment_failed',
      stripeInvoiceId: 'in_fail_1',
    });
  });

  it('does not set stripeInvoiceId on subscription_created events', () => {
    const row = mapStripeEventToBillingHistory(
      {
        id: 'evt_sub',
        type: 'customer.subscription.created',
        created: 1_700_000_000,
        data: {
          object: {
            id: 'sub_1',
            customer: 'cus_1',
            currency: 'usd',
            items: {
              data: [{ price: { id: 'price_monthly', unit_amount: 9900 } }],
            },
          } as Stripe.Subscription,
        },
      } as Stripe.Event,
      planByPriceId,
    );
    expect(row?.eventType).toBe('subscription_created');
    expect(row?.stripeInvoiceId).toBeUndefined();
  });
});
