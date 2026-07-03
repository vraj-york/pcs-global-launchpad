import type { CognitoAuthError } from "@/types";

export const AUTH_POST_LOGIN_REDIRECT_QUERY_PARAM = "redirect" as const;

export const AUTH_FORM_IDS = {
	loginForm: "login-form",
	email: "email",
	password: "password",
} as const;

export const AUTH_FIELD_NAMES = {
	email: "email",
	password: "password",
} as const;

export const AUTH_LAYOUT_CONTENT = {
	leftHeadlineLine1: "Map your",
	leftHeadlineAccent: "behavioral",
	leftHeadlineLine2: "intelligence.",
	leftSubtitle:
		"Explore how your behaviours connect, influence each other, and shape your overall profile.",
	helpText: "Need help?",
	contactUs: "Contact Us",
} as const;

export const LOGIN_PAGE_SUBTITLE_LINES = [
	"Your journey to self-discovery continues here.",
	"Discover your behavioral pattern.",
	"Unlock deeper self-awareness",
] as const;

export const LOGIN_PAGE_SUBTITLE_ROTATION_MS = 3500;

export const LOGIN_PAGE_CONTENT = {
	title: "Welcome back!",
	emailLabel: "Email",
	passwordLabel: "Password",
	rememberMe: "Remember me",
	forgotPassword: "Forgot Password?",
	submitButton: "Login",
} as const;

export const PROFILE_REVIEW_CONSENT_PAGE_CONTENT = {
	title: "Profile Review & Consent",
	consentPrefix: "I accept all the",
	termsOfUse: "Terms of Use",
	andText: "and",
	privacyPolicy: "Privacy Policy.",
	disclaimer:
		"Your responses remain private. Certain profile attributes (such as personality type) may be visible to your organization, while other insights are shared only in aggregated, non-identifiable form.",
	submitButton: "Agree & Continue",
	submitting: "Saving...",
	consentSwitchAriaLabel: "I accept all the Terms of Use and Privacy Policy",
	profileLoadError: "We could not load your profile. Please try again.",
	retryButton: "Retry",
	valueUnavailable: "N/A",
} as const;

export const PROFILE_REVIEW_CONSENT_DETAIL_LABELS = {
	parentCorporation: "Parent Corporation",
	companyName: "Company Name",
	fullName: "Full Name",
	role: "Role",
	email: "Email",
	workPhone: "Work Phone No.",
} as const;

export const PASSWORD_VISIBILITY_LABELS = {
	show: "Show password",
	hide: "Hide password",
} as const;

export const AUTH_TEXT_INPUT_CLASSNAME =
	"h-10 min-h-10 w-full border border-input bg-background px-4 py-2 text-small font-normal leading-small text-text-foreground shadow-none";

export const AUTH_VALIDATION_MESSAGES = {
	emailInvalid: "Invalid email address",
	passwordsDoNotMatch: "Passwords do not match",
} as const;

export const AUTH_TOAST_MESSAGES = {
	loginError: "Login failed. Please try again.",
	logoutSuccess: "Logged out successfully",
	verificationSuccess: "Account verified successfully!",
	verificationError: "Verification failed. Please try again.",
	codeResent: "Verification code resent!",
} as const;

export const VERIFICATION_PAGE_CONTENT = {
	title: "Enter Verification Code",
	subtitle: "We've sent a 6-digit code to your email",
	codeLabel: "Enter code",
	submitButton: "Verify Account",
	resendText: "Didn’t receive the code?",
	resendLink: "Resend Code",
	loadingText: "Verifying...",
} as const;

export const VERIFICATION_CONFIG = {
	codeLength: 6,
	timerDuration: 180,
} as const;

export const FORGOT_PASSWORD_PAGE_CONTENT = {
	title: "Forgot Password?",
	subtitle: "No worries — we'll send you reset instructions.",
	emailLabel: "Email",
	submitButton: "Send Instructions",
	backToLogin: "Back to Login",
} as const;

export const PASSWORD_RESET_PAGE_CONTENT = {
	title: "Reset Password",
	subtitle: "We've sent a 6-digit code to your email",
	codeLabel: "Enter code",
	submitButton: "Verify & Proceed",
	resendText: "Didn’t receive the code?",
	resendLink: "Resend Code",
	backToLogin: "Back to Login",
	verifyingText: "Verifying...",
} as const;

export const PASSWORD_RESET_CONFIG = {
	codeLength: 6,
	timerDuration: 180,
} as const;

export const AUTH_ERROR_MESSAGES = {
	invalidVerificationCode: "The verification code is invalid or has expired",
	invalidCredentials: "Invalid email or password.",
	accountUnavailable:
		"Your account is unavailable. Please contact our support team.",
	invitationExpired:
		"Your account invitation is no longer valid. Please contact our support team.",
} as const;

export const COGNITO_SIGN_IN_ERROR_MESSAGES = {
	incorrectCredentials: "Incorrect username or password.",
	userDisabled: "User is disabled.",
	accountExpired:
		"User account has expired, it must be reset by an administrator.",
} as const;

export function mapCognitoSignInError(error: CognitoAuthError): string {
	if (error.name !== "NotAuthorizedException") {
		return error.message ?? AUTH_TOAST_MESSAGES.loginError;
	}

	switch (error.message) {
		case COGNITO_SIGN_IN_ERROR_MESSAGES.incorrectCredentials:
			return AUTH_ERROR_MESSAGES.invalidCredentials;
		case COGNITO_SIGN_IN_ERROR_MESSAGES.userDisabled:
			return AUTH_ERROR_MESSAGES.accountUnavailable;
		case COGNITO_SIGN_IN_ERROR_MESSAGES.accountExpired:
			return AUTH_ERROR_MESSAGES.invitationExpired;
		default:
			return AUTH_TOAST_MESSAGES.loginError;
	}
}

export const PASSWORD_RESET_SUCCESS_PAGE_CONTENT = {
	title: "Password Reset Successful",
	subtitle:
		"Your new password has been successfully created. Login again to access the platform.",
	ctaButton: "Let's Login Again",
} as const;

export const SET_NEW_PASSWORD_PAGE_CONTENT = {
	title: "Set New Password",
	subtitle:
		"Your new password must be at least 8 characters, with upper & lowercase, a symbol or a number.",
	passwordLabel: "New Password",
	confirmPasswordLabel: "Confirm Password",
	submitButton: "Reset Password",
	backToLogin: "Back to Login",
	resetting: "Resetting...",
} as const;

/** After first login with a Cognito temporary password (e.g. company admin invite). */
export const FIRST_LOGIN_NEW_PASSWORD_PAGE_CONTENT = {
	title: "Set your password",
	subtitle: SET_NEW_PASSWORD_PAGE_CONTENT.subtitle,
	submitButton: "Continue",
	submitting: "Saving…",
	backToSignIn: "Back to sign in",
	successToast: "Password set. Welcome!",
} as const;

export const PASSWORD_STRENGTH = {
	none: {
		level: 0,
		label: "",
		color: "bg-border",
	},
	poor: {
		level: 1,
		label: "Poor",
		color: "bg-destructive",
	},
	average: {
		level: 2,
		label: "Average",
		color: "bg-warning",
	},
	strong: {
		level: 3,
		label: "Strong",
		color: "bg-success",
	},
} as const;

export const PASSWORD_REQUIREMENTS = {
	minLength: 8,
	requireUpperAndLower: true,
	requireSymbolOrNumber: true,
} as const;
