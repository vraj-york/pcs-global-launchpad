import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib";
import type {
	CorporationAdminDashboardOption,
	CorporationAdminSystemAnalyticsData,
	CorporationAdminSystemAnalyticsQuery,
} from "@/types";

/**
 * GET /corporations/dashboard/system-analytics — Corporation Admin donut-chart aggregates.
 */
export async function getCorporationAdminSystemAnalytics(
	params: CorporationAdminSystemAnalyticsQuery = {},
) {
	const search = new URLSearchParams();
	if (params.companyId) search.set("companyId", params.companyId);
	if (params.timeFilter) search.set("timeFilter", params.timeFilter);

	const query = search.toString();
	const url = query
		? `${API_ENDPOINTS.corporations.dashboardSystemAnalytics}?${query}`
		: API_ENDPOINTS.corporations.dashboardSystemAnalytics;

	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data?: CorporationAdminSystemAnalyticsData;
	}>(url);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}

/**
 * GET /corporations/companies/all?corporationId= — companies for dashboard filters.
 */
export async function getAllCompaniesByCorporation(corporationId: string) {
	const url = `${API_ENDPOINTS.corporations.allCompanies}?corporationId=${encodeURIComponent(corporationId)}`;
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data?: CorporationAdminDashboardOption[];
	}>(url);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!Array.isArray(data))
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}
