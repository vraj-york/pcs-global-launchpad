/**
 * Maps Stripe account events and persisted subscription actions into Super Admin billing-history rows.
 */
import type Stripe from 'stripe';
import type {
  BillingHistoryEvent,
  BillingHistoryEventType,
} from './stripe-billing-history.types';

/** Stripe event types that can produce a billing-history row for one customer. */
export const BILLING_HISTORY_STRIPE_EVENT_TYPES = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.finalized',
  'invoice.paid',
  'invoice.payment_failed',
] as const;

/** Internal plan type + display name keyed by Stripe Price id (from Prisma). */
export type PlanByStripePriceId = Map<
  string,
  { planTypeId: string; planLabel: string }
>;

/** Placeholder actor until admin actions are stored with user attribution. */
const SYSTEM_ACTOR = {
  actorName: 'System',
  actorRole: 'BSPBlueprint',
  actorKind: 'system' as const,
};

/**
 * Resolves the Stripe customer on an event payload (subscription or invoice).
 * Used to keep only events belonging to the company under view.
 */
export function extractStripeEventCustomerId(
  event: Stripe.Event,
): string | null {
  const obj = event.data.object as {
    customer?: string | { id?: string } | null;
  };
  const customer = obj.customer;
  if (typeof customer === 'string') {
    return customer;
  }
  if (
    customer &&
    typeof customer === 'object' &&
    typeof customer.id === 'string'
  ) {
    return customer.id;
  }
  return null;
}

/** Stripe Price id on the subscription's first line item (plan key). */
function priceIdFromSubscription(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0];
  if (!item?.price) {
    return null;
  }
  const price = item.price;
  return typeof price === 'string' ? price : (price.id ?? null);
}

/** Stripe Price id on the invoice's first line item (plan key). */
function priceIdFromInvoice(inv: Stripe.Invoice): string | null {
  const line = inv.lines?.data?.[0];
  if (!line?.price) {
    return null;
  }
  const price = line.price;
  return typeof price === 'string' ? price : (price.id ?? null);
}

/** Resolves plan label and type id from Prisma `stripePriceId` map; null when unknown. */
function planFromPriceId(
  priceId: string | null,
  planByPriceId: PlanByStripePriceId,
): { planLabel: string | null; planTypeId: string | null } {
  if (!priceId) {
    return { planLabel: null, planTypeId: null };
  }
  const hit = planByPriceId.get(priceId);
  if (!hit) {
    return { planLabel: null, planTypeId: null };
  }
  return { planLabel: hit.planLabel, planTypeId: hit.planTypeId };
}

/** Invoice rows: prefer amount collected; fall back to invoice total for failed/finalized. */
function amountFromInvoice(inv: Stripe.Invoice): {
  amountCents: number | null;
  currency: string | null;
} {
  const amountCents =
    inv.amount_paid != null
      ? inv.amount_paid
      : inv.total != null
        ? inv.total
        : null;
  return { amountCents, currency: inv.currency ?? null };
}

/** Recurring unit amount in cents from the subscription's first price (subscription rows). */
function unitAmountFromSubscription(sub: Stripe.Subscription): number | null {
  const price = sub.items?.data?.[0]?.price;
  if (!price || typeof price === 'string') {
    return null;
  }
  return price.unit_amount ?? null;
}

/**
 * `customer.subscription.updated` is generic; derive UI event types from
 * `previous_attributes` (scheduled cancel/reinstate or price change on line 0).
 */
function subscriptionUpdatedEventType(
  event: Stripe.Event,
): BillingHistoryEventType | null {
  if (event.type !== 'customer.subscription.updated') {
    return null;
  }
  const sub = event.data.object;
  const prev = event.data.previous_attributes;

  // Scheduled end-of-period cancel toggled on or off (not immediate deletion).
  if (
    prev?.cancel_at_period_end === true &&
    sub.cancel_at_period_end === false
  ) {
    return 'subscription_reinstated';
  }
  if (
    prev?.cancel_at_period_end === false &&
    sub.cancel_at_period_end === true
  ) {
    return 'subscription_canceled';
  }

  const prevItems = prev?.items;
  if (prevItems) {
    const prevPriceId =
      typeof prevItems === 'object' &&
      prevItems !== null &&
      'data' in prevItems &&
      Array.isArray(prevItems.data)
        ? (() => {
            const first = prevItems.data[0];
            const p = first?.price;
            return typeof p === 'string' ? p : (p?.id ?? null);
          })()
        : null;
    const nextPriceId = priceIdFromSubscription(sub);
    if (prevPriceId && nextPriceId && prevPriceId !== nextPriceId) {
      return 'plan_upgraded';
    }
  }

  return null;
}

