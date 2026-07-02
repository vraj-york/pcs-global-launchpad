export const ASSESSMENT_DIRECTORY_SORT_BY = [
	"assessmentName",
	"startedAt",
	"completedAt",
	"status",
] as const;

export type AssessmentDirectoryApiSortBy =
	(typeof ASSESSMENT_DIRECTORY_SORT_BY)[number];

export const ASSESSMENT_DIRECTORY_SORT_ORDER = ["asc", "desc"] as const;

export type AssessmentDirectoryApiSortOrder =
	(typeof ASSESSMENT_DIRECTORY_SORT_ORDER)[number];

export const ASSESSMENT_DIRECTORY_STATUS_FILTER = [
	"complete",
	"incomplete",
] as const;

export type AssessmentDirectoryApiStatusFilter =
	(typeof ASSESSMENT_DIRECTORY_STATUS_FILTER)[number];

export const ASSESSMENT_DIRECTORY_TIME_FILTER = [
	"last24Hours",
	"last7Days",
	"last30Days",
	"last3Months",
	"last6Months",
	"lastYear",
] as const;

export type AssessmentDirectoryApiTimeFilter =
	(typeof ASSESSMENT_DIRECTORY_TIME_FILTER)[number];

export type AssessmentDirectoryListApiItem = {
	uuid: string;
	assessmentName: string;
	startedAt: string;
	completedAt: string | null;
	status: AssessmentDirectoryApiStatusFilter;
	reportKey: string | null;
};

export type AssessmentDirectoryListApiData = {
	items: AssessmentDirectoryListApiItem[];
	pagination: {
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	};
};

export type ListAssessmentsDirectoryParams = {
	page: number;
	limit: number;
	sortBy?: AssessmentDirectoryApiSortBy;
	sortOrder?: AssessmentDirectoryApiSortOrder;
	status?: AssessmentDirectoryApiStatusFilter;
	timeFilter?: AssessmentDirectoryApiTimeFilter;
};
