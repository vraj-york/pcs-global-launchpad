import { useAuthStore } from "@/store";

/**
 * Returns Cognito groups from the auth store (resolved once per session).
 * `ready` is false only until the first resolve completes for authenticated users.
 */
export function useUserGroups() {
	const { isAuthenticated, cognitoGroups, cognitoGroupsReady } = useAuthStore();
	return {
		groups: isAuthenticated ? cognitoGroups : [],
		ready: isAuthenticated ? cognitoGroupsReady : true,
	};
}
