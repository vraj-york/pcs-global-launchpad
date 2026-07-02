import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib/apiClient";
import type {
	CompanyAdminDashboardResponse,
	OnsiteTrainingApiOption,
} from "@/types";

type ApiEnvelope<T> = {
	success: boolean;
	message: string;
	data?: T;
};

export async function getCompanyAdminOnboardingReview() {
	const result = await apiClient.get<
		ApiEnvelope<CompanyAdminDashboardResponse>
	>(API_ENDPOINTS.companyAdmin.onboardingReview);
	if (isApiError(result)) return result;
	const body = result.data;
	const inner = body?.data;
	if (!inner?.companies || body.success === false) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: inner, status: result.status };
}

export async function postCompanyAdminCheckoutSession(payload?: {
	companyId?: string;
	onsiteTrainingOption?: OnsiteTrainingApiOption;
	assessmentQuantity?: number;
}) {
	const result = await apiClient.post<ApiEnvelope<{ url: string }>>(
		API_ENDPOINTS.companyAdmin.checkoutSession,
		payload ?? {},
	);
	if (isApiError(result)) return result;
	const envelope = result.data;
	const inner = envelope?.data;
	if (!inner?.url || envelope.success === false) {
		return {
			ok: false as const,
			message: envelope?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: inner, status: result.status };
}
