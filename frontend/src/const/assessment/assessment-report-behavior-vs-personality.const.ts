import { ASSESSMENT_REPORT_RESULTS_PAGE } from "./assessment-report-results-page.const";

/** Behavior vs. Personality (``bevspe_information`` report_content). */
export const ASSESSMENT_REPORT_BEHAVIOR_VS_PERSONALITY = {
	sectionId: ASSESSMENT_REPORT_RESULTS_PAGE.behaviorVsPersonalitySectionId,
	/** Fallback when ``bevspe_tile`` is missing from API. */
	sectionTitleFallback: "Behavior vs. Personality",
	/** Semibold spans inside ``bevspe_dsc1`` paragraphs (matched case-insensitively). */
	dsc1EmphasisPhrases: [
		"4 basic types: control, adapt, affiliate, and detach.",
	] as const,
	dsc2EmphasisPhrases: ["Behavioral tendencies,", "Behaviors"] as const,
	pills: {
		behavior: {
			title: "Behavior",
			description: "Observable, flexible, context-dependent patterns of action",
			icon: "sparkle" as const,
			surfaceClassName: "bg-primary text-light-same",
			iconButtonClassName: "bg-interactive-primary-hover text-light-same",
		},
		personality: {
			title: "Personality",
			description: "Deep, stable traits shaped by genes and life experience",
			icon: "drama" as const,
			surfaceClassName: "bg-interactive-secondary text-light-same",
			iconButtonClassName: "bg-interactive-secondary-hover text-light-same",
		},
	},
	pillOrder: ["behavior", "personality"] as const,
	loadErrorBody:
		"We could not load the behavior vs. personality section. Try again later.",
} as const;
