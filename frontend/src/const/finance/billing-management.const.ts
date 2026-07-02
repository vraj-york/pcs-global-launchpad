export const BILLING_MANAGEMENT_UI = {
	emptyCell: "N/A",
} as const;

export const BILLING_MANAGEMENT_PAGE_CONTENT = {
	breadcrumbsTitle: "Billing Management",
	title: "Billing Management",
	subtitle: "Manage all the system-wide billing related things in one place.",
	planFilterAll: "All Plans",
	subscriptionStatusAll: "All Subscription Status",
	paymentStatusAll: "All Payment Status",
	filtersButton: "Filters",
	sortAriaPrefix: "Sort by",
	truncatedTotalNote:
		"Showing up to the first 8,000 matching companies for performance.",
	noRecords: "No billing records match your filters.",
	detailBreadcrumb: "View Billing Details",
	detailTitle: "Billing details",
	detailSubtitle: "Subscription, payment, and renewal for this company.",
	backButton: "Back",
	backToList: "Back to billing list",
	editDetails: "Edit Details",
	tabBillingPaymentInfo: "Billing & Payment Info.",
	tabBillingHistory: "Billing History",
	tabsListAriaLabel: "Billing detail sections",
	billingInfoCardTitle: "Billing Info.",
	paymentInfoCardTitle: "Payment Info.",
	planLevel: "Plan Level",
	loading: "Loading…",
	missingCompanyId: "Missing company id.",
} as const;

export const BILLING_TABLE_LABELS = {
	billingId: "Billing ID",
	company: "Company",
	plan: "Plan",
	billingCycle: "Billing Cycle",
	subscriptionStatus: "Subscription Status",
	paymentStatus: "Payment Status",
	renewalDate: "Renewal Date",
	nextAmount: "Next Billing Amount",
	paymentType: "Payment Type",
	actions: "Actions",
} as const;

export const BILLING_SUBSCRIPTION_BADGE_LABELS: Record<string, string> = {
	active: "Active",
	trialing: "Trial",
	past_due: "Past Due",
	canceled: "Canceled",
	incomplete: "Incomplete",
	unpaid: "Unpaid",
	none: "None",
};

export const BILLING_PAYMENT_BADGE_LABELS = {
	paid: "Paid",
	failed: "Failed",
	pending: "Pending",
} as const;

export const BILLING_SUBSCRIPTION_STATUS_FILTER_OPTIONS = [
	{
		value: "all",
		label: BILLING_MANAGEMENT_PAGE_CONTENT.subscriptionStatusAll,
	},
	{ value: "active", label: BILLING_SUBSCRIPTION_BADGE_LABELS.active },
	{ value: "trialing", label: BILLING_SUBSCRIPTION_BADGE_LABELS.trialing },
	{ value: "past_due", label: BILLING_SUBSCRIPTION_BADGE_LABELS.past_due },
	{ value: "canceled", label: BILLING_SUBSCRIPTION_BADGE_LABELS.canceled },
	{
		value: "incomplete",
		label: BILLING_SUBSCRIPTION_BADGE_LABELS.incomplete,
	},
	{ value: "unpaid", label: BILLING_SUBSCRIPTION_BADGE_LABELS.unpaid },
	{ value: "none", label: BILLING_SUBSCRIPTION_BADGE_LABELS.none },
] as const;

export const BILLING_PAYMENT_STATUS_FILTER_OPTIONS = [
	{ value: "all", label: BILLING_MANAGEMENT_PAGE_CONTENT.paymentStatusAll },
	{ value: "paid", label: BILLING_PAYMENT_BADGE_LABELS.paid },
	{ value: "failed", label: BILLING_PAYMENT_BADGE_LABELS.failed },
	{ value: "pending", label: BILLING_PAYMENT_BADGE_LABELS.pending },
] as const;

export const BILLING_PAYMENT_TYPE_LABELS = {
	ach: "ACH",
	cc: "CC",
	offline: "Offline",
} as const;

