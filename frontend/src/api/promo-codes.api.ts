import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib";
import type {
	AvailablePromoCodesForSetupQuery,
	CreatePromoCodePayload,
	ListPromoCodesQuery,
	ListPromoCodeUsageQuery,
	PromoApiEnvelope,
	PromoCodeCreatedData,
	PromoCodeDetailData,
	PromoCodeListItemData,
	PromoCodesAvailableForCompanySetupData,
	PromoCodesListData,
	PromoCodeUsageListData,
	PromoCodeValidatedData,
	UpdatePromoCodePayload,
} from "@/types";

function appendPromoUsageQueryParams(
	search: URLSearchParams,
	query: ListPromoCodeUsageQuery,
): void {
	if (query.page != null) search.set("page", String(query.page));
	if (query.pageSize != null) search.set("pageSize", String(query.pageSize));
	if (query.search != null && query.search !== "")
		search.set("search", query.search);
	if (query.outcome != null && query.outcome !== "all")
		search.set("outcome", query.outcome);
	if (query.corporationId != null && query.corporationId !== "")
		search.set("corporationId", query.corporationId);
	if (query.companyId != null && query.companyId !== "")
		search.set("companyId", query.companyId);
	if (query.time != null && query.time !== "all")
		search.set("time", query.time);
	if (query.sortBy != null) search.set("sortBy", query.sortBy);
	if (query.sortOrder != null) search.set("sortOrder", query.sortOrder);
}

function appendPromoListQueryParams(
	search: URLSearchParams,
	query: ListPromoCodesQuery,
): void {
	if (query.page != null) search.set("page", String(query.page));
	if (query.limit != null) search.set("limit", String(query.limit));
	if (query.sortBy != null) search.set("sortBy", query.sortBy);
	if (query.sortOrder != null) search.set("sortOrder", query.sortOrder);
	if (query.search != null && query.search !== "")
		search.set("search", query.search);
	if (query.planTypeId != null && query.planTypeId !== "")
		search.set("planTypeId", query.planTypeId);
	if (query.discountType != null)
		search.set("discountType", query.discountType);
	if (query.createdAfter != null && query.createdAfter !== "")
		search.set("createdAfter", query.createdAfter);
	if (query.status != null) search.set("status", query.status);
}

function appendAvailablePromoSetupQueryParams(
	search: URLSearchParams,
	query: AvailablePromoCodesForSetupQuery,
): void {
	if (query.planTypeId != null && query.planTypeId !== "")
		search.set("planTypeId", query.planTypeId);
	if (query.corporationId != null && query.corporationId !== "")
		search.set("corporationId", query.corporationId);
}

/**
 * POST /promo-codes — Super Admin only.
 */
