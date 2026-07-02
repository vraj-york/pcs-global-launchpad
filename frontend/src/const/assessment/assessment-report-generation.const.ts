export const ASSESSMENT_REPORTS_BASE_URL = (
	(import.meta.env.VITE_ASSESSMENT_REPORTS_BASE_URL as string | undefined) ?? ""
)
	.trim()
	.replace(/\/$/, "");

const reportImagesBaseFromEnv = (
	(import.meta.env.VITE_ASSESSMENT_REPORT_IMAGES_BASE_URL as
		| string
		| undefined) ?? ""
)
	.trim()
	.replace(/\/$/, "");

/** Public base for ``report_content`` image paths (e.g. S3 ``…/assessment_report/images``). */
export const ASSESSMENT_REPORT_IMAGES_BASE_URL =
	reportImagesBaseFromEnv ||
	(ASSESSMENT_REPORTS_BASE_URL
		? `${ASSESSMENT_REPORTS_BASE_URL}/assessment_report/images`
		: "");

export const ASSESSMENT_REPORT_POLL_MS = 2500 as const;

export const ASSESSMENT_REPORT_MAX_WAIT_MS = 5 * 60 * 1000;

export const ASSESSMENT_REPORT_STEP_ROTATE_MS = 3000 as const;

export const ASSESSMENT_REPORT_GENERATION = {
	missingDownloadBase:
		"Report download is not configured. Contact support if this continues.",
	downloadUrlError: "Could not download the report. Please try again.",
	welcomeIntroLoadError:
		"We could not load your report introduction. You can still download your PDF.",
	colorInfoLoadError:
		"We could not load the BSP color model section. The rest of your report is still available.",
	communicationEffectivenessLoadError:
		"We could not load the communication effectiveness section. The rest of your report is still available.",
	stressManagementLoadError:
		"We could not load the stress management section. The rest of your report is still available.",
	behaviorVsPersonalityLoadError:
		"We could not load the behavior vs. personality section. The rest of your report is still available.",
	nextStepsLoadError:
		"We could not load your next steps section. The rest of your report is still available.",
	bspStylesLoadError:
		"We could not load BSP style details for the color wheel. The rest of your report is still available.",
	reportResultsLoadError:
		"We could not load this assessment. Return to the assessment and try again.",
	reportResultsUnavailable:
		"This report is not available yet. Finish the assessment or wait for generation to complete.",
	timeEstimatePill: "This usually takes ~30 seconds",
	processingLabel: "Processing...",
	errorTitle: "Something Went Wrong!",
	errorSubtitleLead:
		"We encountered a temporary issue while generating your assessment Result. ",
	errorSubtitleEmphasis: "Your responses have been safely saved",
	errorSubtitleTrail: ", and you can try again without losing progress.",
	retryCta: "Retry Result Generation",
	returnToDashboardCta: "Return to Dashboard",
	printCaptureError:
		"We could not prepare your report layout. Please try again.",
	printUploadError:
		"We could not upload your report snapshot. Please try again.",
	enqueueReportError: "We could not start PDF generation. Please try again.",
	pipelineCancelled: "Cancelled",
	pipelineFailedAssessmentStatus: "Failed to load assessment status.",
	pipelineTimedOutScoring: "Timed out waiting for assessment scoring.",
	pipelineTimedOutPdf: "Timed out waiting for PDF generation.",
} as const;

export const ASSESSMENT_REPORT_GENERATION_STEPS = [
	{
		layout: "progress" as const,
		title: "Analyzing your behavioral patterns...",
		subtitle: "Please wait while we process your results",
		percentLabel: "25%",
		barFillPercent: 25,
		ringProgress: 0.25,
		emphasizePercent: false,
	},
	{
		layout: "progress" as const,
		title: "Calculating your behavioral profile scores...",
		subtitle: "Please wait while we process your results",
		percentLabel: "50%",
		barFillPercent: 50,
		ringProgress: 0.5,
		emphasizePercent: false,
	},
	{
		layout: "progress" as const,
		title: "Analyzing your behavioral patterns",
		subtitle: "Please wait while we process your results",
		percentLabel: "75%",
		barFillPercent: 75,
		ringProgress: 0.75,
		emphasizePercent: false,
	},
	{
		layout: "progress" as const,
		title: "Preparing your full report...",
		subtitle: "Please wait while we process your results",
		percentLabel: "98%",
		barFillPercent: 98,
		ringProgress: 0.98,
		emphasizePercent: true,
	},
	{
		layout: "interstitial" as const,
		title: "Your report is ready!",
		subtitle: "Redirecting to your result...",
	},
] as const;

export const ASSESSMENT_REPORT_INTERSTITIAL_STEP_INDEX =
	ASSESSMENT_REPORT_GENERATION_STEPS.length - 1;

export const ASSESSMENT_REPORT_LAST_PROGRESS_STEP_INDEX =
	ASSESSMENT_REPORT_INTERSTITIAL_STEP_INDEX - 1;

export const ASSESSMENT_REPORT_MIN_LOADER_MS =
	ASSESSMENT_REPORT_GENERATION_STEPS.length * ASSESSMENT_REPORT_STEP_ROTATE_MS;
