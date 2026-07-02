/** Fixed assessment label shown on Super Admin Send Invite (Invite Management). */
export const ASSESSMENT_INVITE_TYPE_LABEL = '60-Question (Full)';

export const ASSESSMENT_INVITE_OPTIONS_FETCHED_MSG =
  'Assessment invite options fetched successfully.';

export const ASSESSMENT_INVITE_SENT_MSG =
  'Assessment invitation sent successfully.';

export const ASSESSMENT_INVITE_FORBIDDEN_MSG =
  'You do not have permission to send assessment invitations.';

export const ASSESSMENT_INVITE_PROMO_REQUIRED_MSG =
  'Promo code is required when Has Promo Code is enabled.';

export const ASSESSMENT_INVITE_PROMO_INVALID_MSG =
  'Promo code is invalid or expired.';

export const ASSESSMENT_INVITE_ACCESS_DENIED_LOG_MSG =
  'Assessment invite access denied: caller is not SuperAdmin';

export const ASSESSMENT_INVITE_PROMO_REQUIRED_LOG_MSG =
  'Assessment invite rejected: promo code required but missing';

export const ASSESSMENT_INVITE_PROMO_REJECTED_LOG_MSG =
  'Assessment invite rejected: promo code not eligible for individual assessment';

export const ASSESSMENT_INVITE_LIST_FETCHED_MSG =
  'Assessment invites fetched successfully.';

export const ASSESSMENT_INVITE_LIST_FAILED_MSG =
  'Failed to fetch assessment invites. Please try again later.';

export const ASSESSMENT_INVITE_LIST_FETCH_ERROR_LOG_MSG =
  'Error fetching assessment invites list';

export const ASSESSMENT_INVITE_LIST_INVITEE_TYPE_LABEL = 'User';

/** Total option-level responses when an assessment is fully answered (60 × 4). */
export const ASSESSMENT_INVITE_TOTAL_RESPONSE_COUNT = 240;

export const ASSESSMENT_INVITE_LIST_STATUS_FILTER = [
  'invited',
  'in_progress',
  'completed',
  'expired',
] as const;

export type AssessmentInviteListStatusFilter =
  (typeof ASSESSMENT_INVITE_LIST_STATUS_FILTER)[number];

export const ASSESSMENT_INVITE_LIST_SORT_BY = [
  'name',
  'inviteeType',
  'status',
  'progress',
  'invitedOn',
  'lastActivity',
] as const;

export type AssessmentInviteListSortBy =
  (typeof ASSESSMENT_INVITE_LIST_SORT_BY)[number];

export const ASSESSMENT_INVITE_LIST_SORT_ORDER = ['asc', 'desc'] as const;

export type AssessmentInviteListSortOrder =
  (typeof ASSESSMENT_INVITE_LIST_SORT_ORDER)[number];

export type AssessmentInviteLifecycleStatus =
  | 'invited'
  | 'in_progress'
  | 'completed'
  | 'expired';
