import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib/apiClient";
import type { AddCompanyConfigurationSchemaType } from "@/schemas";
import type { ApiSuccessResponse } from "@/types";
import type { CompanyDirectoryItem } from "@/types/companies/company.types";
import type {
	CompanyBasicInfoPatchPayload,
	CompanyBasicInfoPostPayload,
	CompanyDetailData,
	CompanyDirectoryListData,
	CompanyDirectoryListItem,
	CompanyFilterOptions,
	CompanyPlanSeatsPayload,
	KeyContactsPayload,
	ListCompaniesParams,
	SuspendCompanyPayload,
} from "@/types/companies/company-api.types";

/** Map API list item to table CompanyDirectoryItem type */
function mapListItemToCompanyDirectoryItem(
	item: CompanyDirectoryListItem,
): CompanyDirectoryItem {
	const status = item.status?.toLowerCase();
	const validStatuses: CompanyDirectoryItem["status"][] = [
		"active",
		"incomplete",
		"suspended",
		"closed",
	];
	const mappedStatus: CompanyDirectoryItem["status"] = validStatuses.includes(
		status as CompanyDirectoryItem["status"],
	)
		? (status as CompanyDirectoryItem["status"])
		: "incomplete";

	// Map plan to string format
	const planName = item.plan?.name ?? "";
	const planTypeId = item.plan?.planTypeId ?? "";
	const planDisplay = planName && planTypeId ? `${planName} ${planTypeId}` : "";

	return {
		id: item.id,
		companyId: item.companyId,
		companyName: item.name,
		region: item.location ?? "",
		status: mappedStatus,
		submittedSteps: item.submittedSteps,
		assignedCorporation: item.assignedCorporation
			? {
					name: item.assignedCorporation.name,
					corporationCode: item.assignedCorporation.corporationCode,
				}
			: null,
		plan: planDisplay,
		planName,
		planTypeId,
		createdOn: item.createdAt,
		lastUpdatedOn: item.updatedAt,
	};
}

/**
 * Fetch company directory list with pagination, sorting, and filters.
 * GET /companies?page=1&limit=10&sortBy=createdAt&sortOrder=desc&createdFilter=last30Days&status=all&corporationId=...&planId=...&planTypeId=...
 */
export async function getCompanies(params: ListCompaniesParams) {
	const {
		page,
		limit,
		sortBy,
		sortOrder,
		createdFilter,
		status,
		corporationId,
		planId,
		planTypeId,
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
	if (corporationId) search.set("corporationId", corporationId);
	if (planId) search.set("planId", planId);
	if (planTypeId) search.set("planTypeId", planTypeId);
	if (searchQuery?.trim()) search.set("search", searchQuery.trim());
	const url = `${API_ENDPOINTS.companies.root}?${search.toString()}`;
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: CompanyDirectoryListData;
	}>(url);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return {
		ok: true as const,
		data: {
			items: data.items.map(mapListItemToCompanyDirectoryItem),
			total: data.pagination.total,
			page: data.pagination.page,
			limit: data.pagination.pageSize,
			totalPages: data.pagination.totalPages,
		},
	};
}

/**
 * Create company (Add Company flow – basic info step).
 * POST /corporations/:corporationId/companies/companynew
 */
export async function createCompanyNew(
	corporationId: string,
	body: CompanyBasicInfoPostPayload,
) {
	const url = API_ENDPOINTS.corporations.createCompanyNew(corporationId);
	const result = await apiClient.post<ApiSuccessResponse<CompanyDetailData>>(
		url,
		body,
	);
	if (isApiError(result)) return result;
	return result;
}

/**
 * Fetch company by id (Add Company flow – prefill when editing).
 * GET /corporations/companies/:companyId
 */
export async function getCompanyById(companyId: string) {
	const url = API_ENDPOINTS.corporations.companyByCompanyId(companyId);
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: CompanyDetailData;
	}>(url);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}

/**
 * Update company basic info (Add Company wizard step 1).
 * PATCH /corporations/companies/:companyId
 */
export async function patchCompanyBasicInfo(
	companyId: string,
	body: CompanyBasicInfoPatchPayload,
) {
	const url = API_ENDPOINTS.corporations.companyByCompanyId(companyId);
	const result = await apiClient.patch<ApiSuccessResponse<CompanyDetailData>>(
		url,
		body,
	);
	if (isApiError(result)) return result;
	return result;
}

