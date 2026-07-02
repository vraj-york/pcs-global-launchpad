export const SUPPORT_MESSAGE_MAX_LENGTH = 500;

export const SUPPORT_MAX_ATTACHMENTS = 3;

export const SUPPORT_ATTACHMENTS_MAX_TOTAL_BYTES = 10 * 1024 * 1024;

export const SUPPORT_ATTACHMENT_ALLOWED_TYPES = [
	"image/png",
	"image/jpeg",
	"image/jpg",
] as const;

export const SUPPORT_ATTACHMENT_ACCEPT =
	".png,.jpg,.jpeg,image/png,image/jpeg,image/jpg";

export const SUPPORT_PAGE_CONTENT = {
	title: "Hi, How can we help you?",
	emailLabel: "Email",
	subjectLabel: "Subject",
	messageLabel: "Message",
	attachmentsTitle: "Add up to 3 attachments",
	attachmentsHint: "PNG & JPG up to 10MB",
	attachmentsAriaLabel: "Add support attachments",
	submitButton: "Submit",
	submitting: "Submitting...",
	removeAttachmentAriaLabel: "Remove attachment",
	successTitle: "Thank You!",
	successDescription:
		"Your message has been successfully submitted. Our team will get back to you soon.",
	loginAgainButton: "Let's Login Again",
	continueButton: "Continue",
	submitError: "We could not submit your request. Please try again.",
} as const;

export const SUPPORT_VALIDATION_MESSAGES = {
	messageMaxLength: `Message must be at most ${SUPPORT_MESSAGE_MAX_LENGTH} characters.`,
	maxAttachments: `You can attach up to ${SUPPORT_MAX_ATTACHMENTS} files.`,
	unsupportedFormat: "Attachments must be PNG or JPG files.",
	totalSizeExceeded: "Combined attachment size must be 10MB or less.",
} as const;
