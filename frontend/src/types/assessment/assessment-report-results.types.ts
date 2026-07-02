import type { ReactNode } from "react";
import type { ASSESSMENT_REPORT_RESULTS_NAV } from "@/const";
import type { ViewUserTabId } from "@/types";

export type AssessmentReportResultsNavItem =
	(typeof ASSESSMENT_REPORT_RESULTS_NAV)[number];

export type AssessmentReportResultsNavSection = AssessmentReportResultsNavItem;

export type AssessmentReportResultsNavId =
	AssessmentReportResultsNavSection["id"];

export type AssessmentReportSectionScrollNode = {
	navId: AssessmentReportResultsNavId;
	element: HTMLElement;
};

export type AssessmentReportResultsPhase =
	| "load"
	| "generating"
	| "ready"
	| "error";

export type AssessmentReportResultsRouteParams = {
	assessmentId: string;
};

export type PrefetchedReportResults = {
	reportKey: string;
	completedAt: string | null;
};

export type AssessmentReportResultsReturnTo = {
	path: string;
	state?: { activeTab?: ViewUserTabId };
};

export type AssessmentReportResultsLocationState = {
	prefetchedReportResults?: PrefetchedReportResults;
	returnTo?: AssessmentReportResultsReturnTo;
	triggerCoaching?: boolean;
};

export type AssessmentReportResultsBackVariant = "back" | "close";

export type AssessmentReportResultsHeaderProps = {
	pageTitle: string;
	completedSubtitle: string;
	backLabel: string;
	backVariant: AssessmentReportResultsBackVariant;
	showTitleAndSubtitle: boolean;
	showShare: boolean;
	shareLabel: string;
	downloadLabel: string;
	downloadDisabled: boolean;
	isDownloading?: boolean;
	onBack: () => void;
	onShare: () => void;
	onDownload: () => void;
};

export type AssessmentReportResultsShellProps = {
	completedSubtitle: string;
	downloadDisabled: boolean;
	isDownloading?: boolean;
	backLabel: string;
	backVariant: AssessmentReportResultsBackVariant;
	showTitleAndSubtitle: boolean;
	showShare: boolean;
	onBack: () => void;
	onShare: () => void;
	onDownload: () => void;
	children: ReactNode;
};

export type AssessmentReportScaledLayoutFrameProps = {
	designWidth: number;
	designHeight: number;
	fitInset?: number;
	minScale?: number;
	className?: string;
	innerClassName?: string;
	allowOverflow?: boolean;
	children: ReactNode;
};
