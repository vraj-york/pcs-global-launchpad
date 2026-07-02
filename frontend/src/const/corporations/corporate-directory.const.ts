import type {
	ConfirmationFieldValues,
	CorporationStatus,
	ViewCorporationTabId,
} from "@/types";

export const CORPORATE_DIRECTORY_PAGE_CONTENT = {
	breadcrumbsTitle: "Corporation Directory",
	Title: "Corporations",
	subtitle: "View and manage all corporations across the platform",
	addNewCorporationButton: "Add New Corporation",
	searchAriaLabel: "Search corporations",
	createdFilterAriaLabel: "Filter by created date",
	statusFilterAriaLabel: "Filter by status",
	statusFilterAllLabel: "All Status",
	createdFilterAllLabel: "All Time",
	chooseSetupBreadcrumbsTitle: "Choose Setup",
	chooseSetupPageTitle: "Choose Setup Type",
	addNewBreadcrumbsTitle: "Add New Corporation",
	editBreadcrumbsTitle: "Edit Corporation",
	backButton: "Back",
	backToCorporationDirectory: "Back to Corporation Directory",
	noData: "No corporations found.",
	// View corporation detail page
	viewEditButton: "Edit",
	viewEditCorporationButton: "Edit Corporation",
	viewSuspendButton: "Suspend",
	reinstateButton: "Reinstate",
	tableResumeButton: "Resume",
	tableSuspendButton: "Suspend",
	viewCloseCorporationButton: "Close Corporation",
	viewTabBasicInfo: "Basic Info.",
	viewTabCompanies: "Companies",
	viewTabBranding: "Branding",
	viewTabKeyContacts: "Key Contacts",
	viewTabConfiguration: "Configuration",
	viewCardCorporationBasics: "Corporation Basics",
	viewCardCorporateAdmin: "Corporate Admin",
	viewCardExecutiveSponsor: "Executive Sponsor",
	viewCardComplianceContact: "Compliance Contact",
	viewCardBrandLogo: "Branding Logo",
	viewFieldCorporationId: "Corporation ID",
	viewFieldStatus: "Status",
	viewFieldCorporationLegalName: "Corporation Legal Name",
	viewFieldDbaName: "DBA Name",
	viewFieldWebsiteUrl: "Website URL",
	viewFieldOwnershipType: "Ownership Type",
	viewFieldRegion: "Region (Data Residency)",
	viewFieldIndustry: "Industry",
	viewFieldCorporatePhoneNo: "Corporation Phone No.",
	viewFieldAddress: "Address",
	viewFieldTimeZone: "Time Zone",
	viewFieldFullName: "Full Name",
	viewFieldNickname: "Nickname",
	viewFieldName: "Name",
	viewFieldJobRole: "Job Role",
	viewFieldEmail: "Email",
	viewFieldWorkPhoneNo: "Work Phone No.",
	viewFieldCellPhoneNo: "Cell Phone No.",
	// Configuration tab (static)
	viewConfigCardTitle: "Default Security Posture",
	viewConfigAuthMethod: "Authentication Method",
	viewConfigAuthMethodValue: "Email & password",
	viewConfigPasswordPolicy: "Password Policy",
	viewConfigPasswordPolicyValue: "Standard (8+ chars, mixed case)",
	viewConfig2FA: "2FA Requirement",
	viewConfig2FAValue: "Required",
	viewConfigSessionTimeout: "Session Timeout (In Minutes)",
	viewConfigSessionTimeoutValue: "60 min",
	viewCompaniesTabPlaceholder: "Companies tab — content coming soon.",
	viewNoAdminOrSponsor: "No admin or sponsor contacts are available.",
	viewNoLogoUploaded: "No logo uploaded.",
	viewNoAppKeyContacts: "No key contacts are available.",
	viewCorporationNotFound: "Corporation not found.",
	corporationOverviewTitle: "Corporation Overview",
	corporationOverviewBackToDashboard: "Back to Dashboard",
	corporationOverviewProfileError:
		"We could not load your profile. Please refresh or try again later.",
	corporationOverviewNoCorporationLinked:
		"No corporation is linked to this account.",
	// Companies tab
	viewCompaniesTitle: "Companies",
	viewCompaniesFilterAllCompanyTypes: "All Company Types",
	viewCompaniesFilterAllRegions: "All Region",
	viewCompaniesFilterAllPlans: "All Plan",
	viewCompaniesNoResults: "No companies found.",
	// Company detail (Companies tab sub-view)
	viewCompanyDetailBackToCompanies: "Back to Companies",
	viewCardCompanyDetails: "Company Details",
	viewCardCompanyAdmin: "Company Admin",
	viewFieldCompanyId: "Company ID",
	viewFieldCompanyLegalName: "Company Legal Name",
	viewFieldCompanyType: "Company Type",
	viewFieldOfficeType: "Office Type",
	viewFieldPlan: "Plan",
	viewFieldPlanLevel: "Plan Level",
	viewFieldSecurityPosture: "Security Posture",
	viewFieldCompanyAddress: "Company Address",
	viewFieldCompanyPhoneNo: "Company Phone No.",
} as const;

