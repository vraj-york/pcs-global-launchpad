/** Billing history event types surfaced in Super Admin billing detail (Figma). */
export type BillingHistoryEventType =
  | 'subscription_created'
  | 'invoice_generated'
  | 'payment_successful'
  | 'payment_failed'
  | 'plan_upgraded'
  | 'subscription_canceled'
  | 'subscription_reinstated';

export type BillingHistoryActorKind =
  | 'system'
  | 'super_admin'
  | 'corporation_admin'
  | 'company_admin';

export type BillingHistoryEvent = {
  eventId: string;
  eventType: BillingHistoryEventType;
  planLabel: string | null;
  planTypeId: string | null;
  amountCents: number | null;
  currency: string | null;
  actorName: string;
  actorRole: string;
  actorKind: BillingHistoryActorKind;
  /** Stripe invoice id when the event is invoice-backed (download). */
  stripeInvoiceId?: string | null;
  /** Unix seconds (Stripe event time). */
  occurredAt: number;
};

export type BillingHistoryListResult = {
  items: BillingHistoryEvent[];
  page: number;
  limit: number;
  totalCount: number;
  hasNextPage: boolean;
};
