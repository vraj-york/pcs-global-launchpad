import type { ReactNode } from "react";

export const CHART_DESIGN_TOKENS = [
	"interactive-info",
	"interactive-secondary",
	"interactive-success",
	"interactive-warning",
	"interactive-error",
	"interactive-neutral-active",
] as const;

export type ChartDesignToken = (typeof CHART_DESIGN_TOKENS)[number];

export type DonutChartSeriesItem = {
	key: string;
	label: string;
	value: number;
	colorToken?: ChartDesignToken;
};

export type DonutChartCardModel = {
	id: string;
	title: string;
	centerLabel: string;
	total: number;
	series: DonutChartSeriesItem[];
	footer?: ReactNode;
	legendWrap?: boolean;
	emptyCenterLabel?: string;
};

export type DonutChartCardProps = {
	title: string;
	centerLabel: string;
	total: number;
	series: DonutChartSeriesItem[];
	footer?: ReactNode;
	className?: string;
	chartClassName?: string;
	legendWrap?: boolean;
	loading?: boolean;
	emptyCenterLabel?: string;
};

export type DonutChartProps = {
	series: DonutChartSeriesItem[];
	total: number;
	centerLabel: string;
	emptyTitle: string;
	emptyCenterLabel?: string;
	legendWrap?: boolean;
	showLegend?: boolean;
	className?: string;
	loading?: boolean;
};
