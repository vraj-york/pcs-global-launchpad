import { ASSESSMENT_DIRECTORY_TIME_FILTER_OPTIONS } from "@/const";

export const CORPORATION_ADMIN_DASHBOARD_PAGE = {
	title: "Dashboard Overview",
	subtitle: "Monitor and manage your entire platform",
	companyFilterAriaLabel: "Filter by company",
	timeFilterAriaLabel: "Filter by time range",
	allCompaniesLabel: "All Companies",
	companyFilterNoResultsLabel: "No matching companies",
	companiesLoadingLabel: "Loading companies…",
	analyticsLoadError: "We couldn't load system analytics. Please try again.",
	retryLabel: "Retry",
	avgTimeToCompleteLabel: "Avg. time to complete the assessment",
	noCorporationLinkedError:
		"No corporation is linked to this account. Contact your administrator.",
	tabOverview: "Overview",
	tabPayments: "Payments",
	tabsListAriaLabel: "Corporation admin dashboard sections",
} as const;

export const CORPORATION_ADMIN_DASHBOARD_TIME_FILTER_OPTIONS =
	ASSESSMENT_DIRECTORY_TIME_FILTER_OPTIONS;

export const CORPORATION_ADMIN_SYSTEM_ANALYTICS_CHART_TITLES = {
	companies: "Companies",
	users: "Users",
	assessments: "Assessments (Corporation-wide)",
} as const;
