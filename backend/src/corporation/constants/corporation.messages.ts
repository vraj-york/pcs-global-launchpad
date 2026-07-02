// Success messages
export const CORPORATION_CREATED_SUCCESS_MSG =
  'Corporation created successfully';
export const CORPORATION_UPDATED_SUCCESS_MSG =
  'Corporation updated successfully';
export const CORPORATION_STEPS_UPDATED_SUCCESS_MSG =
  'Corporation steps updated successfully';
export const CORPORATION_FETCHED_SUCCESS_MSG =
  'Corporation details fetched successfully';
export const CORPORATION_LIST_FETCHED_SUCCESS_MSG =
  'Corporation list fetched successfully';
export const CORPORATION_ACTIVE_LIST_FETCHED_SUCCESS_MSG =
  'Active corporation list fetched successfully';
export const CORPORATION_ALL_FETCHED_SUCCESS_MSG =
  'All corporations fetched successfully';

/** Logged when GET /corporations/all fails. */
export const CORPORATION_ALL_FETCH_ERROR_LOG_MSG =
  'Error fetching all corporations';
export const CORPORATION_BRAND_LOGO_UPLOADED_SUCCESS_MSG =
  'Brand logo uploaded successfully';
export const CORPORATION_BRAND_LOGO_DELETED_SUCCESS_MSG =
  'Brand logo deleted successfully';
export const CORPORATION_KEY_CONTACT_UPSERTED_SUCCESS_MSG =
  'Key contact updated successfully';
export const CORPORATION_KEY_CONTACT_DELETED_SUCCESS_MSG =
  'Key contact removed successfully';
export const CORPORATION_REINSTATED_SUCCESS_MSG =
  'Corporation reinstated successfully';
export const CORPORATION_CLOSED_SUCCESS_MSG = 'Corporation closed successfully';
export const CORPORATION_SUSPENDED_SUCCESS_MSG =
  'Corporation suspended successfully';

// Reinstate validation
export const CORPORATION_REINSTATE_NOT_SUSPENDED_MSG =
  'Corporation can only be reinstated when status is suspended';

export const CORPORATION_REINSTATE_FAILED_MSG =
  'Failed to reinstate corporation. Please try again later.';

/** Logged when Cognito enable fails during corporation reinstate. */
export const CORPORATION_REINSTATE_COGNITO_ERROR_LOG_MSG =
  'Corporation reinstate: Cognito enable failed';

/** Logged when the DB transaction fails during corporation reinstate. */
export const CORPORATION_REINSTATE_DB_TRANSACTION_ERROR_LOG_MSG =
  'Corporation reinstate: database transaction failed';

// Corporation admin app role (must match seeded `roles.name`)
export const CORPORATION_ADMIN_ROLE_NAME = 'Corporation Admin';

export const CORPORATION_ADMIN_ROLE_NOT_CONFIGURED_MSG = `Role "${CORPORATION_ADMIN_ROLE_NAME}" is not configured; seed roles before creating corporations.`;

/** Stored in `app_users.user_type` when onboarding corporation admin */
export const CORPORATION_ADMIN_APP_USER_TYPE = 'corp_admin';

/** Stored in `app_users.invite_type` when onboarding corporation admin */
export const CORPORATION_ADMIN_APP_INVITE_TYPE = 'BSPBlueprint';

/** Shown in corporation admin invite email (matches product branding). */
export const CORPORATION_ADMIN_INVITE_SENDER_LABEL = 'BSPBlueprint Platform';

export const CORPORATION_ADMIN_INVITE_SUBJECT =
  'Invitation to BSPBlueprint Platform';

export const CORPORATION_ADMIN_INVITE_EMAIL_FAILED_MESSAGE =
  'Corporation was activated but the invitation email could not be sent. Please try again.';

// Suspend/close validation
export const CORPORATION_ALREADY_SUSPENDED_MSG =
  'This corporation is already suspended.';
export const CORPORATION_CANNOT_SUSPEND_CLOSED_MSG =
  'This corporation is closed and cannot be suspended.';
export const CORPORATION_ALREADY_CLOSED_MSG =
  'This corporation is already closed.';
export const CORPORATION_CANNOT_UPDATE_CLOSED_MSG =
  'Cannot update a corporation with closed status.';

export const CORPORATION_SUSPEND_FAILED_MSG =
  'Failed to suspend corporation. Please try again later.';

/** Logged when Cognito sign-out or disable fails during corporation suspend. */
export const CORPORATION_SUSPEND_COGNITO_ERROR_LOG_MSG =
  'Corporation suspend: Cognito sign-out or disable failed';

/** Logged when the DB transaction fails during corporation suspend. */
export const CORPORATION_SUSPEND_DB_TRANSACTION_ERROR_LOG_MSG =
  'Corporation suspend: database transaction failed';

export const CORPORATION_CLOSE_FAILED_MSG =
  'Failed to close corporation. Please try again later.';

/** Logged when Cognito sign-out or disable fails during corporation close. */
export const CORPORATION_CLOSE_COGNITO_ERROR_LOG_MSG =
  'Corporation close: Cognito sign-out or disable failed';

/** Logged when the DB transaction fails during corporation close. */
export const CORPORATION_CLOSE_DB_TRANSACTION_ERROR_LOG_MSG =
  'Corporation close: database transaction failed';

/** Logged when Stripe subscription cancel fails for a company during corporation close. */
export const CORPORATION_CLOSE_SUBSCRIPTION_CANCEL_FAILED_LOG_MSG =
  'Corporation close: company subscription cancel failed';

/** Logged when subscription cancel is skipped for a company during corporation close. */
export const CORPORATION_CLOSE_SUBSCRIPTION_CANCEL_SKIPPED_LOG_MSG =
  'Corporation close: company subscription cancel skipped';

/** GET corporations/:id — caller is neither SuperAdmin nor CorporationAdmin. */
export const CORPORATION_DETAIL_FORBIDDEN_MSG =
  'You do not have permission to view this corporation.';
/** CorporationAdmin has no linked corporation on `app_users.corporation_id`. */
export const CORPORATION_DETAIL_CORP_ADMIN_UNASSIGNED_MSG =
  'No corporation is linked to this account.';
/** CorporationAdmin requested a corporation other than their own. */
export const CORPORATION_DETAIL_CORP_ADMIN_WRONG_CORP_MSG =
  'You may only view your own corporation. Use your corporation ID or "me" in the path.';
/** SuperAdmin must pass the corporation UUID; `me` is reserved for corporation admins. */
export const CORPORATION_DETAIL_SUPER_ADMIN_ME_PATH_MSG =
  'SuperAdmin requests must use the corporation UUID, not "me".';

export const CORPORATION_DASHBOARD_ANALYTICS_SUCCESS_MSG =
  'Corporation dashboard analytics fetched successfully.';
export const CORPORATION_DASHBOARD_ANALYTICS_FORBIDDEN_MSG =
  'You do not have permission to view corporation dashboard analytics.';
export const CORPORATION_DASHBOARD_ANALYTICS_FETCH_FAILED_LOG =
  'getDashboardAnalyticsForRequester failed';

// Brand logo validation messages
export const BRAND_LOGO_FILE_REQUIRED_MSG = 'Logo file is required';
export const BRAND_LOGO_SINGLE_FILE_ONLY_MSG = 'Only one file is allowed';
export const BRAND_LOGO_INVALID_TYPE_MSG = 'Logo must be a PNG or JPG file';
export const BRAND_LOGO_MAX_SIZE_MSG = (maxMb: number) =>
  `Logo size must not exceed ${maxMb} MB`;
