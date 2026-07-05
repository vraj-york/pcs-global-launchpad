import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError, type ApiError, type ApiResponse } from "@/lib/apiClient";
import type {
	CoachClientSession,
	CoachScheduledSession,
	CoachSessionRequest,
} from "@/types";

type ApiEnvelope<T> = {
	success: boolean;
	message: string;
	data?: T;
};

function invalidResponse(status: number, message = "Invalid response") {
	return { ok: false as const, message, status };
}

function unwrapBody<T>(
	result: ApiResponse<ApiEnvelope<T>> | ApiError,
): { ok: true; data: T; status: number } | ApiError {
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success || body.data === undefined) {
		return invalidResponse(result.status, body?.message ?? "Invalid response");
	}
	return { ok: true as const, data: body.data, status: result.status };
}

export async function getCoachSessions(scope: "upcoming" | "past") {
	const result = await apiClient.get<ApiEnvelope<CoachScheduledSession[]>>(
		`${API_ENDPOINTS.coach.sessions}?scope=${encodeURIComponent(scope)}`,
	);
	return unwrapBody(result);
}

export async function getCoachSessionDetail(sessionId: string) {
	const result = await apiClient.get<ApiEnvelope<CoachScheduledSession>>(
		API_ENDPOINTS.coach.sessionById(sessionId),
	);
	return unwrapBody(result);
}

export async function getCoachSessionNotes(sessionId: string) {
	const result = await apiClient.get<ApiEnvelope<{ sessionId: string; notes: string }>>(
		API_ENDPOINTS.coach.sessionNotes(sessionId),
	);
	return unwrapBody(result);
}

export async function updateCoachSessionNotes(sessionId: string, notes: string) {
	const result = await apiClient.put<ApiEnvelope<{ sessionId: string; notes: string }>>(
		API_ENDPOINTS.coach.sessionNotes(sessionId),
		{ notes },
	);
	return unwrapBody(result);
}

export async function getCoachSessionRequests(filters?: {
	status?: string;
	employeeId?: string;
}) {
	const search = new URLSearchParams();
	if (filters?.status) search.set("status", filters.status);
	if (filters?.employeeId) search.set("employeeId", filters.employeeId);
	const suffix = search.toString() ? `?${search.toString()}` : "";
	const result = await apiClient.get<ApiEnvelope<CoachSessionRequest[]>>(
		`${API_ENDPOINTS.coach.sessionRequests}${suffix}`,
	);
	return unwrapBody(result);
}

export async function acceptCoachSessionRequest(requestId: string) {
	const result = await apiClient.post<ApiEnvelope<{ id: string }>>(
		API_ENDPOINTS.coach.sessionRequestAccept(requestId),
		{},
	);
	return unwrapBody(result);
}

export async function declineCoachSessionRequest(requestId: string, reason?: string) {
	const result = await apiClient.post<ApiEnvelope<{ id: string }>>(
		API_ENDPOINTS.coach.sessionRequestDecline(requestId),
		reason ? { reason } : {},
	);
	return unwrapBody(result);
}

export async function proposeCoachSessionSlots(requestId: string, proposedSlots: string[]) {
	const result = await apiClient.post<ApiEnvelope<{ id: string }>>(
		API_ENDPOINTS.coach.sessionRequestProposeSlots(requestId),
		{ proposedSlots },
	);
	return unwrapBody(result);
}

export async function editCoachSessionSlots(requestId: string, proposedSlots: string[]) {
	const result = await apiClient.patch<ApiEnvelope<{ id: string }>>(
		API_ENDPOINTS.coach.sessionRequestSlots(requestId),
		{ proposedSlots },
	);
	return unwrapBody(result);
}

export async function remindCoachSessionRequest(requestId: string) {
	const result = await apiClient.post<ApiEnvelope<{ reminded: boolean }>>(
		API_ENDPOINTS.coach.sessionRequestRemind(requestId),
		{},
	);
	return unwrapBody(result);
}

export async function cancelCoachSessionRequest(requestId: string, reason?: string) {
	const result = await apiClient.post<ApiEnvelope<{ id: string }>>(
		API_ENDPOINTS.coach.sessionRequestCancel(requestId),
		reason ? { reason } : {},
	);
	return unwrapBody(result);
}

export async function getCoachSessionRequestReason(requestId: string) {
	const result = await apiClient.get<ApiEnvelope<{ reason: string }>>(
		API_ENDPOINTS.coach.sessionRequestReason(requestId),
	);
	return unwrapBody(result);
}

export async function getCoachClientSessions(
	clientId: string,
	scope: "upcoming" | "past",
) {
	const result = await apiClient.get<ApiEnvelope<CoachClientSession[]>>(
		`${API_ENDPOINTS.coach.clientSessions(clientId)}?scope=${encodeURIComponent(scope)}`,
	);
	return unwrapBody(result);
}
