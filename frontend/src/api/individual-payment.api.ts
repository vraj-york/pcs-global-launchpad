import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib";
import type {
	IndividualPaymentApiEnvelope,
	IndividualPaymentReview,
} from "@/types";

export async function getIndividualPaymentReview() {
	const result = await apiClient.get<
		IndividualPaymentApiEnvelope<IndividualPaymentReview>
	>(API_ENDPOINTS.users.individualPaymentReview);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.data || body.success === false) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: body.data, status: result.status };
}

export async function postIndividualPaymentCheckoutSession() {
	const result = await apiClient.post<
		IndividualPaymentApiEnvelope<{ url: string }>
	>(API_ENDPOINTS.users.individualPaymentCheckoutSession, {});
	if (isApiError(result)) return result;
	const envelope = result.data;
	const url = envelope?.data?.url;
	if (!url || envelope.success === false) {
		return {
			ok: false as const,
			message: envelope?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: { url }, status: result.status };
}
