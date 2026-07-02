import type { AssessmentDirectoryApiTimeFilter } from "@/types";
import type {
	AssessmentStatusCountBreakdown,
	UserStatusCountBreakdown,
} from "./super-admin-dashboard.types";

export type CompanyAdminAnalyticsDashboardTimeFilter =
	| "all"
	| AssessmentDirectoryApiTimeFilter;

export type CompanyAdminSystemAnalyticsData = {
	users: UserStatusCountBreakdown;
	assessments: AssessmentStatusCountBreakdown;
};

export type CompanyAdminSystemAnalyticsQuery = {
	timeFilter?: AssessmentDirectoryApiTimeFilter;
};
