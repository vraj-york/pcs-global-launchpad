export const PROMO_CODE_FORM_VALIDATION_MESSAGES = {
	codeRequired: "Promo code is required",
	codeMin: "Promo code must be at least 2 characters",
	codeMax: "Promo code must be at most 50 characters",
	planRequired: "Plan is required",
	planOneOf: "Select a plan",
	descriptionMax: "Description is too long",
	discountRequired: "Discount is required",
	discountNumeric: "Enter a valid number",
	discountPercentRange: "Enter a percentage between 0.01 and 100",
	discountFixedPositive: "Amount must be greater than 0",
	expiryFuture: "Expiry date must be in the future",
	maxRedemptionsInt: "Must be a whole number of at least 1",
	corporationRequired: "Corporation is required",
	corporationSelect: "Select a corporation",
} as const;

export const PROMO_CODES_PAGE_CONTENT = {
	typography: {
		emDash: "—",
	},
	managementTitle: "Promo Code Management",
	managementSubtitle:
		"Create, track, and manage promo codes across overall system.",
	addCta: "Add New Promo Code",
	breadcrumbManagement: "Promo Code Management",
	breadcrumbAdd: "Add New Promo Code",
	title: "Add New Promo Code",
	subtitle: "Configure promo code details.",
	edit: {
		title: "Edit Promo Code Details",
		subtitle: "Modify promo code details.",
		breadcrumb: "Edit Promo Code Details",
		expiryBanner:
			"Auto-disable after expiry — This promo code will be automatically disabled once it expires and cannot be re-enabled.",
		revalidateBannerTitle: "Re-validate the Promo Code?",
		revalidateBannerBody:
			"If you make changes to the promo code settings, validate again before saving.",
		revalidateCta: "Re-validate Code",
		validationSuccessBody:
			"You can now save your changes. Stripe will be updated when you confirm.",
		saveUpdate: "Save & Update",
		saveBlockedHint: "Re-validate the promo code after changing settings.",
		scheduleLockedHint:
			"Expiry date and max usage limit cannot be edited after the promo code is created.",
		deleteCta: "Delete",
		deleteDialogTitle: "Delete promo code?",
		deleteDialogDescription:
			"This action will soft-delete the promo code from the system. It will no longer be usable or editable.",
		deleteDialogConfirm: "Delete Promo Code",
		deleteDialogCancel: "Cancel",
	},
	sections: {
		promoInfo: "Promo Code Info.",
		assignment: "Assignment Settings",
	},
	form: {
		promoCode: "Promo Code",
		discountValueSrOnly: "Discount value",
		required: "Required",
		plan: "Plan",
		description: "Description",
		discount: "Discount",
		discountTypePercent: "% (Percentage)",
		discountTypeFixed: "$ (Fixed Amount)",
		discountLabelPercent: "Discount (%)",
		discountLabelFixed: "Discount ($)",
		discountType: "Discount Type",
		maxUsage: "Max. Usage Limit",
		maxUsageTooltip:
			"Maximum number of times this code can be redeemed. Leave blank for no limit. Cannot be edited after the promo code is created.",
		instalmentType: "Instalment Type",
		instalmentOnce: "One-time (first invoice)",
		instalmentForever: "Forever",
		expiryDate: "Expiry Date",
		expiryDateTooltip:
			"Expiry date cannot be edited after the promo code is created.",
		corporation: "Corporation",
		allCorporations: "All Corporations",
		company: "Company",
		allCompanies: "All Companies",
		limitCheckbox:
			"Limit the access of this promo code to this corporations/ companies",
	},
	validationBannerTitle: "Ready to Validate the Promo Code?",
	validationBannerBody:
		"Confirm that the promo code details, expiry date and discount settings are correct before saving.",
	validateNow: "Validate Now",
	validationSuccessTitle: "Promo code details are validated successfully.",
	validationSuccessBody:
		"You can now proceed with saving. The promo code will be created in Stripe when you confirm.",
	addBlockedHint: "Validate the promo code before saving.",
	actions: {
		cancel: "Cancel",
		addPromoCode: "Add Promo Code",
		submitting: "Saving…",
	},
	result: {
		title: "Promo code created",
		body: "The code is saved and synced with Stripe.",
	},
	errors: {
		generic: "Could not create promo code. Check your input and try again.",
		loadPlans: "Could not load plans.",
		loadCorporations: "Could not load corporations.",
		loadCompanies: "Could not load companies.",
	},
	toasts: {
		validationOk: "Promo code details look valid. You can save when ready.",
	},
	list: {
		title: "Promo codes",
		aria: {
			selectAllOnPage: "Select all on this page",
			selectRowPrefix: "Select ",
			viewDetails: "View details",
			moreActions: "More actions",
		},
		empty: "No promo codes yet. Create one to see it listed here.",
		filters: {
			allPlans: "All Plans",
			allDiscountTypes: "All Discount Types",
			allTime: "All Time",
			allRowStatus: "All Status",
			rowStatusActive: "Active",
			rowStatusInactive: "Disabled",
			rowStatusExpired: "Expired",
			status: {
				active: "Active",
				disabled: "Disabled",
				expired: "Expired",
			},
			discountType: {
				percent: "Percentage",
				fixed: "Fixed amount",
			},
			time: {
				all: "All Time",
				last7d: "Last 7 days",
				last30d: "Last 30 days",
				last90d: "Last 90 days",
				last1y: "Last year",
			},
		},
		columns: {
			promoCode: "Promo Code",
			status: "Status",
			discount: "Discount",
			plan: "Plan",
			usageLimit: "Usage Limit",
			expiryDate: "Expiry Date",
			actions: "Actions",
		},
		bulk: {
			itemsSelected: "{count} items selected",
			exportCsv: "Export CSV",
			exportCsvLoading: "Exporting…",
			deleteSelected: "Delete",
		},
		rowMenu: {
			edit: "Edit",
			disableCode: "Disable Code",
			activateCode: "Activate Code",
			deleteCode: "Delete",
		},
		deleteDialog: {
			title: "Delete promo code?",
			description:
				"This action will soft-delete the promo code from the system. It will no longer be usable or editable.",
			confirm: "Delete Promo Code",
			cancel: "Cancel",
		},
		bulkDeleteDialog: {
			title: "Delete selected promo codes?",
			description:
				"This will soft-delete {count} promo codes from the system. They will no longer be usable or editable.",
			confirm: "Delete Promo Codes",
			cancel: "Cancel",
		},
		deleteSuccess: "Promo code deleted.",
		bulkDeleteSuccess: "Selected promo codes were deleted.",
		deleteFailed: "Could not delete promo code.",
		csvFilename: "promo-codes-export.csv",
		csvExported: "CSV file downloaded.",
		loadError: "Could not load promo codes.",
		activationUpdated: "Promo code updated.",
		activationFailed: "Could not update promo code.",
	},
	detail: {
		breadcrumb: "View Promo Code Details",
		tabsListAriaLabel: "Promo code sections",
		back: "Back",
		editDetails: "Edit Details",
		deleteCode: "Delete",
		deleteDialog: {
			title: "Delete promo code?",
			description:
				"This action will soft-delete the promo code from the system. It will no longer be usable or editable.",
			confirm: "Delete Promo Code",
			cancel: "Cancel",
		},
		disableCode: "Disable Code",
		activateCode: "Activate Code",
		tabs: {
			basic: "Basic Info.",
			usage: "Usage History",
		},
		enableSection: {
			title: "Enable Promo Code",
			subtitle: "Toggle enable or disable this promo code.",
			warningTitle: "Auto-disable after expiry",
			warningBody:
				"This promo code will be automatically disabled once it expires and cannot be re-enabled.",
		},
		infoSection: {
			title: "Promo Code Info.",
			promoCode: "Promo Code",
			status: "Status",
			plan: "Plan",
			description: "Description",
			descriptionNotAvailable: "Not Available",
			discountType: "Discount Type",
			discount: "Discount",
			maxUsage: "Max. Usage Limit",
			instalmentType: "Instalment Type",
			expiryDate: "Expiry Date",
			noExpiry: "None",
			noMax: "Unlimited",
			assignment: "Assignment",
			global: "All corporations / companies",
		},
		usage: {
			loadError: "Could not load usage history.",
			empty: "No usage recorded for this promo code yet.",
			filters: {
				allStatus: "All Status",
				allCorporations: "All Corporations",
				allCompanies: "All Companies",
				allTime: "All Time",
			},
			columns: {
				userName: "User Name",
				status: "Status",
				corporation: "Corporation",
				company: "Company",
				dateTime: "Date & Time",
			},
			outcome: {
				success: "Success",
				failed: "Failed",
			},
			na: "NA",
		},
		status: {
			active: "Active",
			disabled: "Disabled",
			expired: "Expired",
		},
		switchDisabledHint:
			"This promo has expired and cannot be re-enabled. The code stays disabled after expiry.",
		loadError: "Could not load this promo code.",
		notFound: "Promo code not found.",
	},
} as const;

const F = PROMO_CODES_PAGE_CONTENT.list.filters;

export const PROMO_CODE_DISCOUNT_TYPE_OPTIONS = [
	{ value: "all", label: F.allDiscountTypes },
	{ value: "percent", label: F.discountType.percent },
	{ value: "fixed_amount", label: F.discountType.fixed },
] as const;

export const PROMO_CODE_STATUS_OPTIONS = [
	{ value: "all", label: F.allRowStatus },
	{ value: "active", label: F.rowStatusActive },
	{ value: "inactive", label: F.rowStatusInactive },
	{ value: "expired", label: F.rowStatusExpired },
] as const;

export const PROMO_CODE_TIME_OPTIONS = [
	{ value: "all", label: F.time.all },
	{ value: "7d", label: F.time.last7d },
	{ value: "30d", label: F.time.last30d },
	{ value: "90d", label: F.time.last90d },
	{ value: "1y", label: F.time.last1y },
] as const;

const U = PROMO_CODES_PAGE_CONTENT.detail.usage;

export const PROMO_CODE_OUTCOME_OPTIONS = [
	{ value: "all", label: U.filters.allStatus },
	{ value: "success", label: U.outcome.success },
	{ value: "failed", label: U.outcome.failed },
] as const;
