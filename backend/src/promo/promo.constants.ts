export const PROMO_CODE_CREATED_MSG = 'Promo code created successfully';

export const PROMO_CODE_VALIDATED_MSG =
  'Promo code details are valid and ready to save.';

export const PROMO_CODE_UPDATED_MSG = 'Promo code updated successfully';

export const PROMO_CODE_DELETED_MSG =
  'Promo code removed from the system and Stripe.';

export const PROMO_CODES_LIST_FETCHED_MSG = 'Promo codes fetched successfully.';
export const PROMO_CODES_AVAILABLE_FOR_SETUP_FETCHED_MSG =
  'Available promo codes fetched successfully.';

export const PROMO_CODE_DETAIL_FETCHED_MSG = 'Promo code fetched successfully.';

export const PROMO_CODE_PROMOTION_ACTIVE_UPDATED_MSG =
  'Promo code activation updated successfully.';

export const PROMO_CODE_NOT_FOUND_MSG = 'Promo code not found.';

/** Normalized promo `code` length (after trim / uppercase / collapsing spaces). */
export const PROMO_CODE_INVALID_LENGTH_MSG =
  'Code must be between 2 and 50 characters.';

export const PROMO_CODE_INVALID_CHARSET_MSG =
  'Code may only contain letters, numbers, hyphens, and underscores.';

export const PROMO_CODE_MISSING_STRIPE_PROMOTION_MSG =
  'This promo code has no Stripe promotion reference; activation cannot be changed.';

export const PROMO_NO_FIELDS_TO_UPDATE_MSG =
  'Provide at least one field to update.';

export const PROMO_DISCOUNT_VALUE_WHEN_TYPE_CHANGE_MSG =
  'Provide discountValue when changing discount type.';

export const PROMO_DUPLICATE_CODE_MSG =
  'A promo code with this name already exists. Choose a different code.';

export const PROMO_EXPIRY_IN_PAST_MSG = 'Expiry date must be in the future.';

export const PROMO_SCHEDULE_NOT_EDITABLE_MSG =
  'Expiry date and max usage cannot be changed after the promo code is created.';

export const PROMO_CANNOT_ACTIVATE_EXPIRED_MSG =
  'This promo code has expired and cannot be re-enabled.';

export const PROMO_USAGE_LIST_FETCHED_MSG =
  'Promo code usage history fetched successfully.';

export const PROMO_INVALID_PERCENT_MSG =
  'Percentage discount must be greater than 0 and at most 100.';

export const PROMO_INVALID_FIXED_MSG =
  'Fixed discount amount must be greater than 0.';

export const PROMO_PLAN_TYPE_NOT_FOUND_MSG = 'Selected plan is not valid.';

export const PROMO_PLAN_NO_STRIPE_PRICES_MSG =
  'This plan has no linked Stripe prices. Link pricing plans to Stripe before creating a promo.';

export const PROMO_LIMIT_REQUIRES_CORPORATION_MSG =
  'Select a corporation when limiting promo access.';

export const PROMO_COMPANY_NOT_IN_CORPORATION_MSG =
  'Selected company does not belong to the selected corporation.';
