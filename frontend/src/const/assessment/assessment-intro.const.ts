/** BSP intro YouTube: https://www.youtube.com/watch?v=KWZaHyIplO0 */
export const ASSESSMENT_INTRO_YOUTUBE_VIDEO_ID = "KWZaHyIplO0" as const;

export const ASSESSMENT_INTRO_VIDEO_MODAL = {
	/** Iframe and region accessible name */
	embedTitle: "BSP introduction video",
	embedDescription:
		"Embedded YouTube player with standard playback and progress controls.",
	/** Thumbnail: click or activate to start playback in this card */
	openVideoCard: "Play introduction video",
} as const;

export const ASSESSMENT_INTRO_CONTENT = {
	stepBadge: "Step 1 of 2 - Introduction to BSP",
	title: "BSP Behavioral Assessment",
	subtitle:
		"A scientifically grounded tool to help you understand how you naturally behave at work, under stress, and in your personal life.",
	videoTitle: "Watch Introduction Video",
	videoSubtitle: "Dr. John Minarcik explains BSP",
	howToAnswerTitle: "How to Answer",
	howToAnswerItems: [
		{
			title: "No right or wrong",
			description:
				"Every answer is valid. There are no better or worse behavioral types.",
		},
		{
			title: "Answer naturally",
			description:
				"Base your answers on your natural tendencies - not how you wish you were.",
		},
		{
			title: "Save & Resume",
			description:
				"Your progress is automatically saved. Come back anytime to continue.",
		},
	] as const,
	importantTipLabel: "Important Tip",
	importantTipBody:
		"Answer based on who you are, not who you want to be. The more honest you are, the more accurate and useful your results will be.",
	sidebarCards: [
		{
			title: "What It Measures",
			items: [
				"Communication style & preferences",
				"Decision-making tendencies",
				"Team dynamics & collaboration",
				"Stress response patterns",
			],
		},
		{
			title: "Why It Matters",
			items: [
				"Improves all your relationships",
				"Boosts professional effectiveness",
				"Enhances emotional intelligence",
				"Unlocks personal growth pathways",
			],
		},
		{
			title: "What You’ll Receive",
			items: [
				"Full behavioral profile report",
				"Personalized insights & strategies",
				"Communication style guide",
				"AI coaching from BiSPy Bot",
			],
		},
	] as const,
	exitAssessment: "Exit Assessment",
	skipIntro: "Skip Intro & Instructions - Start Assessment",
	continueToInstructions: "Continue to Instructions",
} as const;
