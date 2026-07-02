/** `app_users.payment_status` for Super Admin–provisioned individual users. */
export const INDIVIDUAL_PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
} as const;

export type IndividualPaymentStatus =
  (typeof INDIVIDUAL_PAYMENT_STATUS)[keyof typeof INDIVIDUAL_PAYMENT_STATUS];

export const INDIVIDUAL_PAYMENT_REVIEW_FETCHED_MSG =
  'Individual payment review loaded successfully.';

export const INDIVIDUAL_PAYMENT_NOT_REQUIRED_MSG =
  'Payment is not required for this account.';

export const INDIVIDUAL_PAYMENT_ALREADY_PAID_MSG =
  'Payment has already been completed for this account.';

export const INDIVIDUAL_PAYMENT_USER_NOT_FOUND_MSG =
  'Individual user account was not found.';

export const INDIVIDUAL_PAYMENT_PLAN_NOT_CONFIGURED_MSG =
  'Individual assessment pricing is not configured.';

export const INDIVIDUAL_PAYMENT_PROMO_INVALID_MSG =
  'Promo code is no longer valid for this assessment.';

export const INDIVIDUAL_PAYMENT_CHECKOUT_CREATED_MSG =
  'Checkout session created successfully.';

export const INDIVIDUAL_PAYMENT_ACTIVATED_MSG =
  'Payment completed and account activated successfully.';

/** Stripe Checkout metadata key for B2C individual user payments. */
export const STRIPE_CHECKOUT_INDIVIDUAL_USER_META = 'individualAppUser';

/** Stripe Invoice metadata: set after the individual user invoice email is sent. */
export const STRIPE_INDIVIDUAL_INVOICE_EMAIL_SENT_META =
  'individualInvoiceEmailSent';

/** Display name shown on Stripe Checkout for individual assessment purchases. */
export const INDIVIDUAL_PAYMENT_CHECKOUT_PRODUCT_NAME =
  'BSP Assessment (Individual)';

/** Short description shown on Stripe Checkout for individual assessment purchases. */
export const INDIVIDUAL_PAYMENT_CHECKOUT_PRODUCT_DESCRIPTION =
  'One-time access to the BSP assessment for individual users.';
