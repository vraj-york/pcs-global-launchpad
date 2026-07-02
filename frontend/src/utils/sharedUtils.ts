import { format } from "date-fns";
import { toast } from "sonner";
import * as yup from "yup";
import {
	AUTH_VALIDATION_MESSAGES,
	CORPORATION_VALIDATION_MESSAGES,
	PASSWORD_REQUIREMENTS,
	PERSON_FIELD_MAX_LENGTH,
	PERSON_FIELD_VALIDATION_MESSAGES,
	SUPPORT_ATTACHMENT_ALLOWED_TYPES,
	SUPPORT_ATTACHMENTS_MAX_TOTAL_BYTES,
	SUPPORT_MAX_ATTACHMENTS,
	SUPPORT_VALIDATION_MESSAGES,
	US_JOB_ROLE_HAS_ALNUM,
	US_JOB_ROLE_REGEX,
	US_PERSON_NAME_HAS_LETTER,
	US_PERSON_NAME_REGEX,
} from "@/const";
import type {
	PasswordStrengthLevel,
	PricingPlanLevel,
	PricingPlanType,
} from "@/types";

const DEFAULT_MAX_LENGTH = 100;

/**
 * Reusable required string schema: trims input, requires presence, rejects empty/whitespace,
 * and enforces max length. Use for any required text field to get consistent messages.
 * @param fieldName - Used in validation messages.
 * @param maxLength - Max allowed length (default 100).
 */
export const requiredString = (
	fieldName: string,
	maxLength: number = DEFAULT_MAX_LENGTH,
) =>
	yup
		.string()
		.transform((value) => (typeof value === "string" ? value.trim() : value))
		.required(`${fieldName} is required`)
		.max(maxLength, `Maximum ${maxLength} characters are allowed`)
		.test("not-empty", `${fieldName} is required`, (value) => {
			return value != null && (value as string).trim() !== "";
		});

const trimString = (value: unknown) =>
	typeof value === "string" ? value.trim() : value;

const isValidPersonName = (value: string | null | undefined): boolean => {
	if (value == null || value === "") return true;
	return (
		US_PERSON_NAME_HAS_LETTER.test(value) && US_PERSON_NAME_REGEX.test(value)
	);
};

const isValidJobRole = (value: string | null | undefined): boolean => {
	if (value == null || value === "") return true;
	return US_JOB_ROLE_HAS_ALNUM.test(value) && US_JOB_ROLE_REGEX.test(value);
};

/** Required first/last name: trim, required, max length, US person-name character rules. */
export const requiredPersonName = (
	fieldName: string,
	maxLength: number = PERSON_FIELD_MAX_LENGTH,
) =>
	requiredString(fieldName, maxLength).test(
		"person-name",
		PERSON_FIELD_VALIDATION_MESSAGES.invalidPersonName(fieldName),
		(value) => isValidPersonName(value),
	);

/** Optional nickname: empty OK; non-empty must pass US person-name character rules. */
export const optionalPersonName = (
	maxLength: number = PERSON_FIELD_MAX_LENGTH,
) =>
	yup
		.string()
		.optional()
		.default("")
		.transform(trimString)
		.max(maxLength, `Maximum ${maxLength} characters are allowed`)
		.test(
			"person-name",
			PERSON_FIELD_VALIDATION_MESSAGES.invalidPersonName("Nickname"),
			(value) => isValidPersonName(value),
		);

/** Required job role: trim, required, max length, US job-role character rules. */
export const requiredJobRole = (
	fieldName: string,
	maxLength: number = PERSON_FIELD_MAX_LENGTH,
) =>
	requiredString(fieldName, maxLength).test(
		"job-role",
		PERSON_FIELD_VALIDATION_MESSAGES.invalidJobRole(fieldName),
		(value) => isValidJobRole(value),
	);

/** Optional job role: empty OK; non-empty must pass US job-role character rules. */
export const optionalJobRole = (maxLength: number = PERSON_FIELD_MAX_LENGTH) =>
	yup
		.string()
		.optional()
		.default("")
		.transform(trimString)
		.max(maxLength, `Maximum ${maxLength} characters are allowed`)
		.test(
			"job-role",
			PERSON_FIELD_VALIDATION_MESSAGES.invalidJobRole("Job role"),
			(value) => isValidJobRole(value),
		);

