export const APP_USERS_LIST_FETCHED_SUCCESS_MSG = 'Users fetched successfully.';
export const APP_USERS_LIST_FAILED_MSG =
  'Failed to fetch users. Please try again later.';
export const APP_USERS_LIST_FETCH_ERROR_LOG_MSG = 'Error fetching users list';

/** GET /users — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const APP_USERS_LIST_FORBIDDEN_MSG =
  'You do not have permission to view users.';

/** CompanyAdmin has no admin `user_company_access` on a non-deleted company. */
export const APP_USERS_LIST_COMPANY_ADMIN_UNASSIGNED_MSG =
  'No company is linked to this account as company admin.';

/** CompanyAdmin requested `companyIds` outside their admin companies. */
export const APP_USERS_LIST_COMPANY_ADMIN_WRONG_COMPANY_MSG =
  'You may only view users for your assigned company.';

/** CorporationAdmin requested `corporationIds` or companies outside their corporation. */
export const APP_USERS_LIST_CORP_ADMIN_WRONG_CORP_MSG =
  'You may only view users under your corporation.';

/** CompanyAdmin requested `corporationIds` outside their assigned companies. */
export const APP_USERS_LIST_COMPANY_ADMIN_WRONG_CORP_MSG =
  'You may only filter users by corporations for your assigned company.';

export const APP_USER_VIEW_FETCHED_SUCCESS_MSG =
  'User details fetched successfully.';
/** GET /users/:cognitoSub — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const APP_USER_VIEW_FORBIDDEN_MSG =
  'You do not have permission to view user details.';
export const APP_USER_VIEW_FAILED_MSG =
  'Failed to fetch user details. Please try again later.';
export const APP_USER_VIEW_FETCH_ERROR_LOG_MSG =
  'Error fetching app user by user code';
export const APP_USER_SELF_PROFILE_FETCHED_SUCCESS_MSG =
  'Current user profile fetched successfully.';
export const APP_USER_SELF_PROFILE_FETCH_FAILED_MSG =
  'Failed to fetch current user profile. Please try again later.';
export const APP_USER_SELF_PROFILE_FETCH_ERROR_LOG_MSG =
  'Error fetching current user profile';
export const APP_USER_SELF_PROFILE_UPDATED_MSG =
  'Your profile was updated successfully.';
export const APP_USER_SELF_PROFILE_UPDATE_FAILED_MSG =
  'Failed to update your profile. Please try again later.';
export const APP_USER_SELF_PROFILE_UPDATE_ERROR_LOG_MSG =
  'Error updating current user profile';
export const APP_USER_AVATAR_UPLOADED_SUCCESS_MSG =
  'Avatar uploaded successfully.';
export const APP_USER_AVATAR_UPLOAD_FAILED_MSG =
  'Failed to upload avatar. Please try again later.';
export const APP_USER_AVATAR_UPLOAD_ERROR_LOG_MSG =
  'Error uploading current user avatar';
export const APP_USER_AVATAR_DELETED_SUCCESS_MSG =
  'Avatar deleted successfully.';
export const APP_USER_AVATAR_DELETE_FAILED_MSG =
  'Failed to delete avatar. Please try again later.';
export const APP_USER_AVATAR_DELETE_ERROR_LOG_MSG =
  'Error deleting current user avatar';
export const APP_USER_AVATAR_FILE_REQUIRED_MSG = 'Avatar file is required';
export const APP_USER_AVATAR_SINGLE_FILE_ONLY_MSG = 'Only one file is allowed';
export const APP_USER_AVATAR_INVALID_TYPE_MSG =
  'Avatar must be a PNG or JPG file';
export const APP_USER_AVATAR_MAX_SIZE_MSG = (maxMb: number) =>
  `Avatar must be ${maxMb} MB or smaller`;
export const APP_USER_ANALYTICS_CONTEXT_FAILED_MSG =
  'Failed to load analytics context. Please try again later.';
/** BSP assessment score contexts included in the peer mention compact summary. */
export const PEER_MENTION_CONTEXTS = [
  'overall',
  'professional_typical',
  'professional_stressful',
  'personal_typical',
  'personal_stressful',
] as const;

export const APP_USER_PEER_MENTIONS_FETCHED_SUCCESS_MSG =
  'Peer mention suggestions fetched successfully.';
