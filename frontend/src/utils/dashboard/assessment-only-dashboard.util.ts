import type { SubscriptionAccessData } from "@/types";

export function isAssessmentOnlyDashboardUser(
	access: Pick<
		SubscriptionAccessData,
		"canAccessFullApp" | "planTypeId" | "companyId"
	>,
): boolean {
	if (access.canAccessFullApp) {
		return false;
	}
	const planTypeId = access.planTypeId;
	if (planTypeId === "annual" || planTypeId === "one_time") {
		return true;
	}
	if (!access.companyId) {
		return true;
	}
	return false;
}
