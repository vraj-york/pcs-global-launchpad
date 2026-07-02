import type { ASSESSMENT_REPORT_NEXT_STEPS } from "@/const";

export type NextStepCardIconKey =
	(typeof ASSESSMENT_REPORT_NEXT_STEPS.cards)[keyof typeof ASSESSMENT_REPORT_NEXT_STEPS.cards]["icon"];

export type NextStepCardContent = {
	title: string;
	description: string;
	link: string;
};

export type NextStepsResolvedContent = {
	left: NextStepCardContent;
	right: NextStepCardContent;
};

export type NextStepActionCardVariant = "default" | "print";

export type YourNextStepsProps = {
	content: NextStepsResolvedContent;
	onShare: () => void;
	variant?: NextStepActionCardVariant;
	/** Absolute URL for Share Report in print/PDF (opens share flow in browser). */
	shareReportHref?: string;
};

export type NextStepActionCardProps = {
	card: NextStepCardContent;
	icon: NextStepCardIconKey;
	ctaLabel: string;
	showCta?: boolean;
	usesShareHandler?: boolean;
	shareReportHref?: string;
	onShare?: () => void;
};