export const APP_USER_PEER_MENTIONS_RESOLVED_SUCCESS_MSG =
  'Peer mentions resolved successfully.';
export const APP_USER_PEER_MENTIONS_FETCH_FAILED_MSG =
  'Failed to fetch peer mention suggestions. Please try again later.';
export const APP_USER_PEER_MENTIONS_RESOLVE_FAILED_MSG =
  'Failed to resolve peer mentions. Please try again later.';
export const APP_USER_CHATBOT_PERSONALIZATION_FETCHED_SUCCESS_MSG =
  'Chatbot personalization context fetched successfully.';
export const APP_USER_CHATBOT_PERSONALIZATION_FETCH_FAILED_MSG =
  'Failed to fetch chatbot personalization context. Please try again later.';
export const APP_USER_CHATBOT_PERSONALIZATION_FETCH_ERROR_LOG_MSG =
  'Error fetching chatbot personalization context';
export const APP_USER_NOT_FOUND_MSG = 'User not found.';

export const APP_USER_BLOCK_STATUS_UPDATED_MSG =
  'User is blocked/unblocked successfully.';
export const APP_USER_BLOCK_STATUS_FAILED_MSG =
  'Failed to update user status. Please try again later.';
export const APP_USER_BLOCK_STATUS_UPDATE_ERROR_LOG_MSG =
  'Error updating app user status';

/** PATCH /users/:cognitoSub/block — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const APP_USER_BLOCK_FORBIDDEN_MSG =
  'You do not have permission to block or unblock users.';

/** PATCH /users/:cognitoSub/block — target user's corporation or a linked company is suspended or closed. */
export const APP_USER_BLOCK_ORG_SUSPENDED_MSG =
  'This user cannot be unblocked while their corporation or company is suspended or closed.';

/** PATCH /users/:cognitoSub/block — target `app_users.user_type` is super_admin. */
export const APP_USER_BLOCK_SUPER_ADMIN_NOT_ALLOWED_MSG =
  'Super Admin users cannot be blocked or unblocked.';

export const APP_USER_INVITATION_CANCELED_MSG =
  'Invitation cancelled successfully.';
/** PATCH /users/:cognitoSub/invitation/cancel — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const APP_USER_INVITATION_CANCEL_FORBIDDEN_MSG =
  'You do not have permission to cancel user invitations.';
export const APP_USER_INVITATION_CANCEL_FAILED_MSG =
  'Failed to cancel invitation. Please try again later.';
export const APP_USER_INVITATION_CANCEL_ERROR_LOG_MSG =
  'Error canceling app user invitation';
export const APP_USER_INVITATION_CANCEL_NOT_PENDING_MSG =
  'Only a pending invitation can be cancelled.';
export const APP_USER_INVITATION_RESENT_MSG = 'Invitation resent successfully.';
/** POST /users/:cognitoSub/invitation/resend — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const APP_USER_INVITATION_RESEND_FORBIDDEN_MSG =
  'You do not have permission to resend user invitations.';
export const APP_USER_INVITATION_RESEND_FAILED_MSG =
  'Failed to resend invitation. Please try again later.';
export const APP_USER_INVITATION_RESEND_ERROR_LOG_MSG =
  'Error resending app user invitation';
export const APP_USER_INVITATION_RESEND_NOT_PENDING_MSG =
  'Invitation can only be resent for users in Pending or Cancelled or Expired status.';
export const APP_USER_INVITATION_RESEND_EMAIL_MISSING_MSG =
  'User email is missing; cannot resend invitation.';
export const APP_USER_INVITATION_RESEND_EMAIL_FAILED_MSG =
  'Failed to send invitation email. Please try again later.';

/** If DB status is Pending and `invitation_sent_at` is older than this many days, view APIs return runtime status `Expired`. */
export const APP_USER_INVITE_PENDING_EXPIRY_DAYS = 7;
/** Precomputed from {@link APP_USER_INVITE_PENDING_EXPIRY_DAYS} to avoid per-call multiplies. */
export const APP_USER_INVITE_PENDING_EXPIRY_MS =
  APP_USER_INVITE_PENDING_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export const APP_USER_SOFT_DELETED_MSG = 'User deleted successfully.';
