import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib";
import type {
	SuperAdminDashboardOption,
	SuperAdminSystemAnalyticsData,
	SuperAdminSystemAnalyticsQuery,
} from "@/types";

/**
 * GET /super-admin/dashboard/system-analytics — status breakdowns for donut charts.
 */
export async function getSuperAdminSystemAnalytics(
	params: SuperAdminSystemAnalyticsQuery = {},
) {
	const search = new URLSearchParams();
	if (params.corporationId) search.set("corporationId", params.corporationId);
	if (params.companyId) search.set("companyId", params.companyId);
	if (params.timeFilter) search.set("timeFilter", params.timeFilter);

	const query = search.toString();
	const url = query
		? `${API_ENDPOINTS.superAdmin.systemAnalytics}?${query}`
		: API_ENDPOINTS.superAdmin.systemAnalytics;

	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data?: SuperAdminSystemAnalyticsData;
	}>(url);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}

/**
 * GET /corporations/all — all corporations (id + legalName) for dashboard filters.
 */
export async function getAllCorporations() {
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data?: SuperAdminDashboardOption[];
	}>(API_ENDPOINTS.corporations.all);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!Array.isArray(data))
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}
