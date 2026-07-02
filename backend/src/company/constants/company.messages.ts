// Success messages
export const COMPANY_CREATED_SUCCESS_MSG = 'Company created successfully';
export const COMPANY_UPDATED_SUCCESS_MSG = 'Company updated successfully';
export const COMPANY_DELETED_SUCCESS_MSG = 'Company deleted successfully';
export const COMPANY_FETCHED_SUCCESS_MSG =
  'Company details fetched successfully';
export const COMPANY_LIST_FETCHED_SUCCESS_MSG =
  'Company list fetched successfully';
export const COMPANY_ACTIVE_SUMMARIES_FETCHED_SUCCESS_MSG =
  'Active companies fetched successfully';
export const COMPANY_ALL_FETCHED_SUCCESS_MSG =
  'All companies fetched successfully';
export const COMPANY_DIRECTORY_LIST_FETCHED_SUCCESS_MSG =
  'Company directory list fetched successfully';
export const COMPANY_DIRECTORY_FILTER_OPTIONS_FETCHED_SUCCESS_MSG =
  'Company directory filter options fetched successfully';

// Error messages (directory)
export const COMPANY_DIRECTORY_LIST_FAILED_MSG =
  'Failed to fetch company directory list. Please try again later.';
export const COMPANY_DIRECTORY_FILTER_OPTIONS_FAILED_MSG =
  'Failed to fetch company directory filter options. Please try again later.';

// Error messages
export const CORPORATION_ID_REQUIRED_MSG = 'Corporation ID is required';
export const COMPANY_ID_REQUIRED_MSG = 'Company ID is required';

/** GET corporations/companies/:companyId — caller is not SuperAdmin, CorporationAdmin, or an authorized CompanyAdmin. */
export const COMPANY_DETAIL_FORBIDDEN_MSG =
  'You do not have permission to view this company.';

/** CorporationAdmin has no linked corporation on `app_users.corporation_id`. */
export const COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG =
  'No corporation is linked to this account.';

/** CorporationAdmin requested a company not under their corporation (`corporation_companies`). */
export const COMPANY_DETAIL_CORP_ADMIN_WRONG_CORP_MSG =
  'You may only view companies under your corporation.';

/** CompanyAdmin has no admin `user_company_access` row for this company. */
export const COMPANY_DETAIL_COMPANY_ADMIN_FORBIDDEN_MSG =
  'You may only view your assigned company.';

/** SuperAdmin must pass the company UUID; `me` is reserved for CompanyAdmin. */
export const COMPANY_DETAIL_SUPER_ADMIN_ME_PATH_MSG =
  'SuperAdmin requests must use the company UUID, not "me".';

/** CorporationAdmin must pass a company UUID; `me` is only for CompanyAdmin. */
export const COMPANY_DETAIL_CORP_ADMIN_ME_PATH_MSG =
  'CorporationAdmin requests must use a company UUID, not "me".';

/** CompanyAdmin called `.../companies/me` but has no admin row on a non-deleted company. */
export const COMPANY_DETAIL_COMPANY_ADMIN_ME_UNASSIGNED_MSG =
  'No company is linked to this account as company admin.';

/** GET corporations/:corporationId/companies — caller is not SuperAdmin or CorporationAdmin. */
export const COMPANY_LIST_FORBIDDEN_MSG =
  'You do not have permission to list companies for this corporation.';

/** GET company directory list — caller is not SuperAdmin or CorporationAdmin. */
export const COMPANY_DIRECTORY_LIST_FORBIDDEN_MSG =
  'You do not have permission to view the company directory.';

/** GET company directory filter-options — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const COMPANY_DIRECTORY_FILTER_OPTIONS_FORBIDDEN_MSG =
  'You do not have permission to view company directory filter options.';

/** GET corporations/companies/active — caller is not SuperAdmin or CorporationAdmin. */
export const COMPANY_ACTIVE_SUMMARIES_FORBIDDEN_MSG =
  'You do not have permission to list active companies.';

