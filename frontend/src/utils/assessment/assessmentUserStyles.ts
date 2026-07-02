import {
	ASSESSMENT_FTUE_DOMINANT_MIND_STATE_ACCENT,
	ASSESSMENT_REPORT_ADAPTARIAN,
	ASSESSMENT_REPORT_OVERALL_BEHAVIORAL_STYLE,
	ASSESSMENT_REPORT_QUADRANT_STYLE_SHARED,
	ASSESSMENT_REPORT_STYLE_TRAIT_TITLES,
	BSP_STYLE_INFO_PILL_VARIANT_CLASS,
} from "@/const";
import type {
	ApiBspStyle,
	AssessmentReportStyleTraitItem,
	AssessmentScoreStyleType,
	BspStyleInfoPillVariant,
	OverallStressfulDominantMindState,
	OverallStressfulScoreBreakdown,
	OverallStyleIndicator,
	WagonWheelSpokeId,
} from "@/types";
import {
	extractColorCategoryLabelFromDescription,
	pillVariantFromDescription,
} from "./bspStyleColors";

const SPOKE_IDS: readonly WagonWheelSpokeId[] = [
	1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
] as const;

export function styleNumberToSpokeId(
	styleNumber: number,
): WagonWheelSpokeId | null {
	if (!Number.isInteger(styleNumber) || styleNumber < 1 || styleNumber > 12) {
		return null;
	}
	return styleNumber as WagonWheelSpokeId;
}

export function isAdaptarianStyleNumber(styleNumber: number): boolean {
	return styleNumber === ASSESSMENT_REPORT_ADAPTARIAN.styleNumber;
}

export function resolveOverallStyleIndicator(
	overallStyle: ApiBspStyle,
): OverallStyleIndicator {
	const spokeId = styleNumberToSpokeId(overallStyle.style_number);
	const isAdaptarian = isAdaptarianStyleNumber(overallStyle.style_number);
	const pillClass = isAdaptarian
		? ASSESSMENT_REPORT_ADAPTARIAN.styleIndicatorPillClass
		: getStylePillBackgroundClassFromDescription(
				overallStyle.description,
				spokeId,
			);

	return {
		styleNumber: overallStyle.style_number,
		title: overallStyle.title,
		pillClass,
		ariaLabel:
			ASSESSMENT_REPORT_OVERALL_BEHAVIORAL_STYLE.styleIndicatorAriaLabel(
				overallStyle.style_number,
				overallStyle.title,
			),
	};
}

export function getStylePillBackgroundClassFromDescription(
	description: string,
	spoke: WagonWheelSpokeId | null,
): string {
	const variant = pillVariantFromDescription(description, spoke);
	return BSP_STYLE_INFO_PILL_VARIANT_CLASS[variant];
}

const PILL_VARIANT_TITLE_GRADIENT_CLASS: Record<
	BspStyleInfoPillVariant,
	string
> = {
	red: "text-brand-red",
	green: "text-brand-green",
	gray: "text-icon-primary",
	redGreen:
		"bg-gradient-to-r from-brand-red to-brand-green bg-clip-text text-transparent",
	greenRed:
		"bg-gradient-to-r from-brand-green to-brand-red bg-clip-text text-transparent",
	greenGray:
		"bg-gradient-to-r from-brand-green to-icon-primary bg-clip-text text-transparent",
	grayRed:
		"bg-gradient-to-r from-icon-primary to-brand-red bg-clip-text text-transparent",
	grayRedLeft:
		"bg-gradient-to-l from-icon-primary to-brand-red bg-clip-text text-transparent",
	greenGrayLeft:
		"bg-gradient-to-l from-brand-green to-icon-primary bg-clip-text text-transparent",
	redGreenLeft:
		"bg-gradient-to-l from-brand-red to-brand-green bg-clip-text text-transparent",
};

export function getStyleTitleGradientClassFromDescription(
	description: string,
	spoke: WagonWheelSpokeId | null,
): string {
	const variant = pillVariantFromDescription(description, spoke);
	return PILL_VARIANT_TITLE_GRADIENT_CLASS[variant];
}