/** Shared form labels for Suspend/Close Corporation action modal */
export const CORPORATION_ACTION_MODAL_SHARED = {
	preDefinedReasonsLabel: "Pre-defined Reasons",
	additionalNotesLabel: "Additional Notes",
	cancelButton: "Cancel",
} as const;

/** Copy for Suspend Corporation modal */
export const SUSPEND_CORPORATION_MODAL = {
	...CORPORATION_ACTION_MODAL_SHARED,
	title: "Suspend Corporation",
	subtitle: (corporationName: string) =>
		`You are about to suspend ${corporationName}.`,
	warningTitle: "Suspend action will have the following impact:",
	impactList: [
		"All users will be immediately logged out",
		"Login access will be blocked for all corporation users",
		"Data will be retained but inaccessible",
		"Billing will be paused (no new charges)",
		"Corporation admins will receive suspension notification",
	],
	confirmButton: "Suspend Corporation",
} as const;

/** Copy for Close Corporation modal */
export const CLOSE_CORPORATION_MODAL = {
	title: "Close Corporation",
	subtitle: (corporationName: string) =>
		`You are about to permanently close ${corporationName}. It cannot be undone!`,
	warningTitle:
		"Close action is permanent delete & will have the following impact:",
	impactList: [
		"Immediate termination of all user access",
		"All active sessions will be invalidated",
		'Corporation marked as "Closed" in the system',
		"Billing subscription will be cancelled",
	],
	confirmButton: "Close Corporation",
} as const;

/** Copy for Reinstate Corporation confirmation modal */
export const REINSTATE_CORPORATION_MODAL = {
	title: "Reinstate this corporation?",
	description:
		"This action will restore the corporation & re-enable its access to the platform.",
	cancel: "Cancel",
	confirm: "Reinstate Corporation",
} as const;

/** Pre-defined reasons for suspend/close corporation (shared dropdown) */
export const CORPORATION_ACTION_REASONS = [
	{
		value: "Non-Payment / Payment Failure",
		label: "Non-Payment / Payment Failure",
	},
	{
		value: "Violation of Terms of Agreement",
		label: "Violation of Terms of Agreement",
	},
	{
		value: "Security Risk or Suspected Breach",
		label: "Security Risk or Suspected Breach",
	},
	{
		value: "Abusive/ Harassing Behavior (toward staff or other users)",
		label: "Abusive/ Harassing Behavior (toward staff or other users)",
	},
	{
		value: "Misuse or Abuse of the Platform",
		label: "Misuse or Abuse of the Platform",
	},
	{
		value: "Unauthorized Access or Account Sharing",
		label: "Unauthorized Access or Account Sharing",
	},
	{
		value: "Data Privacy/ Compliance Violation",
		label: "Data Privacy/ Compliance Violation",
	},
	{
		value: "Fraudulent Activity or Misrepresentation",
		label: "Fraudulent Activity or Misrepresentation",
	},
	{ value: "Lack of Engagement", label: "Lack of Engagement" },
	{
		value: "Client-Requested Pause/ Temporary Suspension",
		label: "Client-Requested Pause/ Temporary Suspension",
	},
	{ value: "Other", label: "Other" },
] as const;

export const VIEW_CORPORATION_TABS: {
	id: ViewCorporationTabId;
	label: string;
}[] = [
	{ id: "basic", label: CORPORATE_DIRECTORY_PAGE_CONTENT.viewTabBasicInfo },
	{ id: "companies", label: CORPORATE_DIRECTORY_PAGE_CONTENT.viewTabCompanies },
	{ id: "branding", label: CORPORATE_DIRECTORY_PAGE_CONTENT.viewTabBranding },
	{
		id: "contacts",
		label: CORPORATE_DIRECTORY_PAGE_CONTENT.viewTabKeyContacts,
	},
];

