import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib/apiClient";
import type {
	BillingApiEnvelope,
	BillingApiItem,
	BillingHistoryListApiData,
	BillingHistoryListResult,
	BillingListApiData,
	BillingListRecordsResult,
	BillingManagementRow,
	BillingMutationResult,
	BillingPlanOption,
	BillingPlanOptionsResult,
	BillingRecordResult,
	BillingUpgradeApplyData,
	BillingUpgradeApplyResult,
	BillingUpgradeOptionsData,
	BillingUpgradeOptionsResult,
	BillingUpgradePreviewData,
	BillingUpgradePreviewResult,
	CancelBillingSubscriptionPayload,
	ListBillingHistoryParams,
	ListBillingRecordsParams,
} from "@/types";

function toRow(item: BillingApiItem): BillingManagementRow {
	return { ...item, id: item.companyId };
}

let billingPlanOptionsInflight: Promise<BillingPlanOptionsResult> | null = null;

export async function fetchBillingRecords(
	params: ListBillingRecordsParams,
): Promise<BillingListRecordsResult> {
	const searchParams = new URLSearchParams();
	searchParams.set("page", String(params.page));
	searchParams.set("limit", String(params.limit));
	if (params.planTypeId) searchParams.set("planTypeId", params.planTypeId);
	if (params.subscriptionStatus && params.subscriptionStatus !== "all") {
		searchParams.set("subscriptionStatus", params.subscriptionStatus);
	}
	if (params.paymentStatus && params.paymentStatus !== "all") {
		searchParams.set("paymentStatus", params.paymentStatus);
	}
	if (params.search?.trim()) {
		searchParams.set("search", params.search.trim());
	}
	if (params.billingCycles?.length) {
		searchParams.set("billingCycles", params.billingCycles.join(","));
	}
	if (params.paymentTypes?.length) {
		searchParams.set("paymentTypes", params.paymentTypes.join(","));
	}
	if (params.timePeriod) {
		searchParams.set("timePeriod", params.timePeriod);
	}
	if (params.sortBy) {
		searchParams.set("sortBy", params.sortBy);
	}
	if (params.sortOrder) {
		searchParams.set("sortOrder", params.sortOrder);
	}
	const qs = searchParams.toString();
	const path = `${API_ENDPOINTS.finance.billing}${qs ? `?${qs}` : ""}`;
	const result =
		await apiClient.get<BillingApiEnvelope<BillingListApiData>>(path);
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
	const mapped = {
		...inner,
		items: inner.items.map((item) => toRow(item as BillingApiItem)),
	};
	return { ok: true, data: mapped, status: result.status };
}

export async function fetchBillingPlanOptions(): Promise<BillingPlanOptionsResult> {
	if (!billingPlanOptionsInflight) {
		billingPlanOptionsInflight =
			(async (): Promise<BillingPlanOptionsResult> => {
				const result = await apiClient.get<
					BillingApiEnvelope<BillingPlanOption[]>
				>(API_ENDPOINTS.finance.billingPlanOptions);
				if (isApiError(result)) {
					billingPlanOptionsInflight = null;
					return {
						ok: false,
						message: result.message,
						status: result.status,
					};
				}
				const inner = result.data.data;
				if (inner === undefined) {
					billingPlanOptionsInflight = null;
					return {
						ok: false,
						message: "Invalid response from server",
						status: result.status,
					};
				}
				return { ok: true, data: inner, status: result.status };
			})();
	}

	return billingPlanOptionsInflight;
}

export async function fetchBillingHistory(
	companyId: string,
	params: ListBillingHistoryParams,
): Promise<BillingHistoryListResult> {
	const searchParams = new URLSearchParams();
	searchParams.set("page", String(params.page));
	searchParams.set("limit", String(params.limit));
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
	const path = `${API_ENDPOINTS.finance.billingCompanyHistory(companyId)}${qs ? `?${qs}` : ""}`;
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

export async function fetchBillingRecord(
	companyId: string,
): Promise<BillingRecordResult> {
	const path = API_ENDPOINTS.finance.billingCompany(companyId);
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

export async function cancelBillingSubscription(
	companyId: string,
	payload: CancelBillingSubscriptionPayload,
): Promise<BillingMutationResult> {
	const path = API_ENDPOINTS.finance.billingCancelSubscription(companyId);
	const result = await apiClient.post<BillingApiEnvelope<{ ok: true }>>(path, {
		reason: payload.reason,
		additionalNotes: payload.additionalNotes,
	});
	if (isApiError(result)) {
		return { ok: false, message: result.message, status: result.status };
	}
	return { ok: true, status: result.status };
}

export async function retryBillingPayment(
	companyId: string,
): Promise<BillingMutationResult> {
	const path = API_ENDPOINTS.finance.billingRetryPayment(companyId);
	const result = await apiClient.post<BillingApiEnvelope<{ ok: true }>>(
		path,
		{},
	);
	if (isApiError(result)) {
		return { ok: false, message: result.message, status: result.status };
	}
	return { ok: true, status: result.status };
}

export async function reinstateBillingSubscription(
	companyId: string,
): Promise<BillingMutationResult> {
	const path = API_ENDPOINTS.finance.billingReinstateSubscription(companyId);
	const result = await apiClient.post<BillingApiEnvelope<{ ok: true }>>(
		path,
		{},
	);
	if (isApiError(result)) {
		return { ok: false, message: result.message, status: result.status };
	}
	return { ok: true, status: result.status };
}

export async function fetchBillingUpgradeOptions(
	companyId: string,
): Promise<BillingUpgradeOptionsResult> {
	const path = API_ENDPOINTS.finance.billingUpgradeOptions(companyId);
	const result =
		await apiClient.get<BillingApiEnvelope<BillingUpgradeOptionsData>>(path);
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

export async function previewBillingUpgrade(
	companyId: string,
	targetPricingPlanId: string,
): Promise<BillingUpgradePreviewResult> {
	const path = API_ENDPOINTS.finance.billingUpgradePreview(companyId);
	const result = await apiClient.post<
		BillingApiEnvelope<BillingUpgradePreviewData>
	>(path, { targetPricingPlanId });
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

export async function applyBillingUpgrade(
	companyId: string,
	targetPricingPlanId: string,
): Promise<BillingUpgradeApplyResult> {
	const path = API_ENDPOINTS.finance.billingUpgrade(companyId);
	const result = await apiClient.post<
		BillingApiEnvelope<BillingUpgradeApplyData>
	>(path, { targetPricingPlanId });
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
