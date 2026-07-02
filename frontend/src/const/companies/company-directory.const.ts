import type { ViewCompanyTabId } from "@/types";
import { PLAN_PRICE_BREAKDOWN_CARD_LABELS } from "../common/plan-price-breakdown.const";

export const COMPANIES_DIRECTORY_PAGE_CONTENT = {
	breadcrumbsTitle: "Company Directory",
	companyOverviewTitle: "Company Overview",
	companyOverviewBackToDashboard: "Back to Dashboard",
	companyOverviewProfileError:
		"We could not load your profile. Please refresh or try again later.",
	companyOverviewNoCompanyLinked: "No company is linked to this account.",
	viewCancelSubscriptionButton: "Cancel Subscription",
	viewUpgradePlanButton: "Upgrade Plan",
	backButton: "Back",
	viewCompanyNotFound: "Company not found.",
	backToCompanyDirectory: "Back to Company Directory",
	editBreadcrumbsTitle: "Edit Company",
	viewEditCompanyButton: "Edit Company",
	viewSuspendButton: "Suspend",
	viewReinstateButton: "Reinstate",
	suspendCompanyConfirmTitle: "Suspend this company?",
	suspendCompanyConfirmDescription:
		"This will suspend the company and restrict access for its users until you reinstate it.",
	suspendCompanyConfirmButton: "Suspend Company",
	reinstateCompanyConfirmTitle: "Reinstate this company?",
	reinstateCompanyConfirmDescription:
		"This will restore the company and re-enable access for its users.",
	reinstateCompanyConfirmButton: "Reinstate Company",
	confirmModalCancel: "Cancel",
	viewTabBasicInfo: "Basic Info.",
	viewTabKeyContacts: "Key Contacts",
	viewTabPlanSeats: "Plan & Seats",
	viewTabBranding: "Branding",
	viewTabConfiguration: "Configuration",
	viewTrialConfigurationCard: "Trial Configuration",
	viewPlanConfigurationCard: "Plan Configuration",
	viewGeneralSettingsCard: "General Settings",
	viewFieldZeroTrial: "Zero Trial",
	viewFieldTrialLength: "Trial Length",
	viewFieldTrialStartDate: "Trial Start Date",
	viewFieldTrialEndDate: "Trial End Date",
	viewFieldAutoConvertTrial: "Auto-convert Trial",
	viewAutoConvertOnDefault: "On (Default)",
	viewOn: "On",
	viewOff: "Off",
	viewNotApplicable: "NA",
	statusUnavailableLabel: "N/A",
	viewFieldPricePerAssessment: "Price per Assessment",
	viewFieldNoOfAssessments: "No. of Assessments",
	viewPlanDetailsUnavailable:
		"Plan details are not available for this company yet.",
	viewCardCompanyBasics: "Company Basics",
	viewNoKeyContacts: "No key contacts are available.",
	viewCardParentCorporation: "Parent Corporation Info.",
	viewFieldCompanyId: "Company ID",
	title: "Companies",
	subtitle: "Manage all physical Companies and their corporation assignments",
	addNewCompanyButton: "Add New Company",
	searchAriaLabel: "Search companies",
	statusFilterAriaLabel: "Filter by status",
	corporationFilterAriaLabel: "Filter by corporation",
	planFilterAriaLabel: "Filter by plan",
	dateFilterAriaLabel: "Filter by date range",
	statusFilterAllLabel: "All Status",
	corporationFilterAllLabel: "All Corporations",
	corporationFilterNoResultsLabel: "No matching corporations",
	planFilterAllLabel: "All Plans",
	dateFilterAllLabel: "All Time",
	noData: "No companies found.",
	tableResumeButton: "Resume setup",
	tableViewButton: "View company",
	tableEditButton: "Edit",
	tableSuspendButton: "Suspend",
	reinstateButton: "Reinstate",
	tableDeleteButton: "Delete",
	paginationInfo: (showing: number, total: number) =>
		`Showing ${showing} of ${total} results`,
	previousButton: "Previous",
	nextButton: "Next",
} as const;

