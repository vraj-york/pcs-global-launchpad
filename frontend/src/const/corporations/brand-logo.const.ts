/**
 * Brand logo constants (must match backend allowed types, size, and S3 prefix).
 */

/** S3 object key prefix for corporation brand logos (must match backend BRAND_LOGOS_PREFIX). */
export const BRAND_LOGOS_KEY_PREFIX = "corporation-brand-logos/";

/** Allowed MIME types for brand logo (PNG, JPEG only; SVG excluded). Normalize browser type before comparing. */
export const BRAND_LOGO_ALLOWED_TYPES = [
	"image/png",
	"image/jpeg",
	"image/jpg",
] as const;

/** Max file size for brand logo (10 MB). */
export const BRAND_LOGO_MAX_SIZE_BYTES = 10 * 1024 * 1024;