export function getStyleTitleClassFromPillClass(pillClass: string): string {
	if (pillClass.includes("gradient")) {
		return `${pillClass} bg-clip-text text-transparent`;
	}

	if (pillClass === BSP_STYLE_INFO_PILL_VARIANT_CLASS.red) {
		return "text-brand-red";
	}
	if (pillClass === BSP_STYLE_INFO_PILL_VARIANT_CLASS.green) {
		return "text-brand-green";
	}
	if (pillClass === BSP_STYLE_INFO_PILL_VARIANT_CLASS.gray) {
		return "text-icon-primary";
	}

	return pillClass.replace(/^bg-/, "text-");
}

export function isWagonWheelSpokeId(value: number): value is WagonWheelSpokeId {
	return SPOKE_IDS.includes(value as WagonWheelSpokeId);
}

const CONTEXT_STYLE_PILL_BY_TYPE: Record<AssessmentScoreStyleType, string> = {
	basic: BSP_STYLE_INFO_PILL_VARIANT_CLASS.gray,
	plural: BSP_STYLE_INFO_PILL_VARIANT_CLASS.green,
	split: "bg-gradient-to-l from-icon-primary to-brand-red",
};

export function getContextStyleCategoryClass(
	styleType: AssessmentScoreStyleType,
	spoke: WagonWheelSpokeId | null,
	description: string,
): string {
	if (styleType === "split") {
		return "bg-gradient-to-r from-brand-red to-icon-primary bg-clip-text text-transparent";
	}
	if (description.trim()) {
		return getStyleTitleGradientClassFromDescription(description, spoke);
	}
	return "text-foreground";
}

export function getContextStylePillClass(
	styleType: AssessmentScoreStyleType,
	spoke: WagonWheelSpokeId | null,
	description: string,
): string {
	if (styleType === "split") {
		return CONTEXT_STYLE_PILL_BY_TYPE.split;
	}
	if (description.trim()) {
		return getStylePillBackgroundClassFromDescription(description, spoke);
	}
	return CONTEXT_STYLE_PILL_BY_TYPE[styleType];
}

export function formatStyleTraitList(
	items: string[],
	separator: string,
): string {
	return items.filter((item) => item.trim().length > 0).join(separator);
}

export function buildBspStyleTraitItems(
	style: ApiBspStyle,
): AssessmentReportStyleTraitItem[] {
	const separator = ASSESSMENT_REPORT_QUADRANT_STYLE_SHARED.traitListSeparator;
	const titles = ASSESSMENT_REPORT_STYLE_TRAIT_TITLES;

	const items: AssessmentReportStyleTraitItem[] = [
		{
			id: "environment",
			title: titles.environment,
			icon: "globe",
			body: formatStyleTraitList(style.environmental_preferences, " "),
		},
		{
			id: "strengths",
			title: titles.strengths,
			icon: "star",
			body: formatStyleTraitList(style.character_strengths, separator),
		},
		{
			id: "likes",
			title: titles.likes,
			icon: "thumbsUp",
			body: formatStyleTraitList(style.likes, separator),
		},
		{
			id: "dislikes",
			title: titles.dislikes,
			icon: "thumbsDown",
			body: formatStyleTraitList(style.dislikes, separator),
		},
		{
			id: "psychNeeds",
			title: titles.psychNeeds,
			icon: "brain",
			body: formatStyleTraitList(style.psychological_needs, separator),
		},
		{
			id: "workPreference",
			title: titles.workPreference,
			icon: "building",
			body: formatStyleTraitList(style.work_preferences, separator),
		},
	];

	return items.filter((item) => item.body.length > 0);
}

export function roundAwarenessScore(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Math.round(value);
}

export function getOverallStressfulDominantMindState(
	scores: OverallStressfulScoreBreakdown,
): OverallStressfulDominantMindState {
	const { cred, cgreen, cgrey } = scores;
	const craCopy = ASSESSMENT_REPORT_QUADRANT_STYLE_SHARED;
	const accent = ASSESSMENT_FTUE_DOMINANT_MIND_STATE_ACCENT;

	if (cred >= cgreen && cred >= cgrey) {
		return {
			label: craCopy.craControlLabel,
			accentClassName: accent.control,
		};
	}

	if (cgreen >= cgrey) {
		return {
			label: craCopy.craAffiliateLabel,
			accentClassName: accent.affiliate,
		};
	}

	return {
		label: craCopy.craRetreatLabel,
		accentClassName: accent.retreat,
	};
}

export { extractColorCategoryLabelFromDescription };
