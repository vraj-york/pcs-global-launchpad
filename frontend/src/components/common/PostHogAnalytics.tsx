import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useUserRoles } from "@/hooks";
import {
	capturePosthogPageview,
	isPosthogConfigured,
	syncPosthogUserIdentity,
} from "@/lib";
import { useAuthStore } from "@/store";

/**
 * SPA pageviews + identify/group sync when the Cognito session is active.
 */
export function PostHogAnalytics() {
	const location = useLocation();
	const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
	const user = useAuthStore((s) => s.user);
	const cognitoSub = user?.userId ?? user?.username ?? "";
	const { isSuperAdmin, isCompanyAdmin, ready } = useUserRoles();
	const identityOncePerSubRef = useRef<string | null>(null);

	useEffect(() => {
		if (!isPosthogConfigured()) return;
		capturePosthogPageview(
			`${location.pathname}${location.search}${location.hash}`,
		);
	}, [location.pathname, location.search, location.hash]);

	useEffect(() => {
		if (!isPosthogConfigured() || !isAuthenticated || !cognitoSub || !ready) {
			identityOncePerSubRef.current = null;
			return;
		}
		if (identityOncePerSubRef.current === cognitoSub) return;
		identityOncePerSubRef.current = cognitoSub;
		let cancelled = false;
		void (async () => {
			await syncPosthogUserIdentity(cognitoSub, {
				isSuperAdmin,
				isCompanyAdmin,
			});
			if (cancelled) return;
		})();
		return () => {
			cancelled = true;
		};
	}, [isAuthenticated, cognitoSub, ready, isSuperAdmin, isCompanyAdmin]);

	return null;
}