/** GET corporations/companies/all — caller is not SuperAdmin or CorporationAdmin. */
export const COMPANY_ALL_FORBIDDEN_MSG =
  'You do not have permission to list all companies.';

/** Logged when GET /corporations/companies/all fails. */
export const COMPANY_ALL_FETCH_ERROR_LOG_MSG = 'Error fetching all companies';

export const LEGAL_NAME_DUPLICATE_MSG =
  'Company legal name must be unique within the corporation';
export const CANNOT_DELETE_LAST_COMPANY_MSG =
  'Cannot delete the only remaining company in the corporation';
export const COMPANY_KEY_CONTACTS_UPDATED_SUCCESS_MSG =
  'Company key contacts updated successfully';
export const COMPANY_PLAN_SEAT_UPDATED_SUCCESS_MSG =
  'Company plan seat saved successfully';

/** PUT plan-seats when `corporation_companies.subscription_status` is active (early return, no upsert). */
export const COMPANY_PLAN_SEAT_ACTIVE_SUBSCRIPTION_SKIP_MSG =
  'Plan seat cannot be changed while the company has an active subscription.';
export const COMPANY_CONFIGURATION_UPDATED_SUCCESS_MSG =
  'Company configuration saved successfully';
export const COMPANY_BRAND_LOGO_DELETED_SUCCESS_MSG =
  'Company brand logo deleted successfully';
export const COMPANY_CONFIRMATION_SUCCESS_MSG =
  'Company confirmation completed successfully';

export const COMPANY_SUSPENDED_SUCCESS_MSG = 'Company suspended successfully';

export const COMPANY_ALREADY_SUSPENDED_MSG =
  'This company is already suspended; action disabled';

export const COMPANY_SUSPEND_REQUIRES_ACTIVE_MSG =
  'Only active companies can be suspended.';

export const COMPANY_SUSPEND_FAILED_MSG =
  'Failed to suspend company. Please try again later.';

/** Logged when Cognito sign-out or disable fails (excluding user-not-found) during company suspend. */
export const COMPANY_SUSPEND_COGNITO_ERROR_LOG_MSG =
  'Company suspend: Cognito sign-out or disable failed';

/** Logged when the post-Cognito DB transaction fails during company suspend. */
export const COMPANY_SUSPEND_DB_TRANSACTION_ERROR_LOG_MSG =
  'Company suspend: database transaction failed after Cognito updates';

export const COMPANY_SUBSCRIPTION_LAPSE_DISABLE_LOG_MSG =
  'Company end users disabled after subscription lapse';

export const COMPANY_SUBSCRIPTION_RESTORE_ENABLE_LOG_MSG =
  'Company end users re-enabled after subscription restored';

export const COMPANY_REINSTATED_SUCCESS_MSG = 'Company reinstated successfully';

export const COMPANY_ALREADY_ACTIVE_REINSTATE_MSG =
  'This company is already active; reinstate is not allowed.';

export const COMPANY_REINSTATE_NOT_SUSPENDED_MSG =
  'Company can only be reinstated when status is suspended.';

export const COMPANY_REINSTATE_CORPORATION_SUSPENDED_MSG =
  'Company cannot be reinstated while its corporation is suspended.';

export const COMPANY_REINSTATE_FAILED_MSG =
  'Failed to reinstate company. Please try again later.';

/** Logged when Cognito enable fails (excluding user-not-found) during company reinstate. */
export const COMPANY_REINSTATE_COGNITO_ERROR_LOG_MSG =
  'Company reinstate: Cognito enable failed';

/** Logged when the DB transaction fails during company reinstate. */
export const COMPANY_REINSTATE_DB_TRANSACTION_ERROR_LOG_MSG =
  'Company reinstate: database transaction failed';