export const BILLING_ROW_ACTIONS = {
	view: "View",
	menuEdit: "Edit",
	menuRetryPayment: "Retry Payment",
	menuCancelSubscription: "Cancel Subscription",
	menuReinstateSubscription: "Reinstate",
	moreActionsAriaLabel: "More billing actions for",
	editAriaLabel: "Edit company",
	viewAriaLabel: "View billing details for",
} as const;

export const BILLING_CANCEL_SUBSCRIPTION_VALIDATION = {
	reasonRequired: "Select a pre-defined reason.",
	notesRequired: "Additional notes are required when reason is Other.",
} as const;

export const BILLING_CANCEL_SUBSCRIPTION_MODAL = {
	title: "Cancel Subscription",
	subtitle: (companyName: string) =>
		`You are about to cancel the subscription of ${companyName} company.`,
	currentPlanLabel: "Current Plan",
	billingCycleLabel: "Billing Cycle",
	nextRenewalDateLabel: "Next Renewal Date",
	nextBillingAmountLabel: "Next Billing Amount",
	cancellationNoteTitle: "Cancelation Note",
	cancellationNoteBefore:
		"Your subscription will remain active until the end of the current billing period on ",
	cancellationNoteAfter:
		". After this date, you'll lose access to this plan's features.",
	preDefinedReasonsLabel: "Pre-defined Reasons",
	additionalNotesLabel: "Additional Notes",
	selectPlaceholder: "Select a reason",
	notesPlaceholder: "Type your notes here...",
	cancelButton: "Cancel",
	confirmButton: "Cancel Subscription",
} as const;

export const BILLING_CANCEL_SUBSCRIPTION_REASONS = [
	{
		value: "Budget / economic pressures",
		label: "Budget / economic pressures",
	},
	{
		value: "Product Fit / Value",
		label: "Product Fit / Value",
	},
	{
		value: "Implementation / Experience",
		label: "Implementation / Experience",
	},
	{
		value: "Privacy / Trust / Compliance",
		label: "Privacy / Trust / Compliance",
	},
	{
		value: "Competitive / Strategic",
		label: "Competitive / Strategic",
	},
	{
		value: "Training / Content",
		label: "Training / Content",
	},
	{
		value: "Administrative",
		label: "Administrative",
	},
	{ value: "Other", label: "Other" },
] as const;

export const BILLING_HISTORY_ACTOR_KIND_LABELS: Record<
	"system" | "super_admin" | "corporation_admin" | "company_admin",
	string
> = {
	system: "System",
	super_admin: "Super Admin",
	corporation_admin: "Corporation Admin",
	company_admin: "Company Admin",
};

export const BILLING_CONFIRM = {
	retryPaymentTitle: "Retry payment?",
	retryPaymentDescription:
		"Attempts to collect the latest subscription invoice again.",
	confirm: "Confirm",
	cancel: "Cancel",
} as const;

export const BILLING_REINSTATE_MODAL = {
	title: "Reinstate this subscription?",
	description:
		"This action will restore the company's subscription in the system.",
	cancel: "Cancel",
	confirm: "Reinstate Subscription",
} as const;

export const BILLING_TOAST = {
	cancelScheduled:
		"Subscription will cancel at the end of the current billing period.",
	reinstateSuccess: "Scheduled subscription cancellation has been removed.",
	retryAttempted: "Payment retry attempted.",
	planChangeRequested:
		"Your request has been submitted. Our team will contact you shortly to discuss your subscription options.",
	cancelFailed: "Could not cancel subscription.",
	retryFailed: "Could not retry payment.",
	reinstateFailed: "Could not reinstate subscription.",
	planChangeFailed: "Could not submit plan change request.",
	upgradeSuccess: "Subscription plan upgraded successfully.",
	upgradeFailed: "Could not upgrade subscription plan.",
} as const;

