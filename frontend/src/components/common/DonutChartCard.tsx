import { cn } from "@/lib/utils";
import type { DonutChartCardProps } from "@/types";
import { DonutChart } from "./DonutChart";

export function DonutChartCard({
	title,
	centerLabel,
	total,
	series,
	footer,
	className,
	chartClassName = "h-[60vh] w-[60vw]",
	legendWrap = false,
	loading = false,
	emptyCenterLabel,
}: DonutChartCardProps) {
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
			<div className="flex justify-center pt-0 pb-6">
				<DonutChart
					series={series}
					total={total}
					centerLabel={centerLabel}
					emptyTitle={title}
					legendWrap={legendWrap}
					className={chartClassName}
					loading={loading}
					emptyCenterLabel={emptyCenterLabel}
				/>
			</div>

			{footer ? <div className="px-20 pb-12">{footer}</div> : null}
		</div>
	);
}
