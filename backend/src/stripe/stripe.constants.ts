export const CHECKOUT_SESSION_CREATED_MSG =
  'Stripe Checkout session created successfully';

export const STRIPE_NOT_CONFIGURED_MSG =
  'Stripe is not configured (STRIPE_SECRET_KEY)';

export const STRIPE_CHECKOUT_URLS_MISSING_MSG =
  'Missing STRIPE_CHECKOUT_SUCCESS_URL or STRIPE_CHECKOUT_CANCEL_URL';

export const STRIPE_CHECKOUT_CLOSED_CORPORATION_MSG =
  'Cannot create checkout for a closed corporation';

export const STRIPE_ALREADY_ACTIVE_SUBSCRIPTION_MSG =
  'This company already has an active subscription. Cancel or change it in the billing portal before starting a new checkout.';

export const STRIPE_MONTHLY_ANNUAL_ONLY_MSG =
  'Only monthly, annual, or individual (one-time) plans can be purchased via Checkout';

export const STRIPE_PRICING_PLAN_NOT_LINKED_MSG =
  'This pricing plan is not linked to Stripe (missing stripe_price_id). Create a recurring Price in Stripe Dashboard and set stripe_price_id on the plan.';

/** Monthly plan with trial (zero trial off) requires `trial_end_date` on the company plan seat. */
export const STRIPE_CHECKOUT_MONTHLY_TRIAL_END_MISSING_MSG =
  'This monthly plan includes a trial, but trial end date is missing. Update Plan & Seats before checkout.';

/** Monthly trial end date must still be in the future at checkout time. */
export const STRIPE_CHECKOUT_MONTHLY_TRIAL_END_IN_PAST_MSG =
  'The trial end date for this monthly plan is in the past. Update Plan & Seats before checkout.';

export const STRIPE_CHECKOUT_NO_URL_MSG = 'Stripe did not return a URL';

export const STRIPE_CHECKOUT_PROMO_CODE_NOT_FOUND_MSG =
  'That promotion code was not found.';

export const STRIPE_CHECKOUT_PROMO_PLAN_MISMATCH_MSG =
  'That promotion code does not apply to this plan.';

export const STRIPE_CHECKOUT_PROMO_NOT_ELIGIBLE_MSG =
  'That promotion code does not apply to this company.';

export const STRIPE_CHECKOUT_PROMO_NOT_ACTIVE_MSG =
  'That promotion code is not active, has expired, or has no redemptions left.';

export const STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED_MSG =
  'STRIPE_WEBHOOK_SECRET is not configured';

export const STRIPE_MISSING_STRIPE_SIGNATURE_HEADER_MSG =
  'Missing stripe-signature header';

export const STRIPE_WEBHOOK_MISSING_RAW_BODY_MSG =
  'Missing raw body for Stripe webhook';

export const STRIPE_INVALID_SIGNATURE_MSG = 'Invalid signature';

/** Max Stripe invoice ids per bulk download / bulk send request. */
export const FINANCE_BULK_MAX_INVOICES = 50;

/** Max additional recipient emails per bulk send (SES copies). */
export const FINANCE_BULK_MAX_EXTRA_EMAILS = 20;

export const FINANCE_BULK_EMAIL_SUBJECT = 'BSPBlueprint Invoice';

/** Plan type ids allowed for Stripe Checkout (subscription mode). */
export const SUBSCRIPTION_PLAN_TYPES = new Set<string>([
  'monthly',
  'annual',
  'one_time',
]);

/** Quantity (number of training days) charged on Stripe for each onsite training option. */
export const ONSITE_TRAINING_QUANTITY_BY_OPTION = {
  '1_day': 1,
  '2_days': 2,
} as const;

export const STRIPE_IMPLEMENTATION_FEE_PRICE_ID_NOT_CONFIGURED_MSG =
  'STRIPE_IMPLEMENTATION_FEE_PRICE_ID is not configured. Create a one-time Price in Stripe and set its id in the environment.';

export const STRIPE_ONSITE_TRAINING_PRICE_ID_NOT_CONFIGURED_MSG =
  'STRIPE_ONSITE_TRAINING_PRICE_ID is not configured. Create a one-time per-day Price in Stripe and set its id in the environment.';

export const STRIPE_ONE_TIME_PRICE_ID_NOT_CONFIGURED_MSG =
  'STRIPE_ONE_TIME_PRICE_ID is not configured. Create the Individual Assessment Price in Stripe and set its id in the environment.';

export const STRIPE_ONE_TIME_PRICE_UNIT_AMOUNT_MISSING_MSG =
  'The configured STRIPE_ONE_TIME_PRICE_ID does not have a unit amount.';

