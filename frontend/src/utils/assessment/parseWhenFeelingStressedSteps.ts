import type { StressedStepsListItem } from "@/types";

const SENTENCE_SPLIT = /\.(?:\s+|$)/;
const EMPHASIS_TOKEN = /\b([A-Z][A-Z-]+)\b/g;

function parseSentenceParts(sentence: string): StressedStepsListItem["parts"] {
	const parts: StressedStepsListItem["parts"] = [];
	let lastIndex = 0;

	for (const match of sentence.matchAll(EMPHASIS_TOKEN)) {
		const index = match.index ?? 0;
		if (index > lastIndex) {
			parts.push({ text: sentence.slice(lastIndex, index), bold: false });
		}
		parts.push({ text: match[1] ?? "", bold: true });
		lastIndex = index + match[0].length;
	}

	if (lastIndex < sentence.length) {
		parts.push({ text: sentence.slice(lastIndex), bold: false });
	}

	if (parts.length === 0) {
		parts.push({ text: sentence, bold: false });
	}

	return parts;
}

/** Split ``when_feeling_stressed`` into list items with ALL-CAPS emphasis spans. */
export function parseWhenFeelingStressedSteps(
	whenFeelingStressed: string,
): StressedStepsListItem[] {
	const normalized = whenFeelingStressed.trim();
	if (!normalized) {
		return [];
	}

	return normalized
		.split(SENTENCE_SPLIT)
		.map((sentence) => sentence.trim())
		.filter(Boolean)
		.map((sentence) => ({
			parts: parseSentenceParts(sentence),
		}));
}
