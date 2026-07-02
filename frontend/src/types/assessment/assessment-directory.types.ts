import type {
	AssessmentDirectoryApiSortBy,
	AssessmentDirectoryApiSortOrder,
	AssessmentDirectoryApiStatusFilter,
	AssessmentDirectoryApiTimeFilter,
} from "./assessment-directory-api.types";

export type AssessmentDirectoryDisplayStatus =
	AssessmentDirectoryApiStatusFilter;

export type AssessmentDirectoryItem = {
	id: string;
	assessmentName: string;
	startedAt: string;
	completedAt: string | null;
	status: AssessmentDirectoryDisplayStatus;
	reportKey: string | null;
};

export type AssessmentDirectoryActionMode = "self" | "adminUser";

export type AssessmentDirectoryColumnOptions = {
	actionMode?: AssessmentDirectoryActionMode;
	onResumeClick?: (row: AssessmentDirectoryItem) => void;
	onViewClick?: (row: AssessmentDirectoryItem) => void;
	onDownloadClick?: (row: AssessmentDirectoryItem) => void;
	onShareClick?: (row: AssessmentDirectoryItem) => void;
	downloadingReportKey?: string | null;
	permissions?: {
		canTake: boolean;
		canViewResult: boolean;
	};
	showActionsColumn?: boolean;
};

export type AssessmentDirectoryResultRow = {
	id: string;
	reportKey: string | null;
	completedAt: string | null;
};

export type AssessmentDirectoryContentProps = {
	variant?: AssessmentDirectoryActionMode;
	cognitoSub?: string;
	returnUserId?: string;
};

export type AssessmentDirectoryState = {
	listItems: AssessmentDirectoryItem[];
	listTotal: number;
	listPage: number;
	listLoading: boolean;
	listError: string | null;
	listSortBy: AssessmentDirectoryApiSortBy;
	listSortOrder: AssessmentDirectoryApiSortOrder;
	listStatusFilter: AssessmentDirectoryApiStatusFilter | undefined;
	listTimeFilter: AssessmentDirectoryApiTimeFilter | undefined;
	listCognitoSub: string | undefined;
};

export type AssessmentDirectoryActions = {
	fetchAssessments: (
		page: number,
		limit: number,
		params?: {
			sortBy?: AssessmentDirectoryApiSortBy;
			sortOrder?: AssessmentDirectoryApiSortOrder;
			status?: AssessmentDirectoryApiStatusFilter;
			timeFilter?: AssessmentDirectoryApiTimeFilter;
		},
	) => Promise<void>;
	setListPage: (page: number) => void;
	setListSort: (
		sortBy: AssessmentDirectoryApiSortBy,
		sortOrder: AssessmentDirectoryApiSortOrder,
	) => void;
	setListStatusFilter: (
		status: AssessmentDirectoryApiStatusFilter | undefined,
	) => void;
	setListTimeFilter: (
		timeFilter: AssessmentDirectoryApiTimeFilter | undefined,
	) => void;
	setListCognitoSub: (cognitoSub: string | undefined) => void;
	clearListError: () => void;
	reset: () => void;
};

export type AssessmentDirectoryStore = AssessmentDirectoryState &
	AssessmentDirectoryActions;
