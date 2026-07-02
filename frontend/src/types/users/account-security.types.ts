export type MfaMethod = "email";

/** Enable or disable MFA — selects `/users/me/security/mfa/{action}/…` routes. */
export type MfaOtpAction = "enable" | "disable";

export type SecurityStatusData = {
	mfaEnabled: boolean;
	mfaMethod: MfaMethod | null;
	email: string | null;
};

export type ChangePasswordPayload = {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
};

export type VerifyMfaOtpPayload = {
	otp: string;
};

export type SettingsSecurityTabProps = {
	securityLoading: boolean;
	securityError: string | null;
	onRetryLoad: () => void;
};

export type SettingsChangePasswordDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export type SettingsMfaDialogMode = MfaOtpAction;

export type SettingsMfaDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: SettingsMfaDialogMode;
	email: string | null;
};

export type MfaOtpFormValues = {
	code: string[];
};

export type AccountSecurityState = {
	securityStatus: SecurityStatusData | null;
	securityLoading: boolean;
	securityError: string | null;
	isChangePasswordSubmitting: boolean;
	isMfaOtpSending: boolean;
	isMfaOtpResending: boolean;
	isMfaVerifySubmitting: boolean;
};

export type AccountSecurityActions = {
	fetchSecurityStatus: () => Promise<boolean>;
	changePassword: (payload: ChangePasswordPayload) => Promise<boolean>;
	sendMfaOtp: (mode: SettingsMfaDialogMode) => Promise<boolean>;
	resendMfaOtp: (mode: SettingsMfaDialogMode) => Promise<boolean>;
	verifyMfaOtp: (
		mode: SettingsMfaDialogMode,
		payload: VerifyMfaOtpPayload,
	) => Promise<boolean>;
	reset: () => void;
};

export type AccountSecurityStore = AccountSecurityState &
	AccountSecurityActions;
