import { mapDashboardAnalyticsToCharts } from "@/components";
import {
	CORPORATION_ADMIN_DASHBOARD_PAGE,
	CORPORATION_ADMIN_SYSTEM_ANALYTICS_CHART_TITLES,
} from "@/const";
import type {
	CorporationAdminSystemAnalyticsData,
	DonutChartCardModel,
} from "@/types";

export function mapCorporationAnalyticsToCharts(
	data: CorporationAdminSystemAnalyticsData | null,
): DonutChartCardModel[] {
	return mapDashboardAnalyticsToCharts(
		data,
		CORPORATION_ADMIN_SYSTEM_ANALYTICS_CHART_TITLES,
		CORPORATION_ADMIN_DASHBOARD_PAGE.avgTimeToCompleteLabel,
	);
}