export async function postCreatePromoCode(payload: CreatePromoCodePayload) {
	const result = await apiClient.post<PromoApiEnvelope<PromoCodeCreatedData>>(
		API_ENDPOINTS.promoCodes.root,
		payload,
	);
	if (isApiError(result)) return result;
	const envelope = result.data;
	if (!envelope?.success || !envelope.data) {
		return {
			ok: false as const,
			message: envelope?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: envelope.data, message: envelope.message };
}

/** POST /promo-codes/validate — validate create payload without Stripe coupon / DB row. */
export async function postValidatePromoCodeCreate(
	payload: CreatePromoCodePayload,
) {
	const result = await apiClient.post<PromoApiEnvelope<PromoCodeValidatedData>>(
		API_ENDPOINTS.promoCodes.validate,
		payload,
	);
	if (isApiError(result)) return result;
	const envelope = result.data;
	if (!envelope?.success || !envelope.data) {
		return {
			ok: false as const,
			message: envelope?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: envelope.data, message: envelope.message };
}

/** POST /promo-codes/:id/validate — validate merged update without persisting. */
export async function postValidatePromoCodeUpdate(
	id: string,
	payload: UpdatePromoCodePayload,
) {
	const result = await apiClient.post<PromoApiEnvelope<PromoCodeValidatedData>>(
		API_ENDPOINTS.promoCodes.validateUpdateById(id),
		payload,
	);
	if (isApiError(result)) return result;
	const envelope = result.data;
	if (!envelope?.success || !envelope.data) {
		return {
			ok: false as const,
			message: envelope?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: envelope.data, message: envelope.message };
}

/** GET /promo-codes — paginated list for management home. */
export async function getPromoCodesList(query: ListPromoCodesQuery = {}) {
	const search = new URLSearchParams();
	appendPromoListQueryParams(search, query);
	const qs = search.toString();
	const url = qs
		? `${API_ENDPOINTS.promoCodes.root}?${qs}`
		: API_ENDPOINTS.promoCodes.root;
	const result = await apiClient.get<PromoApiEnvelope<PromoCodesListData>>(url);
	if (isApiError(result)) return result;
	const envelope = result.data;
	if (!envelope?.success || !envelope.data) {
		return {
			ok: false as const,
			message: envelope?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: envelope.data, message: envelope.message };
}

/** GET /promo-codes/available-for-company-setup — Super Admin; Plan & Seats dropdown. */
export async function getPromoCodesAvailableForCompanySetup(
	query: AvailablePromoCodesForSetupQuery = {},
) {
	const search = new URLSearchParams();
	appendAvailablePromoSetupQueryParams(search, query);
	const qs = search.toString();
	const url = qs
		? `${API_ENDPOINTS.promoCodes.availableForCompanySetup}?${qs}`
		: API_ENDPOINTS.promoCodes.availableForCompanySetup;
	const result =
		await apiClient.get<
			PromoApiEnvelope<PromoCodesAvailableForCompanySetupData>
		>(url);
	if (isApiError(result)) return result;
	const envelope = result.data;
	if (!envelope?.success || !envelope.data) {
		return {
			ok: false as const,
			message: envelope?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: envelope.data, message: envelope.message };
}

/**
 * Fetches all pages matching `base` (same filters as the table) for CSV export.
 * Stops at `maxRows` to bound work when many promos exist.
 */
export async function getPromoCodesListAllMatching(
	base: Omit<ListPromoCodesQuery, "page" | "limit">,
	opts?: { maxRows?: number },
): Promise<
	| { ok: true; data: { items: PromoCodeListItemData[] } }
	| { ok: false; message: string; status: number }
> {
	const maxRows = opts?.maxRows ?? 5000;
	const limit = 100;
	const items: PromoCodeListItemData[] = [];
	let page = 1;
	for (;;) {
		const res = await getPromoCodesList({ ...base, page, limit });
		if (!res.ok) return res;
		items.push(...res.data.items);
		if (items.length >= maxRows) break;
		if (res.data.items.length < limit || page >= res.data.pagination.totalPages)
			break;
		page += 1;
	}
	return { ok: true, data: { items } };
}

/** GET /promo-codes/:id — detail for view screen. */
export async function getPromoCodeById(id: string) {
	const result = await apiClient.get<PromoApiEnvelope<PromoCodeDetailData>>(
		API_ENDPOINTS.promoCodes.byId(id),
	);
	if (isApiError(result)) return result;
	const envelope = result.data;
	if (!envelope?.success || !envelope.data) {
		return {
			ok: false as const,
			message: envelope?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: envelope.data, message: envelope.message };
}

/** GET /promo-codes/:id/usage — paginated usage history for the detail screen. */
export async function getPromoCodeUsageList(
	promoCodeId: string,
	query: ListPromoCodeUsageQuery = {},
) {
	const search = new URLSearchParams();
	appendPromoUsageQueryParams(search, query);
	const qs = search.toString();
	const url = qs
		? `${API_ENDPOINTS.promoCodes.usageById(promoCodeId)}?${qs}`
		: API_ENDPOINTS.promoCodes.usageById(promoCodeId);
	const result =
		await apiClient.get<PromoApiEnvelope<PromoCodeUsageListData>>(url);
	if (isApiError(result)) return result;
	const envelope = result.data;
	if (!envelope?.success || !envelope.data) {
		return {
			ok: false as const,
			message: envelope?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: envelope.data, message: envelope.message };
}

/** PATCH /promo-codes/:id/promotion-active — enable/disable Stripe promotion code. */
export async function patchPromoCodePromotionActive(
	id: string,
	active: boolean,
) {
	const result = await apiClient.patch<PromoApiEnvelope<PromoCodeCreatedData>>(
		API_ENDPOINTS.promoCodes.promotionActiveById(id),
		{ active },
	);
	if (isApiError(result)) return result;
	const envelope = result.data;
	if (!envelope?.success || !envelope.data) {
		return {
			ok: false as const,
			message: envelope?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: envelope.data, message: envelope.message };
}

/** PATCH /promo-codes/:id — update fields (Super Admin). */
export async function patchUpdatePromoCode(
	id: string,
	payload: UpdatePromoCodePayload,
) {
	const result = await apiClient.patch<PromoApiEnvelope<PromoCodeCreatedData>>(
		API_ENDPOINTS.promoCodes.byId(id),
		payload,
	);
	if (isApiError(result)) return result;
	const envelope = result.data;
	if (!envelope?.success || !envelope.data) {
		return {
			ok: false as const,
			message: envelope?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: envelope.data, message: envelope.message };
}

/** DELETE /promo-codes/:id — soft-delete (Stripe + deletedAt). */
export async function deletePromoCode(id: string) {
	const result = await apiClient.delete<PromoApiEnvelope<PromoCodeCreatedData>>(
		API_ENDPOINTS.promoCodes.byId(id),
	);
	if (isApiError(result)) return result;
	const envelope = result.data;
	if (!envelope?.success || !envelope.data) {
		return {
			ok: false as const,
			message: envelope?.message ?? "Invalid response",
			status: result.status,
		};
	}
	return { ok: true as const, data: envelope.data, message: envelope.message };
}
