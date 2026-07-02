import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib/apiClient";
import type {
	BulkUploadKeyContactsResult,
	ContactDirectoryItem,
	CreateKeyContactPayload,
	KeyContactBulkImportData,
	KeyContactDetails,
	KeyContactsListApiData,
	ListKeyContactsParams,
	PatchKeyContactPayload,
	SendKeyContactInvitePayload,
} from "@/types";

function appendCsvParam(
	search: URLSearchParams,
	key: string,
	values: string[] | undefined,
) {
	if (values && values.length > 0) {
		search.set(key, values.join(","));
	}
}

/**
 * Paginated key contacts (directory contacts tab).
 * GET /key-contacts?page=&limit=&search=&contactType=&corporationIds=&companyIds=&timezones=&sortBy=&sortOrder=
 */
export async function getKeyContacts(params: ListKeyContactsParams) {
	const {
		page,
		limit,
		sortBy,
		sortOrder,
		search: searchQuery,
		contactType,
		corporationIds,
		companyIds,
		timezones,
	} = params;
	const search = new URLSearchParams({
		page: String(page),
		limit: String(limit),
	});
	if (sortBy) search.set("sortBy", sortBy);
	if (sortOrder) search.set("sortOrder", sortOrder);
	if (searchQuery?.trim()) search.set("search", searchQuery.trim());
	if (contactType?.trim()) search.set("contactType", contactType.trim());
	appendCsvParam(search, "corporationIds", corporationIds);
	appendCsvParam(search, "companyIds", companyIds);
	appendCsvParam(search, "timezones", timezones);
	const url = `${API_ENDPOINTS.keyContacts.root}?${search.toString()}`;
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: KeyContactsListApiData;
	}>(url);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	const items: ContactDirectoryItem[] = data.items;
	return {
		ok: true as const,
		data: {
			items,
			total: data.pagination.total,
			page: data.pagination.page,
			limit: data.pagination.pageSize,
			totalPages: data.pagination.totalPages,
		},
	};
}

/**
 * Create standalone directory key contact (no invitation).
 * POST /key-contacts
 */
export async function createKeyContact(payload: CreateKeyContactPayload) {
	const url = API_ENDPOINTS.keyContacts.root;
	const result = await apiClient.post<{
		success: boolean;
		message: string;
	}>(url, payload);
	if (isApiError(result)) return result;
	const resBody = result.data;
	if (!resBody?.success) {
		return {
			ok: false as const,
			message: resBody?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return {
		ok: true as const,
		message: typeof resBody.message === "string" ? resBody.message : "",
	};
}

/**
 * Single key contact for directory detail view.
 * GET /key-contacts/:id
 */
export async function getKeyContactById(contactId: string) {
	const url = API_ENDPOINTS.keyContacts.byId(contactId);
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: KeyContactDetails;
	}>(url);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}

/**
 * Update key contact fields.
 * PATCH /key-contacts/:id
 */
export async function patchKeyContact(
	contactId: string,
	payload: PatchKeyContactPayload,
) {
	const url = API_ENDPOINTS.keyContacts.byId(contactId);
	const result = await apiClient.patch<{
		success: boolean;
		message: string;
	}>(url, payload);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const };
}

/**
 * Invite key contact as app user (Super Admin).
 * POST /key-contacts/:id/invite — body `{ roleId }` only.
 */
export async function sendKeyContactInvite(
	contactId: string,
	payload: SendKeyContactInvitePayload,
) {
	const url = API_ENDPOINTS.keyContacts.invite(contactId);
	const result = await apiClient.post<{
		success: boolean;
		message: string;
	}>(url, payload);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return {
		ok: true as const,
		message: typeof body.message === "string" ? body.message : "",
	};
}

/**
 * Soft-delete standalone directory key contact (Super Admin).
 * DELETE /key-contacts/:id — no body.
 */
export async function deleteKeyContact(contactId: string) {
	const url = API_ENDPOINTS.keyContacts.byId(contactId);
	const result = await apiClient.delete<{
		success: boolean;
		message: string;
	}>(url);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return {
		ok: true as const,
		message: typeof body.message === "string" ? body.message : "",
	};
}

/**
 * Bulk import key contacts from CSV.
 * POST /key-contacts/bulk — multipart/form-data, field name `file` (Postman: contacts → bulk upload).
 */
export async function bulkUploadKeyContacts(
	file: File,
): Promise<BulkUploadKeyContactsResult> {
	const formData = new FormData();
	formData.append("file", file);
	const url = API_ENDPOINTS.keyContacts.bulk;
	const result = await apiClient.post<{
		success: boolean;
		message: string;
		data?: KeyContactBulkImportData;
	}>(url, formData);
	if (isApiError(result)) return result;
	const body = result.data;
	if (!body?.success) {
		return {
			ok: false as const,
			message: body?.message ?? "Invalid response",
			status: result.status,
		};
	}
	const raw = body.data;
	const data: KeyContactBulkImportData = {
		createdCount: typeof raw?.createdCount === "number" ? raw.createdCount : 0,
		createdIds: Array.isArray(raw?.createdIds) ? raw.createdIds : [],
		failed: Array.isArray(raw?.failed) ? raw.failed : [],
	};
	return {
		ok: true as const,
		message: typeof body.message === "string" ? body.message : "",
		data,
	};
}
