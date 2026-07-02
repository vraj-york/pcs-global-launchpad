import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { AppLoader } from "@/components";
import { ROUTES } from "@/const";
import { useIndividualPaymentGate, useIsEndUser } from "@/hooks";
import { resolveEndUserHomeRoute } from "@/lib";
import { useAuthStore, useUsersStore } from "@/store";

type PublicRouteProps = {
	children: ReactNode;
};

/**
 * PublicRoute - Prevents authenticated users from accessing public auth routes.
 * End users with incomplete onboarding go to onboarding; everyone else to dashboard.
 */
export function PublicRoute({ children }: PublicRouteProps) {
	const { isAuthenticated, isLoading } = useAuthStore();
	const { isEndUser, ready } = useIsEndUser();
	const { userProfile, userProfileError } = useUsersStore();
	const {
		loading: individualPaymentGateLoading,
		paymentRequired: individualPaymentRequired,
		isIndividualUser,
	} = useIndividualPaymentGate();

	if (!isAuthenticated) {
		return <>{children}</>;
	}

	const authContextPending =
		isLoading ||
		!ready ||
		(isEndUser && !userProfile && !userProfileError) ||
		(isIndividualUser && individualPaymentGateLoading);

	if (authContextPending) {
		return <AppLoader fullScreen showMessage />;
	}

	const target =
		isEndUser && userProfile
			? individualPaymentRequired
				? ROUTES.dashboard.root
				: resolveEndUserHomeRoute(userProfile)
			: ROUTES.dashboard.root;

	return <Navigate to={target} replace />;
}
