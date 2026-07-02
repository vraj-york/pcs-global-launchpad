import posthog from "posthog-js";
import { getMeAnalyticsContext } from "@/api";
import { POSTHOG_EVENTS } from "@/const";
export function isPosthogConfigured(): boolean {
	const key = import.meta.env.VITE_POSTHOG_KEY;
	const host = import.meta.env.VITE_POSTHOG_HOST;
	return Boolean(
		typeof key === "string" &&
			key.trim().length > 0 &&
			typeof host === "string" &&
			host.trim().length > 0,
	);
}

/** Call once before React mounts (see `main.tsx`). */
export function initPosthog(): void {
	if (!isPosthogConfigured()) return;
	const apiKey = import.meta.env.VITE_POSTHOG_KEY as string;
	const apiHost = import.meta.env.VITE_POSTHOG_HOST as string;
	posthog.init(apiKey, {
		api_host: apiHost,
		person_profiles: "identified_only",
		capture_pageview: false,
		capture_pageleave: true,
	});
}

export function resetPosthog(): void {
	if (!isPosthogConfigured()) return;
	posthog.reset();
}

export function capturePosthogEvent(
	event: string,
	properties?: Record<string, unknown>,
): void {
	if (!isPosthogConfigured()) return;
	posthog.capture(event, properties);
}

export function capturePosthogLoginSuccess(authFlow: string): void {
	capturePosthogEvent(POSTHOG_EVENTS.loginSuccess, { auth_flow: authFlow });
}

export function capturePasswordChangeViewed(inviteChannel: string): void {
	capturePosthogEvent(POSTHOG_EVENTS.passwordChangeViewed, {
		invite_channel: inviteChannel,
	});
}

export function capturePasswordChangeCompleted(inviteChannel: string): void {
	capturePosthogEvent(POSTHOG_EVENTS.passwordChangeCompleted, {
		invite_channel: inviteChannel,
	});
}

/** `roleBucket` should be a Cognito group name (e.g. from {@link resolveFirstDashboardViewRoleBucket}). */
export function captureFirstDashboardView(roleBucket: string): void {
	try {
		const key = `ph_fd_${roleBucket}`;
		if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) {
			return;
		}
		sessionStorage.setItem(key, "1");
	} catch {
		// sessionStorage unavailable
	}
	capturePosthogEvent(POSTHOG_EVENTS.firstDashboardView, {
		role_bucket: roleBucket,
	});
}

export function captureCompanyPlanReviewViewed(payload: {
	company_id: string;
	corporation_id: string;
	plan_type_id?: string;
}): void {
	capturePosthogEvent(POSTHOG_EVENTS.companyPlanReviewViewed, payload);
}

export function captureStripeCheckoutStarted(payload: {
	company_id?: string;
	corporation_id?: string;
	plan_type_id?: string;
}): void {
	capturePosthogEvent(POSTHOG_EVENTS.stripeCheckoutStarted, payload);
}

export function captureAssessmentStarted(payload: {
	assessment_id: string;
	is_resume: boolean;
}): void {
	capturePosthogEvent(POSTHOG_EVENTS.assessmentStarted, payload);
}

export function captureAssessmentCompleted(payload: {
	assessment_id: string;
}): void {
	capturePosthogEvent(POSTHOG_EVENTS.assessmentCompleted, payload);
}

/** Adoption: breakdown `feature_key` in PostHog (e.g. ai_chat, assessment). */
export function captureFeatureUsed(payload: { feature_key: string }): void {
	capturePosthogEvent(POSTHOG_EVENTS.featureUsed, payload);
}

export type PosthogRoleFlags = {
	isSuperAdmin: boolean;
	isCompanyAdmin: boolean;
};

/**
 * Identify user + attach PostHog groups from backend context (and Cognito flags).
 * Safe to call on each session restore; skips duplicate work for the same `sub`.
 */
export async function syncPosthogUserIdentity(
	cognitoSub: string,
	roleFlags: PosthogRoleFlags,
): Promise<void> {
	if (!isPosthogConfigured() || !cognitoSub) return;

	const ctxRes = await getMeAnalyticsContext();
	const ctx = ctxRes.ok
		? ctxRes.data
		: {
				corporationId: null,
				companyIds: [],
				primaryCompanyId: null,
				inviteType: null,
				isB2cAssessmentOnly: false,
			};

	const props: Record<string, unknown> = {
		is_super_admin: roleFlags.isSuperAdmin,
		is_company_admin: roleFlags.isCompanyAdmin,
		is_b2c_assessment_only: ctx.isB2cAssessmentOnly,
	};
	if (ctx.inviteType) props.invite_type = ctx.inviteType;

	posthog.identify(cognitoSub, props);

	if (ctx.corporationId) {
		posthog.group("corporation", ctx.corporationId, {});
	}
	if (ctx.primaryCompanyId) {
		posthog.group("company", ctx.primaryCompanyId, {});
	}
}

export function capturePosthogPageview(pathname: string): void {
	if (!isPosthogConfigured()) return;
	posthog.capture("$pageview", {
		$current_url: typeof window !== "undefined" ? window.location.href : "",
		path: pathname,
	});
}
