import type { LucideIcon } from "lucide-react";

export type AssessmentReportSectionLoadState =
	| "idle"
	| "loading"
	| "ok"
	| "error";

export type AssessmentReportStatusFlowProps = {
	phase: "generating" | "error";
	rotatingStepIndex: number;
	onRetry: () => void;
	onReturnToDashboard: () => void;
	returnCtaLabel: string;
};

export type AssessmentReportLoaderPillState =
	| "complete"
	| "current"
	| "pending";

export type AssessmentReportProgressRingProps = {
	progress: number;
	className?: string;
};

export type AssessmentReportStepPillProps = {
	state: AssessmentReportLoaderPillState;
	Icon: LucideIcon;
};
