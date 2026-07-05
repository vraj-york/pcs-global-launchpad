import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError, type ApiError, type ApiResponse } from "@/lib/apiClient";
import type { CoachCalendarResponse } from "@/types";

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

export async function getCoachCalendar(view: "week" | "month", start: string) {
	const result = await apiClient.get<ApiEnvelope<CoachCalendarResponse>>(
		`${API_ENDPOINTS.coach.calendar}?view=${encodeURIComponent(view)}&start=${encodeURIComponent(start)}`,
	);
	return unwrapBody(result);
}
