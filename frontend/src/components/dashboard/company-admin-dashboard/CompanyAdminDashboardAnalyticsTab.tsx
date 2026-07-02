import { useMemo } from "react";
import { buildPlaceholderDashboardCharts, DonutChartCard } from "@/components";
import {
	COMPANY_ADMIN_ANALYTICS_DASHBOARD_PAGE,
	COMPANY_ADMIN_SYSTEM_ANALYTICS_CHART_TITLES,
} from "@/const";
import { useCompanyAdminDashboardStore } from "@/store";
import { mapCompanyAdminAnalyticsToCharts } from "./mapCompanyAdminAnalyticsToCharts";

const C = COMPANY_ADMIN_ANALYTICS_DASHBOARD_PAGE;

export function CompanyAdminDashboardAnalyticsTab({
	isDashboardLoading = false,
}: {
	isDashboardLoading?: boolean;
}) {
	const { analytics, analyticsLoading, analyticsError, fetchSystemAnalytics } =
		useCompanyAdminDashboardStore();

	const charts = useMemo(
		() => mapCompanyAdminAnalyticsToCharts(analytics),
		[analytics],
	);

	const displayCharts = useMemo(
		() =>
			charts.length > 0
				? charts
				: buildPlaceholderDashboardCharts(
						COMPANY_ADMIN_SYSTEM_ANALYTICS_CHART_TITLES,
						C.avgTimeToCompleteLabel,
					),
		[charts],
	);

	const isLoading = isDashboardLoading || analyticsLoading;

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
					loading={isLoading}
				/>
			))}
		</div>
	);
}