export const ADD_NEW_CORPORATION_STEPS = [
	{
		id: "basic",
		title: "Basic Info.",
		subtitle: "Create top-level organization",
	},
	{
		id: "company",
		title: "Company Info.",
		subtitle: "Set up first operating unit",
	},
	{
		id: "confirmation",
		title: "Confirmation",
		subtitle: "Review details & confirm",
	},
] as const;

export const ADD_NEW_CORPORATION_STEPS_ADVANCED = [
	{
		id: "basic",
		title: "Basic Info.",
		subtitle: "Corporation-based details",
	},
	{
		id: "company-setup",
		title: "Company Setup",
		subtitle: "Company assignment",
	},
	{
		id: "branding",
		title: "Branding",
		subtitle: "Identity configuration",
	},
	{
		id: "key-contact",
		title: "Key Contacts",
		subtitle: "Structure & access",
	},
	{
		id: "confirmation",
		title: "Confirmation",
		subtitle: "Review all details",
	},
] as const;

export const ADD_NEW_CORPORATION_CONTENT = {
	pageTitle: "Add New Corporation",
	pageSubtitle:
		"Set up a new corporation with its plan, region, and initial admin access.",
	editPageTitle: "Edit Corporation",
	editPageSubtitle:
		"Update corporation details, plan, region, and admin access.",
	basicInfo: {
		title: "Basic Info.",
		subtitle: "Enter the core details for the new corporation.",
	},
	companyInfo: {
		title: "Company Info.",
		subtitle:
			"Each corporation must have at least one company before continuing.",
	},
	branding: {
		title: "Branding",
		subtitle:
			"Upload a logo to reflect your corporation's identity. This step is optional.",
		uploadTitle: "Upload Logo",
		uploadLabel: "Click to upload or drag-&-drop file",
		uploadHint: "Supported file formats are PNG & JPG up to 10MB",
		removeLogo: "Remove logo",
		errors: {
			unsupportedFormat: "Logo must be a PNG or JPG file.",
			fileTooLarge: "Logo size must not exceed 10 MB.",
			uploadFailed: "Logo upload failed. Please try again.",
			uploadForbidden:
				"Invalid image format, please try again with valid image.",
			removeFailed: "Failed to remove logo. Please try again.",
			imageLoadFailed: "Image could not be loaded. Try a different file.",
		},
	},
	confirmation: {
		title: "Confirmation",
		subtitle: "Review all details that has been added.",
		placeholderMessage:
			"Confirmation step — review details & confirm. (Placeholder)",
	},
	advancedPageSubtitle:
		"Set up a new corporation with its basic details, company, branding, and governance.",
	advancedSteps: {
		companySetup: {
			title: "Company Setup",
			subtitle:
				"Each corporation must have at least one Company before continuing.",
			companiesCountLabel: (count: number) => `Companies (${count})`,
			alertTitle: "Company Assignment & Modification",
			alertBody:
				"Created companies will be assigned to the corporation after creation is complete. For further modification kindly go to the Company Directory.",
			addNewCompany: "Add New Company",
			noCompaniesTitle: "No companies yet",
			addOneCompanyRequired:
				"Add at least one company to continue to the next step.",
			editAriaLabel: "Edit company",
			deleteAriaLabel: "Delete company",
			deleteDialog: {
				title: "Delete this company?",
				description:
					"This action will permanently remove the company from system.",
				cancel: "Cancel",
				confirm: "Delete Company",
			},
			backToCompanies: "Back to Companies",
			editCompany: "Edit Company",
			editCompanySubtitle: "Modify company details as required.",
			addNewCompanySubtitle:
				"Create a new physical company to the corporation.",
			cancel: "Cancel",
			saveAndAdd: "Save & Add",
			saveAndUpdate: "Save & Update",
		},
		branding: {
			title: "Branding",
			subtitle: "Configure corporation identity.",
		},
		keyContact: {
			title: "Key Contacts",
			subtitle:
				"Define governance, financial, and compliance ownership at the corporate level.",
		},
		confirmation: {
			title: "Confirmation",
			subtitle: "Review all the details that has been added.",
			noteTitle: "Note",
			noteBodyBefore:
				"Kindly review the information below to ensure everything is correct, then click ",
			noteBodyAfter: " to create the corporation.",
		},
	},
	cards: {
		corporationBasics: "Corporation Basics",
		corporationAddress: "Corporation Address",
		corporationAdmin: "Corporation Admin",
		executiveSponsor: "Executive Sponsor",
		collapseSectionAriaLabel: "Collapse section",
		expandSectionAriaLabel: "Expand section",
	},
	referenceOnlyTooltip:
		"This contact is saved for reference only & doesn’t grant platform access.",
	sameAsCorpAdminLabel: "Same as corporation admin",
	fields: {
		corporationLegalName: "Corporation Legal Name",
		dbaName: "DBA Name",
		websiteUrl: "Website URL",
		ownershipType: "Ownership Type",
		region: "Region (Data Residency)",
		industry: "Industry",
		corporatePhoneNo: "Corporation Phone No.",
		addressLine: "Address Line",
		stateProvince: "State/Province",
		city: "City",
		country: "Country",
		zipPostalCode: "ZIP/Postal Code",
		timeZone: "Time Zone",
		firstName: "First Name",
		lastName: "Last Name",
		nickname: "Nickname",
		name: "Name",
		role: "Job Role",
		email: "Email",
		workPhoneNo: "Work Phone No.",
		cellPhoneNo: "Cell Phone No.",
	},
	buttons: {
		cancel: "Cancel",
		previous: "Previous",
		next: "Next",
		confirmAdd: "Confirm & Add",
		confirmUpdate: "Confirm & Update",
	},
	toast: {
		corporationCreated: "Corporation created successfully.",
		corporationUpdated: "Corporation updated successfully.",
		keyContactUpdated: "Key contact updated successfully.",
		companyAdded: "Company added successfully.",
		companyUpdated: "Company updated successfully.",
	},
	progress: "Complete",
	loadingDetail: "Loading corporation details...",
	setupBadge: {
		quick: "Quick Setup",
		advanced: "Advanced Setup",
	},
} as const;

