import { ASSESSMENT_REPORT_RESULTS_PAGE } from "./assessment-report-results-page.const";

/** Stress Management report section (``decrease_stress`` report_content). */
export const ASSESSMENT_REPORT_STRESS_MANAGEMENT = {
	sectionId: ASSESSMENT_REPORT_RESULTS_PAGE.stressManagementSectionId,
	sectionTitle: "How to use your results to decrease effects of stress?",
	stepsCardTitle: "When feeling stressed, try these steps:",
	primaryCardTitle: {
		ba150: "Congratulations!",
		oa150: "Congratulations!",
	},
	/** Substrings to render semibold inside the secondary (shift) card body. */
	secondaryBoldPhrases: {
		p17812: "under stress, you shift behavioral style components",
		p81217: "under stress, you shift behavioral style components",
		sameregion:
			"under stress, your behavioral style maintains some consistency",
	},
	placeholderToken: "[Professional/Personal]",
	labels: {
		professional: "Professional",
		personal: "Personal",
	},
	loadErrorTitle: "Stress management unavailable",
	loadErrorBody:
		"We could not load your stress management results. Try again later.",
} as const;
