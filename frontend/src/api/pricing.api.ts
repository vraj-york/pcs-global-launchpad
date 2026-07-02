import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib/apiClient";
import type { OnboardingFees, PricingPlanType } from "@/types";

/**
 * Fetch pricing plans (Plan and Plan Level dropdowns).
 * GET /pricing/plans (with auth)
 */
export async function getPricingPlans() {
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: PricingPlanType[];
	}>(API_ENDPOINTS.pricing.plans);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}

/**
 * Fetch implementation + onsite training fee amounts resolved from Stripe Price
 * IDs configured on the backend. These drive the Plan & Seats price breakdown
 * and the Confirmation step so amounts always match Stripe Checkout.
 *
 * GET /pricing/onboarding-fees (with auth)
 */
export async function getOnboardingFees() {
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: OnboardingFees;
	}>(API_ENDPOINTS.pricing.onboardingFees);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}
