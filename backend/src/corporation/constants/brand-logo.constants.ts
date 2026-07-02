/** Max brand logo file size in bytes (10 MB). */
export const BRAND_LOGO_MAX_SIZE_BYTES = 10 * 1024 * 1024;

/** Allowed MIME types for brand logo upload. */
export const BRAND_LOGO_ALLOWED_MIMES = ['image/png', 'image/jpeg'] as const;

/** Map MIME type to file extension for brand logo. */
export const BRAND_LOGO_EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
};
