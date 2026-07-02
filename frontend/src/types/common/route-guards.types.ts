import type { ReactNode } from "react";

export type RoleGuardRouteProps = {
	children: ReactNode;
	/** User must belong to at least one of these Cognito groups. */
	allowedGroups: readonly string[];
};

export type SubscriptionAccessMode = "fullApp" | "assessment" | "chatbot";

export type SubscriptionGuardRouteProps = {
	children: ReactNode;
	/**
	 * When set, only users on the specified plan(s) may access the route.
	 * Admin roles always pass regardless of plan.
	 * Prefer `requiredAccess` for capability-based gating.
	 */
	requiredPlans?: string[];
	/**
	 * Capability gate derived from GET /users/me/subscription-access.
	 * - `fullApp`: monthly plan with active subscription (BiSPy extras, full dashboard).
	 * - `assessment`: may start or continue assessments (monthly, annual, one_time, assessment only).
	 * - `chatbot`: monthly plan chatbot access.
	 */
	requiredAccess?: SubscriptionAccessMode;
	/**
	 * When true, the route is always accessible regardless of subscription
	 * status (e.g. viewing past results). Defaults to false.
	 */
	alwaysAccessible?: boolean;
};
