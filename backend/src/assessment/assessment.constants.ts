/** Max recipient emails per share-report request (matches invoice bulk send cap). */
export const ASSESSMENT_REPORT_SHARE_MAX_RECIPIENTS = 20;

export const ASSESSMENT_REPORT_SHARE_EMAIL_SUBJECT =
  'BSPBlueprint Behavioral Assessment Result';

export const ASSESSMENT_REPORT_SHARE_SENT_MSG =
  'Assessment result shared successfully.';

export const ASSESSMENT_REPORT_NOT_FOUND_MSG = 'Assessment report not found.';

export const ASSESSMENT_REPORT_NOT_READY_MSG =
  'Assessment report is not ready to share yet.';

export const ASSESSMENT_REPORT_FORBIDDEN_MSG =
  'You do not have access to this assessment.';

export const ASSESSMENT_REPORTS_BUCKET_MISSING_MSG =
  'Assessment report storage is not configured.';

export const ASSESSMENT_LIST_FETCHED_MSG = 'Assessments fetched successfully.';

/** @deprecated Use {@link ASSESSMENT_LIST_FETCHED_MSG}. */
export const ASSESSMENT_ADMIN_LIST_FETCHED_MSG = ASSESSMENT_LIST_FETCHED_MSG;

export const ASSESSMENT_LIST_FAILED_MSG =
  'Failed to fetch assessments. Please try again later.';

/** @deprecated Use {@link ASSESSMENT_LIST_FAILED_MSG}. */
export const ASSESSMENT_ADMIN_LIST_FAILED_MSG = ASSESSMENT_LIST_FAILED_MSG;

export const ASSESSMENT_LIST_FETCH_ERROR_LOG_MSG =
  'Failed to fetch assessment list';

/** @deprecated Use {@link ASSESSMENT_LIST_FETCH_ERROR_LOG_MSG}. */
export const ASSESSMENT_ADMIN_LIST_FETCH_ERROR_LOG_MSG =
  ASSESSMENT_LIST_FETCH_ERROR_LOG_MSG;

/** Display status values returned by the assessment list API and accepted as `status` filter. */
export const ASSESSMENT_LIST_STATUS_FILTER = [
  'complete',
  'incomplete',
] as const;

export type AssessmentListStatusFilter =
  (typeof ASSESSMENT_LIST_STATUS_FILTER)[number];

export type AssessmentListDisplayStatus = AssessmentListStatusFilter;

export const ASSESSMENT_LIST_SORT_BY = [
  'assessmentName',
  'startedAt',
  'completedAt',
  'status',
] as const;

/** Prefix for list item `assessmentName` (e.g. "Assessment 1"). */
export const ASSESSMENT_LIST_NAME_PREFIX = 'Assessment';

export function formatAssessmentListName(index: number): string {
  return `${ASSESSMENT_LIST_NAME_PREFIX} ${index}`;
}

export type AssessmentListSortBy = (typeof ASSESSMENT_LIST_SORT_BY)[number];

export const ASSESSMENT_LIST_SORT_ORDER = ['asc', 'desc'] as const;

export type AssessmentListSortOrder =
  (typeof ASSESSMENT_LIST_SORT_ORDER)[number];

/** @deprecated Use {@link ASSESSMENT_LIST_STATUS_FILTER}. */
export const ASSESSMENT_ADMIN_LIST_STATUS_FILTER =
  ASSESSMENT_LIST_STATUS_FILTER;

/** @deprecated Use {@link AssessmentListStatusFilter}. */
export type AssessmentAdminListStatusFilter = AssessmentListStatusFilter;

export const ASSESSMENT_USER_LIST_FETCHED_MSG =
  'Your assessments fetched successfully.';

export const ASSESSMENT_LIST_BY_USER_FETCHED_MSG =
  'User assessments fetched successfully.';

/** GET /assessments/users/:cognitoSub — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const ASSESSMENT_LIST_BY_USER_FORBIDDEN_MSG =
  'You do not have permission to view user assessments.';

/** Target user has no user_company_access row (individual assessment user); only SuperAdmin may list. */
export const ASSESSMENT_LIST_INDIVIDUAL_USER_FORBIDDEN_MSG =
  'You may only view assessments for individual assessment users as Super Admin.';
