import { API_ENDPOINTS } from "@/const";
import {
	apiClient,
	isApiError,
	type ApiError,
	type ApiResponse,
} from "@/lib/apiClient";
import type {
	CoachAvailabilityPayload,
	CoachClientOption,
	CoachClientActivity,
	CoachDashboardSummaryResponse,
	CoachInsightStat,
	CoachQuickPrepData,
	CoachSession,
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

export type ScheduleCoachSessionPayload = {
	title: string;
	date: string;
	startTime: string;
	endTime: string;
	clientId: string;
	description?: string;
	notify?: boolean;
};

export type RescheduleCoachSessionPayload = {
	date: string;
	startTime: string;
	endTime: string;
	notes?: string;
	notify?: boolean;
};

export type CancelCoachSessionPayload = {
	reason: string;
	notify?: boolean;
};

export type UpdateCoachAvailabilityPayload = {
	timezone: string;
	defaultSessionLengthMins: number;
	bufferMins: number;
	days: Array<{
		id: string;
		enabled: boolean;
		ranges: Array<{ start: string; end: string }>;
	}>;
};

export async function getCoachDashboardSummary() {
	const result = await apiClient.get<ApiEnvelope<CoachDashboardSummaryResponse>>(
		API_ENDPOINTS.coachDashboard.summary,
	);
	return unwrapBody(result);
}

export async function getCoachDashboardSessions(date?: string) {
	const suffix = date ? `?date=${encodeURIComponent(date)}` : "";
	const result = await apiClient.get<ApiEnvelope<CoachSession[]>>(
		`${API_ENDPOINTS.coachDashboard.sessions}${suffix}`,
	);
	return unwrapBody(result);
}

export async function createCoachSession(payload: ScheduleCoachSessionPayload) {
	const result = await apiClient.post<ApiEnvelope<{ id: string }>>(
		API_ENDPOINTS.coachDashboard.sessions,
		payload,
	);
	return unwrapBody(result);
}

export async function rescheduleCoachSession(
	sessionId: string,
	payload: RescheduleCoachSessionPayload,
) {
	const result = await apiClient.patch<ApiEnvelope<{ id: string }>>(
		API_ENDPOINTS.coachDashboard.sessionReschedule(sessionId),
		payload,
	);
	return unwrapBody(result);
}

export async function joinCoachSession(sessionId: string) {
	const result = await apiClient.post<ApiEnvelope<{ meetingUrl: string }>>(
		API_ENDPOINTS.coachDashboard.sessionJoin(sessionId),
		{},
	);
	return unwrapBody(result);
}

export async function getCoachQuickPrep(sessionId: string) {
	const result = await apiClient.get<ApiEnvelope<CoachQuickPrepData>>(
		API_ENDPOINTS.coachDashboard.sessionQuickPrep(sessionId),
	);
	return unwrapBody(result);
}

export async function cancelCoachSession(
	sessionId: string,
	payload: CancelCoachSessionPayload,
) {
	const result = await apiClient.deleteWithBody<ApiEnvelope<{ id: string }>>(
		API_ENDPOINTS.coachDashboard.sessionById(sessionId),
		payload,
	);
	return unwrapBody(result);
}

export async function getCoachActivity(limit?: number) {
	const suffix = limit ? `?limit=${limit}` : "";
	const result = await apiClient.get<ApiEnvelope<CoachClientActivity[]>>(
		`${API_ENDPOINTS.coachDashboard.activity}${suffix}`,
	);
	return unwrapBody(result);
}

export async function getCoachInsight(period = "month") {
	const result = await apiClient.get<ApiEnvelope<CoachInsightStat[]>>(
		`${API_ENDPOINTS.coachDashboard.insight}?period=${encodeURIComponent(period)}`,
	);
	return unwrapBody(result);
}

export async function getCoachAvailability() {
	const result = await apiClient.get<ApiEnvelope<CoachAvailabilityPayload>>(
		API_ENDPOINTS.coachDashboard.availability,
	);
	return unwrapBody(result);
}

export async function updateCoachAvailability(
	payload: UpdateCoachAvailabilityPayload,
) {
	const result = await apiClient.put<ApiEnvelope<CoachAvailabilityPayload>>(
		API_ENDPOINTS.coachDashboard.availability,
		payload,
	);
	return unwrapBody(result);
}

export async function getCoachClients() {
	const result = await apiClient.get<ApiEnvelope<CoachClientOption[]>>(
		API_ENDPOINTS.coachDashboard.clients,
	);
	return unwrapBody(result);
}
