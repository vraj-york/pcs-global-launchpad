import type { BspStyleInfoPillVariant, WagonWheelSpokeId } from "@/types";
import { getPillAnchorForSpoke } from "./wagonWheelGeometry";

export type BspColorToken = "red" | "green" | "gray";

const STATE_OF_MIND_PATTERN = /[""]State of Mind[""]/i;
const COLOR_SLASH_PATTERN =
	/\b(red|green|gr(?:ay|ey))(?:\s*\/\s*(?:red|green|gr(?:ay|ey)))+\b/i;
const SINGLE_COLOR_PATTERN = /\b(red|green|gr(?:ay|ey))\b/i;

function normalizeColorPart(part: string): string {
	const p = part.trim().toLowerCase();
	if (p === "grey" || p === "gray") {
		return "GRAY";
	}
	if (p === "red") {
		return "RED";
	}
	if (p === "green") {
		return "GREEN";
	}
	return part.trim().toUpperCase();
}

/**
 * Parses RED / GREEN / GRAY combinations from the start of ``description``
 * (e.g. ``RED/Green``, ``Green/Gray``, ``Red/Green/Gray``).
 */
export function extractColorCategoryLabelFromDescription(
	description: string,
): string {
	const trimmed = description.trim();
	if (!trimmed) {
		return "";
	}

	const mindSplit = trimmed.split(STATE_OF_MIND_PATTERN);
	const prefix = (mindSplit[0] ?? trimmed.slice(0, 120)).trim();
	const cleaned = prefix
		.replace(/^the\s+split\s+/i, "")
		.replace(/^those\s+with\s+a\s+/i, "")
		.replace(/^the\s+/i, "")
		.trim();

	const slashMatch = cleaned.match(COLOR_SLASH_PATTERN);
	if (slashMatch) {
		return slashMatch[0]
			.split("/")
			.map((part) => normalizeColorPart(part))
			.join("/");
	}

	const singleMatch = cleaned.match(SINGLE_COLOR_PATTERN);
	if (singleMatch) {
		return normalizeColorPart(singleMatch[1] ?? "");
	}

	return "";
}

export function parseColorTokensFromDescription(
	description: string,
): BspColorToken[] {
	const label = extractColorCategoryLabelFromDescription(description);
	if (!label) {
		return [];
	}
	return label
		.toLowerCase()
		.split("/")
		.map((part): BspColorToken | null => {
			if (part === "red" || part === "green") {
				return part;
			}
			if (part === "gray") {
				return "gray";
			}
			return null;
		})
		.filter((token): token is BspColorToken => token != null);
}

/** Maps parsed color tokens and wheel position to pill gradient variant. */
export function colorTokensToPillVariant(
	colors: readonly BspColorToken[],
	anchor: "left" | "right",
): BspStyleInfoPillVariant {
	if (colors.length === 0) {
		return "gray";
	}
	if (colors.length === 1) {
		return colors[0] ?? "gray";
	}
	if (colors.length >= 3) {
		return "gray";
	}

	const [first, second] = colors;
	if (first === "red" && second === "green") {
		return anchor === "left" ? "redGreen" : "redGreenLeft";
	}
	if (first === "green" && second === "red") {
		return "greenRed";
	}
	if (first === "green" && second === "gray") {
		return anchor === "left" ? "greenGray" : "greenGrayLeft";
	}
	if (first === "gray" && second === "green") {
		return "greenGrayLeft";
	}
	if (first === "gray" && second === "red") {
		return "grayRed";
	}
	if (first === "red" && second === "gray") {
		return "grayRedLeft";
	}
	return "gray";
}

export function pillVariantFromDescription(
	description: string,
	spoke: WagonWheelSpokeId | null,
): BspStyleInfoPillVariant {
	const anchor = spoke != null ? getPillAnchorForSpoke(spoke) : "left";
	return colorTokensToPillVariant(
		parseColorTokensFromDescription(description),
		anchor,
	);
}
