import { ClockFading } from "lucide-react";
import type { ReactNode } from "react";
import {
	CHART_STATUS_COLOR_TOKENS,
	CHART_STATUS_LABEL_OVERRIDES,
	DONUT_CHART_ASSESSMENTS_AVG_TIME_UNAVAILABLE_LABEL,
	DONUT_CHART_ASSESSMENTS_EMPTY_CENTER_LABEL,
} from "@/const";
import type {
	AssessmentStatusCountBreakdown,
	ChartDesignToken,
	DonutChartCardModel,
	DonutChartSeriesItem,
	EntityStatusCountBreakdown,
	UserStatusCountBreakdown,
} from "@/types";

const BREAKDOWN_EXCLUDE_KEYS = ["total", "avgTimeToComplete"];

type ChartBreakdown =
	| EntityStatusCountBreakdown
	| UserStatusCountBreakdown
	| AssessmentStatusCountBreakdown;

function capitalizeChartKey(key: string): string {
	return key.charAt(0).toUpperCase() + key.slice(1);
}

function formatStatusLabel(
	key: string,
	overrides: Record<string, string>,
): string {
	if (overrides[key]) {
		return overrides[key];
	}
	return key
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (char) => char.toUpperCase());
}

function breakdownToSeries(
	breakdown: Record<string, number | null>,
	colorTokens: Record<string, ChartDesignToken>,
	labelOverrides: Record<string, string>,
	excludeKeys: string[] = BREAKDOWN_EXCLUDE_KEYS,
): DonutChartSeriesItem[] {
	return Object.entries(breakdown)
		.filter(
			([key, value]) =>
				!excludeKeys.includes(key) && value != null && Number.isFinite(value),
		)
		.map(([key, value]) => ({
			key,
			label: formatStatusLabel(key, labelOverrides),
			value: value as number,
			colorToken: colorTokens[key],
		}));
}

function resolveBreakdownTotal(
	breakdown: ChartBreakdown,
	series: DonutChartCardModel["series"],
): number {
	if ("total" in breakdown && typeof breakdown.total === "number") {
		return breakdown.total;
	}
	return series.reduce((sum, item) => sum + item.value, 0);
}

function buildChartFromBreakdown(
	id: string,
	title: string,
	centerLabel: string,
	breakdown: ChartBreakdown,
): DonutChartCardModel {
	const series = breakdownToSeries(
		breakdown,
		CHART_STATUS_COLOR_TOKENS,
		CHART_STATUS_LABEL_OVERRIDES,
	);

	return {
		id,
		title,
		centerLabel,
		total: resolveBreakdownTotal(breakdown, series),
		series,
		legendWrap: series.length > 4,
	};
}

export function buildPlaceholderDashboardCharts(
	chartTitles: Record<string, string>,
	avgTimeToCompleteLabel?: string,
): DonutChartCardModel[] {
	return Object.entries(chartTitles).map(([id, title]) => ({
		id,
		title,
		centerLabel: id.charAt(0).toUpperCase() + id.slice(1),
		total: 0,
		series: [],
		...(id === "assessments" && {
			emptyCenterLabel: DONUT_CHART_ASSESSMENTS_EMPTY_CENTER_LABEL,
			footer: avgTimeToCompleteLabel
				? buildAssessmentsFooter(null, avgTimeToCompleteLabel)
				: undefined,
		}),
	}));
}

export function formatAvgDays(days: number): string {
	const value = Number.isInteger(days) ? days : days.toFixed(1);
	return `~${value} ${days === 1 ? "day" : "days"}`;
}

export function buildAssessmentsFooter(
	avgDays: number | null | undefined,
	avgTimeLabel: string,
): ReactNode {
	const hasAvg =
		avgDays != null && typeof avgDays === "number" && Number.isFinite(avgDays);

	return (
		<div className="flex w-full items-center gap-4 rounded-xl border border-border bg-background p-4">
			<div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-primary-bg">
				<ClockFading className="size-7 text-icon-brand-primary" aria-hidden />
			</div>
			<div className="flex flex-col gap-1">
				<p
					className={
						hasAvg
							? "text-heading-4 font-semibold leading-heading-4 text-text-foreground"
							: "text-base font-medium leading-base text-muted-foreground"
					}
				>
					{hasAvg
						? formatAvgDays(avgDays)
						: DONUT_CHART_ASSESSMENTS_AVG_TIME_UNAVAILABLE_LABEL}
				</p>
				<p className="text-mini leading-mini text-muted-foreground">
					{avgTimeLabel}
				</p>
			</div>
		</div>
	);
}

export function mapDashboardAnalyticsToCharts<
	TData extends Record<string, ChartBreakdown>,
	Titles extends Record<keyof TData, string>,
>(
	data: TData | null,
	chartTitles: Titles,
	avgTimeToCompleteLabel: string,
): DonutChartCardModel[] {
	if (!data) {
		return [];
	}

	return (Object.keys(chartTitles) as (keyof TData & string)[]).map((key) => {
		const breakdown = data[key];
		const chart = buildChartFromBreakdown(
			key,
			chartTitles[key],
			capitalizeChartKey(key),
			breakdown,
		);

		if (key !== "assessments") {
			return chart;
		}

		const assessments = breakdown as AssessmentStatusCountBreakdown;
		return {
			...chart,
			emptyCenterLabel: DONUT_CHART_ASSESSMENTS_EMPTY_CENTER_LABEL,
			footer: buildAssessmentsFooter(
				assessments.avgTimeToComplete ?? null,
				avgTimeToCompleteLabel,
			),
		};
	});
}
