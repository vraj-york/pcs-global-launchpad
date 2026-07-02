/** Stored on `app_user_bulk_invite_jobs.status`. */
export const APP_USER_BULK_INVITE_JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type AppUserBulkInviteJobStatusName =
  (typeof APP_USER_BULK_INVITE_JOB_STATUS)[keyof typeof APP_USER_BULK_INVITE_JOB_STATUS];

export const APP_USER_BULK_INVITE_JOB_ENQUEUED_MSG =
  "We're processing your file. You'll be notified via email with a summary once the upload is complete.";
export const APP_USER_BULK_INVITE_JOB_FETCHED_MSG =
  'Bulk invite job status retrieved successfully.';
export const APP_USER_BULK_INVITE_JOB_NOT_FOUND_MSG =
  'Bulk invite job not found.';
/** Bulk invite CSV endpoints — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const APP_USER_BULK_INVITE_JOB_FORBIDDEN_MSG =
  'You do not have permission to perform bulk user invites.';
export const APP_USER_BULK_INVITE_JOB_ENQUEUE_ERROR_LOG_MSG =
  'Error enqueueing app user bulk invite CSV job';
export const APP_USER_BULK_INVITE_JOB_PROCESS_ERROR_LOG_MSG =
  'Error processing app user bulk invite CSV job';

/** Template 1 — full success (no failures). */
export const APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUBJECT_SUCCESS =
  'Employee upload completed';

/** Template 2 — partial success. */
export const APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUBJECT_WITH_ERRORS =
  'Employee upload completed with errors';

/** Template 3 — every data row failed (job still `completed`). */
export const APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUBJECT_ALL_FAILED =
  'Employee upload failed';

/** Interpolate `{record_count}` with the number of successfully added records. */
export const APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUCCESS_RECORDS_LINE =
  'Your employee file has been processed successfully. {record_count} records have been added.';

export const APP_USER_BULK_INVITE_COMPLETION_EMAIL_VIEW_EMPLOYEES_LABEL =
  'View employees:';

export const APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUPPORT_FOOTER =
  'If you need assistance, contact your support team.';

export const APP_USER_BULK_INVITE_COMPLETION_EMAIL_PARTIAL_INTRO =
  'Your employee file has been processed. Some records could not be added—see attached file for details.';

/** Interpolate `{record_count}` with succeeded row count. */
export const APP_USER_BULK_INVITE_COMPLETION_EMAIL_PARTIAL_SUCCESS_COUNT_LINE =
  '{record_count} records were added successfully.';

export const APP_USER_BULK_INVITE_COMPLETION_EMAIL_ALL_FAILED_INTRO =
  'Your employee file could not be processed. See attached file for details and retry.';

export const APP_USER_BULK_INVITE_ERRORS_CSV_FILENAME =
  'bulk-invite-failed-rows.csv';

export const APP_USER_BULK_INVITE_COMPLETION_EMAIL_LOG_NO_RECIPIENT_MSG =
  'Bulk invite completion email skipped: no recipient email for job';

export const APP_USER_BULK_INVITE_COMPLETION_EMAIL_LOG_BAD_RESULT_MSG =
  'Bulk invite completion email skipped: job result_json missing or invalid';

export const APP_USER_BULK_INVITE_COMPLETION_EMAIL_LOG_SEND_FAILED_MSG =
  'Failed to send bulk invite completion email';
