export const ASSESSMENT_REPORT_SHARE_MODAL = {
	title: "Share Result",
	formId: "share-assessment-report-form",
	recipientsInputId: "share-report-recipients-input",
	recipientsPlaceholder: "Enter email id of recipients",
	recipientsLabel: "Recipients",
	invalidEmail: "Enter a valid email address.",
	recipientsCount: (count: number) =>
		count === 1 ? "1 recipient" : `${count} recipients`,
	removeRecipientAriaLabel: "Remove recipient",
	cancel: "Cancel",
	shareResult: "Share Result",
} as const;

export const ASSESSMENT_REPORT_SHARE = {
	success: "Your assessment result was shared successfully.",
	shareFailed: "Could not share the report. Please try again.",
	noRecipients: "Add at least one recipient email.",
	sharing: "Sharing...",
} as const;
