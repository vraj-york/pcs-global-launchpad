import { API_ENDPOINTS } from "@/const";
import { type ApiError, apiClient, isApiError } from "@/lib/apiClient";
import type { SupportRequestPayload, SupportRequestResponse } from "@/types";

/**
 * POST /support-requests — multipart/form-data, no auth required.
 * Fields: email, subject, message, attachments (repeatable file field).
 */
export async function submitSupportRequest(payload: SupportRequestPayload) {
	const formData = new FormData();
	formData.append("email", payload.email.trim());
	formData.append("subject", payload.subject.trim());
	formData.append("message", payload.message.trim());

	for (const file of payload.attachments ?? []) {
		formData.append("attachments", file);
	}

	const result = await apiClient.post<SupportRequestResponse>(
		API_ENDPOINTS.support.root,
		formData,
	);

	if (isApiError(result)) return result;

	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		} satisfies ApiError;
	}

	return {
		ok: true as const,
		message: typeof body.message === "string" ? body.message : "",
	};
}
