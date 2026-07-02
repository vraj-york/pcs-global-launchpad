import type { RichTextPart } from "@/types";
import { splitReportCopyParagraphs } from "./assessmentReport.utils";

export type { RichTextPart } from "@/types";

function findEarliestPhrase(
	text: string,
	phrases: readonly string[],
): { phrase: string; index: number } | null {
	let match: { phrase: string; index: number } | null = null;

	for (const phrase of phrases) {
		if (!phrase) {
			continue;
		}
		const index = text.toLowerCase().indexOf(phrase.toLowerCase());
		if (index === -1) {
			continue;
		}
		if (!match || index < match.index) {
			match = { phrase, index };
		}
	}

	return match;
}

/** Split ``text`` into plain and semibold spans for the first matching ``phrases`` (case-insensitive). */
export function splitTextWithEmphasisPhrases(
	text: string,
	phrases: readonly string[],
): RichTextPart[] {
	const normalized = text.trim();
	if (!normalized) {
		return [];
	}

	const sortedPhrases = [...phrases]
		.filter(Boolean)
		.sort((a, b) => b.length - a.length);

	const parts: RichTextPart[] = [];
	let remaining = normalized;

	while (remaining.length > 0) {
		const found = findEarliestPhrase(remaining, sortedPhrases);
		if (!found) {
			parts.push({ text: remaining, bold: false });
			break;
		}

		if (found.index > 0) {
			parts.push({ text: remaining.slice(0, found.index), bold: false });
		}

		parts.push({
			text: remaining.slice(found.index, found.index + found.phrase.length),
			bold: true,
		});
		remaining = remaining.slice(found.index + found.phrase.length);
	}

	return parts.filter((part) => part.text.length > 0);
}

export function splitReportContentParagraphs(raw: string): string[] {
	return splitReportCopyParagraphs(raw);
}
