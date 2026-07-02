import type { AssessmentDirectoryApiTimeFilter } from "@/types";

export type SuperAdminDashboardTabId = "posthog" | "system-analytics";

export type SuperAdminDashboardFilterValue = "all" | string;

export type SuperAdminDashboardTimeFilter =
	| "all"
	| AssessmentDirectoryApiTimeFilter;

export type SuperAdminDashboardOption = {
	id: string;
	legalName: string;
};

export type EntityStatusCountBreakdown = {
	total: number;
	active: number;
	incomplete: number;
	suspended: number;
	closed: number;
};

export type UserStatusCountBreakdown = {
	total: number;
	active: number;
	pending: number;
	blocked: number;
	cancelled: number;
	expired: number;
	deleted: number;
};

export type AssessmentStatusCountBreakdown = {
	completed: number;
	inprogress: number;
	avgTimeToComplete: number | null;
};

export type SuperAdminSystemAnalyticsData = {
	corporations: EntityStatusCountBreakdown;
	companies: EntityStatusCountBreakdown;
	users: UserStatusCountBreakdown;
	assessments: AssessmentStatusCountBreakdown;
};

export type SuperAdminSystemAnalyticsQuery = {
	corporationId?: string;
	companyId?: string;
	timeFilter?: AssessmentDirectoryApiTimeFilter;
};

export type SuperAdminDashboardState = {
	corporationFilter: SuperAdminDashboardFilterValue;
	companyFilter: SuperAdminDashboardFilterValue;
	timeFilter: SuperAdminDashboardTimeFilter;
	corporationOptions: SuperAdminDashboardOption[];
	companyOptions: SuperAdminDashboardOption[];
	corporationsLoading: boolean;
	companiesLoading: boolean;
	analytics: SuperAdminSystemAnalyticsData | null;
	analyticsLoading: boolean;
	analyticsError: string | null;
};

export type SuperAdminDashboardActions = {
	fetchCorporationOptions: () => Promise<void>;
	fetchCompanyOptions: (corporationId: string) => Promise<void>;
	fetchSystemAnalytics: () => Promise<void>;
	setCorporationFilter: (
		value: SuperAdminDashboardFilterValue,
	) => Promise<void>;
	setCompanyFilter: (value: SuperAdminDashboardFilterValue) => Promise<void>;
	setTimeFilter: (value: SuperAdminDashboardTimeFilter) => Promise<void>;
	initializeDashboard: () => Promise<void>;
	reset: () => void;
};

export type SuperAdminDashboardStore = SuperAdminDashboardState &
	SuperAdminDashboardActions;