export const CORPORATION_VALIDATION_MESSAGES = {
	email: "Enter a valid email address",
	url: "Enter a valid URL",
	phone: "Enter a valid phone number",
	minNumber: "Must be at least 1",
	reasonRequired: "Pre-defined reason is required",
} as const;

export const ADD_NEW_CORPORATION_DROPDOWN_OPTIONS = {
	regions: [
		{ value: "North America", label: "North America" },
		{ value: "Middle East", label: "Middle East" },
		{ value: "Africa", label: "Africa" },
		{ value: "India", label: "India" },
		{ value: "Asia-Pacific", label: "Asia-Pacific" },
		{ value: "Latin America", label: "Latin America" },
		{ value: "Japan", label: "Japan" },
		{ value: "China", label: "China" },
		{ value: "Australia & New Zealand", label: "Australia & New Zealand" },
	],
	industries: [
		{ value: "Technology / SaaS", label: "Technology / SaaS" },
		{
			value: "Healthcare & Life Sciences",
			label: "Healthcare & Life Sciences",
		},
		{ value: "Financial Services", label: "Financial Services" },
		{ value: "Education", label: "Education" },
		{ value: "Manufacturing", label: "Manufacturing" },
		{ value: "Retail & E-commerce", label: "Retail & E-commerce" },
		{ value: "Media & Entertainment", label: "Media & Entertainment" },
		{
			value: "Logistics & Transportation",
			label: "Logistics & Transportation",
		},
		{ value: "Energy & Utilities", label: "Energy & Utilities" },
		{
			value: "Government & Public Sector",
			label: "Government & Public Sector",
		},
		{ value: "Professional Services", label: "Professional Services" },
		{ value: "Non-Profit", label: "Non-Profit" },
		{
			value: "Construction and Infrastructure",
			label: "Construction and Infrastructure",
		},
		{
			value: "Mobility Industries",
			label: "Mobility Industries",
		},
		{
			value: "Retail & Hospitality",
			label: "Retail & Hospitality",
		},
		{ value: "Other", label: "Other" },
	],
	states: [
		{ value: "California", label: "California" },
		{ value: "New York", label: "New York" },
		{ value: "Texas", label: "Texas" },
	],
	cities: [
		{ value: "Los Angeles", label: "Los Angeles" },
		{ value: "San Francisco", label: "San Francisco" },
		{ value: "New York City", label: "New York City" },
	],
	countries: [
		{ value: "United States", label: "United States" },
		{ value: "Canada", label: "Canada" },
		{ value: "United Kingdom", label: "United Kingdom" },
	],
	ownershipTypes: [
		{ value: "Wholly Owned", label: "Wholly Owned" },
		{ value: "Majority", label: "Majority" },
		{ value: "Affiliate", label: "Affiliate" },
		{ value: "Franchise", label: "Franchise" },
	],
	timeZones: [
		{ value: "EST (Eastern Time)", label: "EST (Eastern Time)" },
		{ value: "CST (Central Time)", label: "CST (Central Time)" },
		{ value: "MST (Mountain Time)", label: "MST (Mountain Time)" },
		{ value: "PST (Pacific Time)", label: "PST (Pacific Time)" },
		{ value: "AKST (Alaska Time)", label: "AKST (Alaska Time)" },
		{ value: "HST (Hawaii Time)", label: "HST (Hawaii Time)" },
	],
	companyTypes: [
		{ value: "Operating Company", label: "Operating Company" },
		{ value: "Subsidiary", label: "Subsidiary" },
		{ value: "Franchise", label: "Franchise" },
		{ value: "Division", label: "Division" },
	],
	officeTypes: [
		{ value: "HQ", label: "HQ" },
		{ value: "Regional", label: "Regional" },
		{ value: "Field", label: "Field" },
		{ value: "Virtual", label: "Virtual" },
	],
	securityPostures: [
		{ value: "Standard", label: "Standard" },
		{ value: "Enhanced", label: "Enhanced" },
		{ value: "Enterprise", label: "Enterprise" },
	],
} as const;