/**
 * Submit key contacts for a company.
 * POST /corporations/companies/:companyId/key-contacts
 */
export async function postKeyContacts(
	companyId: string,
	body: KeyContactsPayload,
) {
	const url = API_ENDPOINTS.corporations.keyContacts(companyId);
	const result = await apiClient.post<{ success: boolean; message: string }>(
		url,
		body,
	);
	if (isApiError(result)) return result;
	return result;
}

/**
 * Save plan & seats for a company (active tab submission).
 * PUT /corporations/companies/:companyId/plan-seats
 */
export async function putCompanyPlanSeats(
	companyId: string,
	body: CompanyPlanSeatsPayload,
) {
	const url = API_ENDPOINTS.corporations.planSeats(companyId);
	const result = await apiClient.put<{ success: boolean; message: string }>(
		url,
		body,
	);
	if (isApiError(result)) return result;
	return result;
}

/**
 * Build multipart body for company configuration (keys match API: authMethod, passwordPolicy, mfa, …, logo).
 */
export function buildCompanyConfigurationFormData(
	values: AddCompanyConfigurationSchemaType,
): FormData {
	const formData = new FormData();
	formData.append("authMethod", values.authMethod);
	formData.append("passwordPolicy", values.passwordPolicy);
	formData.append("mfa", values.mfa);
	formData.append("sessionTimeout", values.sessionTimeout);
	formData.append("securityPosture", values.securityPosture);
	formData.append("primaryLanguage", values.primaryLanguage);
	if (values.logo instanceof File) {
		formData.append("logo", values.logo);
	}
	return formData;
}

/**
 * Save company configuration (security & branding defaults).
 * PUT /corporations/companies/:companyId/configuration (multipart/form-data)
 */
export async function putCompanyConfiguration(
	companyId: string,
	values: AddCompanyConfigurationSchemaType,
) {
	const url = API_ENDPOINTS.corporations.companyConfiguration(companyId);
	const formData = buildCompanyConfigurationFormData(values);
	const result = await apiClient.put<{ success: boolean; message: string }>(
		url,
		formData,
	);
	if (isApiError(result)) return result;
	return result;
}

/**
 * Delete company brand logo.
 * DELETE /corporations/companies/:companyId/brand-logo
 */
export async function deleteCompanyBrandLogo(companyId: string) {
	const result = await apiClient.delete<
		ApiSuccessResponse<Record<string, unknown>>
	>(API_ENDPOINTS.corporations.companyBrandLogo(companyId));
	if (isApiError(result)) return result;
	return result;
}

/**
 * Complete add-company wizard (confirmation step).
 * POST /corporations/companies/:companyId/confirmation
 */
export async function postCompanyConfirmation(companyId: string) {
	const result = await apiClient.post<{ success: boolean; message: string }>(
		API_ENDPOINTS.corporations.companyConfirmation(companyId),
		{},
	);
	if (isApiError(result)) return result;
	return result;
}

/**
 * Suspend a company.
 * POST /corporations/companies/:companyId/suspend
 */
export async function suspendCompany(
	companyId: string,
	body: SuspendCompanyPayload,
) {
	const result = await apiClient.post<
		| ApiSuccessResponse<CompanyDetailData>
		| { success: boolean; message: string }
	>(API_ENDPOINTS.corporations.companySuspend(companyId), body);
	if (isApiError(result)) return result;
	return result;
}

/**
 * Reinstate a suspended company.
 * POST /corporations/companies/:companyId/reinstate (empty body)
 */
export async function reinstateCompany(companyId: string) {
	const result = await apiClient.post<
		| ApiSuccessResponse<CompanyDetailData>
		| { success: boolean; message: string }
	>(API_ENDPOINTS.corporations.companyReinstate(companyId), {});
	if (isApiError(result)) return result;
	return result;
}

/**
 * Fetch company directory filter options (status, corporation, plan).
 * GET /companies/filter-options
 */
export async function getCompanyFilterOptions() {
	const url = API_ENDPOINTS.companies.filterOptions;
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: CompanyFilterOptions;
	}>(url);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}
