import { ASSESSMENT_DIRECTORY_TIME_FILTER_OPTIONS } from "@/const";

export const SUPER_ADMIN_DASHBOARD_PAGE = {
	title: "Dashboard Overview",
	subtitle: "Monitor and manage your entire platform",
	tabsListAriaLabel: "Dashboard analytics sections",
	posthogTab: "PostHog Analytics",
	posthogDescription:
		"Open PostHog in a new tab. Sign in with your PostHog account to view analytics.",
	posthogOpenDashboardLabel: "Open PostHog dashboard",
	posthogOpenDashboardAriaLabel: "Open PostHog dashboard in a new tab",
	posthogMissingDashboardUrl:
		"Set VITE_POSTHOG_DASHBOARD_URL to your PostHog dashboard URL.",
	systemAnalyticsTab: "System Analytics",
	corporationFilterAriaLabel: "Filter by corporation",
	companyFilterAriaLabel: "Filter by company",
	timeFilterAriaLabel: "Filter by time range",
	allCorporationsLabel: "All Corporations",
	allCompaniesLabel: "All Companies",
	corporationFilterNoResultsLabel: "No matching corporations",
	companyFilterNoResultsLabel: "No matching companies",
	companiesLoadingLabel: "Loading companies…",
	analyticsLoadError: "We couldn't load system analytics. Please try again.",
	retryLabel: "Retry",
	avgTimeToCompleteLabel: "Avg. time to complete the assessment",
} as const;

export const SUPER_ADMIN_DASHBOARD_TABS = [
	{ id: "posthog" as const, label: SUPER_ADMIN_DASHBOARD_PAGE.posthogTab },
	{
		id: "system-analytics" as const,
		label: SUPER_ADMIN_DASHBOARD_PAGE.systemAnalyticsTab,
	},
] as const;

export const SUPER_ADMIN_DASHBOARD_TIME_FILTER_OPTIONS =
	ASSESSMENT_DIRECTORY_TIME_FILTER_OPTIONS;

export const SUPER_ADMIN_SYSTEM_ANALYTICS_CHART_TITLES = {
	corporations: "Corporations",
	companies: "Companies",
	users: "Users",
	assessments: "Assessments (Global)",
} as const;