export const COMPANY_INFO_CONTENT = {
	cards: {
		companyDetails: "Company Details",
		companyAddress: "Company Address",
		companyAdmin: "Company Admin",
		accessSetup: "Access Setup",
	},
	fields: {
		companyLegalName: "Company Legal Name",
		companyType: "Company Type",
		officeType: "Office Type",
		region: "Region (Data Residency)",
		industry: "Industry",
		plan: "Plan",
		planLevel: "Plan Level",
		securityPosture: "Security Posture",
		companyPhoneNo: "Company Phone No.",
		addressLine: "Address Line",
		stateProvince: "State/ Province",
		city: "City",
		country: "Country",
		zipPostalCode: "ZIP/ Postal Code",
		firstName: "First Name",
		lastName: "Last Name",
		nickname: "Nickname",
		name: "Name",
		jobRole: "Job Role",
		email: "Email",
		noOfEmployees: "No. of Employees",
		workPhoneNo: "Work Phone No.",
		cellPhoneNo: "Cell Phone No.",
	},
} as const;

export const CHOOSE_SETUP_CONTENT = {
	quickSetup: {
		badge: "Recommended",
		title: "Quick Setup",
		description:
			"Best for first-time onboarding. Applies system defaults and guides you through the essentials in a streamlined 3-step process. Perfect for getting started quickly.",
		features: ["3 steps", "~8 minutes", "System defaults applied"],
		steps: [
			{
				number: 1,
				title: "Basic Info. Setup",
				subtitle: "Corporation level basic details",
			},
			{
				number: 2,
				title: "Company Setup",
				subtitle: "At least 1 company detail needed",
			},
			{
				number: 3,
				title: "Confirmation",
				subtitle: "Check & verify the given info.",
			},
		],
		buttonText: "Start Quick Setup",
	},
	advancedSetup: {
		title: "Advanced Setup",
		description:
			"Full control over companies, plans, and other configurations. Provide basic details, add multiple companies, branding & plans settings from the ground up.",
		features: [
			"Multiple steps",
			"In-detailed company info.",
			"Full customization",
		],
		steps: [
			{
				number: 1,
				title: "Basic Info. Setup",
				subtitle: "Corporation level basic details",
			},
			{
				number: 2,
				title: "Company Setup",
				subtitle: "Configure multiple companies",
			},
			{
				number: 3,
				title: "Branding & Key Contacts",
				subtitle: "Set up basic contacts & brand experience",
			},
			{
				number: 4,
				title: "Confirmation",
				subtitle: "Check & verify the given info.",
			},
		],
		buttonText: "Start Advanced Setup",
	},
} as const;

