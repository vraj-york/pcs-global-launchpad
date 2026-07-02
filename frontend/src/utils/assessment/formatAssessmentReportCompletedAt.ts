import { ASSESSMENT_REPORT_RESULTS_PAGE } from "@/const";
import type { FormatAssessmentCompletedOptions } from "@/types";

/**
 * Parses ``completed_at`` from the assessment API.
 * Naive ISO datetimes (no ``Z`` / offset) are treated as **UTC** because the
 * assessment service stores ``datetime.utcnow()`` without tzinfo.
 */
function parseAssessmentCompletedAtToDate(iso: string): Date {
	const s = iso.trim();
	if (!s) {
		return new Date(NaN);
	}
	if (/[zZ]$/.test(s)) {
		return new Date(s);
	}
	// Offset forms, e.g. +00:00, -05:00, +0530
	if (/[+-]\d{2}:?\d{2}$/.test(s)) {
		return new Date(s);
	}
	// Date-only — UTC midnight per ECMA-262
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
		return new Date(s);
	}
	return new Date(`${s}Z`);
}

export function formatAssessmentCompletedWithPrefix(
	completedAtIso: string | null | undefined,
	prefix: string,
	fallback: string,
	options?: FormatAssessmentCompletedOptions,
): string {
	if (!completedAtIso?.trim()) {
		return fallback;
	}
	const d = parseAssessmentCompletedAtToDate(completedAtIso);
	if (Number.isNaN(d.getTime())) {
		return fallback;
	}
	try {
		const includeTime = options?.includeTime !== false;
		const formatted = new Intl.DateTimeFormat(
			undefined,
			includeTime
				? { dateStyle: "long", timeStyle: "short" }
				: { dateStyle: "long" },
		).format(d);
		return `${prefix}${formatted}`;
	} catch {
		return fallback;
	}
}

/**
 * Formats ``completed_at`` in the viewer's local timezone and locale.
 */
export function formatAssessmentReportCompletedLine(
	completedAtIso: string | null | undefined,
	fallback: string,
): string {
	return formatAssessmentCompletedWithPrefix(
		completedAtIso,
		ASSESSMENT_REPORT_RESULTS_PAGE.completedOnLinePrefix,
		fallback,
	);
}
