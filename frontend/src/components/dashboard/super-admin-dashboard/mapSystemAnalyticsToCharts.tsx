import { mapDashboardAnalyticsToCharts } from "@/components";
import {
	SUPER_ADMIN_DASHBOARD_PAGE,
	SUPER_ADMIN_SYSTEM_ANALYTICS_CHART_TITLES,
} from "@/const";
import type {
	DonutChartCardModel,
	SuperAdminSystemAnalyticsData,
} from "@/types";

export function mapSystemAnalyticsToCharts(
	data: SuperAdminSystemAnalyticsData | null,
): DonutChartCardModel[] {
	return mapDashboardAnalyticsToCharts(
		data,
		SUPER_ADMIN_SYSTEM_ANALYTICS_CHART_TITLES,
		SUPER_ADMIN_DASHBOARD_PAGE.avgTimeToCompleteLabel,
	);
}