export const VIEW_COMPANY_TABS: {
	id: ViewCompanyTabId;
	label: string;
}[] = [
	{ id: "basic", label: COMPANIES_DIRECTORY_PAGE_CONTENT.viewTabBasicInfo },
	{
		id: "keyContacts",
		label: COMPANIES_DIRECTORY_PAGE_CONTENT.viewTabKeyContacts,
	},
	{ id: "planSeats", label: COMPANIES_DIRECTORY_PAGE_CONTENT.viewTabPlanSeats },
	{ id: "branding", label: COMPANIES_DIRECTORY_PAGE_CONTENT.viewTabBranding },
	{
		id: "configuration",
		label: COMPANIES_DIRECTORY_PAGE_CONTENT.viewTabConfiguration,
	},
];

export const COMPANY_TABLE_HEADERS = {
	companyId: "Company ID",
	companyName: "Company Name",
	status: "Status",
	assignedCorporation: "Assigned Corporation",
	plan: "Plan",
	createdOn: "Created On",
	lastUpdatedOn: "Last Updated On",
	actions: "Actions",
} as const;

export const COMPANY_DATE_FILTER_OPTIONS = [
	{ value: "all", label: "All Time" },
	{ value: "last24Hours", label: "Last 24 hours" },
	{ value: "last7Days", label: "Last 7 days" },
	{ value: "last30Days", label: "Last 30 days" },
	{ value: "last3Months", label: "Last 3 months" },
	{ value: "last6Months", label: "Last 6 months" },
	{ value: "lastYear", label: "Last Year" },
] as const;

export const ADD_NEW_COMPANY_STEPS = [
	{
		id: "basic-info",
		title: "Basic Info.",
		subtitle: "Company-based details",
	},
	{
		id: "key-contacts",
		title: "Key Contacts",
		subtitle: "Operating unit setup",
	},
	{
		id: "plan-seats",
		title: "Plan & Seats",
		subtitle: "Subscription setup",
	},
	{
		id: "configuration",
		title: "Configuration",
		subtitle: "General settings for security & branding experience.",
	},
	{
		id: "confirmation",
		title: "Confirmation",
		subtitle: "Review & submit details",
	},
] as const;

