import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib";
import type {
	AssessmentInviteOptions,
	AssessmentInvitesListData,
	InviteManagementApiEnvelope,
	InviteManagementListParams,
	SendAssessmentInvitePayload,
} from "@/types";

/** GET /invite-management/assessment-invites — Super Admin only. */
export async function getAssessmentInvitesList(
	params: InviteManagementListParams,
) {
	const searchParams = new URLSearchParams();
	if (params.page != null) searchParams.set("page", String(params.page));
	if (params.limit != null) searchParams.set("limit", String(params.limit));
	if (params.search?.trim()) searchParams.set("search", params.search.trim());
	if (params.status) searchParams.set("status", params.status);
	if (params.timeFilter) searchParams.set("timeFilter", params.timeFilter);
	if (params.sortBy) searchParams.set("sortBy", params.sortBy);
	if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

	const query = searchParams.toString();
	const path = query
		? `${API_ENDPOINTS.inviteManagement.assessmentInvites}?${query}`
		: API_ENDPOINTS.inviteManagement.assessmentInvites;

	const result =
		await apiClient.get<InviteManagementApiEnvelope<AssessmentInvitesListData>>(
			path,
		);
	if (isApiError(result)) return result;
	const envelope = result.data;
	if (!envelope?.success || !envelope.data) {
		return {
			ok: false as const,
			message: envelope?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return {
		ok: true as const,
		data: {
			items: envelope.data.items,
			summary: envelope.data.summary,
			total: envelope.data.pagination.total,
			page: envelope.data.pagination.page,
		},
		message: envelope.message,
	};
}

/** GET /invite-management/assessment-invite/options — Super Admin only. */
export async function getAssessmentInviteOptions() {
	const result = await apiClient.get<
		InviteManagementApiEnvelope<AssessmentInviteOptions>
	>(API_ENDPOINTS.inviteManagement.assessmentInviteOptions);
	if (isApiError(result)) return result;
	const envelope = result.data;
	if (!envelope?.success || !envelope.data) {
		return {
			ok: false as const,
			message: envelope?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: envelope.data, message: envelope.message };
}

/** POST /invite-management/assessment-invites — Super Admin only. */
export async function sendAssessmentInvite(
	payload: SendAssessmentInvitePayload,
) {
	const result = await apiClient.post<InviteManagementApiEnvelope<unknown>>(
		API_ENDPOINTS.inviteManagement.assessmentInvites,
		payload,
	);
	if (isApiError(result)) return result;
	const envelope = result.data;
	if (!envelope?.success) {
		return {
			ok: false as const,
			message: envelope?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return {
		ok: true as const,
		message: typeof envelope.message === "string" ? envelope.message : "",
	};
}
