import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError, type ApiError, type ApiResponse } from "@/lib/apiClient";
import type { CoachResource } from "@/types";

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

export async function getCoachResources() {
	const result = await apiClient.get<ApiEnvelope<CoachResource[]>>(
		`${API_ENDPOINTS.coachResources.root}?audience=COACH`,
	);
	return unwrapBody(result);
}