export const BILLING_EDIT_PAGE_CONTENT = {
	breadcrumb: "Edit Billing Details",
	title: "Edit Billing Details",
	saveUpdate: "Save & Update",
	cancel: "Cancel",
	planField: "Plan",
	planLevelField: "Plan Level",
	prorationTitle: "Pro-rated Adjustments",
	prorationLoading: "Calculating adjustment…",
	prorationCredit: "One-time plan credit",
	prorationPreviousCredit: "Previous Subscription Credit",
	prorationAmountDue: "Amount Due Today",
	prorationRenewal: "New Renewal Date",
	prorationEmptyValue: "N/A",
	confirmTitle: "Confirm plan upgrade?",
	confirmDescription:
		"The subscriber will be charged the amount due today and notified by email.",
	confirmButton: "Confirm upgrade",
	noTargets: "No upgrade options are available for this company.",
	selectPlanLevel: "Select plan level",
	selectPlan: "Select plan",
} as const;

export const BILLING_MORE_FILTERS_CONTENT = {
	title: "More Filters",
	billingCycle: "Billing Cycle",
	timePeriod: "Time Period",
	paymentMethods: "Payment Methods",
	clearAll: "Clear All",
	apply: "Apply Filters",
} as const;

export const BILLING_CYCLE_FILTER_OPTIONS = [
	{ id: "monthly", label: "Monthly" },
	{ id: "annual", label: "Annual" },
	{ id: "one_time", label: "One-time" },
] as const;

export const BILLING_PAYMENT_METHOD_FILTER_OPTIONS = [
	{ id: "ach", label: "ACH (Bank Transfer)" },
	{ id: "cc", label: "CC (Credit Card)" },
	{ id: "offline", label: "Offline" },
] as const;

export const BILLING_HISTORY_TABLE_LABELS = {
	eventId: "Event ID",
	eventType: "Event Type",
	plan: "Plan",
	amount: "Amount",
	actor: "Actor",
	invoiceDate: "Invoice Date",
} as const;

export const BILLING_HISTORY_EVENT_TYPE_LABELS = {
	subscription_created: "Subscription Created",
	invoice_generated: "Invoice Generated",
	payment_successful: "Payment Successful",
	payment_failed: "Payment Failed",
	plan_upgraded: "Plan Upgraded",
	subscription_canceled: "Subscription Canceled",
	subscription_reinstated: "Subscription Reinstated",
} as const;

export const BILLING_HISTORY_EVENT_BADGE_TYPES: Record<
	keyof typeof BILLING_HISTORY_EVENT_TYPE_LABELS,
	string
> = {
	subscription_created: "success",
	invoice_generated: "trialing",
	payment_successful: "pending",
	payment_failed: "failed",
	plan_upgraded: "monthly",
	subscription_canceled: "canceled",
	subscription_reinstated: "monthly",
};

export const BILLING_DETAIL_SUBSCRIPTION_BADGE_TYPES: Record<string, string> = {
	active: "monthly",
	trialing: "trialing",
	past_due: "past_due",
	canceled: "canceled",
	incomplete: "incomplete",
	unpaid: "unpaid",
	none: "gray",
};

export const BILLING_HISTORY_PAGE_CONTENT = {
	eventTypeFilterAll: "All Event Types",
	planFilterAll: "All Plans",
	actorFilterAll: "All Actors",
	loadError: "Could not load billing history. Try again.",
	noRecords: "No billing history events found.",
} as const;

export const BILLING_HISTORY_EVENT_TYPE_FILTER_OPTIONS = [
	{
		value: "all",
		label: BILLING_HISTORY_PAGE_CONTENT.eventTypeFilterAll,
	},
	...(
		Object.entries(BILLING_HISTORY_EVENT_TYPE_LABELS) as [
			keyof typeof BILLING_HISTORY_EVENT_TYPE_LABELS,
			string,
		][]
	).map(([value, label]) => ({ value, label })),
] as const;

export const BILLING_HISTORY_ACTOR_FILTER_OPTIONS = [
	{ value: "all", label: BILLING_HISTORY_PAGE_CONTENT.actorFilterAll },
	{ value: "system", label: "System" },
	{ value: "super_admin", label: "Super Admin" },
	{ value: "company_admin", label: "Company Admin" },
] as const;