/**
 * Converts one Stripe event into a billing-history row, or null when ignored.
 * Ignores subscription.updated events that are not cancel/reinstate/plan change.
 */
export function mapStripeEventToBillingHistory(
  event: Stripe.Event,
  planByPriceId: PlanByStripePriceId,
): BillingHistoryEvent | null {
  const occurredAt = event.created;
  const base = { eventId: event.id, ...SYSTEM_ACTOR, occurredAt };

  switch (event.type) {
    case 'customer.subscription.created': {
      const sub = event.data.object;
      const priceId = priceIdFromSubscription(sub);
      const plan = planFromPriceId(priceId, planByPriceId);
      return {
        ...base,
        eventType: 'subscription_created',
        ...plan,
        amountCents: unitAmountFromSubscription(sub),
        currency: sub.currency ?? null,
      };
    }
    // Immediate subscription end (distinct from scheduled cancel via subscription.updated).
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const priceId = priceIdFromSubscription(sub);
      const plan = planFromPriceId(priceId, planByPriceId);
      return {
        ...base,
        eventType: 'subscription_canceled',
        ...plan,
        amountCents: null,
        currency: sub.currency ?? null,
      };
    }
    case 'customer.subscription.updated': {
      const eventType = subscriptionUpdatedEventType(event);
      if (!eventType) {
        return null;
      }
      const sub = event.data.object;
      const priceId = priceIdFromSubscription(sub);
      const plan = planFromPriceId(priceId, planByPriceId);
      return {
        ...base,
        eventType,
        ...plan,
        amountCents: unitAmountFromSubscription(sub),
        currency: sub.currency ?? null,
      };
    }
    case 'invoice.finalized': {
      const inv = event.data.object;
      const plan = planFromPriceId(priceIdFromInvoice(inv), planByPriceId);
      const { amountCents, currency } = amountFromInvoice(inv);
      return {
        ...base,
        eventType: 'invoice_generated',
        ...plan,
        amountCents,
        currency,
        stripeInvoiceId: inv.id ?? null,
      };
    }
    case 'invoice.paid': {
      const inv = event.data.object;
      const plan = planFromPriceId(priceIdFromInvoice(inv), planByPriceId);
      const { amountCents, currency } = amountFromInvoice(inv);
      return {
        ...base,
        eventType: 'payment_successful',
        ...plan,
        amountCents,
        currency,
        stripeInvoiceId: inv.id ?? null,
      };
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object;
      const plan = planFromPriceId(priceIdFromInvoice(inv), planByPriceId);
      const { amountCents, currency } = amountFromInvoice(inv);
      return {
        ...base,
        eventType: 'payment_failed',
        ...plan,
        amountCents,
        currency,
        stripeInvoiceId: inv.id ?? null,
      };
    }
    default:
      return null;
  }
}

/** Stripe cancel/reinstate events within this window are replaced by audit rows. */
export const BILLING_HISTORY_AUDIT_DEDUPE_SECONDS = 300;

export function shouldSkipStripeHistoryEventForAudit(
  event: BillingHistoryEvent,
  auditOccurredAtByType: Map<BillingHistoryEventType, number[]>,
): boolean {
  if (
    event.eventType !== 'subscription_canceled' &&
    event.eventType !== 'subscription_reinstated'
  ) {
    return false;
  }
  const auditTimes = auditOccurredAtByType.get(event.eventType);
  if (!auditTimes?.length) {
    return false;
  }
  return auditTimes.some(
    (t) =>
      Math.abs(event.occurredAt - t) <= BILLING_HISTORY_AUDIT_DEDUPE_SECONDS,
  );
}

/** Sort comparator for in-memory history list (matches `ListBillingHistoryQueryDto`). */
export function compareBillingHistoryEvents(
  a: BillingHistoryEvent,
  b: BillingHistoryEvent,
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'desc',
): number {
  const dir = sortOrder === 'asc' ? 1 : -1;
  const cmp = (x: number | string, y: number | string): number => {
    if (x < y) return -1 * dir;
    if (x > y) return 1 * dir;
    return 0;
  };

  switch (sortBy) {
    case 'eventId':
      return cmp(a.eventId, b.eventId);
    case 'eventType':
      return cmp(a.eventType, b.eventType);
    case 'planLabel':
      return cmp(a.planLabel ?? '', b.planLabel ?? '');
    case 'amount': {
      const ax = a.amountCents ?? -1;
      const bx = b.amountCents ?? -1;
      return cmp(ax, bx);
    }
    case 'actorName':
      return cmp(a.actorName, b.actorName);
    case 'occurredAt':
    default:
      return cmp(a.occurredAt, b.occurredAt);
  }
}
