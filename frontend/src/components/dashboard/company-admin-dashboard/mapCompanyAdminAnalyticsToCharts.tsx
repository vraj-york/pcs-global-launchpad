import { mapDashboardAnalyticsToCharts } from "@/components";
import {
	COMPANY_ADMIN_ANALYTICS_DASHBOARD_PAGE,
	COMPANY_ADMIN_SYSTEM_ANALYTICS_CHART_TITLES,
} from "@/const";
import type {
	CompanyAdminSystemAnalyticsData,
	DonutChartCardModel,
} from "@/types";

export function mapCompanyAdminAnalyticsToCharts(
	data: CompanyAdminSystemAnalyticsData | null,
): DonutChartCardModel[] {
	return mapDashboardAnalyticsToCharts(
		data,
		COMPANY_ADMIN_SYSTEM_ANALYTICS_CHART_TITLES,
		COMPANY_ADMIN_ANALYTICS_DASHBOARD_PAGE.avgTimeToCompleteLabel,
	);
}
