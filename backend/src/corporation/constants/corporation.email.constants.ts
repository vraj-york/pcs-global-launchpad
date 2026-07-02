/** Subject for the corporation suspension notification sent to the corporation admin. */
export const CORPORATION_SUSPENDED_EMAIL_SUBJECT =
  'Corporation Access Suspended on BSP Platform';

/** Logged when the suspension email cannot be sent (missing config, recipient, or SES failure). */
export const CORPORATION_SUSPENDED_EMAIL_SEND_FAILED_LOG_MSG =
  'Corporation suspend: failed to send suspension email to corporation admin';

/** Subject for the corporation closure notification sent to the corporation admin. */
export const CORPORATION_CLOSED_EMAIL_SUBJECT =
  'Notice: Your corporation has been closed';

/** Logged when the closure email cannot be sent (missing config, recipient, or SES failure). */
export const CORPORATION_CLOSED_EMAIL_SEND_FAILED_LOG_MSG =
  'Corporation close: failed to send closure email to corporation admin';

/** Subject for the corporation reinstatement notification sent to the corporation admin. */
export const CORPORATION_REINSTATED_EMAIL_SUBJECT =
  'Corporation Access Reinstated on BSP Platform';

/** Logged when the reinstatement email cannot be sent (missing config, recipient, or SES failure). */
export const CORPORATION_REINSTATED_EMAIL_SEND_FAILED_LOG_MSG =
  'Corporation reinstate: failed to send reinstatement email to corporation admin';
