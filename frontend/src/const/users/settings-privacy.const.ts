export const SETTINGS_PRIVACY_CONTENT = {
	cardTitle: "Privacy & Data",
	termsOfUseTitle: "Terms of Use",
	privacyPolicyTitle: "Privacy Policy",
	viewButton: "View",
	downloadDataTitle: "Download My Data",
	downloadDataDescription:
		"Personal profile, assessment, results, activities & consent details will be included.",
	sendRequestButton: "Send Request",
	dialogTitle: "Request Your Data",
	dialogSubtitle: "Confirm your identity & proceed further",
	noteTitle: "Important Note",
	noteBody: "We'll compile your account data, including assessment's results.",
	fieldCode: "Code",
	cancelButton: "Cancel",
	requestDataButton: "Request Data",
	requestDataSubmitting: "Submitting…",
	sendingCode: "Sending code…",
	resendPrompt: "Didn't receive the code?",
	resendLink: "Resend",
	resending: "Resending…",
	otpSentToast: "A verification code has been sent to your registered email.",
	requestSubmittedTitle: "Request Submitted!",
	requestSubmittedBody:
		"We're preparing your data. You'll receive an email with a download link once it's ready.",
	requestSubmittedTimeframe: "Usually takes up to 24–48 hours.",
	okUnderstoodButton: "Ok, Understood",
	requestSubmittedToast:
		"Your data download request has been submitted successfully.",
} as const;

export const SETTINGS_PRIVACY_OTP_CONFIG = {
	codeLength: 6,
	timerDurationSeconds: 180,
} as const;
