/**
 * In-browser assessment report. Static copy where noted; welcome paragraphs from
 * ``report_content`` (``welcome_copy``).
 */
export const ASSESSMENT_REPORT_VIEW = {
	sectionKeys: {
		welcomeAndOverall: "welcome_and_overall",
		colorInfo: "color_info",
		increaseCommunication: "increase_communication",
		decreaseStress: "decrease_stress",
		bevspeInformation: "bevspe_information",
		nextSteps: "next_steps",
	},
	introTitle: "Understanding your Behavioral assessment",
	welcomeGreetingPrefix: "Welcome, ",
	welcomeWheelImageAlt: "Behavioral styles overview wheel",
	introParagraphCount: 2,
	/** When profile has no usable name (greeting + results page). */
	welcomeDisplayNameFallback: "there",
} as const;

export function formatAssessmentReportWelcomeGreeting(
	displayName: string,
): string {
	const name =
		displayName.trim() || ASSESSMENT_REPORT_VIEW.welcomeDisplayNameFallback;
	return `${ASSESSMENT_REPORT_VIEW.welcomeGreetingPrefix}${name}`;
}