/**
 * Format code for display with a prefix and 3-digit pad (e.g. CORP-001, COMP-012).
 * @param value - Numeric or string code (e.g. 1 → CORP-001, 12 → COMP-012).
 * @param prefix - Prefix (e.g. "CORP", "COMP").
 */
export function formatCode(value: string | number, prefix: string): string {
	return `${prefix}-${String(value).padStart(3, "0")}`;
}

/**
 * Joins first and last name into a single trimmed string.
 * @returns Non-empty string if either part is present, otherwise "".
 */
export function deriveNameFromEmail(email: string | null): string | null {
	if (!email) return null;
	const local = email.split("@")[0];
	return local
		.split(/[._-]/)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(" ");
}

export function formatFullName(
	firstName?: string | null,
	lastName?: string | null,
): string {
	return [firstName, lastName].filter(Boolean).join(" ").trim();
}

/**
 * Avatar initials from profile first and last name.
 */
export function getUserInitials(
	firstName: string | null,
	lastName: string | null,
	fallback = "U",
): string {
	const f = firstName?.trim();
	const l = lastName?.trim();
	if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
	if (f) return f.slice(0, 2).toUpperCase();
	if (l) return l.slice(0, 2).toUpperCase();
	return fallback;
}

/**
 * Format address parts into a single line (e.g. for Corporation or Company address display).
 * @param addr - Object with optional addressLine, state, city, country, zip
 * @returns Comma-separated address or "—" if empty
 */
export function formatAddress(
	addr:
		| {
				addressLine?: string | null;
				state?: string | null;
				city?: string | null;
				country?: string | null;
				zip?: string | null;
		  }
		| null
		| undefined,
): string {
	if (!addr) return "—";
	const parts = [
		addr.addressLine,
		addr.state,
		addr.city,
		addr.country,
		addr.zip,
	].filter(Boolean);
	return parts.length ? parts.join(", ") : "—";
}

/**
 * Plan tier label from pricing API (`employeeRangeMin` / `employeeRangeMax`):
 * e.g. Plan Level dropdown, company cards.
 * @returns "X-Y employees", "X+ employees", or "Custom" when both bounds are null.
 */
export function formatPlanEmployeeRange(
	min: number | null | undefined,
	max: number | null | undefined,
): string {
	if (min != null && max != null) return `${min}-${max} employees`;
	if (min != null) return `${min}+ employees`;
	return "Custom";
}

/** Individual / one_time tier from GET /pricing/plans (BSP Assessment Individual). */
export function findIndividualPricingPlanLevel(
	planTypes: PricingPlanType[],
): PricingPlanLevel | null {
	const group = planTypes.find((p) => p.id === "one_time");
	return (
		group?.plans.find(
			(p) => p.planTypeId === "one_time" && p.customerType === "individual",
		) ?? null
	);
}

/**
 * USD amount for display (`en-US`, 0–2 fraction digits, comma grouping).
 * @param amount - Coerced with `Number`; non-finite values return "".
 */
export function formatCurrencyAmount(
	amount: number | string | null | undefined,
): string {
	const n = Number(amount);
	if (!Number.isFinite(n)) {
		return "";
	}
	return n.toLocaleString("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

/**
 * Rounds a monetary amount to 2 decimal.
 */
export function roundCurrencyToTwoDecimals(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.round(value * 100) / 100;
}

/**
 * Coerces a numeric/string input to a finite non-negative number.
 * Returns 0 for null/undefined, non-numeric, non-finite, negative, or zero values.
 */
export function toFiniteNonNegative(
	value: number | string | null | undefined,
): number {
	if (value == null) return 0;
	const n = typeof value === "number" ? value : Number.parseFloat(value);
	return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Formats Stripe-style minor units (e.g. cents) with an ISO currency code.
 */
export function formatMoneyFromMinorUnits(
	amountMinor: number,
	currencyCode: string,
): string {
	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currencyCode.toUpperCase(),
		}).format(amountMinor / 100);
	} catch {
		return `${(amountMinor / 100).toFixed(2)} ${currencyCode}`;
	}
}