/** DELETE /users/:cognitoSub — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const APP_USER_SOFT_DELETE_FORBIDDEN_MSG =
  'You do not have permission to delete users.';
export const APP_USER_SOFT_DELETE_FAILED_MSG =
  'Failed to delete user. Please try again later.';
/** DELETE /users/:cognitoSub — target user is Corporation Admin or Company Admin. */
export const APP_USER_SOFT_DELETE_CORP_COMPANY_ADMIN_NOT_ALLOWED_MSG =
  'Corporation Admin and Company Admin users cannot be removed from the user directory.';

/** DELETE /users/:cognitoSub — target `app_users.user_type` is super_admin. */
export const APP_USER_SOFT_DELETE_SUPER_ADMIN_NOT_ALLOWED_MSG =
  'Super Admin users cannot be removed from the user directory.';
export const APP_USER_SOFT_DELETE_ERROR_LOG_MSG =
  'Error soft-deleting app user';

export const APP_USER_UPDATED_MSG = 'User updated successfully.';
/** PATCH /users/:cognitoSub — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const APP_USER_UPDATE_FORBIDDEN_MSG =
  'You do not have permission to update users.';
export const APP_USER_UPDATE_FAILED_MSG =
  'Failed to update user. Please try again later.';
export const APP_USER_UPDATE_ERROR_LOG_MSG = 'Error updating app user';
export const APP_USER_UPDATE_EMPTY_BODY_MSG =
  'At least one field must be provided.';
export const APP_USER_UPDATE_INVALID_ROLE_MSG = 'Invalid role.';
export const APP_USER_UPDATE_ROLE_CHANGE_NOT_ALLOWED_CORP_COMPANY_ADMIN_MSG =
  'The role cannot be changed for Corporation Admin or Company Admin users.';
export const APP_USER_UPDATE_CANNOT_ASSIGN_CORP_COMPANY_ADMIN_MSG =
  'Cannot assign Corporation Admin or Company Admin role through user edit.';

/** PATCH /users/:cognitoSub — status cannot be set to Active while org is suspended or closed. */
export const APP_USER_UPDATE_ACTIVE_ORG_SUSPENDED_MSG =
  'This user cannot be set to Active while their corporation or company is suspended or closed.';

/** PATCH /users/:cognitoSub — target `app_users.user_type` is super_admin. */
export const APP_USER_UPDATE_SUPER_ADMIN_NOT_ALLOWED_MSG =
  'Super Admin users cannot be updated.';

/** Stored in `app_users.status` (Title case; matches Prisma default and list filters). */
export const APP_USER_STATUS = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  BLOCKED: 'Blocked',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
} as const;

export type AppUserStatus =
  (typeof APP_USER_STATUS)[keyof typeof APP_USER_STATUS];

/** Stored in `app_users.user_type` for pool super administrators; excluded from GET /users list. */
export const SUPER_ADMIN_APP_USER_TYPE = 'super_admin';

/** Stored in `app_users.user_type` for Super Admin–provisioned B2C individual users; excluded from GET /users list. */
export const INDIVIDUAL_APP_USER_TYPE = 'individual';

/** Values for invite user API (`app_users.invite_type`). */
export const APP_USER_INVITE_TYPE = {
  BSP_BLUEPRINT: 'BSPBlueprint',
  /** Assessment-only access; not scoped to a corporation company (no seat check). */
  ASSESSMENT_ONLY: 'Assessment Only',
} as const;

export type AppUserInviteTypeName =
  (typeof APP_USER_INVITE_TYPE)[keyof typeof APP_USER_INVITE_TYPE];

/** POST /users/invite — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const APP_USER_INVITE_FORBIDDEN_MSG =
  'You do not have permission to invite users.';
/** POST /users/invite — CorporationAdmin BSPBlueprint invite outside their corporation. */
export const APP_USER_INVITE_CORP_ADMIN_WRONG_CORP_MSG =
  'You may only invite users under your corporation.';
/** POST /users/invite — CompanyAdmin BSPBlueprint invite outside their admin companies. */
export const APP_USER_INVITE_COMPANY_ADMIN_WRONG_COMPANY_MSG =
  'You may only invite users for your assigned company.';
/** POST /users/invite — CompanyAdmin BSPBlueprint corporation outside their assigned companies. */
export const APP_USER_INVITE_COMPANY_ADMIN_WRONG_CORP_MSG =
  'You may only invite users under corporations for your assigned company.';

export const APP_USER_INVITE_DUPLICATE_EMAIL_MSG =
  'A user with this email already exists.';
