import type {
	CreateCompanySchemaType,
	CreateCorporationSchemaType,
} from "@/schemas";
import type { Corporation, CorporationStatus } from "./corporation.types";

/** Standard API success response shape */
export type ApiSuccessResponse<T> = {
	success: true;
	message: string;
	data: T;
};

/** Request body for POST /corporations */
export type CreateCorporationBody = CreateCorporationSchemaType;

/** Response data from POST /corporations (success payload) */
export type CorporationCreated = {
	id: string;
	corporationCode: number;
	legalName: string;
	dbaName: string;
	website: string;
	dataResidencyRegion: string;
	industry: string;
	phoneNo: string;
	brandLogo: string | null;
	status: string;
	mode: string;
	[key: string]: unknown;
};

/** Step type for PATCH /corporations/:corporationId/steps */
export type CorporationStepType = "company" | "branding" | "confirmation";

/** Request body for PATCH /corporations/:corporationId/steps */
export type SubmitCorporationStepBody = { type: CorporationStepType };

/** Response data from PATCH /corporations/:corporationId/steps (confirmation step) */
export type CorporationStepsUpdated = {
	id: string;
	corporationCode: number;
	legalName: string;
	dbaName: string;
	website: string;
	dataResidencyRegion: string;
	industry: string;
	phoneNo: string;
	brandLogo: string | null;
	status: string;
	mode: string;
	suspendCloseReason: string | null;
	suspendCloseAdditionalNotes: string | null;
	submittedSteps: number;
	passwordPolicy: string | null;
	MFA: string;
	sessionTimeout: number;
	createdAt: string;
	updatedAt: string;
};

/** Request body for POST /corporations/:id/companies */
export type CreateCompanyBody = CreateCompanySchemaType;

/** Single corporation item from GET /corporations list API */
export type CorporationListItem = {
	id: string;
	corporationCode: number;
	legalName: string;
	dataResidencyRegion: string;
	status: string;
	submittedSteps: number;
	mode: string;
	corporationAdminName: string;
	corporationAdminEmail: string;
	noOfCompanies: number;
	createdAt: string;
};

/** Sort by field for GET /corporations list (matches backend CORPORATION_SORT_BY) */
export const CORPORATION_SORT_BY = [
	"corporationCode",
	"legalName",
	"status",
	"adminName",
	"companyCount",
	"createdAt",
] as const;
export type CorporationSortBy = (typeof CORPORATION_SORT_BY)[number];

/** Sort order for GET /corporations list (matches backend CORPORATION_SORT_ORDER) */
export const CORPORATION_SORT_ORDER = ["asc", "desc"] as const;
export type CorporationSortOrder = (typeof CORPORATION_SORT_ORDER)[number];

/** Created date filter for GET /corporations list (matches backend CORPORATION_CREATED_FILTER) */
export const CORPORATION_CREATED_FILTER = [
	"last24Hours",
	"last7Days",
	"last30Days",
	"last3Months",
	"last6Months",
	"lastYear",
] as const;
export type CorporationCreatedFilter =
	(typeof CORPORATION_CREATED_FILTER)[number];

/** Query params for GET /corporations list */
export type ListCorporationsParams = {
	page: number;
	limit: number;
	sortBy?: CorporationSortBy;
	sortOrder?: CorporationSortOrder;
	createdFilter?: CorporationCreatedFilter;
	status?: CorporationStatus;
	search?: string;
};

