import { Navigate, useLocation } from "react-router-dom";
import { ROUTES } from "@/const";
import {
	useIndividualPaymentGate,
	useIsEndUser,
	useSubscriptionAccess,
} from "@/hooks";
import { isEndUserAssessmentIncomplete } from "@/lib";
import {
	hasSubscriptionRouteAccess,
	shouldBlockSubscriptionRoute,
} from "@/lib/subscriptionAccessUi";
import { useUsersStore } from "@/store";
import type { SubscriptionGuardRouteProps } from "@/types";
import { AppLoader } from "./AppLoader";

/**
 * Route guard that checks subscription status and (optionally) plan type.
 *
 * - SuperAdmin always passes; other admin roles pass except chatbot (monthly plan).
 * - `alwaysAccessible` routes skip all checks (past results, reports).
 * - Otherwise, requires the requested subscription capability.
 * - Redirects blocked users to the dashboard.
 */
export function SubscriptionGuardRoute({
	children,
	requiredPlans,
	requiredAccess,
	alwaysAccessible,
}: SubscriptionGuardRouteProps) {
	const location = useLocation();
	const sub = useSubscriptionAccess();
	const {
		paymentRequired: individualPaymentRequired,
		loading: individualPaymentGateLoading,
	} = useIndividualPaymentGate();
	const { isEndUser } = useIsEndUser();
	const { userProfile } = useUsersStore();
	const requiresFirstAssessment =
		isEndUser &&
		userProfile &&
		isEndUserAssessmentIncomplete(userProfile.assessmentCompletionCount);

	if (alwaysAccessible) {
		return <>{children}</>;
	}

	if (shouldBlockSubscriptionRoute(sub.loading, sub.hasResolvedAccess)) {
		return <AppLoader className="min-h-[40vh]" />;
	}

	if (individualPaymentGateLoading && requiredAccess === "assessment") {
		return <AppLoader className="min-h-[40vh]" />;
	}

	if (individualPaymentRequired && requiredAccess === "assessment") {
		return (
			<Navigate
				to={ROUTES.dashboard.root}
				state={{ from: location, reason: "individual_payment_required" }}
				replace
			/>
		);
	}

	if (sub.isSuperAdmin) {
		return <>{children}</>;
	}

	if (sub.isAdminRole && requiredAccess !== "chatbot") {
		return <>{children}</>;
	}

	const accessMode = requiredAccess ?? "fullApp";
	const assessmentPaymentBlocked =
		accessMode === "assessment" &&
		(individualPaymentRequired || Boolean(sub.paymentRequired));
	const redirectWhenDenied = assessmentPaymentBlocked
		? ROUTES.dashboard.root
		: accessMode === "assessment"
			? ROUTES.assessments.root
			: requiresFirstAssessment
				? ROUTES.assessment.root
				: ROUTES.dashboard.root;

	const assessmentCompletionCount = userProfile?.assessmentCompletionCount ?? 0;
	const hasAccess = hasSubscriptionRouteAccess(
		sub,
		accessMode,
		assessmentCompletionCount,
	);

	if (requiredPlans && requiredPlans.length > 0) {
		const planMatches =
			sub.planTypeId !== null && requiredPlans.includes(sub.planTypeId);
		if (!planMatches) {
			return (
				<Navigate
					to={redirectWhenDenied}
					state={{ from: location, reason: "plan_not_allowed" }}
					replace
				/>
			);
		}
	}

	if (!hasAccess) {
		return (
			<Navigate
				to={redirectWhenDenied}
				state={{ from: location, reason: "subscription_inactive" }}
				replace
			/>
		);
	}

	return <>{children}</>;
}
