import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib";
import type {
	CompanyAdminSystemAnalyticsData,
	CompanyAdminSystemAnalyticsQuery,
} from "@/types";

/**
 * GET /corporations/companies/dashboard/system-analytics — Company Admin donut-chart aggregates.
 */
export async function getCompanyAdminSystemAnalytics(
	params: CompanyAdminSystemAnalyticsQuery = {},
) {
	const search = new URLSearchParams();
	if (params.timeFilter) search.set("timeFilter", params.timeFilter);

	const query = search.toString();
	const url = query
		? `${API_ENDPOINTS.corporations.companyDashboardSystemAnalytics}?${query}`
		: API_ENDPOINTS.corporations.companyDashboardSystemAnalytics;

	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data?: CompanyAdminSystemAnalyticsData;
	}>(url);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}