/** List API response data */
export type CorporationListData = {
	items: CorporationListItem[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};

/** GET /corporations/:id – address in response */
export type CorporationDetailAddress = {
	id: string;
	corporationId: string;
	addressLine: string;
	state: string;
	city: string;
	country: string;
	zip: string;
	timezone: string;
	createdAt?: string;
	updatedAt?: string;
};

/** GET /corporations/:id – item in appKeyContacts[] */
export type CorporationDetailAppKeyContact = {
	id: string;
	corporationId: string;
	firstName: string;
	lastName: string;
	nickname: string | null;
	email: string;
	contactType: string;
	jobRole: string;
	workPhone: string;
	cellPhone: string | null;
	sameAsCorpAdmin: boolean;
};

/** GET /corporations/:id – corporationAdminAppUser in response */
export type CorporationDetailAdminAppUser = {
	cognitoSub: string;
	corporationId: string;
	email: string;
	firstName: string;
	lastName: string;
	nickname: string | null;
	workPhone: string;
	cellPhone: string | null;
	jobRole: string;
};

/** Request body for PATCH /corporations/:corporationId/key-contact */
/** Request body for PATCH /corporations/:id/status (suspend/close) */
export type UpdateCorporationStatusBody = {
	status: "CLOSED" | "SUSPENDED";
	suspendCloseReason: string;
	suspendCloseAdditionalNotes: string;
};

export type UpdateKeyContactBody = {
	complianceContact: boolean;
	firstName?: string;
	lastName?: string;
	nickname?: string;
	jobRole?: string;
	email?: string;
	workPhone?: string;
	cellPhone?: string;
};

/** Response data from PATCH /corporations/:corporationId/key-contact */
export type UpdateKeyContactResponse = {
	id: string;
	contactType: string;
	firstName: string;
	lastName: string;
	nickname: string | null;
	jobRole: string;
	email: string;
	workPhone: string;
	cellPhone: string | null;
} | null;

/** GET /corporations/:id – company in response */
/** Plan type nested in company plan (API response) */
export type CorporationDetailCompanyPlanType = {
	id: string;
	name: string;
};

/** Plan nested in company (API response) */
export type CorporationDetailCompanyPlan = {
	id: string;
	planTypeId?: string;
	customerType?: string;
	employeeRangeMin?: number | null;
	employeeRangeMax?: number | null;
	price?: string | number;
	isCustomPricing?: boolean;
	planType?: CorporationDetailCompanyPlanType;
};

/** GET /corporations/:id – company in response */
export type CorporationDetailCompany = {
	id: string;
	corporationId: string;
	legalName: string;
	companyType: string;
	officeType: string;
	industry?: string | null;
	state?: string;
	city?: string;
	zip?: string;
	firstName?: string;
	lastName?: string;
	nickname?: string;
	jobRole?: string | null;
	email?: string;
	workPhone?: string | null;
	cellPhone?: string | null;
	addressLine?: string;
	country?: string;
	planId?: string | null;
	plan?: CorporationDetailCompanyPlan | null;
	sameAsCorpAdmin?: boolean;
	securityPosture?: string;
	phoneNo?: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt?: string | null;
	noOfEmployees?: number;
};

/** Query params for GET /corporations/:corporationId/companies */
export type ListCompanyParams = {
	search?: string;
	companyType?: string;
	region?: string;
	planTypeId?: string;
};

/** Single company item from GET /corporations/:corporationId/companies list */
export type CompanyListItem = {
	id: string;
	corporationId: string;
	companyCode: number;
	legalName: string;
	companyType: string;
	officeType: string;
	firstName?: string | null;
	lastName?: string | null;
	nickname?: string | null;
	role: string | null;
	email: string | null;
	workPhone: string | null;
	cellPhone: string | null;
	addressLine: string | null;
	state: string | null;
	city: string | null;
	country: string | null;
	zip: string | null;
	region: string | null;
	industry: string | null;
	planName: string | null;
	securityPosture?: string | null;
	phoneNo?: string | null;
	plan: {
		id: string;
		planTypeId: string;
		employeeRangeMin: number | null;
		employeeRangeMax: number | null;
	} | null;
};

/** GET /corporations/:id – full response data (API field names) */
export type CorporationDetail = {
	id: string;
	corporationCode: number;
	legalName: string;
	dbaName: string;
	website: string;
	ownershipType?: string;
	dataResidencyRegion: string;
	industry: string;
	phoneNo: string;
	brandLogo: string | null;
	status: string;
	mode: string;
	submittedSteps: number;
	address?: CorporationDetailAddress | null;
	appKeyContacts?: CorporationDetailAppKeyContact[];
	corporationAdminAppUser?: CorporationDetailAdminAppUser | null;
	companies?: CorporationDetailCompany[] | null;
};

/** Corporations store state (add-corporation flow + list + detail) */
export type CorporationsState = {
	corporationId: string | null;
	isLoading: boolean;
	companyActionLoading: boolean;
	error: string | null;
	// List (GET /corporations)
	listItems: Corporation[];
	listTotal: number;
	listPage: number;
	listLoading: boolean;
	listError: string | null;
	listSortBy: CorporationSortBy;
	listSortOrder: CorporationSortOrder;
	listCreatedFilter: CorporationCreatedFilter | undefined;
	listStatusFilter: CorporationStatus | undefined;
	listSearch: string;
	// Detail (GET /corporations/:id)
	corporationDetail: CorporationDetail | null;
	corporationDetailLoading: boolean;
	corporationDetailError: string | null;
	corporationDetailErrorStatus: number | null;
};

/** Corporations store actions */
export type CorporationsActions = {
	createCorporation: (
		body: CreateCorporationBody,
	) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;
	createCompany: (
		body: CreateCompanyBody,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	updateCorporation: (
		corporationId: string,
		body: Partial<CreateCorporationBody>,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	updateCompany: (
		corporationId: string,
		companyId: string,
		body: Partial<CreateCompanyBody>,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	updateKeyContact: (
		corporationId: string,
		body: UpdateKeyContactBody,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	updateCorporationStatus: (
		corporationId: string,
		body: UpdateCorporationStatusBody,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	reinstateCorporation: (
		corporationId: string,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	deleteCompany: (
		corporationId: string,
		companyId: string,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	fetchCorporations: (
		page: number,
		limit: number,
		params?: {
			sortBy?: CorporationSortBy;
			sortOrder?: CorporationSortOrder;
			createdFilter?: CorporationCreatedFilter;
			status?: CorporationStatus;
			search?: string;
		},
	) => Promise<void>;
	setListSort: (
		sortBy: CorporationSortBy,
		sortOrder: CorporationSortOrder,
	) => void;
	setListCreatedFilter: (
		createdFilter: CorporationCreatedFilter | undefined,
	) => void;
	setListStatusFilter: (status: CorporationStatus | undefined) => void;
	setListSearch: (search: string) => void;
	listSortBy: CorporationSortBy;
	listSortOrder: CorporationSortOrder;
	listCreatedFilter: CorporationCreatedFilter | undefined;
	listStatusFilter: CorporationStatus | undefined;
	fetchCorporationById: (corporationId: string) => Promise<void>;
	setListPage: (page: number) => void;
	submitStep: (
		type: CorporationStepType,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
	clearError: () => void;
	clearListError: () => void;
	clearCorporationDetail: () => void;
	reset: () => void;
};

export type CorporationsStore = CorporationsState & CorporationsActions;
