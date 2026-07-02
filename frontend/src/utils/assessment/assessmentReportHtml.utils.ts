import type { BlueColorInfoCardParts, ColorInfoRightSplit } from "@/types";

/** BSP3<sup>60</sup> / BSP3⁶⁰ → plain ``BSP360`` (no superscript markup). */
function normalizeBsp360Branding(html: string): string {
	return html
		.replace(/BSP3\s*<sup>\s*60\s*<\/sup>/gi, "BSP360")
		.replace(/BSP3⁶⁰/g, "BSP360");
}

/** Strips common XSS vectors from CMS HTML (trusted-ish server content). */
export function sanitizeAssessmentReportHtml(html: string): string {
	return normalizeBsp360Branding(
		html
			.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
			.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
			.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, ""),
	);
}

const COLOR_INFO_RIGHT_SPLIT = /<br\s*\/?>\s*<br\s*\/?>\s*(?=The color\b)/i;

/**
 * Splits ``color_info.crightcontent`` into the RGB paragraph block and the BLUE /
 * REMEMBER block, using the ``<br><br>The color`` boundary.
 */
export function splitColorInfoRightContent(html: string): ColorInfoRightSplit {
	const trimmed = html.trim();
	const match = COLOR_INFO_RIGHT_SPLIT.exec(trimmed);
	if (!match || match.index === undefined) {
		return { rgHtml: trimmed, blueSectionHtml: "" };
	}
	const rgHtml = trimmed.slice(0, match.index).trimEnd();
	const blueSectionHtml = trimmed
		.slice(match.index + match[0].length)
		.trimStart();
	return { rgHtml, blueSectionHtml };
}

/**
 * Splits the BLUE card HTML into body (before ``REMEMBER:``) and title (after).
 */
export function parseBlueColorInfoCard(html: string): BlueColorInfoCardParts {
	const t = html.trim();
	const idx = t.search(/\bREMEMBER:\s*/i);
	if (idx === -1) {
		return { bodyHtml: t, titleHtml: "" };
	}
	const bodyHtml = t.slice(0, idx).trimEnd();
	let titleHtml = t
		.slice(idx)
		.replace(/^\s*REMEMBER:\s*/i, "")
		.trim();
	titleHtml = titleHtml.replace(/^\s*<\/b>\s*/i, "");
	return { bodyHtml, titleHtml };
}

/**
 * Repairs fragments from ``color_info`` HTML after splitting mid-``<p>`` so
 * ``dangerouslySetInnerHTML`` receives a single block element.
 */
export function sealColorInfoHtmlFragment(html: string): string {
	const t = html.trim();
	if (!t) {
		return "";
	}
	if (t.startsWith("<p>")) {
		return t.includes("</p>") ? t : `${t}</p>`;
	}
	const inner = t.replace(/<\/p>\s*$/i, "").trim();
	return `<p>${inner}</p>`;
}

/**
 * Normalizes CMS markup for the RGB card: replaces colored ``RED``/``GREEN``/``GRAY``
 * spans with plain words and wraps ``These are RED, GREEN, and GRAY.`` in ``<b>`` for
 * the chip row above.
 */
export function stripRgInlineRgbChipLabels(html: string): string {
	const phraseWithSpans =
		/These are <b>\s*<span[^>]*wysiwyg-color-red[^>]*>\s*RED\s*<\/span>\s*<\/b>\s*,\s*<b>\s*<span[^>]*wysiwyg-color-green[^>]*>\s*GREEN\s*<\/span>\s*<\/b>\s*,\s*and\s*<b>\s*<span[^>]*wysiwyg-color-gray[^>]*>\s*GRAY\s*<\/span>\s*<\/b>\s*\./gi;
	const replaced = html.replace(
		phraseWithSpans,
		"<b>These are RED, GREEN, and GRAY.</b>",
	);
	if (replaced !== html) {
		return replaced;
	}
	const fallback = html
		.replace(
			/<b>\s*<span[^>]*wysiwyg-color-red[^>]*>\s*RED\s*<\/span>\s*<\/b>/gi,
			"RED",
		)
		.replace(
			/<b>\s*<span[^>]*wysiwyg-color-green[^>]*>\s*GREEN\s*<\/span>\s*<\/b>/gi,
			"GREEN",
		)
		.replace(
			/<b>\s*<span[^>]*wysiwyg-color-gray[^>]*>\s*GRAY\s*<\/span>\s*<\/b>/gi,
			"GRAY",
		);
	return fallback.replace(
		/These are RED, GREEN, and GRAY\./,
		"<b>These are RED, GREEN, and GRAY.</b>",
	);
}
