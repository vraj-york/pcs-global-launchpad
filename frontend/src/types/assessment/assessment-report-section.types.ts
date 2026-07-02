import type { ReactNode } from "react";
import type { AssessmentReportSectionLoadState } from "./assessment-report-status-flow.types";
import type { WagonWheelSpokeId } from "./assessment-report-wagon-wheel.types";

export type AssessmentReportSectionHeaderProps = {
	title: string;
	subtitle?: string;
	className?: string;
};

export type AssessmentReportSectionProps = {
	id: string;
	title?: string;
	subtitle?: string;
	loadState?: AssessmentReportSectionLoadState;
	errorTitle?: string;
	errorBody?: string;
	headerClassName?: string;
	children?: ReactNode;
};

export type AssessmentReportStyleWheelPanelVariant =
	| "default"
	| "print"
	| "ftue";

export type AssessmentReportStyleWheelPanelProps = {
	styleNumber: number;
	title: string;
	spokeId: WagonWheelSpokeId | null;
	isAdaptarian: boolean;
	characterStrengths: readonly string[];
	pillClass: string;
	colorCategory?: string;
	categoryClassName?: string;
	styleIndicatorAriaLabel: string;
	wheelAriaLabel: string;
	characterStrengthsAriaLabel: string;
	variant?: AssessmentReportStyleWheelPanelVariant;
	panelClassName?: string;
	wheelMaxWidthClass?: string;
};
