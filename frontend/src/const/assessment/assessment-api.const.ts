export const ASSESSMENT_API_MISSING_BASE_URL_MESSAGE =
	"VITE_BSP_ASSESSMENT_API_URL is not set";

/**
 * Public assessment service base URL (`VITE_BSP_ASSESSMENT_API_URL`), no trailing slash.
 */
export const ASSESSMENT_API_BASE_URL = (
	(import.meta.env.VITE_BSP_ASSESSMENT_API_URL as string | undefined) ?? ""
)
	.trim()
	.replace(/\/$/, "");
