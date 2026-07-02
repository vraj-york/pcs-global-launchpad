import type { CompanyDirectoryItem } from "./company.types";

/** Corporation admin from GET /corporations/list (for same-as-corp-admin prefill) */
export type CorporationAdminOption = {
	id: string;
	corporationId: string;
	firstName: string;
	lastName: string;
	nickname: string;
	jobRole: string;
	email: string;
	workPhone: string;
	cellPhone: string;
};

/** Row from GET /corporations/companies/active */
export type ActiveCompanyListItem = {
	id: string;
	legalName: string;
	corporationId: string;
};

/** Corporation item from GET /corporations/list (dropdown + prefill) */
export type CorporationListOption = {
	id: string;
	legalName: string;
	ownershipType: string;
	dataResidencyRegion: string;
	corporationAdmin: CorporationAdminOption;
};

/** Configuration block from GET /corporations/companies/:companyId (prefill Configuration step). */
export type CompanyConfigurationDetail = {
	id: string;
	companyId: string;
	authMethod: string;
	passwordPolicy: string;
	mfa: string;
	sessionTimeout: string;
	securityPosture: string;
	primaryLanguage: string;
};

/**
 * Company basic info fields for POST create (step 1).
 */
export type CompanyBasicInfoPayload = {
	legalName: string;
	dbaName: string;
	website: string;
	companyType: string;
	officeType: string;
	industry: string;
	phoneNo: string;
	sameAsCorpAdmin: boolean;
	firstName: string;
	lastName: string;
	nickname: string;
	jobRole: string;
	email: string;
	workPhone: string;
	cellPhone: string;
	addressLine: string;
	state: string;
	city: string;
	country: string;
	zip: string;
};

/** Company-admin fields omitted from PATCH when `sameAsCorpAdmin` is true. */
export type CompanyBasicInfoPatchOmittedWhenSameAsCorp =
	| "email"
	| "firstName"
	| "lastName"
	| "nickname"
	| "jobRole"
	| "workPhone"
	| "cellPhone";

/**
 * PATCH /corporations/companies/:companyId — no `email`.
 * When `sameAsCorpAdmin` is true, mirrored admin fields are not sent.
 */
export type CompanyBasicInfoPatchPayload =
	| (Omit<
			CompanyBasicInfoPayload,
			CompanyBasicInfoPatchOmittedWhenSameAsCorp
	  > & {
			sameAsCorpAdmin: true;
	  })
	| (Omit<CompanyBasicInfoPayload, "email"> & { sameAsCorpAdmin: false });

/** POST /corporations/:corpId/companies/companynew — includes static security posture */
export type CompanyBasicInfoPostPayload = CompanyBasicInfoPayload & {
	securityPosture: string;
};

/** Key contact from GET company detail (keyContacts array) */
export type CompanyDetailKeyContact = {
	id?: string;
	contactType: KeyContactType;
	firstName: string;
	lastName: string;
	nickname?: string;
	jobRole?: string | null;
	email: string;
	workPhone: string;
	cellPhone?: string;
};

/** Nested plan summary from GET company */
export type CompanyDetailPlanSummary = {
	id: string;
	planTypeId: string;
	employeeRangeMin?: number | null;
	employeeRangeMax?: number | null;
	planType?: {
		name?: string | null;
	} | null;
};

/** Plan & seats block from GET company (prefill Plan & Seats step). */
export type CompanyPlanSeatDetail = {
	id: string;
	zeroTrial: boolean;
	trialLengthDuration?: number;
	trialLengthType?: string;
	trialStartDate: string | null;
	trialEndDate: string | null;
	planPrice: string;
	discount: string;
	invoiceAmount: string;
	billingCurrency: string;
	autoConvertTrial?: boolean;
	/** Saved at plan setup; used for Company Admin Stripe checkout when valid. */
	checkoutPromoCode?: string | null;
	/** Onsite training selector (`off | 1_day | 2_days`). Fee amounts come from Stripe via GET /pricing/onboarding-fees. */
	onsiteTrainingOption?: string | null;
};

/**
 * Parent corporation fields returned on GET /corporations/companies/:companyId
 */
export type CompanyDetailCorporation = {
	legalName?: string | null;
	ownershipType?: string | null;
	dataResidencyRegion?: string | null;
	corporationAdmin?: CorporationAdminOption | null;
};

/** Company admin block on GET /corporations/companies/:companyId */
export type CompanyDetailCompanyAdmin = {
	firstName: string;
	lastName: string;
	nickname?: string | null;
	jobRole?: string | null;
	email: string;
	workPhone: string;
	cellPhone?: string | null;
};

/** Company detail from GET /corporations/companies/:companyId (for basic step + key contacts prefill) */
export type CompanyDetailData = {
	id: string;
	corporationId: string;
	companyCode: number;
	legalName: string;
	dbaName: string;
	website: string;
	phoneNo: string;
	companyType: string;
	officeType: string;
	industry: string;
	sameAsCorpAdmin: boolean;
	planId: string | null;
	securityPosture: string;
	submittedSteps?: number;
	status?: string;
	subscriptionStatus?: string | null;
	assessmentQuantity?: number | null;
	companyAdmin?: CompanyDetailCompanyAdmin | null;
	addressLine: string;
	state: string;
	city: string;
	country: string;
	zip: string;
	/** Company branding logo (URL or key); used for Configuration step preview. */
	brandLogo?: string | null;
	configuration?: CompanyConfigurationDetail | null;
	plan?: CompanyDetailPlanSummary | null;
	planSeat?: CompanyPlanSeatDetail | null;
	keyContacts?: CompanyDetailKeyContact[];
	corporation?: CompanyDetailCorporation | null;
};