export const COMPANY_PLAN_SEAT_AMOUNTS_NON_NEGATIVE_MSG =
  'planPrice, discount, and invoiceAmount must not be negative';

export const COMPANY_PLAN_SEAT_DISCOUNT_EXCEEDS_PLAN_PRICE_MSG =
  'discount cannot exceed planPrice';

export const COMPANY_PLAN_SEAT_TRIAL_DATES_BOTH_OR_OMIT_MSG =
  'When zeroTrial is true, provide both trialStartDate and trialEndDate or omit both';

export const COMPANY_PLAN_SEAT_TRIAL_END_ON_OR_AFTER_START_MSG =
  'trialEndDate must be on or after trialStartDate';

export const COMPANY_PLAN_SEAT_TRIAL_DATES_REQUIRED_WHEN_NOT_ZERO_TRIAL_MSG =
  'trialStartDate and trialEndDate are required when zeroTrial is false';

export const NO_COMPANY_ACCESS_FOUND_MESSAGE =
  'No company access found for this account';

export const NO_ACCESS_TO_COMPANY_MESSAGE =
  'You do not have access to this company';

export const COMPANY_NOT_FOUND_MESSAGE = 'Company not found';

export const NO_SUBSCRIPTION_PLAN_ASSIGNED_TO_COMPANY_MESSAGE =
  'No subscription plan is assigned to this company';

export const ONSITE_TRAINING_OPTION_LOCKED_FOR_COMPANY_MSG =
  'Onsite training option is locked for this company and cannot be changed.';

export const COMPANY_ADMIN_ACCESS_NOT_FOUND_FOR_UPDATE_MSG =
  'No company admin was found for this company; cannot update admin profile fields.';

/** Step 1 PATCH: request `sameAsCorpAdmin` must match the value stored on the company (it cannot be changed here). */
export const SAME_AS_CORP_ADMIN_MISMATCH_STEP1_MSG =
  'sameAsCorpAdmin cannot be updated via Step 1; omit it or send the same value as stored on the company.';

/** Step 1 PATCH: company shares the corporation admin account — admin profile fields are not editable here. */
export const COMPANY_ADMIN_PROFILE_FIELDS_NOT_EDITABLE_SAME_AS_CORP_STEP1_MSG =
  'Company admin profile fields cannot be updated while the company uses the same admin as the corporation.';

/** Step 1 PATCH: class-validator message when `sameAsCorpAdmin: true` is sent with admin profile fields. */
export const STEP1_ADMIN_FIELDS_DISALLOWED_WHEN_SAME_AS_CORP_MSG =
  'When sameAsCorpAdmin is true, firstName, lastName, jobRole, nickname, workPhone, and cellPhone must not be sent.';

export const COMPANY_STEP1_PATCH_AT_LEAST_ONE_FIELD_MSG =
  'At least one field must be provided to update.';

/** Stored in `app_users.user_type` for company administrators created from company onboarding */
export const COMPANY_ADMIN_APP_USER_TYPE = 'comp_admin';

/** Seeded `roles.name` for company admin permissions */
export const COMPANY_ADMIN_ROLE_NAME = 'Company Admin';

export const COMPANY_ADMIN_ROLE_NOT_CONFIGURED_MSG = `Role "${COMPANY_ADMIN_ROLE_NAME}" is not configured; seed roles before adding companies.`;

export const NO_CORPORATION_ADMIN_APP_USER_MSG =
  'No corporation admin app user was found for this corporation. Complete corporation admin onboarding or set company admin details.';

export const COMPANY_DASHBOARD_ANALYTICS_SUCCESS_MSG =
  'Company dashboard analytics fetched successfully.';
export const COMPANY_DASHBOARD_ANALYTICS_FORBIDDEN_MSG =
  'You do not have permission to view company dashboard analytics.';
export const COMPANY_DASHBOARD_ANALYTICS_FETCH_FAILED_LOG =
  'getDashboardAnalyticsForCompanyAdmin failed';