/** Status filter options for corporation list: All status + active, suspended, closed, incomplete (lowercase) */
export const CORPORATION_STATUS_FILTER_OPTIONS: ReadonlyArray<{
	value: "all" | CorporationStatus;
	label: string;
}> = [
	{ value: "all", label: "All Status" },
	{ value: "active", label: "Active" },
	{ value: "suspended", label: "Suspended" },
	{ value: "closed", label: "Closed" },
	{ value: "incomplete", label: "Incomplete" },
];

/** Created date filter options for corporation list (matches backend CORPORATION_CREATED_FILTER) */
export const CORPORATION_CREATED_FILTER_OPTIONS = [
	{ value: "all", label: "All Time" },
	{ value: "last24Hours", label: "Last 24 hours" },
	{ value: "last7Days", label: "Last 7 days" },
	{ value: "last30Days", label: "Last 30 days" },
	{ value: "last3Months", label: "Last 3 months" },
	{ value: "last6Months", label: "Last 6 months" },
	{ value: "lastYear", label: "Last year" },
] as const;

export const CORPORATION_TABLE_HEADERS = {
	corpId: "Corp. ID",
	corporationName: "Corporation Name",
	status: "Status",
	corporationAdmin: "Corporation Admin",
	companies: "Companies",
	createdOn: "Created On",
	actions: "Actions",
} as const;

export const CONFIRMATION_STEP_CONTENT = {
	corporationInfo: "Corporation Info.",
	corporationInfoFields: {
		corporationLegalName: "Corporation Legal Name",
		dbaName: "DBA Name",
		websiteUrl: "Website URL",
		ownershipType: "Ownership Type",
		region: "Region (Data Residency)",
		industry: "Industry",
		corporatePhoneNo: "Corporation Phone No.",
		address: "Address",
		timeZone: "Time Zone",
	},
	corporationAdminInfo: "Corporation Admin Info.",
	corporationAdminInfoFields: {
		fullName: "Full Name",
		nickname: "Nickname",
		jobRole: "Job Role",
		email: "Email",
		workPhoneNo: "Work Phone No.",
		cellPhoneNo: "Cell Phone No.",
	},
	companies: "Companies",
	executiveSponsorInfo: "Executive Sponsor Info.",
	executiveSponsorInfoFields: {
		fullName: "Full Name",
		nickname: "Nickname",
		role: "Job Role",
		email: "Email",
		workPhoneNo: "Work Phone No.",
		cellPhoneNo: "Cell Phone No.",
	},
	branding: "Branding",
	brandLogo: "Brand Logo",
	keyContact: "Key Contact",
	complianceContact: "Compliance Contact",
	viewFieldFullName: "Full Name",
	viewFieldNickname: "Nickname",
	companyDetails: "Company Info.",
	companyDetailsFields: {
		companyLegalName: "Company Legal Name",
		companyType: "Company Type",
		officeType: "Office Type",
		stateProvince: "State/Province",
		city: "City",
		zipPostalCode: "ZIP/Postal Code",
		planLevel: "Plan Level",
		plan: "Plan",
		address: "Address",
		region: "Region (Data Residency)",
		industry: "Industry",
		securityPosture: "Security Posture",
		companyPhoneNo: "Company Phone No.",
	},
	companyAdminInfo: "Company Admin Info.",
	companyAdminInfoFields: {
		fullName: "Full Name",
		nickname: "Nickname",
		email: "Email",
		cellPhoneNo: "Cell Phone No.",
		jobRole: "Job Role",
		workPhoneNo: "Work Phone No.",
	},
	adminUser: "Admin User",
	adminUserFields: {
		adminName: "Admin Name",
		adminEmail: "Company Admin Email",
		noOfEmployees: "No. of Employees",
		securityPosture: "Security Posture",
	},
};

export const EMPTY_FIELD_VALUES: ConfirmationFieldValues = {
	corporationLegalName: "",
	dbaName: "",
	region: "",
	industry: "",
	corporatePhoneNo: "",
	websiteUrl: "",
	ownershipType: "",
	address: "",
	timeZone: "",
	executiveSponsorFullName: "",
	executiveSponsorNickname: "",
	executiveSponsorJobRole: "",
	email: "",
	workPhoneNo: "",
	cellPhoneNo: "",
	companyLegalName: "",
	companyType: "",
	officeType: "",
	companyIndustry: "",
	stateProvince: "",
	city: "",
	zipPostalCode: "",
	adminFullName: "",
	adminNickname: "",
	companyAdminEmail: "",
	noOfEmployees: "",
	securityPosture: "",
	companyPhoneNo: "",
};
