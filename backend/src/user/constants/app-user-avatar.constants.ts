/** Max avatar file size in bytes (10 MB). */
export const APP_USER_AVATAR_MAX_SIZE_BYTES = 10 * 1024 * 1024;

/** Allowed MIME types for avatar upload. */
export const APP_USER_AVATAR_ALLOWED_MIMES = [
  'image/png',
  'image/jpeg',
] as const;

/** Map MIME type to file extension for avatar upload. */
export const APP_USER_AVATAR_EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

/** Multipart field name for avatar upload. */
export const APP_USER_AVATAR_FILE_FIELD = 'avatar';
