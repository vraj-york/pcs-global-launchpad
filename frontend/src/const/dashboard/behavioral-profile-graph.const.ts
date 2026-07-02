import type { AssessmentReportContextStyleSectionKey } from "@/types";

export const BEHAVIORAL_PROFILE_GRAPH_SCORED_ASSESSMENT_STATUSES = [
	"report_generated",
	"scored",
] as const;

export const BEHAVIORAL_PROFILE_GRAPH_TABS = [
	{ id: "professional_typical", label: "Professional Typical" },
	{ id: "professional_stressful", label: "Professional Stressful" },
	{ id: "personal_typical", label: "Personal Typical" },
	{ id: "personal_stressful", label: "Personal Stressful" },
] as const satisfies readonly {
	id: AssessmentReportContextStyleSectionKey;
	label: string;
}[];

export const BEHAVIORAL_PROFILE_GRAPH_CARD = {
	title: "Your Behavioral Profile Graph",
	subtitle: "All 4 sections' details with chart will be displayed over here",
	ariaLabel: "Your Behavioral Profile Graph",
	tabsAriaLabel: "Behavioral profile contexts",
	loadError: "Could not load your behavioral profile. Try again.",
	retryButton: "Try again",
	noAssessmentTitle: "Assessment results unavailable",
	noAssessmentBody:
		"Complete your behavioral assessment to view your profile graph here.",
} as const;
