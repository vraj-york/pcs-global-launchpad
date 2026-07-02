export type VerifyDataDownloadOtpPayload = {
	otp: string;
};

export type SettingsDataDownloadDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export type DataDownloadOtpFormValues = {
	code: string[];
};

export type SettingsDataDownloadDialogStep = "otp" | "success";

export type PrivacyDataState = {
	isDataDownloadOtpSending: boolean;
	isDataDownloadOtpResending: boolean;
	isDataDownloadVerifySubmitting: boolean;
};

export type PrivacyDataActions = {
	sendDataDownloadOtp: () => Promise<boolean>;
	resendDataDownloadOtp: () => Promise<boolean>;
	verifyDataDownloadOtp: (
		payload: VerifyDataDownloadOtpPayload,
	) => Promise<boolean>;
	reset: () => void;
};

export type PrivacyDataStore = PrivacyDataState & PrivacyDataActions;
