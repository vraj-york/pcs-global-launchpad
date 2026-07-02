import type { NextStepCardContent, NextStepsResolvedContent } from "@/types";

function parseNextStepCard(raw: unknown): NextStepCardContent | null {
	if (typeof raw === "string") {
		const trimmed = raw.trim();
		if (!trimmed) {
			return null;
		}
		try {
			return parseNextStepCard(JSON.parse(trimmed) as unknown);
		} catch {
			return null;
		}
	}

	if (!raw || typeof raw !== "object") {
		return null;
	}

	const record = raw as Record<string, unknown>;
	const title = typeof record.title === "string" ? record.title.trim() : "";
	const description =
		typeof record.description === "string" ? record.description.trim() : "";
	const link = typeof record.link === "string" ? record.link.trim() : "";

	if (!title || !description) {
		return null;
	}

	return { title, description, link };
}

export function mapNextStepsContent(
	content: Record<string, unknown>,
): NextStepsResolvedContent | null {
	const left = parseNextStepCard(content.nsleftcontent);
	const right = parseNextStepCard(content.nsrightcontent);

	if (!left || !right) {
		return null;
	}

	const nsemail =
		typeof content.nsemail === "string" ? content.nsemail.trim() : "";
	const leftWithLink = left.link || (nsemail ? `mailto:${nsemail}` : left.link);

	return {
		left: { ...left, link: leftWithLink },
		right,
	};
}
