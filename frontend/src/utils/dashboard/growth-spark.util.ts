import { GROWTH_SPARK_GENERIC_TITLE } from "@/const";
import type { ParsedGrowthSparkContent } from "@/types";

function splitBodyParagraphs(body: string): string[] {
	const trimmed = body.trim();
	if (!trimmed) {
		return [];
	}

	if (trimmed.includes("\n\n")) {
		return trimmed
			.split(/\n\n+/)
			.map((paragraph) => paragraph.trim())
			.filter(Boolean);
	}

	return trimmed
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
}

export function parseGrowthSparkContent(
	title: string,
	body: string,
): ParsedGrowthSparkContent {
	const paragraphs = splitBodyParagraphs(body);
	const normalizedTitle = title.trim();

	if (normalizedTitle && normalizedTitle !== GROWTH_SPARK_GENERIC_TITLE) {
		return {
			headline: normalizedTitle,
			paragraphs,
		};
	}

	if (paragraphs.length === 0) {
		return { headline: "", paragraphs: [] };
	}

	if (paragraphs.length === 1) {
		return { headline: paragraphs[0], paragraphs: [] };
	}

	return {
		headline: paragraphs[0],
		paragraphs: paragraphs.slice(1),
	};
}
