/** Stripe subscription statuses we surface in Super Admin billing. */
export type BillingSubscriptionUiStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'unpaid'
  | 'none';

/** Derived payment column for billing dashboard (AC3 combinations). */
export type BillingPaymentUiStatus = 'paid' | 'failed' | 'pending';

export type BillingPaymentMethodType = 'ach' | 'cc' | 'offline' | null;

export type BillingAdminListItem = {
  companyId: string;
  /** Stripe invoice number or customer id; null when neither is available. */
  billingId: string | null;
  companyName: string;
  companyRegion: string | null;
  planLabel: string | null;
  /** Employee band label (e.g. `1-25 employees`), from `pricing_plans` on the company. */
  planLevel: string | null;
  /** BSP `plan_types.id` (monthly, annual, one_time) for plan badge styling. */
  planTypeId: string | null;
  /** Current `pricing_plans.id` on the company. */
  pricingPlanId: string | null;
  billingCycle: string | null;
  subscriptionStatus: BillingSubscriptionUiStatus;
  paymentStatus: BillingPaymentUiStatus;
  /** ISO date when current Stripe subscription period started. */
  currentPeriodStart: string | null;
  /** ISO date when current Stripe subscription period ends (renewal). */
  currentPeriodEnd: string | null;
  /** Paid one-time checkout amount in cents when on one_time plan. */
  oneTimePaymentCents: number | null;
  renewalDate: string | null;
  /** ISO date or null when unknown */
  nextBillingAmountCents: number | null;
  nextBillingCurrency: string | null;
  paymentType: BillingPaymentMethodType;
  /** True when subscription is active but latest invoice is unpaid / pending (edge case). */
  inconsistentBillingState: boolean;
  /** From Stripe when a subscription id exists. */
  cancelAtPeriodEnd: boolean;
  canEdit: boolean;
  canRetryPayment: boolean;
  canCancelSubscription: boolean;
  canReinstateSubscription: boolean;
  stripeSubscriptionId: string | null;
};

export type BillingAdminListResult = {
  items: BillingAdminListItem[];
  page: number;
  limit: number;
  totalCount: number;
  totalTruncated: boolean;
  hasNextPage: boolean;
};
