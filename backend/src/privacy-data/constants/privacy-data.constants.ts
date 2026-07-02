/** Status values stored on {@link DataExportRequest} rows. */
export const DATA_EXPORT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type DataExportStatus =
  (typeof DATA_EXPORT_STATUS)[keyof typeof DATA_EXPORT_STATUS];

/** Download link remains valid for 72 hours (per acceptance criteria). */
export const DATA_EXPORT_DOWNLOAD_EXPIRY_HOURS = 72;

/** Short-lived presigned S3 redirect after token validation (seconds). */
export const DATA_EXPORT_PRESIGNED_URL_TTL_SECONDS = 900;

/** Max concurrent pending/processing export requests per user. */
export const DATA_EXPORT_MAX_ACTIVE_REQUESTS_PER_USER = 1;