/**
 * Max pages (100 sessions each) when listing Checkout Sessions to build promo usage.
 * Caps Stripe traffic; totals may be incomplete if the account has more matching sessions
 * beyond this scan window.
 */
export const STRIPE_PROMO_USAGE_CHECKOUT_MAX_PAGES = 100;

/** Matches `company_key_contacts.contact_type` for the Finance / Billing key contact row. */
export const FINANCE_BILLING_CONTACT_TYPE = 'finance_billing_contact' as const;

/** Stripe Invoice metadata: set after a company invoice email is auto-sent. */
export const STRIPE_COMPANY_INVOICE_EMAIL_SENT_META =
  'companyInvoiceEmailSent' as const;

/** Links a Checkout Session to its generated Invoice in Stripe metadata. */
export const STRIPE_CHECKOUT_CORRELATION_META =
  'checkoutCorrelationId' as const;

/** Super Admin finance API — success response messages. */
export const FINANCE_COMPANIES_FETCHED_MSG = 'Companies fetched successfully';
export const FINANCE_INVOICES_FORBIDDEN_MSG =
  'You do not have permission to access invoice management.';
export const FINANCE_INVOICE_ACCESS_DENIED_MSG =
  'You do not have access to this invoice.';
export const FINANCE_INVOICES_FETCHED_MSG = 'Invoices fetched successfully';
export const FINANCE_INVOICES_SENT_MSG = 'Invoices sent successfully';
export const FINANCE_INVOICE_SENT_MSG = 'Invoice sent successfully';
export const FINANCE_BILLING_PLAN_OPTIONS_FETCHED_MSG =
  'Plan options fetched successfully';
export const FINANCE_BILLING_RECORDS_FETCHED_MSG =
  'Billing records fetched successfully';
export const FINANCE_BILLING_RECORD_FETCHED_MSG =
  'Billing record fetched successfully';
export const FINANCE_BILLING_HISTORY_FETCHED_MSG =
  'Billing history fetched successfully';
export const FINANCE_BILLING_RECORD_NOT_FOUND_MSG = 'Billing record not found';
export const FINANCE_BILLING_CANCEL_SCHEDULED_MSG =
  'Subscription set to cancel at period end';
export const FINANCE_BILLING_RETRY_ATTEMPTED_MSG = 'Payment retry attempted';
export const FINANCE_BILLING_REINSTATE_SUCCESS_MSG =
  'Scheduled subscription cancellation removed';

/** Super Admin billing actions — client-facing error messages. */
export const FINANCE_BILLING_NO_SUBSCRIPTION_ID_MSG =
  'Company has no active Stripe subscription id.';
export const FINANCE_BILLING_SUBSCRIPTION_ALREADY_CANCELED_MSG =
  'Subscription is already canceled in Stripe.';
export const FINANCE_BILLING_NO_STRIPE_SUBSCRIPTION_MSG =
  'Company has no Stripe subscription.';
export const FINANCE_BILLING_NO_INVOICE_TO_RETRY_MSG =
  'No invoice found on subscription to retry.';
export const FINANCE_BILLING_INVOICE_ALREADY_PAID_MSG =
  'Latest invoice is already paid.';
export const FINANCE_BILLING_NO_SUBSCRIPTION_ON_FILE_MSG =
  'No Stripe subscription on file; start a new subscription from the company billing flow.';
export const FINANCE_BILLING_SUBSCRIPTION_FULLY_CANCELED_MSG =
  'Subscription is fully canceled in Stripe; create a new subscription via checkout.';

/** Stripe `invoices.pay` failure surfaced to the Super Admin client. */
export const FINANCE_BILLING_STRIPE_PAYMENT_FAILED_MSG = (
  detail: string,
): string => {
  return `Stripe could not collect payment: ${detail}`;
};

export const FINANCE_BILLING_UPGRADE_OPTIONS_FETCHED_MSG =
  'Billing upgrade options fetched successfully';
export const FINANCE_BILLING_UPGRADE_PREVIEW_FETCHED_MSG =
  'Billing upgrade preview calculated successfully';
export const FINANCE_BILLING_UPGRADE_APPLIED_MSG =
  'Subscription plan upgraded successfully';
export const FINANCE_BILLING_UPGRADE_COMPANY_ADMIN_EMAIL_SUBJECT =
  'Your Subscription Plan Has Been Updated';
export const FINANCE_BILLING_UPGRADE_CORPORATION_ADMIN_EMAIL_SUBJECT =
  'Company Subscription Plan Updated';
