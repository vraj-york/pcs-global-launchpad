/** Max uploaded CSV file size (bytes) for key contact bulk import. */
export const KEY_CONTACT_BULK_CSV_MAX_BYTES = 1 * 1024 * 1024;

export const KEY_CONTACT_BULK_FILE_FIELD = 'file';

export const KEY_CONTACT_BULK_CSV_MIME_ALLOWLIST: readonly string[] = [
  'text/csv',
  'application/csv',
  'text/plain',
  'application/octet-stream',
];

export const KEY_CONTACT_BULK_CSV_TYPE_REJECT_MSG =
  'Only CSV files are allowed (use a .csv file and content type text/csv).';
export const KEY_CONTACT_BULK_CSV_SIZE_REJECT_MSG =
  'CSV file exceeds the maximum size of 1 MB.';
export const KEY_CONTACT_BULK_CSV_EMPTY_MSG = 'The CSV file is empty.';
export const KEY_CONTACT_BULK_CSV_INVALID_HEADER_MSG =
  'The CSV must include header columns: firstName, lastName, email, workPhone, contactType (optional: nickname, timezone, cellPhone, jobRole, corporationName, companyName).';
export const KEY_CONTACT_BULK_CSV_MISSING_FILE_MSG =
  'A CSV file is required (form field: file).';

/** POST /key-contacts/bulk — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin. */
export const KEY_CONTACT_BULK_IMPORT_FORBIDDEN_MSG =
  'You do not have permission to import key contacts from CSV.';
export const KEY_CONTACT_BULK_COMPLETED_MSG =
  'Key contact bulk import completed.';
export const KEY_CONTACT_BULK_FAILED_MSG =
  'Key contact bulk import failed. Please try again later.';
export const KEY_CONTACT_BULK_ERROR_LOG_MSG =
  'Error in app key contact bulk import';
export const KEY_CONTACT_BULK_COMPANY_NAME_AMBIGUOUS_MSG =
  'Multiple companies match this name; set corporationName to disambiguate.';
export const KEY_CONTACT_BULK_ROW_DUPLICATE_EMAIL_IN_FILE_MSG =
  'This email appears more than once in the file.';
export const KEY_CONTACT_BULK_ROW_INVALID_EMAIL_MSG =
  'Invalid or missing email.';
export const KEY_CONTACT_BULK_ROW_REQUIRED_FIELD_MSG =
  'A required field is empty (firstName, lastName, email, workPhone, or contactType).';
