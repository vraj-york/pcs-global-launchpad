import {
	APP_USER_TYPE,
	AUTH_POST_LOGIN_REDIRECT_QUERY_PARAM,
	ROUTES,
} from "@/const";
import { useUsersStore } from "@/store";
import type { PostLoginRedirectLocation } from "@/types";
import {
	resolveIndividualPaymentRequired,
	resolvePostAuthenticationRoute,
} from "./cognitoGroups";

export type { PostLoginRedirectLocation };

const BLOCKED_REDIRECT_PATHS = [
	ROUTES.auth.login,
	ROUTES.auth.forgotPassword,
] as const;

/** True for same-app relative paths; blocks external URLs and auth loops. */
export function isSafeAppRedirectPath(path: string): boolean {
	const trimmed = path.trim();
	if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
		return false;
	}
	if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
		return false;
	}

	const pathname = trimmed.split(/[?#]/)[0] ?? trimmed;
	return !BLOCKED_REDIRECT_PATHS.some(
		(blocked) => pathname === blocked || pathname.startsWith(`${blocked}/`),
	);
}

export function buildRedirectPathFromLocation(
	location: PostLoginRedirectLocation,
): string | null {
	const pathname = location.pathname?.trim();
	if (!pathname) {
		return null;
	}
	const path = `${pathname}${location.search ?? ""}${location.hash ?? ""}`;
	return isSafeAppRedirectPath(path) ? path : null;
}

export function readRedirectFromSearch(search: string): string | null {
	const rawSearch = search.startsWith("?") ? search.slice(1) : search;
	const raw = new URLSearchParams(rawSearch)
		.get(AUTH_POST_LOGIN_REDIRECT_QUERY_PARAM)
		?.trim();
	if (!raw) {
		return null;
	}
	try {
		const decoded = decodeURIComponent(raw);
		return isSafeAppRedirectPath(decoded) ? decoded : null;
	} catch {
		return null;
	}
}

export function buildLoginUrlWithRedirect(returnPath: string): string {
	if (!returnPath || returnPath === "/" || !isSafeAppRedirectPath(returnPath)) {
		return ROUTES.auth.login;
	}
	return `${ROUTES.auth.login}?${AUTH_POST_LOGIN_REDIRECT_QUERY_PARAM}=${encodeURIComponent(returnPath)}`;
}

/**
 * Resolves where to navigate after login. Incomplete onboarding still wins;
 * otherwise returns a safe `?redirect=` or router `state.from` target, then the
 * default post-auth route (dashboard or onboarding).
 */
export async function resolvePostLoginNavigationTarget(options?: {
	locationStateFrom?: PostLoginRedirectLocation | null;
	search?: string;
}): Promise<string> {
	const defaultRoute = await resolvePostAuthenticationRoute();
	const profile = useUsersStore.getState().userProfile;
	const individualPaymentRequired = await resolveIndividualPaymentRequired(
		profile?.userType,
	);

	if (individualPaymentRequired && defaultRoute === ROUTES.auth.onboarding) {
		return ROUTES.dashboard.root;
	}

	if (defaultRoute === ROUTES.auth.onboarding) {
		return defaultRoute;
	}

	const fromQuery =
		options?.search != null ? readRedirectFromSearch(options.search) : null;
	const fromState = options?.locationStateFrom
		? buildRedirectPathFromLocation(options.locationStateFrom)
		: null;

	const candidate = fromQuery ?? fromState ?? defaultRoute;
	const isIndividualUser =
		profile?.userType?.trim().toLowerCase() === APP_USER_TYPE.individual;

	if (
		isIndividualUser &&
		individualPaymentRequired &&
		(candidate === ROUTES.auth.onboarding ||
			candidate === ROUTES.assessment.root ||
			candidate.startsWith(`${ROUTES.assessment.root}/`))
	) {
		return ROUTES.dashboard.root;
	}

	return candidate;
}
