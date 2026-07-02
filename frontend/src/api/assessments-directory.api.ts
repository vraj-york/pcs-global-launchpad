import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib/apiClient";
import type {
	AssessmentDirectoryItem,
	AssessmentDirectoryListApiData,
	AssessmentDirectoryListApiItem,
	ListAssessmentsDirectoryParams,
} from "@/types";

function mapListItemToAssessmentDirectoryItem(
	item: AssessmentDirectoryListApiItem,
): AssessmentDirectoryItem {
	return {
		id: item.uuid,
		assessmentName: item.assessmentName,
		startedAt: item.startedAt,
		completedAt: item.completedAt,
		status: item.status,
		reportKey: item.reportKey,
	};
}

function buildListQueryParams(params: ListAssessmentsDirectoryParams) {
	const { page, limit, sortBy, sortOrder, status, timeFilter } = params;
	const search = new URLSearchParams({
		page: String(page),
		limit: String(limit),
	});
	if (sortBy) search.set("sortBy", sortBy);
	if (sortOrder) search.set("sortOrder", sortOrder);
	if (status) search.set("status", status);
	if (timeFilter) search.set("timeFilter", timeFilter);
	return search;
}

async function parseAssessmentsDirectoryResponse(
	result: Awaited<
		ReturnType<
			typeof apiClient.get<{
				success: boolean;
				message: string;
				data: AssessmentDirectoryListApiData;
			}>
		>
	>,
) {
	if (isApiError(result)) return result;

	const data = result.data?.data;
	if (!data) {
		return { ok: false as const, message: "Invalid response", status: 0 };
	}

	return {
		ok: true as const,
		data: {
			items: data.items.map(mapListItemToAssessmentDirectoryItem),
			total: data.pagination.total,
			page: data.pagination.page,
			limit: data.pagination.pageSize,
			totalPages: data.pagination.totalPages,
		},
	};
}

/**
 * Fetch assessment directory list with pagination, sorting, and filters.
 * GET /assessments?page=1&limit=10&sortBy=startedAt&sortOrder=desc&status=complete&timeFilter=last30Days
 */
export async function getAssessmentsDirectory(
	params: ListAssessmentsDirectoryParams,
) {
	const search = buildListQueryParams(params);
	const url = `${API_ENDPOINTS.assessmentsDirectory.list}?${search.toString()}`;
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: AssessmentDirectoryListApiData;
	}>(url);
	return parseAssessmentsDirectoryResponse(result);
}

/**
 * Fetch assessments for a target user (admin scope).
 * GET /assessments/users/:cognitoSub?page=1&limit=10&...
 */
export async function getAssessmentsDirectoryByUser(
	cognitoSub: string,
	params: ListAssessmentsDirectoryParams,
) {
	const trimmed = cognitoSub.trim();
	if (!trimmed) {
		return { ok: false as const, message: "User id is required.", status: 400 };
	}
	const search = buildListQueryParams(params);
	const url = `${API_ENDPOINTS.assessmentsDirectory.listByUser(trimmed)}?${search.toString()}`;
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: AssessmentDirectoryListApiData;
	}>(url);
	return parseAssessmentsDirectoryResponse(result);
}