export const ADD_NEW_COMPANY_CONTENT = {
	pageTitle: "Add New Company",
	pageSubtitle:
		"Set up a new company with its basic details, plan, permissions & general configuration settings.",
	editPageTitle: "Edit Company",
	editPageSubtitle:
		"Update company details, plan, permissions, and general configuration settings.",
	progress: "Complete",
	toast: {
		companyCreated: "Company created successfully.",
		companyUpdated: "Company updated successfully.",
	},
	buttons: {
		cancel: "Cancel",
		previous: "Previous",
		next: "Next",
		confirmAdd: "Confirm & Add",
		confirmUpdate: "Confirm & Update",
		saveAndUpdate: "Save & Update",
	},
	basicInfo: {
		title: "Basic Info.",
		subtitle: "Enter the core details for the new company.",
	},
	keyContacts: {
		title: "Key Contacts",
		subtitle: "Setup the operating unit for the company.",
		sections: {
			finance_billing_contact: "Finance/ Billing Contact",
			technical_it_lead: "Technical/ IT Lead",
			implementation_lead: "Implementation Lead",
			hr_program_owner: "HR/ Program Owner",
		},
	},
	planAndSeats: {
		title: "Plan & Seats",
		subtitle: "Manage your plan allocations and seats assignments.",
		loadingPlans: "Loading plans…",
		plansLoadError: "Unable to load pricing plans.",
		noCompanyPlansForTab: "No company plans available for this selection.",
		manageInBilling: "Manage in Billing",
		manageInBillingAriaLabel: "Open billing details for this company",
		zeroTrial: {
			label: "Zero Trial",
			description: "Skip trial and activate paid access immediately.",
		},
		trialConfiguration: {
			title: "Trial Configuration",
			trialLength: "Trial Length",
			trialStartDate: "Trial Start Date",
			trialEndDate: "Trial End Date",
			autoConvertTitle: "Auto-convert Trial - On (Default)",
			autoConvertDescription:
				"The subscription will automatically convert to a paid plan using the saved payment method once the trial period ends.",
		},
		planConfiguration: {
			title: "Plan Configuration",
			hasPromoCode: "Has Promo Code?",
			hasPromoCodeDescription:
				"Enable only if you have a valid promotional code.",
			promoCode: "Promo Code",
			promoCodeComboboxNoMatches: "No matching promo codes",
			promoCodesLoadError: "Unable to load promo codes.",
			planLevel: "Plan Level",
			planPrice: PLAN_PRICE_BREAKDOWN_CARD_LABELS.planPrice,
			discount: PLAN_PRICE_BREAKDOWN_CARD_LABELS.discount,
			invoiceAmount: PLAN_PRICE_BREAKDOWN_CARD_LABELS.invoiceAmount,
			billingCurrency: "Billing Currency",
			priceBreakdownTitle: PLAN_PRICE_BREAKDOWN_CARD_LABELS.priceBreakdown,
			subTotal: PLAN_PRICE_BREAKDOWN_CARD_LABELS.subTotal,
			implementationFee: PLAN_PRICE_BREAKDOWN_CARD_LABELS.implementationFee,
			onsiteTrainingQuestion: PLAN_PRICE_BREAKDOWN_CARD_LABELS.onsiteTraining,
			onsiteTrainingAddonPrefix:
				PLAN_PRICE_BREAKDOWN_CARD_LABELS.onsiteTrainingAddonPrefix,
		},
		trialLengthOptions: [
			{ value: "7", label: "7 days" },
			{ value: "14", label: "14 days" },
			{ value: "30", label: "30 days" },
			{ value: "60", label: "60 days" },
			{ value: "90", label: "90 days" },
		],
		billingCurrencyOptions: [
			{ value: "usd", label: "USD ($)" },
			{ value: "eur", label: "EUR (€)" },
			{ value: "gbp", label: "GBP (£)" },
			{ value: "cad", label: "CAD (C$)" },
		],
		individualPlan: {
			bannerTitle: "Plan Configuration Managed by Company Admin",
			bannerDescription: (cost: string, currency: string) =>
				`This plan is configured at the company level by the Company Admin. Each assessment costs ${cost}, and all billing is processed in ${currency}.`,
			billingCurrency: "USD ($)",
			promoCodeLabel: "Promo Code",
		},
		validation: {
			trialStartDateInvalid: "Enter a valid trial start date",
			selectPromoCode: "Select a promo code",
			promoCodeMaxLength: "Promo code must be at most 50 characters",
			discountInvalidAmount: "Enter a valid discount amount",
			discountExceedsPlanPrice: "Discount cannot exceed plan price",
		},
	},
	configuration: {
		title: "Configuration",
		subtitle: "General settings for security & branding experience.",
		generalSettings: {
			title: "General Settings",
			authenticationMethod: "Authentication Method",
			passwordPolicy: "Password Policy",
			twoFaRequirement: "2FA Requirement (Inherited)",
			sessionTimeout: "Session Timeout (In minutes)",
			securityPosture: "Security Posture",
			primaryLanguage: "Primary Language",
		},
		errors: {
			missingCompanyId:
				"Company information is not loaded. Complete the previous steps first.",
		},
		branding: {
			title: "Branding",
			logoRemovedSuccess: "Logo removed.",
			uploadLogo: "Upload Logo",
			noteTitle: "Note",
			noteDescription:
				"Display settings remain consistent with BSPBlueprint Branding & overall experience.",
			uploadLabel: "Click to upload or drag-&-drop file",
			uploadHint: "Supported file formats are PNG & JPG up to 10MB",
			removeLogo: "Remove logo",
			logoAlt: "Company logo",
			errors: {
				unsupportedFormat: "Logo must be a PNG or JPG file.",
				fileTooLarge: "Logo size must not exceed 10 MB.",
				imageLoadFailed: "Image could not be loaded. Try a different file.",
				removeFailed: "Failed to remove logo. Please try again.",
			},
		},
	},
	confirmation: {
		title: "Confirmation",
		subtitle: "Review all the details that have been added.",
		noteTitle: "Note",
		noteBodyBefore:
			"Kindly review the information below to ensure everything is correct, then click ",
		noteBodyAfter: " to create the company.",
		noteBodyAfterEdit: " to update the company.",
		sections: {
			corporationInfo: "Corporation Info.",
			corporationAdminInfo: "Corporation Admin Info.",
			companyInfo: "Company Info.",
			companyAdminInfo: "Company Admin Info.",
			keyContacts: "Key Contacts",
			planConfiguration: "Plan Configuration",
			configuration: "Configuration",
			brandingExperience: "Branding & Experience",
		},
		planFields: {
			plan: "Plan",
			promoCode: "Promo Code",
			planLevel: "Plan Level",
			planPrice: "Plan Price",
			discount: "Discount",
			invoiceAmount: "Invoice Amount",
			billingCurrency: "Billing Currency",
			pricePerAssessment: "Price per Assessment",
			implementationFee: "Implementation Fee",
			onsiteTraining: "Onsite Training",
		},
		/** Summary labels on confirmation (form step may use longer copy). */
		configurationSummaryLabels: {
			sessionTimeout: "Session Timeout",
		},
	},
	cards: {
		parentCorporation: "Parent Corporation",
		companyInfo: "Company Info.",
		companyAddress: "Company Address",
		companyAdmin: "Company Admin",
	},
	parentCorporationAlertTitle: "Didn't find your parent corporation?",
	parentCorporationAlertDescription:
		"If you are unable to see your corporation in the above dropdown list then kindly create new one.",
	addNewCorporationButton: "Add New Corporation",
	parentCorporationNoMatches: "No matching corporations",
	sameAsCorpAdminLabel: "Same as corporation admin",
	fields: {
		parentCorporationLegalName: "Parent Corporation Legal Name",
		ownershipType: "Ownership Type",
		companyLegalName: "Company Legal Name",
		dbaTradeName: "DBA/ Trade Name",
		websiteUrl: "Website URL",
		companyType: "Company Type",
		officeType: "Office Type",
		region: "Region (Data Residency)",
		industry: "Industry",
		companyPhoneNo: "Company Phone No.",
		addressLine: "Address Line",
		stateProvince: "State/ Province",
		city: "City",
		country: "Country",
		zipPostalCode: "ZIP/ Postal Code",
		firstName: "First Name",
		lastName: "Last Name",
		nickname: "Nickname",
		jobRole: "Job Role",
		email: "Email",
		workPhoneNo: "Work Phone No.",
		cellPhoneNo: "Cell Phone No.",
	},
} as const;

