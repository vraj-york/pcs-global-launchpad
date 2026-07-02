import { useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import {
	AppLoader,
	EndUserFtueLayout,
	EndUserOnboardingIntroContent,
	ProfileReviewConsentForm,
} from "@/components";
import { Button } from "@/components/ui/button";
import {
	APP_USER_TYPE,
	END_USER_ONBOARDING_REQUIRED_STEP_COUNT,
	PROFILE_REVIEW_CONSENT_PAGE_CONTENT,
	ROUTES,
} from "@/const";
import { useIndividualPaymentGate, useIsEndUser } from "@/hooks";
import { AuthLayout } from "@/layout";
import { resolveEndUserHomeRoute } from "@/lib";
import { useUsersStore } from "@/store";

export function EndUserOnboardingPage() {
	const { isEndUser, ready } = useIsEndUser();
	const {
		paymentRequired: individualPaymentRequired,
		loading: individualPaymentLoading,
	} = useIndividualPaymentGate();

	const {
		userProfile,
		userProfileLoading,
		userProfileError,
		fetchUserProfile,
	} = useUsersStore();

	const profileLoad = useMemo(() => {
		if (userProfileLoading && !userProfile) return "loading";
		if (userProfileError && !userProfile) return "error";
		if (userProfile) return "ok";
		return "loading";
	}, [userProfile, userProfileLoading, userProfileError]);

	useEffect(() => {
		if (ready && isEndUser && !userProfile && !userProfileLoading) {
			void fetchUserProfile();
		}
	}, [ready, isEndUser, userProfile, userProfileLoading, fetchUserProfile]);

	if (!ready) {
		return (
			<AuthLayout consentScreen>
				<AppLoader className="min-h-48" />
			</AuthLayout>
		);
	}

	if (!isEndUser) {
		return <Navigate to={ROUTES.dashboard.root} replace />;
	}

	if (profileLoad === "loading") {
		return (
			<AuthLayout consentScreen>
				<AppLoader className="min-h-48" />
			</AuthLayout>
		);
	}

	if (profileLoad === "error" || !userProfile) {
		const copy = PROFILE_REVIEW_CONSENT_PAGE_CONTENT;
		return (
			<AuthLayout consentScreen>
				<div className="flex min-h-48 flex-col items-center justify-center gap-4">
					<p className="text-center text-small text-text-secondary">
						{copy.profileLoadError}
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => void fetchUserProfile()}
						className="rounded-lg"
					>
						{copy.retryButton}
					</Button>
				</div>
			</AuthLayout>
		);
	}

	const profileSuggestsIndividual =
		userProfile.userType?.trim().toLowerCase() === APP_USER_TYPE.individual;

	if (
		profileSuggestsIndividual &&
		(individualPaymentLoading || individualPaymentRequired)
	) {
		return <Navigate to={ROUTES.dashboard.root} replace />;
	}

	if (
		userProfile.completedOnboardingSteps >=
		END_USER_ONBOARDING_REQUIRED_STEP_COUNT
	) {
		return (
			<Navigate
				to={resolveEndUserHomeRoute(userProfile, {
					paymentRequired: individualPaymentRequired,
				})}
				replace
			/>
		);
	}

	if (userProfile.completedOnboardingSteps <= 0) {
		return (
			<AuthLayout consentScreen>
				<ProfileReviewConsentForm
					onConsentComplete={() => void fetchUserProfile()}
				/>
			</AuthLayout>
		);
	}

	return (
		<EndUserFtueLayout>
			<EndUserOnboardingIntroContent />
		</EndUserFtueLayout>
	);
}
