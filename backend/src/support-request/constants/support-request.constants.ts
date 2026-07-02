export const SUPPORT_REQUEST_EMAIL_SUBJECT =
  'New Support Request Submitted - BSP Platform';

export const SUPPORT_REQUEST_SUBMITTED_SUCCESS_MSG =
  'Your support request has been submitted successfully.';

export const SUPPORT_REQUEST_SUBMIT_FAILED_MSG =
  'Failed to submit support request. Please try again later.';

export const SUPPORT_REQUEST_SUBMIT_ERROR_LOG_MSG =
  'Error submitting support request';

export const SUPPORT_REQUEST_EMAIL_SEND_FAILED_LOG_MSG =
  'Support request saved but notification email failed to send';

export const SUPPORT_REQUEST_SUPPORT_CONTACT_EMAIL_NOT_CONFIGURED_MSG =
  'Support contact email is not configured (SUPPORT_CONTACT_EMAIL)';

export const SUPPORT_REQUEST_EMAIL_REQUIRED_MSG = 'Email is required';

export const SUPPORT_REQUEST_SUBJECT_REQUIRED_MSG = 'Subject is required';

export const SUPPORT_REQUEST_INVALID_EMAIL_MSG =
  'A valid email address is required';

export const SUPPORT_REQUEST_TOO_MANY_ATTACHMENTS_MSG =
  'A maximum of 3 image attachments are allowed';

export const SUPPORT_REQUEST_INVALID_ATTACHMENT_TYPE_MSG =
  'Attachments must be a PNG or JPG file';

export const SUPPORT_REQUEST_ATTACHMENT_DATA_MISSING_MSG =
  'Attachment file data could not be read';

export const SUPPORT_REQUEST_ATTACHMENTS_TOTAL_MAX_SIZE_MSG = (maxMb: number) =>
  `Total attachment size must be ${maxMb} MB or smaller`;

export const SUPPORT_REQUEST_ATTACHMENT_SUMMARY_LINKS_SUFFIX =
  ' (download links below)';

/** Multipart field name for support request image attachments. */
export const SUPPORT_REQUEST_ATTACHMENTS_FIELD = 'attachments';

/** Max attachments per support request. */
export const SUPPORT_REQUEST_MAX_ATTACHMENTS = 3;

/** Max combined size of all attachments in bytes (10 MB). */
export const SUPPORT_REQUEST_ATTACHMENTS_TOTAL_MAX_BYTES = 10 * 1024 * 1024;

/** Allowed MIME types for support request attachments (PNG or JPG). */
export const SUPPORT_REQUEST_ATTACHMENT_ALLOWED_MIMES = [
  'image/png',
  'image/jpeg',
] as const;

/** Map MIME type to file extension for support request attachments. */
export const SUPPORT_REQUEST_ATTACHMENT_EXTENSION_BY_MIME: Record<
  string,
  string
> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

export const SUPPORT_REQUEST_NOT_AVAILABLE_LABEL = 'N/A';

export const PLAN_CHANGE_REQUEST_EMAIL_SUBJECT =
  'Subscription Plan Change Request Received';

export const PLAN_CHANGE_REQUEST_SUPPORT_SUBJECT =
  'Subscription Plan Change Request';

export const PLAN_CHANGE_REQUEST_SUBMITTED_SUCCESS_MSG =
  'Your request has been submitted. Our team will contact you shortly to discuss your subscription options.';

export const PLAN_CHANGE_REQUEST_SUBMIT_FAILED_MSG =
  'Failed to submit plan change request. Please try again later.';

export const PLAN_CHANGE_REQUEST_SUBMIT_ERROR_LOG_MSG =
  'Error submitting plan change request';

export const PLAN_CHANGE_REQUEST_EMAIL_SEND_FAILED_LOG_MSG =
  'Plan change request saved but notification email failed to send';
