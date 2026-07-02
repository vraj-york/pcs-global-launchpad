/** Stripe subscription statuses that allow full app access. */
export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

/** Statuses that block access until payment is resolved. */
export const BLOCKED_SUBSCRIPTION_STATUSES = new Set([
  'past_due',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'paused',
]);

export const PLAN_TYPE_MONTHLY = 'monthly';
export const PLAN_TYPE_ANNUAL = 'annual';
export const PLAN_TYPE_ONE_TIME = 'one_time';

export const SUBSCRIPTION_ACCESS_DENIED_MSG =
  'Your subscription is inactive or your payment is due. Please subscribe/complete payment to restore access.';

export const SUBSCRIPTION_PLAN_FEATURE_DENIED_MSG =
  'This feature is not available on your current plan.';

export const SUBSCRIPTION_EMPLOYEE_LIMIT_MSG =
  'Your company has reached the maximum number of active employees allowed by your plan.';

export const ONE_TIME_COMPANY_ASSESSMENT_CREDITS_EXHAUSTED_MSG =
  'Your company has used all purchased assessment credits.';

/** Normalizes Stripe / DB subscription status for comparisons. */
export function normalizeSubscriptionStatus(
  status: string | null | undefined,
): string | null {
  const trimmed = status?.trim().toLowerCase();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

/** True when subscription status allows app access (active or trialing). */
export function isSubscriptionStatusActive(
  status: string | null | undefined,
): boolean {
  const normalized = normalizeSubscriptionStatus(status);
  return normalized !== null && ACTIVE_SUBSCRIPTION_STATUSES.has(normalized);
}

export const SKIP_SUBSCRIPTION_CHECK_KEY = 'skipSubscriptionCheck';

export function SkipSubscriptionCheck() {
  return <T extends (...args: unknown[]) => unknown>(
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    const method = descriptor.value;
    if (method === undefined) {
      return descriptor;
    }
    Reflect.defineMetadata(SKIP_SUBSCRIPTION_CHECK_KEY, true, method);
    return descriptor;
  };
}

export type SubscriptionContext = {
  companyId: string | null;
  subscriptionStatus: string | null;
  planTypeId: string | null;
  employeeRangeMax: number | null;
  isActive: boolean;
  isBlocked: boolean;
  /** Purchased one-time assessment credits for the company (`one_time` plans). */
  assessmentQuantity?: number | null;
  /** Total assessments started by users in the company. */
  companyAssessmentCount?: number | null;
  /** Remaining one-time assessment credits (`assessmentQuantity - companyAssessmentCount`). */
  assessmentCreditsRemaining?: number | null;
};