/**
 * Formats seconds into MM:SS format
 * @param seconds - The number of seconds to format
 * @returns Formatted time string (e.g., "02:45")
 */
export function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins.toString().padStart(2, "0")}:${secs
		.toString()
		.padStart(2, "0")}`;
}

/**
 * Masks an email address for privacy display
 * Dynamically calculates visible characters based on email length:
 * - 1-3 chars: show 1 char (e.g., "ab@..." -> "a***@...")
 * - 4-6 chars: show 2 chars (e.g., "abcdef@..." -> "ab***@...")
 * - 7+ chars: show 3 chars (e.g., "abcdefgh@..." -> "abc***@...")
 *
 * @param email - The email address to mask
 * @returns Masked email string
 */
export function maskEmail(email: string): string {
	if (!email || !email.includes("@")) {
		return email;
	}

	const [localPart, domain] = email.split("@");
	const length = localPart.length;

	// Calculate visible characters based on local part length
	let visibleChars: number;
	if (length <= 3) {
		visibleChars = 1;
	} else if (length <= 6) {
		visibleChars = 2;
	} else {
		visibleChars = 3;
	}

	const visiblePart = localPart.slice(0, visibleChars);
	return `${visiblePart}***@${domain}`;
}

const EMAIL_REGEX = /^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$/;

/** Returns true when value is non-empty after trim and matches EMAIL_REGEX. */
export function isValidEmailFormat(value: string): boolean {
	const trimmed = typeof value === "string" ? value.trim() : "";
	if (!trimmed) return false;
	return EMAIL_REGEX.test(trimmed);
}

/** Splits multi-recipient input by comma, semicolon, or whitespace. */
export function splitEmailInput(raw: string): string[] {
	return raw
		.split(/[,;\s]+/)
		.map((s) => s.trim())
		.filter(Boolean);
}

export function validateEmailParts(parts: string[]): boolean {
	return parts.every((p) => isValidEmailFormat(p));
}

/**
 * Validates an email string. Trims before validation. Returns an error message or empty string if valid.
 * Use with Yup's .test() or directly for custom validation.
 */
export function validateEmail(email: string): string {
	const trimmed = typeof email === "string" ? email.trim() : "";
	if (!trimmed) return "Email is required.";
	if (!isValidEmailFormat(trimmed))
		return AUTH_VALIDATION_MESSAGES.emailInvalid;
	return "";
}

/**
 * Password strength for the new-password UI meter (length, mixed case, symbol or number).
 * Matches PASSWORD_REQUIREMENTS and set-password / Cognito challenge flows.
 */
export function calculatePasswordStrength(
	password: string,
): PasswordStrengthLevel {
	if (!password) return "none";

	let score = 0;
	if (password.length >= PASSWORD_REQUIREMENTS.minLength) score++;
	if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
	if (/[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;
	if (score === 0) return "poor";
	if (score === 1) return "poor";
	if (score === 2) return "average";
	return "strong";
}

/**
 * Required string + email format using validateEmail (used in Yup schemas).
 * Empty/whitespace is handled by requiredString; this test only fails when there is
 * content that fails the email regex, so "Invalid email address." is shown (not "Email is required.").
 */
export const requiredEmail = (fieldName: string) =>
	requiredString(fieldName).test(
		"email",
		AUTH_VALIDATION_MESSAGES.emailInvalid,
		(value) => {
			const trimmed = (value ?? "").toString().trim();
			if (!trimmed) return true; // let requiredString handle empty
			return isValidEmailFormat(trimmed);
		},
	);

/**
 * Zip code format: 5 digits (required), optional dash + 4 digits (ZIP+4).
 * Examples: 45150 or 45150-2193
 */
const ZIP_CODE_REGEX = /^\d{5}(-\d{4})?$/;

/**
 * Yup schema for zip: optional. When present, must be 5 digits or 5 digits, dash, 4 digits.
 */
export const zipNumericOnly = (fieldName: string) =>
	yup
		.string()
		.transform((value) => (typeof value === "string" ? value.trim() : value))
		.test(
			"zip-format",
			`${fieldName} is invalid`,
			(value) => value == null || value === "" || ZIP_CODE_REGEX.test(value),
		);

/**
 * Required zip: 5 digits (required), optional dash + 4 digits (ZIP+4).
 */
export const requiredZipNumeric = (fieldName: string) =>
	yup
		.string()
		.transform((value) => (typeof value === "string" ? value.trim() : value))
		.required(`${fieldName} is required`)
		.test(
			"zip-format",
			`${fieldName} is invalid`,
			(value) => value != null && value !== "" && ZIP_CODE_REGEX.test(value),
		);

/** Phone: optional +, digits, spaces, hyphens, parentheses. Used for format validation. */
const PHONE_REGEX = /^\+?[\d\s\-()]+$/;

/** Minimum number of digits required in a valid phone number (after stripping non-digits). */
const PHONE_MIN_DIGITS = 10;

/** Maximum number of digits allowed in a phone number (E.164 style). */
const PHONE_MAX_DIGITS = 15;

/**
 * Phone validation: trims, allows + (prefix), digits, spaces, hyphens, parentheses.
 * Validates digit count is between PHONE_MIN_DIGITS and PHONE_MAX_DIGITS when value is present.
 * Use validatePhone().required("...") for required fields or validatePhone().optional() for optional.
 */
export const validatePhone = () =>
	yup
		.string()
		.transform((value) => (typeof value === "string" ? value.trim() : value))
		.test("phone", CORPORATION_VALIDATION_MESSAGES.phone, (value) => {
			if (value == null || value === "") return true;
			if (!PHONE_REGEX.test(value)) return false;
			const digits = value.replace(/\D/g, "");
			return (
				digits.length >= PHONE_MIN_DIGITS && digits.length <= PHONE_MAX_DIGITS
			);
		});

// File Validation Utilities

export type ValidateFileOptions = {
	/** Max file size in bytes. */
	maxSizeBytes: number;
	/** Allowed MIME types (e.g. image/png, image/jpeg). Browser may send with params (e.g. image/svg+xml; charset=utf-8); only the base type is compared. */
	allowedMimeTypes: readonly string[];
	/** When set, a matching extension (e.g. `.csv`) passes validation if MIME is missing or unknown. */
	allowedExtensions?: readonly string[];
	/** Optional custom message when file type is not allowed. */
	messageUnsupportedFormat?: string;
	/** Optional custom message when file exceeds max size. */
	messageFileTooLarge?: string;
};

const DEFAULT_UNSUPPORTED_FORMAT = "File format is not allowed.";
const DEFAULT_FILE_TOO_LARGE = "File size exceeds the allowed limit.";

/**
 * Validates a file against max size and allowed MIME types (and optional extensions).
 * Strips MIME parameters (e.g. "image/svg+xml; charset=utf-8" -> "image/svg+xml") before comparing.
 * When `allowedExtensions` is set, a matching file suffix passes if MIME is missing or not in the list.
 * @returns Error message string, or null if valid.
 */
export function validateFile(
	file: File,
	options: ValidateFileOptions,
): string | null {
	const {
		maxSizeBytes,
		allowedMimeTypes,
		allowedExtensions,
		messageUnsupportedFormat = DEFAULT_UNSUPPORTED_FORMAT,
		messageFileTooLarge = DEFAULT_FILE_TOO_LARGE,
	} = options;

	const baseType = (file.type ?? "").split(";")[0].trim().toLowerCase();
	const allowedMime = [...allowedMimeTypes];
	const mimeOk = baseType.length > 0 && allowedMime.includes(baseType);
	const ext = (file.name.match(/\.[^.]+$/)?.[0] ?? "").toLowerCase();
	const extOk =
		allowedExtensions != null &&
		allowedExtensions.length > 0 &&
		allowedExtensions.includes(ext);
	if (!mimeOk && !extOk) {
		return messageUnsupportedFormat;
	}

	if (file.size > maxSizeBytes) {
		return messageFileTooLarge;
	}

	return null;
}

export function getAttachmentsTotalBytes(files: File[]) {
	return files.reduce((total, file) => total + file.size, 0);
}

/**
 * Validates a support attachment against type, count, and combined size limits.
 * @returns Error message string, or null if valid.
 */
export function validateSupportAttachment(
	file: File,
	existingFiles: File[],
): string | null {
	const perFileError = validateFile(file, {
		maxSizeBytes: SUPPORT_ATTACHMENTS_MAX_TOTAL_BYTES,
		allowedMimeTypes: SUPPORT_ATTACHMENT_ALLOWED_TYPES,
		allowedExtensions: [".png", ".jpg", ".jpeg"],
		messageUnsupportedFormat: SUPPORT_VALIDATION_MESSAGES.unsupportedFormat,
		messageFileTooLarge: SUPPORT_VALIDATION_MESSAGES.totalSizeExceeded,
	});
	if (perFileError) return perFileError;

	const nextFiles = [...existingFiles, file];
	if (nextFiles.length > SUPPORT_MAX_ATTACHMENTS) {
		return SUPPORT_VALIDATION_MESSAGES.maxAttachments;
	}

	if (
		getAttachmentsTotalBytes(nextFiles) > SUPPORT_ATTACHMENTS_MAX_TOTAL_BYTES
	) {
		return SUPPORT_VALIDATION_MESSAGES.totalSizeExceeded;
	}

	return null;
}

// Brand Logo Utilities

export const BRAND_LOGOS_KEY_PREFIX = "brand-logos/";

/** Base URL for brand logo assets (S3 or CloudFront). Uses VITE_BRAND_LOGO_BASE_URL if set, else derived from VITE_ENV and VITE_AWS_REGION to match backend bucket. */
export function getBrandLogoBaseUrl(): string {
	const fromEnv = import.meta.env.VITE_BRAND_LOGO_BASE_URL as
		| string
		| undefined;
	if (fromEnv?.trim()) return fromEnv.trim().replace(/\/$/, "");
	const env = import.meta.env.VITE_ENV ?? "dev";
	const region = import.meta.env.VITE_AWS_REGION ?? "us-east-1";
	const bucket = `bsp-blueprint-${env}-frontend`;
	return `https://${bucket}.s3.${region}.amazonaws.com`;
}

