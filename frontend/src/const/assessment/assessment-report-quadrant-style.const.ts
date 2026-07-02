import type { AssessmentReportContextStyleSectionKey } from "@/types";
import { ASSESSMENT_REPORT_RESULTS_PAGE } from "./assessment-report-results-page.const";

/** Shared CRA / awareness / traits copy for PRT, PRS, PET, PES sections. */
export const ASSESSMENT_REPORT_QUADRANT_STYLE_SHARED = {
	awarenessTitle: "Awareness",
	awarenessBody:
		"Awareness reflects how well you understand your thoughts, emotions, and Behaviors and how consciously you respond rather than react.",
	awarenessGaugeAriaLabel: (score: number) => `Awareness score ${score}`,
	craChartAriaLabel: "Control, Affiliate, and Retreat scores",
	craControlLabel: "Control",
	craAffiliateLabel: "Affiliate",
	craRetreatLabel: "Retreat",
	craChartMaxScore: 150,
	warningSignsTitle: "Warning Signs",
	traitListSeparator: " • ",
	characterStrengthsAriaLabel: "Character strengths",
} as const;

export const ASSESSMENT_REPORT_STYLE_TRAIT_TITLES = {
	environment: "Environment",
	strengths: "Strengths",
	likes: "Likes",
	dislikes: "Dislikes",
	psychNeeds: "Psych Needs",
	workPreference: "Work Preference",
} as const;

/** CRA triangle chart layout (viewBox units). */
export const ASSESSMENT_REPORT_CRA_CHART_GEOMETRY = {
	viewWidth: 259.959,
	viewHeight: 225.131,
	hub: { x: 129.979, y: 150.086 },
	controlVertex: { x: 129.979, y: 1 },
	affiliateVertex: { x: 259.093, y: 224.63 },
	retreatVertex: { x: 0.866, y: 224.63 },
} as const;

export const ASSESSMENT_REPORT_CONTEXT_STYLE_SECTIONS: Record<
	AssessmentReportContextStyleSectionKey,
	{
		sectionId: string;
		sectionTitle: string;
		wheelAriaLabel: string;
		styleIndicatorAriaLabel: (styleNumber: number, title: string) => string;
		loadError: string;
		loadErrorTitle: string;
		loadErrorBody: string;
	}
> = {
	professional_typical: {
		sectionId: ASSESSMENT_REPORT_RESULTS_PAGE.professionalTypicalSectionId,
		sectionTitle: "Professional Typical (PRT)",
		wheelAriaLabel: "BSP color wheel showing your professional typical style",
		styleIndicatorAriaLabel: (styleNumber, title) =>
			`Professional typical style ${styleNumber}, ${title}`,
		loadError:
			"We could not load your professional typical style. Try again later.",
		loadErrorTitle: "Professional typical style unavailable",
		loadErrorBody:
			"Check that you are signed in, the assessment API URL is configured, and this assessment has been scored.",
	},
	professional_stressful: {
		sectionId: ASSESSMENT_REPORT_RESULTS_PAGE.professionalStressfulSectionId,
		sectionTitle: "Professional Stressful (PRS)",
		wheelAriaLabel: "BSP color wheel showing your professional stressful style",
		styleIndicatorAriaLabel: (styleNumber, title) =>
			`Professional stressful style ${styleNumber}, ${title}`,
		loadError:
			"We could not load your professional stressful style. Try again later.",
		loadErrorTitle: "Professional stressful style unavailable",
		loadErrorBody:
			"Check that you are signed in, the assessment API URL is configured, and this assessment has been scored.",
	},
	personal_typical: {
		sectionId: ASSESSMENT_REPORT_RESULTS_PAGE.personalTypicalSectionId,
		sectionTitle: "Personal Typical (PET)",
		wheelAriaLabel: "BSP color wheel showing your personal typical style",
		styleIndicatorAriaLabel: (styleNumber, title) =>
			`Personal typical style ${styleNumber}, ${title}`,
		loadError:
			"We could not load your personal typical style. Try again later.",
		loadErrorTitle: "Personal typical style unavailable",
		loadErrorBody:
			"Check that you are signed in, the assessment API URL is configured, and this assessment has been scored.",
	},
	personal_stressful: {
		sectionId: ASSESSMENT_REPORT_RESULTS_PAGE.personalStressfulSectionId,
		sectionTitle: "Personal Stressful (PES)",
		wheelAriaLabel: "BSP color wheel showing your personal stressful style",
		styleIndicatorAriaLabel: (styleNumber, title) =>
			`Personal stressful style ${styleNumber}, ${title}`,
		loadError:
			"We could not load your personal stressful style. Try again later.",
		loadErrorTitle: "Personal stressful style unavailable",
		loadErrorBody:
			"Check that you are signed in, the assessment API URL is configured, and this assessment has been scored.",
	},
} as const;

export const ASSESSMENT_REPORT_QUADRANT_STYLE_SECTION_KEYS = [
	"professional_typical",
	"professional_stressful",
	"personal_typical",
	"personal_stressful",
] as const satisfies readonly AssessmentReportContextStyleSectionKey[];
