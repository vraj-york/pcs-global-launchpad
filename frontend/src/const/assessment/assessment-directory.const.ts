export const ASSESSMENTS_DIRECTORY_PAGE_CONTENT = {
	title: "Assessments",
	subtitle: "Manage and monitor all your assessments",
	breadcrumbsTitle: "Assessments",
	takeAssessmentButton: "Take Assessment",
	takeAssessmentAriaLabel: "Take assessment",
	resumeAssessmentButton: "Resume Assessment",
	resumeAssessmentAriaLabel: "Resume assessment",
	primaryActionLoadingAriaLabel: "Loading assessment action",
	statusFilterAllLabel: "All Status",
	statusFilterAriaLabel: "Filter assessments by status",
	timeFilterAriaLabel: "Filter assessments by time",
	noData: "No assessments found.",
	statusCompletedLabel: "Completed",
	statusIncompleteLabel: "Incomplete",
	notAvailableLabel: "NA",
	tableResumeAriaLabel: "Resume assessment",
	tableViewAriaLabel: "View assessment results",
	tableDownloadAriaLabel: "Download assessment report",
	tableShareAriaLabel: "Share assessment results",
} as const;

export const ASSESSMENT_DIRECTORY_TABLE_HEADERS = {
	assessmentName: "Assessments",
	startDate: "Start Date",
	endDate: "End Date",
	status: "Status",
	actions: "Actions",
} as const;

export const ASSESSMENT_DIRECTORY_STATUS_FILTER_OPTIONS = [
	{ value: "all", label: "All Status" },
	{ value: "complete", label: "Completed" },
	{ value: "incomplete", label: "Incomplete" },
] as const;

export const ASSESSMENT_DIRECTORY_TIME_FILTER_OPTIONS = [
	{ value: "all", label: "All Time" },
	{ value: "last24Hours", label: "Last 24 hours" },
	{ value: "last7Days", label: "Last 7 days" },
	{ value: "last30Days", label: "Last 30 days" },
	{ value: "last3Months", label: "Last 3 months" },
	{ value: "last6Months", label: "Last 6 months" },
	{ value: "lastYear", label: "Last Year" },
] as const;