/**
 * Returns the display URL for a corporation brand logo.
 * Handles: full URL (use as-is), object key (prefix + key), or filename only (prefix + filename).
 */
export function getBrandLogoDisplayUrl(
	value: string | null | undefined,
): string | null {
	if (!value?.trim()) return null;
	const v = value.trim();
	// API/JSON may send the string "null" or "undefined" instead of null
	if (v.toLowerCase() === "null" || v.toLowerCase() === "undefined")
		return null;
	if (v.startsWith("http://") || v.startsWith("https://")) {
		// Don't use URLs that point to "null" (e.g. .../corporation-brand-logos/null)
		if (/\/null\/?$/i.test(v) || v.endsWith("/null")) return null;
		return v;
	}
	const base = getBrandLogoBaseUrl();
	const key = v.startsWith(BRAND_LOGOS_KEY_PREFIX)
		? v
		: `${BRAND_LOGOS_KEY_PREFIX}${v}`;
	const url = `${base}/${key}`;
	// Never return a URL that ends with or contains /null
	if (/\/null\/?$/i.test(url) || url.endsWith("/null")) return null;
	return url;
}

/**
 * Copies text to the clipboard and shows a toast notification.
 * @param text - The text to copy.
 * @param successMessage - Toast shown on success (default: "Copied.").
 * @param errorMessage - Toast shown on failure (default: "Could not copy.").
 */
