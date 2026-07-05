import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError, type ApiError, type ApiResponse } from "@/lib/apiClient";
import type { CoachBetaFeature } from "@/types";

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

export async function getCoachEarlyAccessFeatures() {
	const result = await apiClient.get<ApiEnvelope<CoachBetaFeature[]>>(
		API_ENDPOINTS.earlyAccess.features,
	);
	return unwrapBody(result);
}

export async function joinCoachEarlyAccessWaitlist(featureKey?: string) {
	const result = await apiClient.post<ApiEnvelope<{ id: string }>>(
		API_ENDPOINTS.earlyAccess.waitlist,
		featureKey ? { featureKey } : {},
	);
	return unwrapBody(result);
}

export async function leaveCoachEarlyAccessWaitlist(featureKey: string) {
	const result = await apiClient.delete<ApiEnvelope<{ removed: boolean }>>(
		API_ENDPOINTS.earlyAccess.waitlistByFeature(featureKey),
	);
	return unwrapBody(result);
}
