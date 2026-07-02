import { ADD_NEW_CORPORATION_DROPDOWN_OPTIONS, API_ENDPOINTS } from "@/const";
import {
	type ApiError,
	type ApiResponse,
	apiClient,
	isApiError,
} from "@/lib/apiClient";
import type {
	CreateCompanySchemaType,
	CreateCorporationSchemaType,
} from "@/schemas";
import type {
	ActiveCompanyListItem,
	ApiSuccessResponse,
	CompanyListItem,
	Corporation,
	CorporationCreated,
	CorporationDetail,
	CorporationDetailCompany,
	CorporationListData,
	CorporationListItem,
	CorporationListOption,
	CorporationStatus,
	CorporationStepsUpdated,
	CorporationStepType,
	CreateCompanyBody,
	CreateCorporationBody,
	ListCompanyParams,
	ListCorporationsParams,
	UpdateCorporationStatusBody,
	UpdateKeyContactBody,
	UpdateKeyContactResponse,
} from "@/types";

/** Map API list item to table Corporation type */
function mapListItemToCorporation(item: CorporationListItem): Corporation {
	const status = item.status.toLowerCase() as CorporationStatus;
	const validStatuses: CorporationStatus[] = [
		"active",
		"suspended",
		"closed",
		"incomplete",
	];
	return {
		id: item.id,
		corpId: String(item.corporationCode),
		name: item.legalName,
		region: item.dataResidencyRegion,
		status: validStatuses.includes(status) ? status : "incomplete",
		corporationAdmin: {
			name: item.corporationAdminName,
			email: item.corporationAdminEmail,
		},
		companies: item.noOfCompanies,
		createdOn: item.createdAt,
		mode: item.mode,
		submittedSteps: item.submittedSteps,
	};
}

/**
 * Fetch corporations list for dropdown (e.g. Add Company parent corporation).
 * GET /corporations/list
 */
export async function getCorporationsList() {
	const url = API_ENDPOINTS.corporations.list;
	const result = await apiClient.get<{
		success: boolean;
		message?: string;
		data: CorporationListOption[];
	}>(url);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!Array.isArray(data))
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}

/**
 * Active companies (e.g. user directory / key contacts more filters).
 * GET /corporations/companies/active
 */
export async function getActiveCompanies() {
	const url = API_ENDPOINTS.corporations.activeCompanies;
	const result = await apiClient.get<{
		success: boolean;
		message?: string;
		data: { items: ActiveCompanyListItem[] };
	}>(url);
	if (isApiError(result)) return result;
	const items = result.data?.data?.items;
	if (!Array.isArray(items))
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data: items };
}

/**
 * Fetch corporation list with pagination, sorting, and optional created date filter.
 * GET /corporations?page=1&limit=10&sortBy=createdAt&sortOrder=desc&createdFilter=last30Days
 */
export async function getCorporations(params: ListCorporationsParams) {
	const {
		page,
		limit,
		sortBy,
		sortOrder,
		createdFilter,
		status,
		search: searchQuery,
	} = params;
	const search = new URLSearchParams({
		page: String(page),
		limit: String(limit),
	});
	if (sortBy) search.set("sortBy", sortBy);
	if (sortOrder) search.set("sortOrder", sortOrder);
	if (createdFilter) search.set("createdFilter", createdFilter);
	search.set("status", status ?? "all");
	if (searchQuery?.trim()) search.set("search", searchQuery.trim());
	const url = `${API_ENDPOINTS.corporations.root}?${search.toString()}`;
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: CorporationListData;
	}>(url);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return {
		ok: true as const,
		data: {
			items: data.items.map(mapListItemToCorporation),
			total: data.total,
			page: data.page,
			limit: data.limit,
			totalPages: data.totalPages,
		},
	};
}

/**
 * Fetch corporation by ID (all steps data).
 * GET /corporations/:corporationId
 */
export async function getCorporationById(corporationId: string) {
	const url = API_ENDPOINTS.corporations.byId(corporationId);
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: CorporationDetail;
	}>(url);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}

/**
 * Map GET corporation detail to basic info (step 0) form default values.
 * Used when user goes back to step 0 to edit.
 */
