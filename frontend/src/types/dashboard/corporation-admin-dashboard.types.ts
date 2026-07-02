import type { AssessmentDirectoryApiTimeFilter } from "@/types";
import type {
	AssessmentStatusCountBreakdown,
	EntityStatusCountBreakdown,
	UserStatusCountBreakdown,
} from "./super-admin-dashboard.types";

export type CorporationAdminDashboardTab = "overview" | "payments";

export type CorporationAdminDashboardFilterValue = "all" | string;

export type CorporationAdminDashboardTimeFilter =
	| "all"
	| AssessmentDirectoryApiTimeFilter;

export type CorporationAdminDashboardOption = {
	id: string;
	legalName: string;
};

export type CorporationAdminSystemAnalyticsData = {
	companies: EntityStatusCountBreakdown;
	users: UserStatusCountBreakdown;
	assessments: AssessmentStatusCountBreakdown;
};

export type CorporationAdminSystemAnalyticsQuery = {
	companyId?: string;
	timeFilter?: AssessmentDirectoryApiTimeFilter;
};

export type CorporationAdminDashboardState = {
	corporationId: string | null;
	companyFilter: CorporationAdminDashboardFilterValue;
	timeFilter: CorporationAdminDashboardTimeFilter;
	companyOptions: CorporationAdminDashboardOption[];
	companiesLoading: boolean;
	analytics: CorporationAdminSystemAnalyticsData | null;
	analyticsLoading: boolean;
	analyticsError: string | null;
};

export type CorporationAdminDashboardActions = {
	fetchCompanyOptions: (corporationId: string) => Promise<void>;
	fetchSystemAnalytics: () => Promise<void>;
	setCompanyFilter: (
		value: CorporationAdminDashboardFilterValue,
	) => Promise<void>;
	setTimeFilter: (value: CorporationAdminDashboardTimeFilter) => Promise<void>;
	initializeDashboard: (corporationId: string) => Promise<void>;
	reset: () => void;
};

export type CorporationAdminDashboardStore = CorporationAdminDashboardState &
	CorporationAdminDashboardActions;
