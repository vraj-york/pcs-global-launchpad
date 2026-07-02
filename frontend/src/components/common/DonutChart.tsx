import { PieChart } from "echarts/charts";
import {
	GraphicComponent,
	LegendComponent,
	TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useMemo, useRef } from "react";
import {
	DONUT_CHART_EMPTY_CENTER_LABEL,
	DONUT_CHART_LOADING_ARIA_LABEL,
} from "@/const";
import { cn } from "@/lib/utils";
import type { DonutChartProps, DonutChartSeriesItem } from "@/types";

echarts.use([
	PieChart,
	TooltipComponent,
	LegendComponent,
	GraphicComponent,
	CanvasRenderer,
]);

function readCssVar(token: string): string {
	if (typeof document === "undefined") {
		return "";
	}
	return getComputedStyle(document.documentElement)
		.getPropertyValue(token)
		.trim();
}

export function resolveDonutSliceColor(item: DonutChartSeriesItem): string {
	return readCssVar(`--${item.colorToken ?? "interactive-info"}`);
}

function getChartLoadingOptions() {
	return {
		text: "",
		color: readCssVar("--primary") || undefined,
		maskColor: readCssVar("--background") || undefined,
		showSpinner: true,
	};
}

export function DonutChart({
	series,
	total,
	centerLabel,
	emptyTitle,
	emptyCenterLabel,
	legendWrap = false,
	showLegend = true,
	className,
	loading = false,
}: DonutChartProps) {
	const chartRef = useRef<HTMLDivElement>(null);
	const chartInstanceRef = useRef<echarts.ECharts | null>(null);

	const chartOption = useMemo(() => {
		const isEmpty = total === 0;
		const pieData = series
			.filter((item) => item.value > 0)
			.map((item) => ({
				value: item.value,
				name: item.label,
				itemStyle: { color: resolveDonutSliceColor(item) },
			}));
		const nonZeroCount = pieData.length;
		const legendColors = series.map((item) => resolveDonutSliceColor(item));

		const centerTextColor = readCssVar("--text-foreground");
		const centerSubtitleColor = readCssVar("--muted-foreground");
		const centerLabelRich = {
			total: {
				fontSize: 48,
				fontWeight: 600,
				lineHeight: 48,
				color: centerTextColor || undefined,
				letterSpacing: -1.5,
			},
			label: {
				fontSize: 16,
				fontWeight: 500,
				lineHeight: 24,
				color: centerSubtitleColor || undefined,
				padding: [4, 0, 0, 0],
			},
		};

		return {
			color: legendColors,
			graphic: isEmpty
				? [
						{
							type: "text",
							left: "center",
							top: "middle",
							style: {
								text:
									emptyCenterLabel ??
									DONUT_CHART_EMPTY_CENTER_LABEL.replace(
										"{title}",
										emptyTitle.toLowerCase(),
									),
								fontSize: 16,
								fontWeight: 500,
								fill: centerSubtitleColor || undefined,
								textAlign: "center",
							},
						},
					]
				: [],
			tooltip: {
				show: !isEmpty,
				trigger: "item" as const,
				backgroundColor: readCssVar("--foreground") || undefined,
				borderWidth: 0,
				textStyle: {
					color: readCssVar("--background") || undefined,
				},
			},
			legend: {
				show: showLegend && !isEmpty,
				selectedMode: false,
				data: series.map((item) => item.label),
				...(legendWrap && {
					type: "plain" as const,
					orient: "horizontal" as const,
					left: "center",
					bottom: 0,
					width: "60%",
					icon: "roundRect",
					itemWidth: 24,
					itemHeight: 12,
					itemGap: 20,
					textStyle: {
						color: readCssVar("--text-secondary") || undefined,
						fontSize: 12,
					},
				}),
			},
			series: [
				{
					name: emptyTitle,
					type: "pie" as const,
					radius: ["40%", "70%"],
					avoidLabelOverlap: false,
					minAngle: 4,
					padAngle: nonZeroCount <= 1 ? 0 : 5,
					itemStyle: { borderRadius: 10 },
					label: isEmpty
						? { show: false }
						: {
								show: true,
								position: "center" as const,
								formatter: () => `{total|${total}}\n{label|${centerLabel}}`,
								rich: centerLabelRich,
							},
					emphasis: { scale: !isEmpty },
					labelLine: { show: false },
					data: isEmpty ? [] : pieData,
				},
			],
		};
	}, [
		centerLabel,
		emptyCenterLabel,
		emptyTitle,
		legendWrap,
		series,
		showLegend,
		total,
	]);

	useEffect(() => {
		const container = chartRef.current;
		if (!container) return;

		const instance = echarts.init(container);
		chartInstanceRef.current = instance;

		const handleResize = () => {
			instance.resize();
		};

		window.addEventListener("resize", handleResize);

		const resizeObserver = new ResizeObserver(handleResize);
		resizeObserver.observe(container);
		handleResize();

		return () => {
			window.removeEventListener("resize", handleResize);
			resizeObserver.disconnect();
			instance.dispose();
			chartInstanceRef.current = null;
		};
	}, []);

	useEffect(() => {
		const instance = chartInstanceRef.current;
		if (!instance) return;

		if (loading) {
			instance.showLoading(getChartLoadingOptions());
			return;
		}

		instance.hideLoading();
		instance.setOption(chartOption, true);
	}, [chartOption, loading]);

	return (
		<div
			ref={chartRef}
			className={cn("h-[50vh] w-[50vw]", className)}
			role="img"
			aria-label={loading ? DONUT_CHART_LOADING_ARIA_LABEL : emptyTitle}
			aria-busy={loading}
		/>
	);
}
