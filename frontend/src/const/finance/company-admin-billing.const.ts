import { BILLING_MANAGEMENT_PAGE_CONTENT } from "./billing-management.const";

export const COMPANY_ADMIN_BILLING_PAGE_CONTENT = {
	breadcrumbsTitle: BILLING_MANAGEMENT_PAGE_CONTENT.breadcrumbsTitle,
	title: BILLING_MANAGEMENT_PAGE_CONTENT.title,
	subtitle: "Manage your subscription & billing related preferences.",
	allEventsTitle: "All Events",
	currentPlanLabel: "Current Plan",
	nextRenewalLabel: "Next Renewal Date",
	invoiceAmountLabel: "Invoice Amount",
	changePlanLevel: "Change Plan Level",
	upgradePlan: "Upgrade Plan",
	downloadInvoice: "Download Invoice",
	retryPayment: "Retry Payment",
	loading: "Loading billing details…",
	loadError: "Could not load billing details. Try again.",
	historyLoadError: "Could not load billing history. Try again.",
	noEvents: "No billing events yet.",
	missingCompanyId:
		"Select a company to view billing, or contact support if you have no company linked.",
	invoiceDownloadFailed: "Could not download the invoice. Try again.",
	cancelSuccessTitle: "Subscription cancellation scheduled",
	cancelSuccessDescription:
		"Your subscription stays active until the end of the current billing period.",
} as const;

export const COMPANY_ADMIN_BILLING_EVENT_COPY = {
	defaultPlanName: "your plan",
	cardTitleReinstated: "Welcome Back!!",
	cardTitlePaymentFailed: "Payment declined",
	cardTitlePaymentSuccessful: "Invoice Paid",
	descriptionSubscriptionCreated: (plan: string) =>
		`Your ${plan} subscription was created.`,
	descriptionInvoiceGeneratedWithAmount: (amount: string, plan: string) =>
		`An invoice of ${amount} was generated for ${plan}.`,
	descriptionInvoiceGeneratedNoAmount: (plan: string) =>
		`An invoice was generated for ${plan}.`,
	descriptionPaymentSuccessfulWithAmount: (amount: string, plan: string) =>
		`Payment of ${amount} was received for ${plan}.`,
	descriptionPaymentSuccessfulNoAmount: (plan: string) =>
		`Payment was received for ${plan}.`,
	descriptionPaymentFailed:
		"Transaction declined. Please update your payment method and retry payment.",
	descriptionPlanUpgraded: (plan: string) =>
		`Your plan was updated to ${plan}.`,
	descriptionSubscriptionCanceled: (plan: string) =>
		`Cancellation was scheduled for ${plan} at the end of the current billing period.`,
	descriptionSubscriptionReinstated: (plan: string) =>
		`Your ${plan} subscription was re-activated and features are available again.`,
} as const;

export const COMPANY_ADMIN_BILLING_EVENT_TITLE_CLASS: Record<string, string> = {
	subscription_created: "text-brand-green",
	invoice_generated: "text-brand-primary",
	payment_successful: "text-brand-green",
	payment_failed: "text-brand-red",
	plan_upgraded: "text-brand-primary",
	subscription_canceled: "text-brand-red",
	subscription_reinstated: "text-brand-green",
};

export type CompanyAdminBillingTimelineMarkerTone =
	| "success"
	| "error"
	| "info";

export const COMPANY_ADMIN_BILLING_EVENT_MARKER_TONE: Record<
	string,
	CompanyAdminBillingTimelineMarkerTone
> = {
	subscription_created: "success",
	invoice_generated: "info",
	payment_successful: "success",
	payment_failed: "error",
	plan_upgraded: "info",
	subscription_canceled: "error",
	subscription_reinstated: "success",
};

export const COMPANY_ADMIN_BILLING_TIMELINE_MARKER_RING_CLASS: Record<
	CompanyAdminBillingTimelineMarkerTone,
	string
> = {
	success: "border-interactive-success",
	error: "border-destructive",
	info: "border-brand-primary",
};

export const COMPANY_ADMIN_BILLING_TIMELINE_MARKER_INNER_CLASS: Record<
	CompanyAdminBillingTimelineMarkerTone,
	string
> = {
	success: "bg-interactive-success",
	error: "bg-destructive",
	info: "bg-brand-primary",
};
