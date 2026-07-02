import { fetchAuthSession } from "aws-amplify/auth";
import {
	APP_USER_TYPE,
	COGNITO_COMPANY_ADMIN_GROUP,
	COGNITO_CORPORATION_ADMIN_GROUP,
	COGNITO_SUPER_ADMIN_GROUP,
	COGNITO_USER_GROUP,
	END_USER_ONBOARDING_REQUIRED_STEP_COUNT,
	INDIVIDUAL_PAYMENT_STATUS,
	ROUTES,
} from "@/const";
import { getDemoPersona, isDemoMode } from "@/demo";
import { useSubscriptionAccessStore, useUsersStore } from "@/store";
import type { SubscriptionAccessData } from "@/types";

/** Corporation Admin outranks Company Admin when both Cognito groups are present. */
export function normalizeCognitoGroups(groups: readonly string[]): string[] {
	if (groups.includes(COGNITO_CORPORATION_ADMIN_GROUP)) {
		return groups.filter((g) => g !== COGNITO_COMPANY_ADMIN_GROUP);
	}
	return [...groups];
}

/**
 * Reads `cognito:groups` from the Cognito ID token via Amplify session (no manual JWT decode).
 */
export async function getCognitoGroupsFromAuthSession(): Promise<string[]> {
	if (isDemoMode) {
		return normalizeCognitoGroups(getDemoPersona().groups);
	}
	try {
		const session = await fetchAuthSession();
		const claim = session.tokens?.idToken?.payload["cognito:groups"];
		if (!Array.isArray(claim)) return [];
		const parsed = claim.filter((g): g is string => typeof g === "string");
		return normalizeCognitoGroups(parsed);
	} catch {
		return [];
	}
}

export function isEndUserOnboardingIncomplete(
	completedSteps: number | null | undefined,
): boolean {
	return (completedSteps ?? 0) < END_USER_ONBOARDING_REQUIRED_STEP_COUNT;
}

export function isEndUserAssessmentIncomplete(
	assessmentCompletionCount: number | null | undefined,
): boolean {
	return (assessmentCompletionCount ?? 0) < 1;
}

export function resolveEndUserHomeRoute(
	profile: {
		completedOnboardingSteps: number;
		assessmentCompletionCount: number;
		userType?: string | null;
	},
	options?: { paymentRequired?: boolean },
): string {
	if (options?.paymentRequired) {
		return ROUTES.dashboard.root;
	}
	if (isEndUserOnboardingIncomplete(profile.completedOnboardingSteps)) {
		return ROUTES.auth.onboarding;
	}
	if (isEndUserAssessmentIncomplete(profile.assessmentCompletionCount)) {
		return ROUTES.assessment.root;
	}
	return ROUTES.dashboard.root;
}

export async function resolveIndividualPaymentRequired(
	userType: string | null | undefined,
): Promise<boolean> {
	const accessData = await useSubscriptionAccessStore
		.getState()
		.fetchSubscriptionAccess();

	return isIndividualPaymentRequiredFromAccess(accessData, userType);
}

export function isIndividualPaymentRequiredFromAccess(
	accessData: SubscriptionAccessData | null,
	userType: string | null | undefined,
): boolean {
	const profileSaysIndividual =
		userType?.trim().toLowerCase() === APP_USER_TYPE.individual;

	if (!accessData) {
		return profileSaysIndividual;
	}

	const { paymentRequired, isIndividualUser, paymentStatus } = accessData;
	const isIndividual = profileSaysIndividual || Boolean(isIndividualUser);

	if (!isIndividual) {
		return false;
	}

	if (paymentRequired) {
		return true;
	}

	return !isPaidIndividualPaymentStatus(paymentStatus);
}

function isPaidIndividualPaymentStatus(
	paymentStatus: string | null | undefined,
): boolean {
	return paymentStatus?.trim().toLowerCase() === INDIVIDUAL_PAYMENT_STATUS.paid;
}

export async function resolvePostAuthenticationRoute(): Promise<string> {
	const groups = await getCognitoGroupsFromAuthSession();
	if (!groups.includes(COGNITO_USER_GROUP)) {
		return ROUTES.dashboard.root;
	}
	const profileLoaded = await useUsersStore.getState().fetchUserProfile();
	const { userProfile } = useUsersStore.getState();
	const paymentRequired = await resolveIndividualPaymentRequired(
		userProfile?.userType,
	);

	if (!profileLoaded || !userProfile) {
		return paymentRequired ? ROUTES.dashboard.root : ROUTES.auth.onboarding;
	}

	return resolveEndUserHomeRoute(userProfile, { paymentRequired });
}

/**
 * PostHog `first_dashboard_view.role_bucket`: uses Cognito pool group names (AWS),
 * same identifiers as `cognito:groups` claims.
 */
export function resolveFirstDashboardViewRoleBucket(
	groups: readonly string[],
): string {
	if (groups.includes(COGNITO_SUPER_ADMIN_GROUP)) {
		return COGNITO_SUPER_ADMIN_GROUP;
	}
	if (groups.includes(COGNITO_COMPANY_ADMIN_GROUP)) {
		return COGNITO_COMPANY_ADMIN_GROUP;
	}
	if (groups.includes(COGNITO_CORPORATION_ADMIN_GROUP)) {
		return COGNITO_CORPORATION_ADMIN_GROUP;
	}
	return COGNITO_USER_GROUP;
}