export const APP_USER_INVITE_COMPANY_NOT_FOUND_MSG =
  'Company was not found or is not available.';
export const APP_USER_INVITE_COMPANY_NO_PLAN_MSG =
  'Company does not have a pricing plan; cannot verify seat capacity.';
export const APP_USER_INVITE_PLAN_SEAT_EXCEEDED_MSG =
  'This company has reached the maximum number of users allowed by its plan.';
export const APP_USER_INVITE_INVALID_END_USER_ROLE_MSG =
  'Cannot assign Corporation Admin or Company Admin role through invite user.';
export const APP_USER_INVITE_SUCCESS_MSG = 'User invited successfully.';
export const APP_USER_INVITE_EMAIL_FAILED_MSG =
  'User was created but the invitation email could not be sent. Please try again.';

/** Allowed request `type` values for PATCH /users/me/onboarding-steps. */
export const APP_USER_ONBOARDING_STEP_TYPE = {
  CONSENT: 'consent',
  INTRO_VIDEO: 'intro_video',
} as const;

export type AppUserOnboardingStepType =
  (typeof APP_USER_ONBOARDING_STEP_TYPE)[keyof typeof APP_USER_ONBOARDING_STEP_TYPE];

/** Maps onboarding request `type` to `app_users.completed_onboarding_steps`. */
export const APP_USER_ONBOARDING_STEP_BY_TYPE: Record<
  AppUserOnboardingStepType,
  number
> = {
  [APP_USER_ONBOARDING_STEP_TYPE.CONSENT]: 1,
  [APP_USER_ONBOARDING_STEP_TYPE.INTRO_VIDEO]: 2,
};

export const APP_USER_ONBOARDING_STEP_UPDATED_MSG =
  'Onboarding step updated successfully.';
export const APP_USER_ONBOARDING_STEP_UPDATE_FAILED_MSG =
  'Failed to update onboarding step. Please try again later.';
export const APP_USER_ONBOARDING_STEP_UPDATE_ERROR_LOG_MSG =
  'Error updating onboarding step';
export const APP_USER_ONBOARDING_CONSENT_EMAIL_SUBJECT =
  'Welcome aboard! Your BSP journey starts now.';
export const APP_USER_ONBOARDING_CONSENT_EMAIL_SEND_FAILED_LOG_MSG =
  'Onboarding consent email could not be sent';

/** Subject line for end-user invite emails (SES). */
export const APP_USER_INVITE_EMAIL_SUBJECT =
  "You're invited to join BSPBlueprint";

/** Maximum rows accepted per bulk invite (CSV upload and bulk invite payload). */
export const APP_USER_BULK_INVITE_MAX_USERS = 1000;

/**
 * How many Assessment Only invites run at once during bulk import. Unbounded concurrency hits
 * Cognito rate limits and Prisma transaction / pool limits on large CSVs.
 */
export const APP_USER_BULK_INVITE_ASSESSMENT_ONLY_CONCURRENCY = 8;

export const APP_USER_BULK_INVITE_MAX_ROWS_EXCEEDED_MSG =
  'The number of users in this import exceeds the allowed maximum for one request.';

export const APP_USER_BULK_INVITE_COMPLETED_MSG = 'Bulk user invite completed.';

export const APP_USER_BULK_INVITE_ROW_DUPLICATE_EMAIL_IN_FILE_MSG =
  'Duplicate email in this import file.';
export const APP_USER_BULK_INVITE_ROW_CORPORATION_NOT_RESOLVED_MSG =
  'No corporation matched the given corporationName.';
export const APP_USER_BULK_INVITE_ROW_CORPORATION_AMBIGUOUS_MSG =
  'Multiple corporations matched the given corporationName.';
export const APP_USER_BULK_INVITE_ROW_COMPANY_NOT_RESOLVED_MSG =
  'No company matched the given companyName under that corporation.';
export const APP_USER_BULK_INVITE_ROW_COMPANY_AMBIGUOUS_MSG =
  'Multiple companies matched the given companyName under that corporation.';
export const APP_USER_BULK_INVITE_ROW_CATEGORY_NOT_RESOLVED_MSG =
  'No role category matched the given categoryName.';
export const APP_USER_BULK_INVITE_ROW_ROLE_NOT_RESOLVED_MSG =
  'No role matched the given roleName for that category.';
