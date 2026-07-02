import { useMemo } from "react";
import {
	buildPlaceholderDashboardCharts,
	DonutChartAssessmentsWideCard,
	DonutChartCard,
} from "@/components";
import {
	CORPORATION_ADMIN_DASHBOARD_PAGE,
	CORPORATION_ADMIN_SYSTEM_ANALYTICS_CHART_TITLES,
} from "@/const";
import { cn } from "@/lib/utils";
import { useCorporationAdminDashboardStore } from "@/store";
import { mapCorporationAnalyticsToCharts } from "./mapCorporationAnalyticsToCharts";

const C = CORPORATION_ADMIN_DASHBOARD_PAGE;

export function CorporationAdminDashboardAnalyticsTab({
	isDashboardLoading = false,
}: {
	isDashboardLoading?: boolean;
}) {
	const {
		analytics,
		companiesLoading,
		analyticsLoading,
		analyticsError,
		fetchSystemAnalytics,
	} = useCorporationAdminDashboardStore();

	const charts = useMemo(
		() => mapCorporationAnalyticsToCharts(analytics),
		[analytics],
	);

	const displayCharts = useMemo(
		() =>
			charts.length > 0
				? charts
				: buildPlaceholderDashboardCharts(
						CORPORATION_ADMIN_SYSTEM_ANALYTICS_CHART_TITLES,
						C.avgTimeToCompleteLabel,
					),
		[charts],
	);

	const isLoading = isDashboardLoading || companiesLoading || analyticsLoading;

	if (analyticsError && charts.length === 0 && !isLoading) {
		return (
			<div className="flex flex-col gap-2">
				<p className="text-sm text-destructive">{C.analyticsLoadError}</p>
				<button
					type="button"
					className="w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
					onClick={() => void fetchSystemAnalytics()}
				>
					{C.retryLabel}
				</button>
			</div>
		);
	}

	return (
		<div
			className="grid grid-cols-1 gap-2.5 pb-6 xl:grid-cols-2"
			aria-busy={isLoading}
		>
			{displayCharts.map((chart) =>
				chart.id === "assessments" ? (
					<DonutChartAssessmentsWideCard
						key={chart.id}
						title={chart.title}
						centerLabel={chart.centerLabel}
						total={chart.total}
						series={chart.series}
						footer={chart.footer}
						className={cn("xl:col-span-2")}
						loading={isLoading}
					/>
				) : (
					<DonutChartCard
						key={chart.id}
						title={chart.title}
						centerLabel={chart.centerLabel}
						total={chart.total}
						series={chart.series}
						legendWrap={chart.legendWrap}
						loading={isLoading}
					/>
				),
			)}
		</div>
	);
}
