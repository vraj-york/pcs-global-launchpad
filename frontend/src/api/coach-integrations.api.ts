import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError, type ApiError, type ApiResponse } from "@/lib/apiClient";
import type { CoachIntegrationStatus } from "@/types";

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

export async function getCoachIntegrations() {
	const result = await apiClient.get<ApiEnvelope<CoachIntegrationStatus[]>>(
		API_ENDPOINTS.coachIntegrations.root,
	);
	return unwrapBody(result);
}

export async function connectCoachIntegration(provider: string) {
	const result = await apiClient.post<ApiEnvelope<CoachIntegrationStatus>>(
		API_ENDPOINTS.coachIntegrations.connect(provider),
		{},
	);
	return unwrapBody(result);
}

export async function disconnectCoachIntegration(provider: string) {
	const result = await apiClient.delete<ApiEnvelope<{ message: string }>>(
		API_ENDPOINTS.coachIntegrations.disconnect(provider),
	);
	return unwrapBody(result);
}
