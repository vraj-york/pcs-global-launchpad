import {
	confirmSignIn,
	fetchAuthSession,
	fetchUserAttributes,
	getCurrentUser,
	signIn,
	signOut,
} from "aws-amplify/auth";
import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/api";
import { configureAmplify } from "@/config";
import {
	AUTH_ERROR_MESSAGES,
	AUTH_TOAST_MESSAGES,
	mapCognitoSignInError,
	ROUTES,
} from "@/const";
import {
	capturePasswordChangeCompleted,
	capturePosthogLoginSuccess,
	getCognitoGroupsFromAuthSession,
	isApiError,
	resetPosthog,
} from "@/lib";
import {
	useCompanyAdminDashboardStore,
	useSubscriptionAccessStore,
	useUsersStore,
} from "@/store";
import type { AuthState, AuthStore, LoginCredentials } from "@/types";

const initialState: AuthState = {
	user: null,
	email: null,
	passwordResetToken: null,
	rememberMe: false,
	isAuthenticated: false,
	isLoading: false,
	isInitialized: false,
	requiresVerification: false,
	requiresNewPassword: false,
	error: null,
	cognitoGroups: [],
	cognitoGroupsReady: false,
};

export const useAuthStore = create<AuthStore>()(
	persist(
		(set, get) => ({
			...initialState,

			resolveCognitoGroups: async (): Promise<string[]> => {
				const groups = await getCognitoGroupsFromAuthSession();
				set({ cognitoGroups: groups, cognitoGroupsReady: true });
				return groups;
			},

			checkAuth: async (): Promise<void> => {
				try {
					const session = await fetchAuthSession();
					if (session.tokens?.accessToken) {
						const user = await getCurrentUser();
						const attributes = await fetchUserAttributes();
						const email = attributes?.email ?? null;
						const groups = await getCognitoGroupsFromAuthSession();
						set({
							user,
							email,
							isAuthenticated: true,
							isInitialized: true,
							error: null,
							cognitoGroups: groups,
							cognitoGroupsReady: true,
						});
					} else {
						set({
							isInitialized: true,
							isAuthenticated: false,
							cognitoGroups: [],
							cognitoGroupsReady: true,
						});
					}
				} catch {
					await signOut().catch(() => null);
					resetPosthog();
					sessionStorage.clear();
					localStorage.clear();
					set({
						isInitialized: true,
						isAuthenticated: false,
						cognitoGroups: [],
						cognitoGroupsReady: true,
					});
					window.location.href = ROUTES.auth.login;
				}
			},

			login: async (
				credentials: LoginCredentials,
			): Promise<"success" | "verification" | "newPassword" | "error"> => {
				const rememberMe = credentials.rememberMe ?? false;
				configureAmplify(rememberMe);

				set({
					isLoading: true,
					error: null,
					email: credentials.email,
					rememberMe,
				});

				const signInResult = await signIn({
					username: credentials.email,
					password: credentials.password,
				}).catch((error: Error) => {
					return {
						isSignedIn: false,
						error: mapCognitoSignInError(error),
					};
				});

				if ("error" in signInResult) {
					set({ isLoading: false, error: signInResult.error });
					return "error";
				}

				if (
					signInResult.nextStep?.signInStep ===
					"CONFIRM_SIGN_IN_WITH_EMAIL_CODE"
				) {
					set({
						isLoading: false,
						requiresVerification: true,
						requiresNewPassword: false,
						error: null,
					});
					return "verification";
				}

				if (
					signInResult.nextStep?.signInStep ===
					"CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
				) {
					set({
						isLoading: false,
						requiresNewPassword: true,
						requiresVerification: false,
						error: null,
					});
					return "newPassword";
				}

				if (signInResult.isSignedIn) {
					const user = await getCurrentUser().catch(() => null);
					set({
						user,
						email: credentials.email,
						isAuthenticated: true,
						requiresVerification: false,
						requiresNewPassword: false,
						error: null,
					});
					await get().resolveCognitoGroups();
					capturePosthogLoginSuccess("password");
					return "success";
				}

				set({ isLoading: false, error: AUTH_TOAST_MESSAGES.loginError });
				return "error";
			},

			completeNewPasswordChallenge: async (
				newPassword: string,
			): Promise<boolean> => {
				set({ isLoading: true, error: null });

				const result = await confirmSignIn({
					challengeResponse: newPassword,
				}).catch((error: Error) => {
					return { isSignedIn: false, error: error.message };
				});

				if ("error" in result) {
					set({ isLoading: false, error: result.error });
					toast.error(result.error);
					return false;
				}

				if (result.isSignedIn) {
					const user = await getCurrentUser().catch(() => null);
					set({
						user,
						isAuthenticated: true,
						requiresNewPassword: false,
						requiresVerification: false,
						error: null,
					});
					await get().resolveCognitoGroups();
					capturePasswordChangeCompleted("cognito_new_password_required");
					capturePosthogLoginSuccess("cognito_new_password");
					return true;
				}

				set({ isLoading: false, error: AUTH_TOAST_MESSAGES.loginError });
				toast.error(AUTH_TOAST_MESSAGES.loginError);
				return false;
			},

			cancelNewPasswordChallenge: async (): Promise<void> => {
				await signOut().catch(() => null);
				set({
					requiresNewPassword: false,
					isLoading: false,
					error: null,
				});
			},

			confirmSignIn: async (code: string): Promise<boolean> => {
				set({ isLoading: true, error: null });

				const result = await confirmSignIn({
					challengeResponse: code,
				}).catch((error: Error) => {
					const isInvalidCode =
						error.name === "CodeMismatchException" ||
						error.name === "ExpiredCodeException" ||
						error.name === "NotAuthorizedException";

					const errorMessage = isInvalidCode
						? AUTH_ERROR_MESSAGES.invalidVerificationCode
						: error.message;

					return { isSignedIn: false, error: errorMessage };
				});

				if ("error" in result) {
					set({ isLoading: false, error: result.error });
					toast.error(result.error);
					return false;
				}

				if (result.isSignedIn) {
					const user = await getCurrentUser().catch(() => null);
					set({
						user,
						isAuthenticated: true,
						requiresVerification: false,
						requiresNewPassword: false,
						error: null,
					});
					await get().resolveCognitoGroups();
					capturePosthogLoginSuccess("email_otp");
					toast.success(AUTH_TOAST_MESSAGES.verificationSuccess);
					return true;
				}

				set({ isLoading: false, error: AUTH_TOAST_MESSAGES.verificationError });
				toast.error(AUTH_TOAST_MESSAGES.verificationError);
				return false;
			},

			requestPasswordReset: async (email: string): Promise<boolean> => {
				set({ isLoading: true, error: null, email });

				const response = await authApi.requestPasswordReset({ email });

				if (isApiError(response)) {
					set({ isLoading: false, error: response.message });
					toast.error(response.message);
					return false;
				}

				set({ isLoading: false, error: null });
				toast.success(response.data.message);
				return true;
			},

			validatePasswordReset: async (
				email: string,
				token: string,
			): Promise<boolean> => {
				set({ isLoading: true, error: null, email });

				const response = await authApi.validatePasswordReset({ email, token });

				if (isApiError(response)) {
					set({ isLoading: false, error: response.message });
					toast.error(response.message);
					return false;
				}

				set({ isLoading: false, error: null, passwordResetToken: token });
				toast.success(response.data.message);
				return true;
			},

			resendPasswordReset: async (email: string): Promise<boolean> => {
				set({ isLoading: true, error: null, email });

				const response = await authApi.resendPasswordReset({ email });

				if (isApiError(response)) {
					set({ isLoading: false, error: response.message });
					toast.error(response.message);
					return false;
				}

				set({ isLoading: false, error: null });
				toast.success(response.data.message);
				return true;
			},

			confirmPasswordReset: async (
				email: string,
				token: string,
				newPassword: string,
			): Promise<boolean> => {
				set({ isLoading: true, error: null });

				const response = await authApi.confirmPasswordReset({
					email,
					token,
					newPassword,
				});

				if (isApiError(response)) {
					set({ isLoading: false, error: response.message });
					toast.error(response.message);
					const codeExpired = response.message
						.toLowerCase()
						.includes("expired");
					if (codeExpired) {
						setTimeout(() => {
							window.location.replace(ROUTES.auth.forgotPassword);
						}, 3000);
					}
					return false;
				}

				set({
					isLoading: false,
					error: null,
					email: null,
					passwordResetToken: null,
				});
				return true;
			},

			logout: async (): Promise<void> => {
				set({ isLoading: true });
				await signOut().catch(() => null);
				resetPosthog();
				useUsersStore.getState().clearUserProfile();
				useCompanyAdminDashboardStore.getState().reset();
				useSubscriptionAccessStore.getState().resetSubscriptionAccess();
				set({ ...initialState, isInitialized: true });
			},

			clearError: () => {
				set({ error: null });
			},

			reset: () => {
				set({ ...initialState });
			},
		}),
		{
			name: "auth-storage",
			storage: {
				getItem: (name) => {
					const value = sessionStorage.getItem(name);
					return value ? JSON.parse(value) : null;
				},
				setItem: (name, value) => {
					sessionStorage.setItem(name, JSON.stringify(value));
				},
				removeItem: (name) => {
					sessionStorage.removeItem(name);
				},
			},
			partialize: (state) =>
				({
					email: state.email,
					passwordResetToken: state.passwordResetToken,
				}) as AuthStore,
		},
	),
);
