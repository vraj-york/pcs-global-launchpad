/** BSP report intro YouTube id (embed + watch URLs built from this). */
export const ASSESSMENT_REPORT_INTRO_YOUTUBE_VIDEO_ID = "rVrj_fiMVXE" as const;

export const ASSESSMENT_REPORT_INTRO_VIDEO = {
	embedTitle: "BSP introduction video",
	embedDescription:
		"Embedded YouTube player with standard playback and progress controls.",
	openVideoCard: "Play introduction video",
} as const;

/** Static copy for the report intro section (welcome card and video block). */
export const ASSESSMENT_REPORT_WELCOME_WAGON_WHEEL = {
	iconClassName: "size-28 shrink-0",
	printIconClassName: "size-15 shrink-0 relative z-10",
	watermarkWrapperClassName:
		"pointer-events-none absolute -bottom-34 -right-32 z-0 size-96 select-none opacity-10",
	printWatermarkOverlayClassName:
		"pointer-events-none absolute inset-0 overflow-hidden rounded-xl",
	printWatermarkClassName:
		"absolute -bottom-10 -end-10 size-44 select-none opacity-10",
	props: {
		showLabels: false,
		showHub: true,
		showOuterRing: true,
		showSpokes: true,
		axisOverlay: "none" as const,
		useInteractiveLabels: false,
	},
} as const;

export const ASSESSMENT_REPORT_INTRO_SECTION = {
	thankYouBody:
		"We sincerely thank you for choosing the Behavioral Styles Profile and know that starting today, your life will never be the same – in a positive way!",
	videoTitle: "Watch Introduction Video",
	videoSubtitle: "Dr. John Minarcik explains BSP",
	goalBody:
		"Our goal at PCS-Global is to keep you happier longer, make it easier for you to get out of stress quicker, and to rapidly identify behaviors within yourself and others for optimal performance.",
	awarenessLeadIn:
		"We at PCS believe that the best way to bring about the desired result is to first start with awareness. This report will give you the awareness you need to answer two important questions:",
	question1: "Which of my behaviors do I like and want to strengthen?",
	question2: "Which of my behaviors would I like to change?",
	awarenessClosing:
		"When you are able to answer these two questions, you will also be able to identify your specific warning signs indicating if you are experiencing prolonged stress.",
} as const;
