export const ASSESSMENT_REPORT_RESULTS_PAGE = {
	primarySectionId: "report-section-behavioral-assessment",
	colorModelSectionId: "report-section-bsp-color-model",
	colorWheelSectionId: "report-section-bsp-color-wheel",
	overallBehavioralStyleSectionId: "report-section-overall-behavioral-style",
	professionalTypicalSectionId: "report-section-professional-typical",
	professionalStressfulSectionId: "report-section-professional-stressful",
	personalTypicalSectionId: "report-section-personal-typical",
	personalStressfulSectionId: "report-section-personal-stressful",
	communicationEffectivenessSectionId:
		"report-section-communication-effectiveness",
	stressManagementSectionId: "report-section-stress-management",
	behaviorVsPersonalitySectionId: "report-section-behavior-vs-personality",
	yourNextStepsSectionId: "report-section-your-next-steps",
	pageTitle: "Your Behavioral Assessment Result",
	closeLabel: "Close",
	backLabel: "Back",
	shareLabel: "Share",
	downloadPdfLabel: "Download Result (PDF)",
	shareTitle: "Behavioral assessment results",
	shareLinkCopied: "Link copied to clipboard.",
	shareFailed: "Could not share or copy the link. Try again.",
	completedUnknown: "Completion time unavailable.",
	completedOnLinePrefix: "Completed on ",
	reportSectionsNavLabel: "Report sections",
	sectionShellClassName:
		"mx-auto flex w-full min-w-0 max-w-full flex-col gap-8 overflow-x-hidden rounded-3xl scroll-mt-28 bg-background p-4 sm:p-6 lg:p-8",
} as const;

/** Admin "View Result" modal (User Directory → View Details → Assessments & Results). */
export const ASSESSMENT_RESULT_MODAL = {
	title: "Assessment Result",
	downloadLabel: "Download",
	closeLabel: "Close",
} as const;

export const ASSESSMENT_REPORT_RESULTS_NAV_STYLES = {
	listClassName: "flex w-full flex-col gap-2.5 lg:max-w-60",
	itemBaseClassName:
		"flex w-full min-h-10 items-center rounded-lg px-3 text-left text-small font-semibold leading-small transition-[color,box-shadow,background-color]",
	itemActiveClassName: "bg-background py-1.5 text-primary shadow-md",
	itemInactiveClassName: "py-2 text-text-secondary hover:bg-background/60",
	itemImplementedClassName: "cursor-pointer",
	itemDisabledClassName: "cursor-not-allowed opacity-60",
} as const;

export const ASSESSMENT_REPORT_SCALED_LAYOUT = {
	defaultFitInset: 1,
	defaultMinScale: 0.35,
} as const;

export const ASSESSMENT_REPORT_RESULTS_NAV = [
	{
		id: "behavioral-assessment",
		label: "Behavioral Assessment",
		targetSectionId: ASSESSMENT_REPORT_RESULTS_PAGE.primarySectionId,
	},
	{
		id: "bsp-color-model",
		label: "BSP Color Model",
		targetSectionId: ASSESSMENT_REPORT_RESULTS_PAGE.colorModelSectionId,
	},
	{
		id: "bsp-color-wheel",
		label: "BSP Color Wheel",
		targetSectionId: ASSESSMENT_REPORT_RESULTS_PAGE.colorWheelSectionId,
	},
	{
		id: "your-behavioral-style",
		label: "Your Behavioral Style",
		targetSectionId:
			ASSESSMENT_REPORT_RESULTS_PAGE.overallBehavioralStyleSectionId,
	},
	{
		id: "prt",
		label: "Professional Typical (PRT)",
		targetSectionId:
			ASSESSMENT_REPORT_RESULTS_PAGE.professionalTypicalSectionId,
	},
	{
		id: "prs",
		label: "Professional Stressful (PRS)",
		targetSectionId:
			ASSESSMENT_REPORT_RESULTS_PAGE.professionalStressfulSectionId,
	},
	{
		id: "pet",
		label: "Personal Typical (PET)",
		targetSectionId: ASSESSMENT_REPORT_RESULTS_PAGE.personalTypicalSectionId,
	},
	{
		id: "pes",
		label: "Personal Stressful (PES)",
		targetSectionId: ASSESSMENT_REPORT_RESULTS_PAGE.personalStressfulSectionId,
	},
	{
		id: "communication-effectiveness",
		label: "Communication Effectiveness",
		targetSectionId:
			ASSESSMENT_REPORT_RESULTS_PAGE.communicationEffectivenessSectionId,
	},
	{
		id: "stress-management",
		label: "Stress Management",
		targetSectionId: ASSESSMENT_REPORT_RESULTS_PAGE.stressManagementSectionId,
	},
	{
		id: "behavior-vs-personality",
		label: "Behavior vs. Personality",
		targetSectionId:
			ASSESSMENT_REPORT_RESULTS_PAGE.behaviorVsPersonalitySectionId,
	},
	{
		id: "your-next-steps",
		label: "Your Next Steps",
		targetSectionId: ASSESSMENT_REPORT_RESULTS_PAGE.yourNextStepsSectionId,
	},
] as const;
