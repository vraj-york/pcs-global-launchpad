import { useCallback, useEffect } from "react";
import { useUserRoles } from "@/hooks";
import {
	useAuthStore,
	useSubscriptionAccessStore,
	useUsersStore,
} from "@/store";
import type { SubscriptionAccess, SubscriptionAccessData } from "@/types";

function deriveAccess(
	data: SubscriptionAccessData | null,
	isSuperAdmin: boolean,
	isCorpOrCompanyAdmin: boolean,
): Omit<
	SubscriptionAccess,
	"loading" | "refreshing" | "hasResolvedAccess" | "refresh"
> {
	const isAdminRole = isCorpOrCompanyAdmin;

	if (!data) {
		return {
			companyId: null,
			subscriptionStatus: null,
			planTypeId: null,
			employeeRangeMax: null,
			activeEmployeeCount: null,
			isActive: false,
			isBlocked: false,
			employeeLimitExceeded: false,
			isAdminRole,
			isSuperAdmin,
			canAccessApp: isSuperAdmin,
			canAccessFullApp: false,
			canAccessChatbot: isSuperAdmin,
			canStartAssessment: false,
			canViewResults: true,
			isIndividualUser: false,
			paymentRequired: false,
			paymentStatus: null,
		};
	}

	const canAccessFullApp = data.canAccessFullApp;
	const canAccessChatbot = isSuperAdmin || data.canAccessChatbot;
	const canStartAssessment = data.canStartAssessment;
	const canViewResults = data.canViewResults;
	const canAccessApp =
		canAccessFullApp || canStartAssessment || canViewResults || isSuperAdmin;

	return {
		...data,
		isAdminRole,
		isSuperAdmin,
		canAccessApp,
		canAccessFullApp,
		canAccessChatbot,
		canStartAssessment,
		canViewResults,
	};
}

/**
 * Loads and caches subscription access from GET /users/me/subscription-access.
 * Shared store prevents duplicate parallel requests across route guards.
 */
export function useSubscriptionAccess(): SubscriptionAccess {
	const { isAuthenticated } = useAuthStore();
	const { userProfile } = useUsersStore();
	const {
		isSuperAdmin,
		isCorporationAdmin,
		isCompanyAdmin,
		ready: groupsReady,
	} = useUserRoles();
	const {
		data,
		loading,
		refreshing,
		fetchAttempted,
		chatbotUnlockRefreshForCount,
		fetchSubscriptionAccess,
		resetSubscriptionAccess,
		setChatbotUnlockRefreshForCount,
	} = useSubscriptionAccessStore();

	const isCorpOrCompanyAdmin = isCorporationAdmin || isCompanyAdmin;

	const refresh = useCallback(async () => {
		await fetchSubscriptionAccess(true);
	}, [fetchSubscriptionAccess]);

	useEffect(() => {
		if (!isAuthenticated || !groupsReady) {
			resetSubscriptionAccess();
			return;
		}
		void fetchSubscriptionAccess();
	}, [
		fetchSubscriptionAccess,
		groupsReady,
		isAuthenticated,
		resetSubscriptionAccess,
	]);

	useEffect(() => {
		if (!data || !userProfile || isSuperAdmin) {
			return;
		}
		const completionCount = userProfile.assessmentCompletionCount;
		if (data.canAccessChatbot || completionCount <= 0) {
			return;
		}
		if (chatbotUnlockRefreshForCount === completionCount) {
			return;
		}
		setChatbotUnlockRefreshForCount(completionCount);
		void fetchSubscriptionAccess(true);
	}, [
		chatbotUnlockRefreshForCount,
		data?.canAccessChatbot,
		fetchSubscriptionAccess,
		isSuperAdmin,
		setChatbotUnlockRefreshForCount,
		userProfile?.assessmentCompletionCount,
	]);

	const derived = deriveAccess(data, isSuperAdmin, isCorpOrCompanyAdmin);

	return {
		...derived,
		loading: isAuthenticated && (loading || !groupsReady),
		refreshing,
		hasResolvedAccess: data !== null || fetchAttempted,
		refresh,
	};
}
