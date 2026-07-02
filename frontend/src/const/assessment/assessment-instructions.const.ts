export const ASSESSMENT_INSTRUCTIONS_CONTENT = {
	stepBadge: "Step 2 of 2 - Instructions",
	title: "How to Complete the Assessment",
	subtitle:
		"Read through these instructions carefully before starting. Understanding the scale will help you give more accurate and useful responses.",
	sectionsOverviewLead: "There are ",
	sectionsOverviewEmphasis: "4 section of 15 questions each",
	sectionsOverviewTail: ".",
	scaleCardTitle: "Understanding the Scale",
	scaleLabels: [
		{
			value: "1",
			title: "Least like me",
			description: "This behavior is very uncommon for me",
		},
		{
			value: "5",
			title: "Sometimes",
			description: "This happens about half the time for me",
		},
		{
			value: "10",
			title: "Most like me",
			description: "This is very typical of how I behave",
		},
	] as const,
	scaleAxisLeast: "Least like me",
	scaleAxisMost: "Most like me",
	criticalRulesTitle: "Critical Rules",
	criticalRules: [
		{
			title: "Assign ONE option a score of 10",
			description: "The option that is MOST like you must get exactly 10",
		},
		{
			title: "Assign ONE option a score of 1",
			description: "The option that is LEAST like you must get exactly 1",
		},
		{
			title: "Remaining TWO, scores between 2–9",
			description: "The other options should reflect your relative tendencies",
		},
	] as const,
	importantNotesTitle: "Important Notes",
	importantNotes: [
		{
			lead: "",
			emphasis: "Answer as you ARE",
			tail: ", not as you think you should be.",
		},
		{
			lead: "Think about your ",
			emphasis: "current role",
			tail: " not the situation.",
		},
		{
			lead: "Consider your ",
			emphasis: "typical patterns",
			tail: ", not one-off events.",
		},
		{
			lead: "Your answers are completely ",
			emphasis: "private & confidential",
			tail: ".",
		},
	] as const,
	demoTitle: "Interactive Demo",
	demoHeading: "Try the Live Demo below",
	demoSubheading:
		"Practice using the sliders. Remember: one must be 10, one must be 1.",
	demoQuestion: "When working in a team, I tend to...",
	demoStatements: [
		"I take charge and lead others decisively",
		"I listen carefully and build consensus",
		"I work through problems analytically",
		"I support others and maintain harmony",
	] as const,
	demoMostLikeLabel: "Most like me",
	demoLeastLikeLabel: "Least like me",
	demoAriaSelectScore: "Select score",
	demoAriaForStatement: "for",
	demoAriaDisabledTaken: "Already used on another line",
	demoTooltip1Or10TakenTitle: "1 or 10 is already in use",
	demoTooltip1Or10TakenBody:
		"Select it on a different line or pick another value.",
	demoErrorDuplicateTitle: "You’ve selected same number in another option.",
	demoErrorDuplicateBody: "Select a different number for each option.",
	demoErrorMissing1And10Title:
		"1 & 10 options hasn’t been selected in any of the options.",
	demoErrorMissing1And10Body:
		'Select or tap 10 for "Most like me" and 1 for "Least like me" on any option.',
	demoErrorOtherTitle: "This selection is not valid",
	demoErrorNeedOne1: "Assign exactly one option a score of 1 (least like you).",
	demoErrorNeedOne10:
		"Assign exactly one option a score of 10 (most like you).",
	demoErrorNeedUnique:
		"All four scores must be different. Use 1 through 10 only once each.",
	demoErrorMiddle2to9:
		"After choosing 1 and 10, the other two scores must be between 2 and 9.",
	demoSuccessTitle: "Perfect",
	demoSuccessBody:
		"You’ve selected one option is 10 (most) and one is 1 (least).",
	validationPill1And10Not: "1 & 10 not selected",
	validationPill1Not: "1 not selected",
	validationPill10Not: "10 not selected",
	validationPillSameNumber: "Same number selected",
	proTipTitle: "We’ve PRO tip for you!",
	proTipLead: "Use the ",
	proTipEmphasis: "full 1-10 range",
	proTipTail:
		" for more accurate results. Avoid clustering all your answers in the middle - the spread between your scores is what reveals your true behavioral profile.",
	exitAssessment: "Exit Assessment",
	backToIntroSection: "Back to Intro Section",
	startAssessment: "Let’s Start Assessment",
	continueAssessment: "Continue Assessment",
} as const;
