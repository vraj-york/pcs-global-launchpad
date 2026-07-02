import type { HTMLAttributes, ReactNode } from "react";

export type AssessmentReportPanelVariant =
	| "bordered"
	| "filled"
	| "info"
	| "warning";

export type AssessmentReportPanelPadding = "none" | "sm" | "md" | "lg" | "xl";

export type AssessmentReportPanelElement =
	| "div"
	| "article"
	| "aside"
	| "section";

export type AssessmentReportPanelProps = {
	as?: AssessmentReportPanelElement;
	variant?: AssessmentReportPanelVariant;
	padding?: AssessmentReportPanelPadding;
	className?: string;
	children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "children">;
