import { useEffect } from "react";
import { COMPANY_ADMIN_ANALYTICS_DASHBOARD_PAGE } from "@/const";
import {
	companyAdminHasActiveSubscription,
	useCompanyAdminDashboardStore,
} from "@/store";
import { CompanyAdminDashboardAnalyticsTab } from "./CompanyAdminDashboardAnalyticsTab";
import { CompanyAdminDashboardFilters } from "./CompanyAdminDashboardFilters";

const C = COMPANY_ADMIN_ANALYTICS_DASHBOARD_PAGE;

export function CompanyAdminDashboard() {
	const {
		companies,
		initializeAnalyticsDashboard,
		resetAnalytics,
		analytics,
		analyticsLoading,
	} = useCompanyAdminDashboardStore();

	const hasActiveSubscription = companyAdminHasActiveSubscription(companies);
	const isDashboardLoading = analyticsLoading && analytics === null;

	useEffect(() => {
		if (!hasActiveSubscription) return;
		void initializeAnalyticsDashboard();
		return () => {
			resetAnalytics();
		};
	}, [hasActiveSubscription, initializeAnalyticsDashboard, resetAnalytics]);

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="text-heading-4 font-semibold text-text-foreground">
						{C.title}
					</h1>
					<p className="text-small text-text-secondary">{C.subtitle}</p>
				</div>

				<CompanyAdminDashboardFilters />
			</div>

			<CompanyAdminDashboardAnalyticsTab
				isDashboardLoading={isDashboardLoading}
			/>
		</div>
	);
}
