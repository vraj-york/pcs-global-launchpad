import { bspColorWheelStyleInfoPrint } from "@/assets/assessment";
import type { AssessmentReportContextStyleSectionKey } from "@/types";

export const ASSESSMENT_REPORT_PRINT = {
	brandFooterLabel: "BSPBlueprint",
	previewBanner:
		"Screen preview at ¼ scale. Browser print: choose Landscape, margins None, headers/footers off.",
	loadingLabel: "Loading printable report…",
	loadFailedTitle: "Printable report could not be loaded",
	loadFailedBody:
		"Check that the assessment is scored and you are signed in. Open DevTools → Network for failed requests to user-styles or report-content.",
	loadFailedWelcomeLabel: "Report content (welcome)",
	loadFailedStylesLabel: "Assessment styles",
	loadFailedStatusOk: "OK",
	loadFailedStatusError: "Failed",
	loadFailedStatusLoading: "Loading",
	captureRenderReadyPollMs: 200,
	captureRenderReadyMaxMs: 120_000,
	captureSnapshotBuildError: "Failed to build print HTML snapshot.",
	captureLayoutLoadError: "Print layout failed to load report data.",
	captureRenderTimeoutError: "Timed out waiting for report print render.",
} as const;

export const BSP_COLOR_WHEEL_PRINT_STYLE_INFO = {
	src: bspColorWheelStyleInfoPrint,
	ariaLabel:
		"BSP behavioral styles diagram with Adaptarian and styles 1 through 12, trait callouts, and connector lines",
} as const;

type AssessmentReportPrintContextPageKey =
	| "prtOverview"
	| "prtTraits"
	| "prsOverview"
	| "prsTraits"
	| "petOverview"
	| "petTraits"
	| "pesOverview"
	| "pesTraits";

export const ASSESSMENT_REPORT_PRINT_CONTEXT_PAGES = [
	{
		pageKey: "prtOverview",
		contextKey: "professional_typical",
		printPart: "overview",
	},
	{
		pageKey: "prtTraits",
		contextKey: "professional_typical",
		printPart: "traits",
	},
	{
		pageKey: "prsOverview",
		contextKey: "professional_stressful",
		printPart: "overview",
	},
	{
		pageKey: "prsTraits",
		contextKey: "professional_stressful",
		printPart: "traits",
	},
	{
		pageKey: "petOverview",
		contextKey: "personal_typical",
		printPart: "overview",
	},
	{
		pageKey: "petTraits",
		contextKey: "personal_typical",
		printPart: "traits",
	},
	{
		pageKey: "pesOverview",
		contextKey: "personal_stressful",
		printPart: "overview",
	},
	{
		pageKey: "pesTraits",
		contextKey: "personal_stressful",
		printPart: "traits",
	},
] as const satisfies readonly {
	pageKey: AssessmentReportPrintContextPageKey;
	contextKey: AssessmentReportContextStyleSectionKey;
	printPart: "overview" | "traits";
}[];

export const ASSESSMENT_REPORT_PRINT_PAGE_DEFINITIONS = [
	{ key: "introOne", label: "Intro Section - 1" },
	{ key: "introTwo", label: "Intro Section - 2" },
	{ key: "colorModel", label: "BSP Color Model - 1" },
	{ key: "colorWheelQuadrant", label: "BSP Color Wheel - 2" },
	{ key: "colorWheelColor", label: "BSP Color Wheel - 3" },
	{ key: "colorWheelStyleInfo", label: "BSP Color Wheel - 4" },
	{ key: "overallStyleOverview", label: "Your overall behavioral style" },
	{
		key: "overallStyleDescription",
		label: "Your overall behavioral style — description",
	},
	{ key: "prtOverview", label: "Professional Typical (PRT)" },
	{ key: "prtTraits", label: "Professional Typical (PRT) — traits" },
	{ key: "prsOverview", label: "Professional Stressful (PRS)" },
	{ key: "prsTraits", label: "Professional Stressful (PRS) — traits" },
	{ key: "petOverview", label: "Personal Typical (PET)" },
	{ key: "petTraits", label: "Personal Typical (PET) — traits" },
	{ key: "pesOverview", label: "Personal Stressful (PES)" },
	{ key: "pesTraits", label: "Personal Stressful (PES) — traits" },
	{
		key: "communication",
		label: "How to increase communication effectiveness?",
	},
	{
		key: "stress",
		label: "How to use your results to decrease effects of stress?",
	},
	{ key: "behaviorVsPersonality", label: "Behavior vs. Personality" },
	{ key: "nextSteps", label: "Your next steps!" },
] as const;

export const ASSESSMENT_REPORT_PRINT_PAGE_NUMBERS =
	ASSESSMENT_REPORT_PRINT_PAGE_DEFINITIONS.reduce(
		(acc, page, index) => {
			acc[page.key] = index + 1;
			return acc;
		},
		{} as Record<
			(typeof ASSESSMENT_REPORT_PRINT_PAGE_DEFINITIONS)[number]["key"],
			number
		>,
	);

export const ASSESSMENT_REPORT_PRINT_PAGES =
	ASSESSMENT_REPORT_PRINT_PAGE_DEFINITIONS.map((page, index) => ({
		key: page.key,
		label: page.label,
		pageNumber: index + 1,
	}));

export const ASSESSMENT_REPORT_PRINT_TOTAL_PAGES =
	ASSESSMENT_REPORT_PRINT_PAGE_DEFINITIONS.length;

export function formatAssessmentReportPrintPageLabel(
	pageNumber: number,
	totalPages: number = ASSESSMENT_REPORT_PRINT_TOTAL_PAGES,
): string {
	const padded = String(pageNumber).padStart(2, "0");
	const total = String(totalPages).padStart(2, "0");
	return `${padded}/${total}`;
}
