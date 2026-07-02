import { ASSESSMENT_REPORT_RESULTS_PAGE } from "./assessment-report-results-page.const";

/** Communication Effectiveness report section (``increase_communication``). */
export const ASSESSMENT_REPORT_COMMUNICATION_EFFECTIVENESS = {
	sectionId: ASSESSMENT_REPORT_RESULTS_PAGE.communicationEffectivenessSectionId,
	sectionTitle: "How to increase communication effectiveness?",
	playThumbnailAriaLabel: "Video thumbnail",
	videoThumbnailPlayButtonClassName:
		"flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background py-2 pe-2 ps-2.5",
	videoThumbnailPlayIconClassName: "size-4 fill-info text-info",
	/** Top intro copy in ``increase_communication``. */
	icdetailsKey: "icdetails",
	/** ``report_content`` keys for gray / green / red card body copy. */
	bodyKeys: {
		gray: "icgray",
		green: "icgreen",
		red: "icred",
	},
	/** ``report_content`` keys for S3 / YouTube poster images per color card. */
	imageKeys: {
		gray: "icgray_img",
		green: "icgreen_img",
		red: "icred_img",
	},
	/** ``report_content`` YouTube watch links per color card. */
	youtubeLinkKeys: {
		gray: "icgray_youtube_link",
		green: "icgreen_youtube_link",
		red: "icred_youtube_link",
	},
	openColorVideoAriaLabel: (color: "gray" | "green" | "red") =>
		`Open ${color} traits communication video on YouTube`,
	cards: {
		gray: {
			surfaceClassName:
				"border-icon-primary bg-muted/50 dark:border-accent dark:bg-muted/30",
			printSurfaceClassName: "border-icon-primary bg-icon-primary/10",
			traitLabelClassName: "text-icon-primary",
			checkIconClassName: "text-icon-primary dark:text-accent",
		},
		green: {
			surfaceClassName: "border-brand-green bg-success-bg",
			printSurfaceClassName: "border-brand-green bg-success-bg",
			traitLabelClassName: "text-brand-green",
			checkIconClassName: "text-brand-green",
		},
		red: {
			surfaceClassName: "border-destructive bg-destructive/10",
			printSurfaceClassName: "border-brand-red bg-error-bg",
			traitLabelClassName: "text-brand-red",
			checkIconClassName: "text-destructive",
		},
	},
} as const;

export const ASSESSMENT_REPORT_COMMUNICATION_CARD_ORDER = [
	"gray",
	"green",
	"red",
] as const;