export function mapCorporationDetailToBasicInfoForm(
	detail: CorporationDetail,
): Partial<CreateCorporationSchemaType> {
	const addr = detail.address;
	const sponsor = detail.appKeyContacts?.find(
		(c) => c.contactType === "exec_sponsor",
	);
	const corpAdmin = detail.corporationAdminAppUser;

	return {
		mode: (detail.mode === "advanced" ? "advanced" : "quick") as
			| "quick"
			| "advanced",
		legalName: detail.legalName,
		dbaName: detail.dbaName ?? "",
		website: detail.website,
		ownershipType:
			detail.ownershipType ??
			ADD_NEW_CORPORATION_DROPDOWN_OPTIONS.ownershipTypes[0].value,
		dataResidencyRegion:
			detail.dataResidencyRegion ??
			ADD_NEW_CORPORATION_DROPDOWN_OPTIONS.regions[0].value,
		industry: detail.industry ?? "",
		phoneNo: detail.phoneNo ?? "",
		address: addr
			? {
					addressLine: addr.addressLine ?? "",
					state: addr.state ?? "",
					city: addr.city ?? "",
					country: addr.country ?? "",
					zip: addr.zip ?? "",
					timezone: addr.timezone ?? "",
				}
			: undefined,
		executiveSponsor: sponsor
			? {
					sameAsCorpAdmin: sponsor.sameAsCorpAdmin ?? false,
					firstName: sponsor.firstName ?? "",
					lastName: sponsor.lastName ?? "",
					nickname: sponsor.nickname ?? "",
					jobRole: sponsor.jobRole ?? "",
					email: sponsor.email ?? "",
					workPhone: sponsor.workPhone ?? "",
					cellPhone: sponsor.cellPhone ?? "",
				}
			: undefined,
		corporationAdmin: corpAdmin
			? {
					firstName: corpAdmin.firstName ?? "",
					lastName: corpAdmin.lastName ?? "",
					nickname: corpAdmin.nickname ?? "",
					jobRole: corpAdmin.jobRole ?? "",
					email: corpAdmin.email ?? "",
					workPhone: corpAdmin.workPhone ?? "",
					cellPhone: corpAdmin.cellPhone ?? "",
				}
			: undefined,
	};
}

/**
 * Map GET corporation detail (first company) to company form default values.
 * Used to prefill Company Info step. Region from corporation; industry from
 * company when editing (each company has its own industry).
 */
export function mapCorporationDetailToCompanyForm(
	detail: CorporationDetail,
): Partial<CreateCompanySchemaType> {
	const company = detail.companies?.[0];
	const base = {
		region:
			detail.dataResidencyRegion ??
			ADD_NEW_CORPORATION_DROPDOWN_OPTIONS.regions[0].value,
		industry: company?.industry?.trim() ?? "",
	};
	if (!company) return base;
	return {
		...base,
		legalName: company.legalName,
		companyType: company.companyType,
		officeType: company.officeType,
		sameAsCorpAdmin: company.sameAsCorpAdmin,
		planId: company.planId ?? "",
		firstName: company.firstName ?? "",
		lastName: company.lastName ?? "",
		nickname: company.nickname ?? "",
		jobRole: company.jobRole ?? "",
		email: company.email,
		workPhone: company.workPhone ?? "",
		cellPhone: company.cellPhone ?? "",
		addressLine: company.addressLine,
		state: company.state,
		city: company.city,
		country: company.country,
		zip: company.zip,
		securityPosture: company.securityPosture ?? "Standard",
		phoneNo: company.phoneNo ?? "",
	};
}

/**
 * Create a corporation (Basic Info step).
 * POST /corporations
 */
export async function createCorporation(body: CreateCorporationBody) {
	const result = await apiClient.post<ApiSuccessResponse<CorporationCreated>>(
		API_ENDPOINTS.corporations.root,
		body,
	);
	if (isApiError(result)) return result;
	return result;
}

/**
 * List companies for a corporation with optional search and filters.
 * GET /corporations/:corporationId/companies?search=...&companyType=...&region=...&planTypeId=...
 */
export async function getCorporationCompanies(
	corporationId: string,
	params?: ListCompanyParams,
) {
	const search = new URLSearchParams();
	if (params?.search?.trim()) search.set("search", params.search.trim());
	if (params?.companyType?.trim())
		search.set("companyType", params.companyType.trim());
	if (params?.region?.trim()) search.set("region", params.region.trim());
	if (params?.planTypeId?.trim())
		search.set("planTypeId", params.planTypeId.trim());
	const query = search.toString();
	const url = `${API_ENDPOINTS.corporations.companies(corporationId)}${
		query ? `?${query}` : ""
	}`;
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: { items: CompanyListItem[] };
	}>(url);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return {
		ok: true as const,
		data: { items: data.items },
	};
}

/**
 * Create a company under a corporation (Company Info step).
 * POST /corporations/:corporationId/companies
 */
