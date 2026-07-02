import axios from "axios";
import { API_ENDPOINTS } from "@/const";
import { apiClient, axiosInstance, isApiError } from "@/lib/apiClient";
import type {
	BillingApiEnvelope,
	BillingApiItem,
	BillingHistoryListApiData,
	BillingManagementRow,
	BillingMutationResult,
	CancelBillingSubscriptionPayload,
	CompanyAdminBillingHistoryResult,
	CompanyAdminBillingRecordResult,
	CompanyAdminBillingScope,
	ListCompanyAdminBillingHistoryParams,
} from "@/types";

function scopeQuery(companyId?: string): string {
	if (!companyId?.trim()) {
		return "";
	}
	return `?companyId=${encodeURIComponent(companyId.trim())}`;
}

function appendScopeToSearch(
	searchParams: URLSearchParams,
	companyId?: string,
): void {
	if (companyId?.trim()) {
		searchParams.set("companyId", companyId.trim());
	}
}

function toRow(item: BillingApiItem): BillingManagementRow {
	return { ...item, id: item.companyId };
}

export async function fetchCompanyAdminBilling(
	scope: CompanyAdminBillingScope = {},
): Promise<CompanyAdminBillingRecordResult> {
	const path = `${API_ENDPOINTS.companyAdmin.billing}${scopeQuery(scope.companyId)}`;
	const result = await apiClient.get<BillingApiEnvelope<BillingApiItem>>(path);
	if (isApiError(result)) {
		return { ok: false, message: result.message, status: result.status };
	}
	const inner = result.data.data;
	if (inner === undefined) {
		return {
			ok: false,
			message: "Invalid response from server",
			status: result.status,
		};
	}
	return {
		ok: true,
		data: toRow(inner as BillingApiItem),
		status: result.status,
	};
}

export async function fetchCompanyAdminBillingHistory(
	params: ListCompanyAdminBillingHistoryParams,
): Promise<CompanyAdminBillingHistoryResult> {
	const searchParams = new URLSearchParams();
	searchParams.set("page", String(params.page));
	searchParams.set("limit", String(params.limit));
	appendScopeToSearch(searchParams, params.companyId);
	if (params.eventType && params.eventType !== "all") {
		searchParams.set("eventType", params.eventType);
	}
	if (params.planTypeId) {
		searchParams.set("planTypeId", params.planTypeId);
	}
	if (params.actorKind && params.actorKind !== "all") {
		searchParams.set("actorKind", params.actorKind);
	}
	if (params.sortBy) {
		searchParams.set("sortBy", params.sortBy);
	}
	if (params.sortOrder) {
		searchParams.set("sortOrder", params.sortOrder);
	}
	const qs = searchParams.toString();
	const path = `${API_ENDPOINTS.companyAdmin.billingHistory}${qs ? `?${qs}` : ""}`;
	const result =
		await apiClient.get<BillingApiEnvelope<BillingHistoryListApiData>>(path);
	if (isApiError(result)) {
		return { ok: false, message: result.message, status: result.status };
	}
	const inner = result.data.data;
	if (inner === undefined) {
		return {
			ok: false,
			message: "Invalid response from server",
			status: result.status,
		};
	}
	return { ok: true, data: inner, status: result.status };
}

export async function cancelCompanyAdminSubscription(
	scope: CompanyAdminBillingScope,
	payload: CancelBillingSubscriptionPayload,
): Promise<BillingMutationResult> {
	const path = `${API_ENDPOINTS.companyAdmin.billingCancelSubscription}${scopeQuery(scope.companyId)}`;
	const result = await apiClient.post<BillingApiEnvelope<{ ok: true }>>(path, {
		reason: payload.reason,
		additionalNotes: payload.additionalNotes,
	});
	if (isApiError(result)) {
		return { ok: false, message: result.message, status: result.status };
	}
	return { ok: true, status: result.status };
}

export async function retryCompanyAdminPayment(
	scope: CompanyAdminBillingScope,
): Promise<BillingMutationResult> {
	const path = `${API_ENDPOINTS.companyAdmin.billingRetryPayment}${scopeQuery(scope.companyId)}`;
	const result = await apiClient.post<BillingApiEnvelope<{ ok: true }>>(
		path,
		{},
	);
	if (isApiError(result)) {
		return { ok: false, message: result.message, status: result.status };
	}
	return { ok: true, status: result.status };
}

export async function requestCompanyAdminPlanChange(
	scope: CompanyAdminBillingScope,
): Promise<BillingMutationResult & { id?: string }> {
	const path = `${API_ENDPOINTS.companyAdmin.billingRequestPlanChange}${scopeQuery(scope.companyId)}`;
	const result = await apiClient.post<BillingApiEnvelope<{ id: string }>>(
		path,
		{},
	);
	if (isApiError(result)) {
		return { ok: false, message: result.message, status: result.status };
	}
	const id = result.data.data?.id;
	return { ok: true, status: result.status, ...(id ? { id } : {}) };
}

export async function reinstateCompanyAdminSubscription(
	scope: CompanyAdminBillingScope,
): Promise<BillingMutationResult> {
	const path = `${API_ENDPOINTS.companyAdmin.billingReinstateSubscription}${scopeQuery(scope.companyId)}`;
	const result = await apiClient.post<BillingApiEnvelope<{ ok: true }>>(
		path,
		{},
	);
	if (isApiError(result)) {
		return { ok: false, message: result.message, status: result.status };
	}
	return { ok: true, status: result.status };
}

export async function fetchCompanyAdminInvoicePdfBlob(
	invoiceId: string,
	scope: CompanyAdminBillingScope = {},
): Promise<
	{ ok: true; blob: Blob } | { ok: false; message: string; status: number }
> {
	const path = `${API_ENDPOINTS.companyAdmin.billingInvoicePdf(invoiceId)}${scopeQuery(scope.companyId)}`;
	try {
		const response = await axiosInstance.get<Blob>(path, {
			responseType: "blob",
		});
		const ct = String(response.headers["content-type"] ?? "");
		if (ct.includes("application/json")) {
			const text = await response.data.text();
			let msg = "Failed to load PDF";
			try {
				const j = JSON.parse(text) as { message?: string };
				if (j.message) msg = String(j.message);
			} catch {
				/* ignore */
			}
			return { ok: false, message: msg, status: response.status };
		}
		return { ok: true, blob: response.data };
	} catch (e) {
		if (axios.isAxiosError(e) && e.response?.data instanceof Blob) {
			const text = await e.response.data.text();
			let msg = "Failed to load PDF";
			try {
				const j = JSON.parse(text) as { message?: string };
				if (j.message) msg = String(j.message);
			} catch {
				/* ignore */
			}
			return { ok: false, message: msg, status: e.response.status };
		}
		if (axios.isAxiosError(e)) {
			return {
				ok: false,
				message: e.message ?? "Failed to load PDF",
				status: e.response?.status ?? 0,
			};
		}
		return { ok: false, message: "Failed to load PDF", status: 0 };
	}
}
