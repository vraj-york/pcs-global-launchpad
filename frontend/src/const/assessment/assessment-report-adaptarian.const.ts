import type { WagonWheelSpokeId } from "@/types";

/** Adaptarian (style 13): triple primary on wheel — 12 red, 4 green, 8 gray. */
export const ASSESSMENT_REPORT_ADAPTARIAN = {
	styleNumber: 13,
	wheelHighlightSpokes: [
		12, 4, 8,
	] as const satisfies readonly WagonWheelSpokeId[],
	colorStripParts: ["GRAY", "RED", "GREEN"] as const,
	styleIndicatorPillClass:
		"bg-gradient-to-r from-brand-red via-brand-green to-icon-primary",
} as const;
