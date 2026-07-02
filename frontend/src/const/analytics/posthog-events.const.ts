/** PostHog custom event names (snake_case). */
export const POSTHOG_EVENTS = {
	loginSuccess: "login_success",
	passwordChangeViewed: "password_change_viewed",
	passwordChangeCompleted: "password_change_completed",
	firstDashboardView: "first_dashboard_view",
	companyPlanReviewViewed: "company_plan_review_viewed",
	stripeCheckoutStarted: "stripe_checkout_started",
	assessmentStarted: "assessment_started",
	assessmentCompleted: "assessment_completed",
	/** Generic feature touch for adoption % of MAU (use `feature_key`). */
	featureUsed: "feature_used",
} as const;