export async function copyClipboard(
	text: string,
	successMessage = "Copied.",
	errorMessage = "Could not copy.",
): Promise<void> {
	try {
		await navigator.clipboard.writeText(text);
		toast.success(successMessage);
	} catch {
		toast.error(errorMessage);
	}
}

/**
 * Formats a date or ISO timestamp as a short time-of-day string (e.g. "3:45 PM").
 * Useful for chat message timestamps, activity logs, and any time-only display.
 * @param timestamp - A Date object or ISO date/timestamp string.
 */
export function formatTimeShort(timestamp: Date | string): string {
	return new Intl.DateTimeFormat("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	}).format(new Date(timestamp));
}

/**
 * Formats a date as MM-DD-YYYY (en-US short format with dashes).
 */
export function formatDateShort(date?: Date | string | null): string {
	if (!date || date === "") return "";

	const d = new Date(date);
	if (Number.isNaN(d.getTime())) return "";

	return new Intl.DateTimeFormat("en-US", {
		month: "2-digit",
		day: "2-digit",
		year: "numeric",
	})
		.format(typeof date === "string" ? new Date(date) : date)
		.replace(/\//g, "-");
}

/**
 * Formats a date as MM-DD-YYYY using UTC, so calendar-date values
 * (e.g. end-of-day UTC timestamps) render as the intended calendar day
 * regardless of the viewer's timezone.
 */
export function formatDateShortUtc(date?: Date | string | null): string {
	if (!date || date === "") return "";

	const d = typeof date === "string" ? new Date(date) : date;
	if (Number.isNaN(d.getTime())) return "";

	return new Intl.DateTimeFormat("en-US", {
		month: "2-digit",
		day: "2-digit",
		year: "numeric",
		timeZone: "UTC",
	})
		.format(d)
		.replace(/\//g, "-");
}

/**
 * Formats a date as MM-DD-YYYY, hh:mm AM/PM (en-US).
 */
export function formatDateTimeShort(date?: Date | string | null): string {
	if (!date || date === "") return "";

	const d = typeof date === "string" ? new Date(date) : date;
	if (Number.isNaN(d.getTime())) return "";

	return format(d, "MM-dd-yyyy, hh:mm a");
}

/**
 * Formats epoch seconds as MM-DD-YYYY, hh:mm AM/PM.
 */
export function formatOccurredAtSeconds(occurredAtSeconds: number): string {
	try {
		return format(new Date(occurredAtSeconds * 1000), "MM-dd-yyyy, hh:mm a");
	} catch {
		return String(occurredAtSeconds);
	}
}

const MS_24H = 24 * 60 * 60 * 1000;

/** True when the message was sent within the last 24 hours (from now). */
export function isMessageWithin24Hours(timestamp: Date | string): boolean {
	const d = new Date(timestamp);
	if (Number.isNaN(d.getTime())) {
		return true;
	}
	return Date.now() - d.getTime() < MS_24H;
}

/**
 * Short label under a message: time if within 24h, otherwise a calendar date
 * (month + day, with year if not the current year).
 */
export function formatMessageInlineTimestamp(timestamp: Date | string): string {
	if (isMessageWithin24Hours(timestamp)) {
		return formatTimeShort(timestamp);
	}
	const d = new Date(timestamp);
	if (Number.isNaN(d.getTime())) {
		return "";
	}
	const now = new Date();
	const sameYear = d.getFullYear() === now.getFullYear();
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		...(sameYear ? {} : { year: "numeric" as const }),
	}).format(d);
}

/**
 * Content for the message date/time tooltip: full date+time if recent, else
 * date on the first line and time on the second.
 */
export function formatMessageTooltipLines(timestamp: Date | string): {
	line1: string;
	line2?: string;
} {
	const d = new Date(timestamp);
	if (Number.isNaN(d.getTime())) {
		return { line1: "—" };
	}
	if (isMessageWithin24Hours(timestamp)) {
		return {
			line1: new Intl.DateTimeFormat("en-US", {
				month: "short",
				day: "numeric",
				hour: "numeric",
				minute: "2-digit",
				hour12: true,
			}).format(d),
		};
	}
	return {
		line1: new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		}).format(d),
		line2: formatTimeShort(d),
	};
}

/** Calendar date in local time as `yyyy-MM-dd` (for `min` / `max` on date inputs). */
export function dateToIsoString(d: Date): string {
	const y = d.getFullYear();
	const mo = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${mo}-${day}`;
}

/** Earliest selectable promo expiry: tomorrow in local time (`yyyy-MM-dd`). */
export function getPromoExpiryMinDateIso(): string {
	const d = new Date();
	d.setDate(d.getDate() + 1);
	return dateToIsoString(d);
}
