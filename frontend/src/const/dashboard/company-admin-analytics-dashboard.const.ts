import { ASSESSMENT_DIRECTORY_TIME_FILTER_OPTIONS } from "@/const";

export const COMPANY_ADMIN_ANALYTICS_DASHBOARD_PAGE = {
	title: "Dashboard Overview",
	subtitle: "Monitor and manage your entire platform",
	timeFilterAriaLabel: "Filter by time range",
	analyticsLoadError: "We couldn't load system analytics. Please try again.",
	retryLabel: "Retry",
	avgTimeToCompleteLabel: "Avg. time to complete the assessment",
} as const;

export const COMPANY_ADMIN_ANALYTICS_DASHBOARD_TIME_FILTER_OPTIONS =
	ASSESSMENT_DIRECTORY_TIME_FILTER_OPTIONS;

export const COMPANY_ADMIN_SYSTEM_ANALYTICS_CHART_TITLES = {
	users: "Users",
	assessments: "Assessments (Company-wide)",
} as const;