export async function createCompany(
	corporationId: string,
	body: CreateCompanyBody,
) {
	const result = await apiClient.post<ApiSuccessResponse<{ id: string }>>(
		API_ENDPOINTS.corporations.companies(corporationId),
		body,
	);
	if (isApiError(result)) return result;
	return result;
}

/**
 * Update a corporation (Basic Info step – edit when user returns to step).
 * PATCH /corporations/:corporationId
 */
export async function updateCorporation(
	corporationId: string,
	body: Partial<CreateCorporationBody>,
) {
	const result = await apiClient.patch<ApiSuccessResponse<CorporationDetail>>(
		API_ENDPOINTS.corporations.byId(corporationId),
		body,
	);
	if (isApiError(result)) return result;
	return result;
}

/**
 * Update a company under a corporation (Company Info step – edit when user returns).
 * PATCH /corporations/:corporationId/companies/:companyId
 */
export async function updateCompany(
	corporationId: string,
	companyId: string,
	body: Partial<CreateCompanyBody>,
) {
	const result = await apiClient.patch<
		ApiSuccessResponse<CorporationDetailCompany>
	>(API_ENDPOINTS.corporations.companyById(corporationId, companyId), body);
	if (isApiError(result)) return result;
	return result;
}

/**
 * Delete a company under a corporation.
 * DELETE /corporations/:corporationId/companies/:companyId
 */
export async function deleteCompany(corporationId: string, companyId: string) {
	const result = await apiClient.delete<ApiSuccessResponse<unknown>>(
		API_ENDPOINTS.corporations.companyById(corporationId, companyId),
	);
	if (isApiError(result)) return result;
	return result;
}

/**
 * Submit a corporation setup step by type (e.g. company, confirmation).
 * PATCH /corporations/:corporationId/steps
 */
export async function submitCorporationStep(
	corporationId: string,
	type: CorporationStepType,
) {
	const result = await apiClient.patch<
		ApiSuccessResponse<CorporationStepsUpdated>
	>(API_ENDPOINTS.corporations.steps(corporationId), { type });
	if (isApiError(result)) return result;
	return result;
}

/**
 * Upload corporation brand logo.
 * PATCH /corporations/:corporationId/brand-logo (multipart/form-data, field: logo)
 * Uses apiClient; FormData triggers interceptor to omit Content-Type so browser sets multipart boundary.
 */
export async function uploadBrandLogo(
	corporationId: string,
	file: File,
): Promise<
	| ApiResponse<{
			success: boolean;
			message: string;
			data: { brandLogo: string };
	  }>
	| ApiError
> {
	const formData = new FormData();
	formData.append("logo", file);
	const result = await apiClient.patch<{
		success: boolean;
		message: string;
		data: { brandLogo: string };
	}>(API_ENDPOINTS.corporations.brandLogo(corporationId), formData);
	if (isApiError(result)) return result;
	return result;
}

/**
 * Delete corporation brand logo.
 * DELETE /corporations/:corporationId/brand-logo
 */
export async function deleteBrandLogo(corporationId: string) {
	const result = await apiClient.delete<
		ApiSuccessResponse<Record<string, unknown>>
	>(API_ENDPOINTS.corporations.brandLogo(corporationId));
	if (isApiError(result)) return result;
	return result;
}

/**
 * Update corporation status (suspend or close).
 * PATCH /corporations/:corporationId/status
 */
export async function updateCorporationStatus(
	corporationId: string,
	body: UpdateCorporationStatusBody,
) {
	const result = await apiClient.patch<ApiSuccessResponse<CorporationDetail>>(
		API_ENDPOINTS.corporations.status(corporationId),
		body,
	);
	if (isApiError(result)) return result;
	return result;
}

/**
 * Reinstate a suspended corporation.
 * POST /corporations/:corporationId/reinstate (empty body)
 */
export async function reinstateCorporation(corporationId: string) {
	const result = await apiClient.post<
		| ApiSuccessResponse<CorporationDetail>
		| { success: boolean; message: string }
	>(API_ENDPOINTS.corporations.reinstate(corporationId), {});
	if (isApiError(result)) return result;
	return result;
}

/**
 * Update corporation key contact (Step 4 – Compliance Contact).
 * PATCH /corporations/:corporationId/key-contact
 */
export async function updateKeyContact(
	corporationId: string,
	body: UpdateKeyContactBody,
) {
	const result = await apiClient.patch<
		ApiSuccessResponse<UpdateKeyContactResponse>
	>(API_ENDPOINTS.corporations.keyContact(corporationId), body);
	if (isApiError(result)) return result;
	return result;
}
