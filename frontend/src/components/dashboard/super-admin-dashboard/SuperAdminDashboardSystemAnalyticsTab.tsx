import { useMemo } from "react";
import { buildPlaceholderDashboardCharts, DonutChartCard } from "@/components";
import {
	SUPER_ADMIN_DASHBOARD_PAGE,
	SUPER_ADMIN_SYSTEM_ANALYTICS_CHART_TITLES,
} from "@/const";
import { useSuperAdminDashboardStore } from "@/store";
import { mapSystemAnalyticsToCharts } from "./mapSystemAnalyticsToCharts";

const C = SUPER_ADMIN_DASHBOARD_PAGE;

export function SuperAdminDashboardSystemAnalyticsTab() {
	const { analytics, analyticsLoading, analyticsError, fetchSystemAnalytics } =
		useSuperAdminDashboardStore();

	const charts = useMemo(
		() => mapSystemAnalyticsToCharts(analytics),
		[analytics],
	);

	const displayCharts = useMemo(
		() =>
			charts.length > 0
				? charts
				: buildPlaceholderDashboardCharts(
						SUPER_ADMIN_SYSTEM_ANALYTICS_CHART_TITLES,
						C.avgTimeToCompleteLabel,
					),
		[charts],
	);

	if (analyticsError && charts.length === 0) {
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
			aria-busy={analyticsLoading}
		>
			{displayCharts.map((chart) => (
				<DonutChartCard
					key={chart.id}
					title={chart.title}
					centerLabel={chart.centerLabel}
					total={chart.total}
					series={chart.series}
					footer={chart.footer}
					legendWrap={chart.legendWrap}
					emptyCenterLabel={chart.emptyCenterLabel}
					loading={analyticsLoading}
				/>
			))}
		</div>
	);
}