/**
 * Select `value` strings match the multipart text fields sent to
 * PUT /corporations/companies/:companyId/configuration (authMethod, passwordPolicy, mfa, etc.).
 */
export const ADD_NEW_COMPANY_CONFIGURATION_OPTIONS = {
	authenticationMethods: [
		{ value: "Email & Password", label: "Email & Password" },
	],
	passwordPolicies: [
		{
			value: "Standard (8+ Characters & Mixed case)",
			label: "Standard (8+ Characters & Mixed case)",
		},
	],
	twoFaRequirements: [
		{ value: "Required", label: "Required" },
		{ value: "Optional", label: "Optional" },
		{ value: "Disabled", label: "Disabled" },
	],
	sessionTimeouts: [{ value: "60 min", label: "60 min" }],
	primaryLanguages: [
		{ value: "English (US)", label: "English (US)" },
		{ value: "Spanish", label: "Spanish" },
	],
	securityPostures: [
		{ value: "Standard", label: "Standard" },
		{ value: "Enhanced", label: "Enhanced" },
		{ value: "Enterprise", label: "Enterprise" },
	],
} as const;

export const COMPANY_KEY_CONTACT_TYPES = [
	"finance_billing_contact",
	"technical_it_lead",
	"implementation_lead",
	"hr_program_owner",
] as const;

/** Shared form labels for Suspend Company modal */
export const COMPANY_SUSPEND_MODAL_SHARED = {
	preDefinedReasonsLabel: "Pre-defined Reasons",
	additionalNotesLabel: "Additional Notes",
	cancelButton: "Cancel",
} as const;

/** Copy for Suspend Company modal */
export const SUSPEND_COMPANY_MODAL = {
	...COMPANY_SUSPEND_MODAL_SHARED,
	title: "Suspend Company",
	subtitle: (companyName: string) => `You are about to suspend ${companyName}.`,
	warningTitle: "Suspend action will have the following impact:",
	impactList: [
		"All users will be immediately logged out",
		"Login access will be blocked for all company users",
		"Data will be retained but inaccessible",
		"Billing will be paused (no new charges)",
		"Company admins will receive suspension notification",
	],
	confirmButton: "Suspend Company",
} as const;

export const COMPANY_SUSPEND_VALIDATION = {
	reasonRequired: "Pre-defined reason is required",
} as const;
