import { useMemo } from "react";
import { DONUT_CHART_ASSESSMENTS_EMPTY_CENTER_LABEL } from "@/const";
import { cn } from "@/lib/utils";
import type { DonutChartCardProps } from "@/types";
import { DonutChart, resolveDonutSliceColor } from "./DonutChart";

export function DonutChartAssessmentsWideCard({
	title,
	centerLabel,
	total,
	series,
	footer,
	className,
	chartClassName = "h-[60vh] w-[60vw]",
	loading = false,
}: DonutChartCardProps) {
	const visibleSeries = useMemo(
		() => series.filter((item) => item.value > 0),
		[series],
	);

	return (
		<div
			className={cn(
				"flex flex-col overflow-hidden rounded-xl border border-border bg-background",
				className,
			)}
		>
			<div className="flex h-16 items-center border-b border-border px-4">
				<h3 className="text-base font-semibold text-text-secondary">{title}</h3>
			</div>
			<div className="flex flex-col items-center justify-center gap-8 px-20 lg:flex-row lg:gap-28">
				<DonutChart
					series={series}
					total={total}
					centerLabel={centerLabel}
					emptyTitle={title}
					emptyCenterLabel={DONUT_CHART_ASSESSMENTS_EMPTY_CENTER_LABEL}
					showLegend={false}
					className={chartClassName}
					loading={loading}
				/>
				<div className="flex w-full max-w-md flex-col gap-10">
					{total > 0 ? (
						<div className="flex flex-wrap gap-5">
							{visibleSeries.map((item) => (
								<div key={item.key} className="flex items-center gap-2">
									<span
										className="h-3 w-6 shrink-0 rounded"
										style={{
											backgroundColor: resolveDonutSliceColor(item),
										}}
										aria-hidden
									/>
									<span className="text-mini font-medium text-text-secondary">
										{item.label}
									</span>
								</div>
							))}
						</div>
					) : null}
					{footer}
				</div>
			</div>
		</div>
	);
}
