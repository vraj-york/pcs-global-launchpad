/** Plan type upgrade rank: one_time < annual < monthly. */
export const PLAN_TYPE_UPGRADE_RANK: Record<string, number> = {
  one_time: 0,
  annual: 1,
  monthly: 2,
};

export const FINANCE_BILLING_UPGRADE_NOT_ELIGIBLE_MSG =
  'This company is not eligible for a plan upgrade.';
export const FINANCE_BILLING_UPGRADE_NO_CURRENT_PLAN_MSG =
  'Company has no current pricing plan assigned.';
export const FINANCE_BILLING_UPGRADE_TARGET_NOT_FOUND_MSG =
  'Target pricing plan was not found.';
export const FINANCE_BILLING_UPGRADE_CUSTOM_TIER_MSG =
  'Custom pricing tiers cannot be changed via Edit Billing.';
export const FINANCE_BILLING_UPGRADE_PLAN_DOWNGRADE_MSG =
  'Only plan upgrades are allowed. The selected plan type is not an upgrade.';
export const FINANCE_BILLING_UPGRADE_LEVEL_DOWNGRADE_MSG =
  'Only plan level upgrades are allowed. Employee seats can only be increased.';
export const FINANCE_BILLING_UPGRADE_NO_CHANGE_MSG =
  'Select a different plan or plan level to upgrade.';
export const FINANCE_BILLING_UPGRADE_ALREADY_ON_TARGET_MSG =
  'Company is already on the selected plan and plan level.';
export const FINANCE_BILLING_UPGRADE_MISSING_STRIPE_PRICE_MSG =
  'Target pricing plan is not linked to Stripe.';
export const FINANCE_BILLING_UPGRADE_NO_PAYMENT_METHOD_MSG =
  'Company has no default payment method on file. Add a payment method before upgrading.';
export const FINANCE_BILLING_UPGRADE_NO_STRIPE_CUSTOMER_MSG =
  'Company has no Stripe customer on file.';
export const FINANCE_BILLING_UPGRADE_INACTIVE_SUBSCRIPTION_MSG =
  'Company subscription is not active. Only active, trialing, or past due subscriptions can be upgraded.';
export const FINANCE_BILLING_UPGRADE_SUBSCRIPTION_NOT_FOUND_MSG =
  'Stripe subscription was not found. It may have been removed; contact support.';
export const FINANCE_BILLING_UPGRADE_SUBSCRIPTION_CANCELED_MSG =
  'Subscription is canceled in Stripe and cannot be upgraded. Start a new subscription from checkout.';
export const FINANCE_BILLING_UPGRADE_SUBSCRIPTION_INACTIVE_MSG =
  'Subscription is not billable in Stripe and cannot be upgraded.';
export const FINANCE_BILLING_UPGRADE_STRIPE_REQUEST_FAILED_MSG = (
  detail: string,
): string => `Stripe billing request failed: ${detail}`;
