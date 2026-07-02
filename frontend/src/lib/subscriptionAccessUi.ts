/** UI/state helpers for subscription access loading and refresh. */

import type { SubscriptionAccessMode } from "@/types";

type SubscriptionRouteAccessInput = {
	canStartAssessment: boolean;
	canAccessFullApp: boolean;
	canAccessChatbot: boolean;
	canAccessApp: boolean;
	canViewResults: boolean;
	isSuperAdmin?: boolean;
	paymentRequired?: boolean;
};

export function hasSubscriptionRouteAccess(
	sub: SubscriptionRouteAccessInput,
	accessMode: SubscriptionAccessMode,
	assessmentCompletionCount: number,
): boolean {
	if (
		sub.isSuperAdmin &&
		(accessMode === "chatbot" || accessMode === "fullApp")
	) {
		return true;
	}

	switch (accessMode) {
		case "fullApp":
			if (sub.canAccessFullApp) return true;
			break;
		case "assessment":
			if (sub.paymentRequired) return false;
			if (sub.canStartAssessment) return true;
			if (sub.canViewResults && assessmentCompletionCount > 0) return true;
			// Report may be report_generated while profile completion count is still stale.
			if (
				sub.canViewResults &&
				!sub.canStartAssessment &&
				assessmentCompletionCount === 0
			) {
				return true;
			}
			return false;
		case "chatbot":
			if (sub.canAccessChatbot) return true;
			return false;
		default:
			if (sub.canAccessApp) return true;
			break;
	}
	return false;
}

export function shouldBlockSubscriptionRoute(
	loading: boolean,
	hasResolvedAccess: boolean,
): boolean {
	return loading && !hasResolvedAccess;
}

export function isSubscriptionBackgroundFetch(
	hasCachedData: boolean,
	explicitBackground?: boolean,
): boolean {
	return explicitBackground ?? hasCachedData;
}
