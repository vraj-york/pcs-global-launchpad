import type { ReactNode } from "react";
import type { AssessmentReportContextStyleSectionKey } from "@/types";

export type BehavioralProfileGraphCardPhase =
	| "loading"
	| "ready"
	| "error"
	| "no-assessment";

export type LatestScoredAssessment = {
	id: string;
	completedAt: string | null;
};

export type BehavioralProfileGraphCardProps = {
	className?: string;
	showExtendedStyleDetails?: boolean;
	title?: string;
	subtitle?: string;
	ariaLabel?: string;
	assessmentId?: string;
	skipStylesProvider?: boolean;
};

export type BehavioralProfileGraphTabId =
	AssessmentReportContextStyleSectionKey;

export type BehavioralProfileGraphTab = {
	id: BehavioralProfileGraphTabId;
	label: string;
};

export type BehavioralProfileGraphCardShellProps =
	BehavioralProfileGraphCardProps & {
		children: ReactNode;
	};

export type BehavioralProfileGraphTabsProps = {
	activeTab: BehavioralProfileGraphTabId;
	onTabChange: (tabId: BehavioralProfileGraphTabId) => void;
};

export type BehavioralProfileGraphTabPanelProps = {
	activeTab: BehavioralProfileGraphTabId;
	showExtendedStyleDetails?: boolean;
};

export type BehavioralProfileGraphCardBodyProps =
	BehavioralProfileGraphCardProps & {
		assessmentId: string;
	};

export type BehavioralProfileGraphHeaderProps = {
	title: string;
	subtitle: string;
};

export type OverallBehavioralProfileGraphCardProps = {
	className?: string;
};

export type BehavioralProfileGraphErrorStateProps =
	BehavioralProfileGraphCardProps & {
		onRetry: () => void;
	};
