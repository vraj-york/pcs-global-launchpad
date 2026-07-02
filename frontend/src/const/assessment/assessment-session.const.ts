export const ASSESSMENT_SECTION_COUNT = 4;
export const ASSESSMENT_QUESTIONS_PER_SECTION = 15;

export const ASSESSMENT_SESSION = {
	loading: "Preparing your assessment…",
	errorLoad: "We could not start the assessment. Please try again.",
	errorNoBaseUrl: "Assessment service is not configured.",
	reminderTitle: "Just a Reminder",
	reminderLine: {
		a: "Select or tap",
		emph10: "10",
		b: " for ",
		phraseMost: '"Most like me"',
		c: " and ",
		emph1: "1",
		d: " for ",
		phraseLeast: '"Least like me"',
		e: " on any option.",
	} as const,
	sections: [
		{
			abbr: "PRT",
			title: "Professional Typical",
			subtitle: "How you show up in everyday work settings.",
		},
		{
			abbr: "PRS",
			title: "Professional Stressful",
			subtitle: "How your behavior shifts under workplace pressure.",
		},
		{
			abbr: "PET",
			title: "Personal Typical",
			subtitle: "How you act in your personal and family day-to-day life.",
		},
		{
			abbr: "PST",
			title: "Personal Stressful",
			subtitle:
				"How you respond when life feels personally stressful or intense.",
		},
	],
	backToInstructions: "Back to instructions",
	progressLabel: (completed: number) =>
		`${completed} / ${ASSESSMENT_SECTION_COUNT * ASSESSMENT_QUESTIONS_PER_SECTION} completed`,
	sectionProgressLabel: (completed: number) =>
		`${completed} / ${ASSESSMENT_QUESTIONS_PER_SECTION} completed`,
	saveAndExit: "Save & Exit",
	saveAndExitTooltip:
		"Your progress will be automatically saved, allowing you to resume from where you left off.",
	submitting: "Submitting...",
	completeSectionsFirst: "Please answer all the questions",
	finishMarkCompleteError:
		"We could not mark your assessment complete. Please try again.",
	saveFailed: "Could not save your answers. Please try again.",
	startOver: "Start again",
} as const;
