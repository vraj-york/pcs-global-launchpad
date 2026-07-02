/** Max uploaded CSV file size (bytes) for app user bulk invite import. */
export const APP_USER_BULK_CSV_MAX_BYTES = 1 * 1024 * 1024;

export const APP_USER_BULK_FILE_FIELD = 'file';

export const APP_USER_BULK_CSV_MIME_ALLOWLIST: readonly string[] = [
  'text/csv',
  'application/csv',
  'text/plain',
  'application/octet-stream',
];

export const APP_USER_BULK_CSV_TYPE_REJECT_MSG =
  'Only CSV files are allowed (use a .csv file and content type text/csv).';
export const APP_USER_BULK_CSV_SIZE_REJECT_MSG =
  'CSV file exceeds the maximum size of 1 MB.';
export const APP_USER_BULK_CSV_EMPTY_MSG = 'The CSV file is empty.';
export const APP_USER_BULK_CSV_INVALID_HEADER_MSG =
  'The CSV must include header columns: firstName, lastName, email, workPhone, timezone, inviteType (optional: cellPhone, nickname; corporationName, companyName, roleName, and categoryName are required on each row where inviteType is BSPBlueprint).';
export const APP_USER_BULK_CSV_MISSING_FILE_MSG =
  'A CSV file is required (form field: file).';
export const APP_USER_BULK_CSV_INVALID_INVITE_TYPE_MSG =
  'inviteType must be BSPBlueprint or Assessment Only.';
export const APP_USER_BULK_CSV_ROW_REQUIRED_FIELD_MSG =
  'A required field is empty (firstName, lastName, email, workPhone, timezone, or inviteType).';
export const APP_USER_BULK_CSV_ROW_INVALID_EMAIL_MSG =
  'Invalid or missing email.';
export const APP_USER_BULK_CSV_ROW_BSP_SCOPING_FIELDS_REQUIRED_MSG =
  'For invite type BSPBlueprint, corporationName, companyName, roleName, and categoryName must all be non-empty.';
export const APP_USER_BULK_CSV_IMPORT_FAILED_MSG =
  'Bulk user invite from CSV failed. Please try again later.';
export const APP_USER_BULK_CSV_ERROR_LOG_MSG =
  'Error in app user bulk invite CSV import';
