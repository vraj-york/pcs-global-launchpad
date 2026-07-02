/** Subject for the company suspension notification sent to the company admin. */
export const COMPANY_SUSPENDED_EMAIL_SUBJECT =
  'Company Access Suspended on BSP Platform';

/** Logged when the suspension email cannot be sent (missing config, recipient, or SES failure). */
export const COMPANY_SUSPENDED_EMAIL_SEND_FAILED_LOG_MSG =
  'Company suspend: failed to send suspension email to company admin';

/** Subject for the company closure notification sent to the company admin. */
export const COMPANY_CLOSED_EMAIL_SUBJECT =
  'Notice: Your company has been closed';

/** Logged when the closure email cannot be sent (missing config, recipient, or SES failure). */
export const COMPANY_CLOSED_EMAIL_SEND_FAILED_LOG_MSG =
  'Company close: failed to send closure email to company admin';

/** Subject for the company reinstatement notification sent to the company admin. */
export const COMPANY_REINSTATED_EMAIL_SUBJECT =
  'Company Access Reinstated on BSP Platform';

/** Logged when the reinstatement email cannot be sent (missing config, recipient, or SES failure). */
export const COMPANY_REINSTATED_EMAIL_SEND_FAILED_LOG_MSG =
  'Company reinstate: failed to send reinstatement email to company admin';
