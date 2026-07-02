import { ASSESSMENT_REPORT_RESULTS_PAGE } from "./assessment-report-results-page.const";

/** Your Next Steps report section (``next_steps`` report_content). */
export const ASSESSMENT_REPORT_NEXT_STEPS = {
	sectionId: ASSESSMENT_REPORT_RESULTS_PAGE.yourNextStepsSectionId,
	sectionTitle: "Your next steps!",
	sectionSubtitle:
		"Continue your growth journey with these personalized recommendations",
	cards: {
		left: {
			icon: "users" as const,
			ctaLabel: "Schedule Now",
		},
		right: {
			icon: "share-2" as const,
			ctaLabel: "Share Report",
			usesShareHandler: true,
		},
	},
	loadErrorBody:
		"We could not load your next steps. The rest of your report is still available.",
} as const;
