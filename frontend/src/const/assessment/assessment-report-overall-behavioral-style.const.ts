import type { AssessmentScoreStyleContextKey } from "@/types";

export const ASSESSMENT_REPORT_OVERALL_BEHAVIORAL_STYLE = {
	sectionTitle: "Your overall Behavioral style",
	sectionSubtitle:
		"Overall type is the sum of four quadrants (PRT, PRS, PET & PES) of Behavior.",
	wheelAriaLabel:
		"BSP color wheel showing your overall behavioral style number",
	styleIndicatorAriaLabel: (styleNumber: number, title: string) =>
		`Overall style ${styleNumber}, ${title}`,
	characterStrengthsAriaLabel: "Character strengths",
	contextCardsAriaLabel: "Styles in other behavioral contexts",
	loadError:
		"We could not load your behavioral style breakdown. Try again later.",
	loadErrorTitle: "Style breakdown unavailable",
	loadErrorBody:
		"Check that you are signed in, the assessment API URL is configured, and this assessment has been scored.",
	overallStyleDescriptionLead: (title: string) => `You are a ${title} `,
} as const;

export const ASSESSMENT_REPORT_CONTEXT_STYLE_LABELS: Record<
	AssessmentScoreStyleContextKey,
	string
> = {
	overall: "Overall",
	professional_typical: "Professional Typical (PRT)",
	professional_stressful: "Professional Stressful (PRS)",
	personal_typical: "Personal Typical (PET)",
	personal_stressful: "Personal Stressful (PES)",
};

export const ASSESSMENT_REPORT_QUADRANT_CONTEXT_KEYS = [
	"professional_typical",
	"professional_stressful",
	"personal_typical",
	"personal_stressful",
] as const satisfies readonly AssessmentScoreStyleContextKey[];
