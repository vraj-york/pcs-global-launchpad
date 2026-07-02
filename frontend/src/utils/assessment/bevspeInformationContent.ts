import { ASSESSMENT_REPORT_BEHAVIOR_VS_PERSONALITY } from "@/const";
import type { BehaviorVsPersonalityContent } from "@/types";
import {
	readReportContentString,
	splitReportCopyParagraphs,
} from "./assessmentReport.utils";
import { splitTextWithEmphasisPhrases } from "./parseRichTextEmphasis";

const copy = ASSESSMENT_REPORT_BEHAVIOR_VS_PERSONALITY;

/** ``bevspe_dsc1`` may be one block; split into two paragraphs before ``Personality types``. */
function splitBevspeDsc1Paragraphs(raw: string): string[] {
	const byNewlines = splitReportCopyParagraphs(raw);
	if (byNewlines.length > 1) {
		return byNewlines;
	}

	const marker = "Personality types";
	const markerIndex = raw.indexOf(marker);
	if (markerIndex > 0) {
		const first = raw.slice(0, markerIndex).trim();
		const second = raw.slice(markerIndex).trim();
		return [first, second].filter(Boolean);
	}

	return byNewlines;
}

export function mapBevspeInformationContent(
	content: Record<string, unknown>,
): BehaviorVsPersonalityContent | null {
	const title = readReportContentString(content, "bevspe_tile");
	const dsc1Raw = readReportContentString(content, "bevspe_dsc1");
	const dsc2Raw = readReportContentString(content, "bevspe_dsc2");

	if (!title || !dsc1Raw || !dsc2Raw) {
		return null;
	}

	const dsc1Paragraphs = splitBevspeDsc1Paragraphs(dsc1Raw).map((paragraph) => {
		const fourTypesMatch = paragraph.match(/4 basic types:[^.]*\./i);
		const emphasisPhrases = fourTypesMatch
			? [fourTypesMatch[0]]
			: copy.dsc1EmphasisPhrases;

		return {
			parts: splitTextWithEmphasisPhrases(paragraph, emphasisPhrases),
		};
	});

	return {
		title,
		dsc1Paragraphs,
		dsc2Parts: splitTextWithEmphasisPhrases(dsc2Raw, copy.dsc2EmphasisPhrases),
		pills: copy.pills,
	};
}
