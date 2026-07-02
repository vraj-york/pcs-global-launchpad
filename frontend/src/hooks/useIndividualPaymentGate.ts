import { APP_USER_TYPE, INDIVIDUAL_PAYMENT_STATUS } from "@/const";
import { useSubscriptionAccess, useUserRoles } from "@/hooks";
import { useUsersStore } from "@/store";

function isPaidIndividualStatus(
	paymentStatus: string | null | undefined,
): boolean {
	return paymentStatus?.trim().toLowerCase() === INDIVIDUAL_PAYMENT_STATUS.paid;
}

/** Payment gate for B2C individual assessment users. */
export function useIndividualPaymentGate() {
	const sub = useSubscriptionAccess();
	const { isSuperAdmin, isCompanyAdmin, isCorporationAdmin } = useUserRoles();
	const { userProfile } = useUsersStore();

	const profileSuggestsIndividual =
		userProfile?.userType?.trim().toLowerCase() === APP_USER_TYPE.individual;

	const isAdminRole = isSuperAdmin || isCompanyAdmin || isCorporationAdmin;
	const isIndividualUser = Boolean(
		sub.isIndividualUser || profileSuggestsIndividual,
	);
	const gateApplies = !isAdminRole && isIndividualUser;
	const gateResolved = sub.hasResolvedAccess;

	const isPaid =
		gateResolved &&
		isIndividualUser &&
		!sub.paymentRequired &&
		(isPaidIndividualStatus(sub.paymentStatus) || sub.canStartAssessment);

	const paymentRequired = gateApplies && gateResolved && !isPaid;
	const loading = gateApplies && !gateResolved;

	return {
		loading,
		paymentRequired,
		isIndividualUser,
		paymentStatus: sub.paymentStatus ?? null,
		refresh: sub.refresh,
	};
}