/** Key contact type for POST /corporations/companies/:companyId/key-contacts */
export type KeyContactType =
	| "finance_billing_contact"
	| "technical_it_lead"
	| "implementation_lead"
	| "hr_program_owner";

/** Single key contact in POST …/key-contacts body */
export type KeyContactItem = {
	contactType: KeyContactType;
	available: boolean;
	firstName: string;
	lastName: string;
	nickname?: string;
	jobRole?: string;
	email: string;
	workPhone: string;
	cellPhone?: string;
};

/** Request body for POST /corporations/companies/:companyId/key-contacts */
export type KeyContactsPayload = {
	keyContacts: KeyContactItem[];
};

/**
 * Request body for PUT /corporations/companies/:companyId/plan-seats
 */
export type CompanyPlanSeatsPayload = {
	zeroTrial: boolean;
	trialStartDate: string;
	trialEndDate: string;
	planLevel: string;
	planPrice: number;
	discount: number;
	invoiceAmount: number;
	/** Optional; persisted for Company Admin checkout. */
	checkoutPromoCode?: string | null;
	/** Onsite training selector (`off | 1_day | 2_days`); fee amounts come from Stripe at checkout time. */
	onsiteTrainingOption?: string;
};

/** Sort by field for GET /companies list */
export const COMPANY_SORT_BY = [
	"companyCode",
	"legalName",
	"status",
	"corporationName",
	"plan",
	"createdAt",
	"updatedAt",
] as const;
export type CompanyApiSortBy = (typeof COMPANY_SORT_BY)[number];

/** Sort order for GET /companies list */
export const COMPANY_SORT_ORDER = ["asc", "desc"] as const;
export type CompanyApiSortOrder = (typeof COMPANY_SORT_ORDER)[number];

/** Created date filter for GET /companies list */
export const COMPANY_CREATED_FILTER = [
	"last24Hours",
	"last7Days",
	"last30Days",
	"last3Months",
	"last6Months",
	"lastYear",
] as const;
export type CompanyApiCreatedFilter = (typeof COMPANY_CREATED_FILTER)[number];

/** Status filter for GET /companies list */
export const COMPANY_STATUS_FILTER = [
	"all",
	"active",
	"incomplete",
	"suspended",
	"closed",
] as const;
export type CompanyApiStatusFilter = (typeof COMPANY_STATUS_FILTER)[number];

/** Query params for GET /companies list */
export type ListCompaniesParams = {
	page: number;
	limit: number;
	sortBy?: CompanyApiSortBy;
	sortOrder?: CompanyApiSortOrder;
	createdFilter?: CompanyApiCreatedFilter;
	status?: CompanyApiStatusFilter;
	corporationId?: string;
	planId?: string;
	planTypeId?: string;
	search?: string;
};

/** List API response data */
export type CompanyDirectoryListData = {
	items: CompanyDirectoryListItem[];
	pagination: {
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	};
};

/** Single company item from GET /companies list API */
export type CompanyDirectoryListItem = {
	id: string;
	companyId: string;
	name: string;
	location: string | null;
	submittedSteps?: number;
	status: string | null;
	assignedCorporation: {
		corporationCode: string;
		id: string;
		name: string;
	} | null;
	plan: {
		id: string;
		planTypeId: string;
		name: string | null;
		customerType: string | null;
	} | null;
	createdAt: string;
	updatedAt: string;
};

/** Filter options from GET /companies/filter-options */
export type CompanyFilterOptions = {
	statuses: { value: string; label: string }[];
	corporations: { id: string; label: string }[];
	plans: { value: string; label: string }[];
};

/** POST /corporations/companies/:companyId/suspend request body */
export type SuspendCompanyPayload = {
	suspendReason: string;
	suspendAdditionalNotes?: string;
};

/** Companies store state (list) */
export type CompaniesState = {
	// List (GET /companies)
	listItems: CompanyDirectoryItem[];
	listTotal: number;
	listPage: number;
	listLoading: boolean;
	listError: string | null;
	listSortBy: CompanyApiSortBy;
	listSortOrder: CompanyApiSortOrder;
	listCreatedFilter: CompanyApiCreatedFilter | undefined;
	listStatusFilter: string | undefined;
	listCorporationFilter: string | undefined;
	listPlanFilter: string | undefined;
	listPlanTypeFilter: string | undefined;
	listSearch: string;
	filterOptions: CompanyFilterOptions | null;
	filterOptionsLoading: boolean;
};

/** Companies store actions */
export type CompaniesActions = {
	fetchFilterOptions: () => Promise<void>;
	fetchCompanies: (
		page: number,
		limit: number,
		params?: {
			sortBy?: CompanyApiSortBy;
			sortOrder?: CompanyApiSortOrder;
			createdFilter?: CompanyApiCreatedFilter;
			status?: CompanyApiStatusFilter;
			corporationId?: string;
			planId?: string;
			planTypeId?: string;
			search?: string;
		},
	) => Promise<void>;
	setListPage: (page: number) => void;
	setListSort: (
		sortBy: CompanyApiSortBy,
		sortOrder: CompanyApiSortOrder,
	) => void;
	setListCreatedFilter: (
		createdFilter: CompanyApiCreatedFilter | undefined,
	) => void;
	setListStatusFilter: (status: string | undefined) => void;
	setListCorporationFilter: (corporationId: string | undefined) => void;
	setListPlanFilter: (planId: string | undefined) => void;
	setListPlanTypeFilter: (planTypeId: string | undefined) => void;
	setListSearch: (search: string) => void;
	clearListError: () => void;
	suspendCompany: (
		companyId: string,
		payload: SuspendCompanyPayload,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	reinstateCompany: (
		companyId: string,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	reset: () => void;
};

/** Companies store (list) */
export type CompaniesStore = CompaniesState & CompaniesActions;
