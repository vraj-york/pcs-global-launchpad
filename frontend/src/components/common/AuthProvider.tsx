import type { ReactNode } from "react";
import { useEffect } from "react";
import { AppLoader } from "@/components";
import { useAuthStore, useUsersStore } from "@/store";

type AuthProviderProps = {
	children: ReactNode;
};

/**
 * AuthProvider - Checks for existing auth session on app load
 * Wraps the app and initializes authentication state
 */
export function AuthProvider({ children }: AuthProviderProps) {
	const { checkAuth, isAuthenticated, isInitialized } = useAuthStore();
	const { fetchUserProfile, clearUserProfile } = useUsersStore();

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	useEffect(() => {
		if (!isInitialized) return;
		if (isAuthenticated) {
			void fetchUserProfile();
			return;
		}
		clearUserProfile();
	}, [isInitialized, isAuthenticated, fetchUserProfile, clearUserProfile]);

	if (!isInitialized) {
		return <AppLoader fullScreen showMessage />;
	}

	return <>{children}</>;
}
