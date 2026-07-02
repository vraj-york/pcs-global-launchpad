import type { ReactNode } from "react";
import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { APP_USER_TYPE, ROUTES, SUBMODULE_KEYS } from "@/const";
import {
	useCompanyAdminPaymentGate,
	useIndividualPaymentGate,
	useIsEndUser,
	usePermissions,
	useSubscriptionAccess,
	useUserRoles,
} from "@/hooks";
import {
	buildLoginUrlWithRedirect,
	isEndUserAssessmentIncomplete,
	isEndUserOnboardingIncomplete,
} from "@/lib";
import {
	useAuthStore,
	useCompanyAdminDashboardStore,
	useUsersStore,
} from "@/store";
import { AppLoader } from "./AppLoader";

type ProtectedRouteProps = {
	children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { isAuthenticated } = useAuthStore();
	const location = useLocation();
	const { isEndUser, ready } = useIsEndUser();
	const { isCompanyAdmin } = useUserRoles();
	const { userProfile, userProfileError } = useUsersStore();
	const {
		enabledKeys,
		ready: permissionsReady,
		loading: permissionsLoading,
	} = usePermissions();
	const canViewDashboard =
		permissionsReady && enabledKeys.has(SUBMODULE_KEYS.DASHBOARD);
	const {
		loading: companyPaymentGateLoading,
		paymentRequired: companyPaymentRequired,
	} = useCompanyAdminPaymentGate();
	const {
		loading: individualPaymentGateLoading,
		paymentRequired: individualPaymentRequired,
	} = useIndividualPaymentGate();
	const { canStartAssessment } = useSubscriptionAccess();
	const paymentRequired = companyPaymentRequired || individualPaymentRequired;
	const canTakeAssessment =
		permissionsReady && enabledKeys.has(SUBMODULE_KEYS.ASSESSMENT_TAKE);

	const isDashboard = location.pathname === ROUTES.dashboard.root;
	const onAssessmentRoute =
		location.pathname === ROUTES.assessment.root ||
		location.pathname.startsWith(`${ROUTES.assessment.root}/`);

	useEffect(() => {
		if (!isCompanyAdmin) {
			return;
		}
		if (permissionsLoading || !permissionsReady) {
			return;
		}
		if (!canViewDashboard) {
			return;
		}
		void useCompanyAdminDashboardStore.getState().fetchCompanies();
	}, [isCompanyAdmin, permissionsReady, permissionsLoading, canViewDashboard]);

	if (!isAuthenticated) {
		const returnPath = `${location.pathname}${location.search}${location.hash}`;
		return (
			<Navigate
				to={buildLoginUrlWithRedirect(returnPath)}
				state={{ from: location }}
				replace
			/>
		);
	}

	if (!ready) {
		return <AppLoader fullScreen showMessage />;
	}

	const onOnboarding = location.pathname === ROUTES.auth.onboarding;
	const profileSuggestsIndividual =
		userProfile?.userType?.trim().toLowerCase() === APP_USER_TYPE.individual;
	const profileGatePending =
		isEndUser && !onOnboarding && !userProfile && !userProfileError;

	if (profileGatePending) {
		return <AppLoader fullScreen showMessage />;
	}

	if (
		onOnboarding &&
		isEndUser &&
		profileSuggestsIndividual &&
		(individualPaymentGateLoading || individualPaymentRequired)
	) {
		return <Navigate to={ROUTES.dashboard.root} replace />;
	}

	if (individualPaymentGateLoading && !isDashboard) {
		return <AppLoader fullScreen showMessage />;
	}

	if (companyPaymentGateLoading && !isDashboard) {
		return <AppLoader fullScreen showMessage />;
	}

	if (paymentRequired && !isDashboard) {
		return <Navigate to={ROUTES.dashboard.root} replace />;
	}

	const onboardingIncomplete =
		isEndUser &&
		isEndUserOnboardingIncomplete(userProfile?.completedOnboardingSteps);

	if (
		onboardingIncomplete &&
		!onOnboarding &&
		!(
			profileSuggestsIndividual &&
			(individualPaymentGateLoading || individualPaymentRequired)
		)
	) {
		return <Navigate to={ROUTES.auth.onboarding} replace />;
	}

	const shouldRedirectToAssessment =
		isEndUser &&
		userProfile &&
		!onboardingIncomplete &&
		!paymentRequired &&
		!individualPaymentGateLoading &&
		canTakeAssessment &&
		canStartAssessment &&
		isEndUserAssessmentIncomplete(userProfile.assessmentCompletionCount);

	if (shouldRedirectToAssessment && !onAssessmentRoute && !onOnboarding) {
		return <Navigate to={ROUTES.assessment.root} replace />;
	}

	return <>{children}</>;
}
