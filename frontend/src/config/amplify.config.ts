import { Amplify } from "aws-amplify";
import {
	AUTH_KEY_PREFIX,
	cognitoUserPoolsTokenProvider,
} from "aws-amplify/auth/cognito";

const userPoolId = import.meta.env.VITE_AWS_USER_POOL_ID as string;
const defaultUserPoolClientId = import.meta.env
	.VITE_AWS_USER_POOL_CLIENT_ID as string;
const rememberUserPoolClientId = import.meta.env
	.VITE_AWS_USER_POOL_CLIENT_ID_REMEMBER as string | undefined;

export function getCognitoUserPoolClientId(rememberMe: boolean): string {
	if (rememberMe && rememberUserPoolClientId) {
		return rememberUserPoolClientId;
	}
	return defaultUserPoolClientId;
}

export function getRememberMePreference(): boolean {
	if (typeof window === "undefined" || !rememberUserPoolClientId) {
		return false;
	}

	const prefix = `${AUTH_KEY_PREFIX}.${rememberUserPoolClientId}.`;
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key?.startsWith(prefix) && key.endsWith(".refreshToken")) {
			return true;
		}
	}
	return false;
}

export function configureAmplify(rememberMe = false): void {
	Amplify.configure({
		Auth: {
			Cognito: {
				userPoolId,
				userPoolClientId: getCognitoUserPoolClientId(rememberMe),
			},
		},
	});

	const authConfig = Amplify.getConfig().Auth;
	if (authConfig) {
		cognitoUserPoolsTokenProvider.setAuthConfig(authConfig);
	}
}
