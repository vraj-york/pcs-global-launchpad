import { toast } from "sonner";
import { create } from "zustand";
import {
	cancelCompanyAdminSubscription,
	downloadInvoicePdfBlob,
	fetchCompanyAdminBilling,
	fetchCompanyAdminBillingHistory,
	fetchCompanyAdminInvoicePdfBlob,
	reinstateCompanyAdminSubscription,
	requestCompanyAdminPlanChange,
	retryCompanyAdminPayment,
} from "@/api";
import { BILLING_TOAST, COMPANY_ADMIN_BILLING_PAGE_CONTENT } from "@/const";
import type {
	CancelBillingSubscriptionPayload,
	CompanyAdminBillingStore,
} from "@/types";

const HISTORY_PAGE_SIZE = 100;

const initialState = {
	companyId: null as string | null,
	billingRow: null as CompanyAdminBillingStore["billingRow"],
	billingLoading: false,
	billingError: null as string | null,
	historyItems: [] as CompanyAdminBillingStore["historyItems"],
	historyTotalCount: 0,
	historyPageIndex: 0,
	historyLoading: false,
	historyError: null as string | null,
	invoiceDownloadBusyEventId: null as string | null,
	retryBusy: false,
	cancelBusy: false,
	reinstateBusy: false,
	changePlanBusy: false,
};

function refreshBillingAndHistory(get: () => CompanyAdminBillingStore): void {
	void get().fetchBilling();
	void get().fetchHistory();
}

export const useCompanyAdminBillingStore = create<CompanyAdminBillingStore>()(
	(set, get) => ({
		...initialState,

		setCompanyId: (companyId) =>
			set({
				companyId,
				billingRow: null,
				billingError: null,
				historyItems: [],
				historyTotalCount: 0,
				historyPageIndex: 0,
				historyError: null,
			}),

		setHistoryPageIndex: (historyPageIndex) => set({ historyPageIndex }),

		fetchBilling: async () => {
			const { companyId } = get();
			if (!companyId) {
				set({
					billingLoading: false,
					billingError: COMPANY_ADMIN_BILLING_PAGE_CONTENT.missingCompanyId,
					billingRow: null,
				});
				return;
			}
			set({ billingLoading: true, billingError: null });
			const res = await fetchCompanyAdminBilling({ companyId });
			if (!res.ok) {
				set({
					billingLoading: false,
					billingError:
						res.message || COMPANY_ADMIN_BILLING_PAGE_CONTENT.loadError,
					billingRow: null,
				});
				return;
			}
			set({
				billingLoading: false,
				billingError: null,
				billingRow: res.data,
			});
		},

		fetchHistory: async () => {
			const { companyId, historyPageIndex } = get();
			if (!companyId) {
				return;
			}
			set({ historyLoading: true, historyError: null });
			const res = await fetchCompanyAdminBillingHistory({
				companyId,
				page: historyPageIndex + 1,
				limit: HISTORY_PAGE_SIZE,
				sortBy: "occurredAt",
				sortOrder: "desc",
			});
			if (!res.ok) {
				set({
					historyLoading: false,
					historyError:
						res.message || COMPANY_ADMIN_BILLING_PAGE_CONTENT.historyLoadError,
					historyItems: [],
					historyTotalCount: 0,
				});
				return;
			}
			set({
				historyLoading: false,
				historyError: null,
				historyItems: res.data.items,
				historyTotalCount: res.data.totalCount,
			});
		},

		cancelSubscription: async (payload: CancelBillingSubscriptionPayload) => {
			const { companyId, billingRow } = get();
			if (!companyId) {
				return {
					ok: false as const,
					status: 400,
					message: "No company selected",
				};
			}
			set({ cancelBusy: true });
			const res = await cancelCompanyAdminSubscription({ companyId }, payload);
			if (!res.ok) {
				set({ cancelBusy: false });
				toast.error(res.message);
				return {
					ok: false as const,
					status: res.status,
					message: res.message,
				};
			}
			set({
				cancelBusy: false,
				billingRow: billingRow
					? {
							...billingRow,
							canCancelSubscription: false,
							canReinstateSubscription: Boolean(
								billingRow.stripeSubscriptionId,
							),
							cancelAtPeriodEnd: true,
							subscriptionStatus:
								billingRow.subscriptionStatus === "none"
									? billingRow.subscriptionStatus
									: "canceled",
						}
					: null,
			});
			toast.success(BILLING_TOAST.cancelScheduled);
			refreshBillingAndHistory(get);
			return { ok: true as const, status: res.status };
		},

		retryPayment: async () => {
			const { companyId } = get();
			if (!companyId) {
				return {
					ok: false as const,
					status: 400,
					message: "No company selected",
				};
			}
			set({ retryBusy: true });
			const res = await retryCompanyAdminPayment({ companyId });
			set({ retryBusy: false });
			if (!res.ok) {
				toast.error(res.message);
				return {
					ok: false as const,
					status: res.status,
					message: res.message,
				};
			}
			toast.success(BILLING_TOAST.retryAttempted);
			refreshBillingAndHistory(get);
			return { ok: true as const, status: res.status };
		},

		requestPlanChange: async () => {
			const { companyId } = get();
			if (!companyId) {
				return {
					ok: false as const,
					status: 400,
					message: "No company selected",
				};
			}
			set({ changePlanBusy: true });
			const res = await requestCompanyAdminPlanChange({ companyId });
			set({ changePlanBusy: false });
			if (!res.ok) {
				toast.error(res.message || BILLING_TOAST.planChangeFailed);
				return {
					ok: false as const,
					status: res.status,
					message: res.message,
				};
			}
			toast.success(BILLING_TOAST.planChangeRequested);
			return { ok: true as const, status: res.status };
		},

		reinstateSubscription: async () => {
			const { companyId, billingRow } = get();
			if (!companyId) {
				return {
					ok: false as const,
					status: 400,
					message: "No company selected",
				};
			}
			set({ reinstateBusy: true });
			const res = await reinstateCompanyAdminSubscription({ companyId });
			if (!res.ok) {
				set({ reinstateBusy: false });
				toast.error(res.message);
				return {
					ok: false as const,
					status: res.status,
					message: res.message,
				};
			}
			set({
				reinstateBusy: false,
				billingRow: billingRow
					? {
							...billingRow,
							canReinstateSubscription: false,
							canCancelSubscription: true,
							cancelAtPeriodEnd: false,
							subscriptionStatus:
								billingRow.subscriptionStatus === "canceled"
									? "active"
									: billingRow.subscriptionStatus,
						}
					: null,
			});
			toast.success(BILLING_TOAST.reinstateSuccess);
			refreshBillingAndHistory(get);
			return { ok: true as const, status: res.status };
		},

		downloadInvoice: async (invoiceId, eventId) => {
			const { companyId } = get();
			if (!companyId) {
				toast.error(COMPANY_ADMIN_BILLING_PAGE_CONTENT.invoiceDownloadFailed);
				return { ok: false };
			}
			set({ invoiceDownloadBusyEventId: eventId });
			const res = await fetchCompanyAdminInvoicePdfBlob(invoiceId, {
				companyId,
			});
			set({ invoiceDownloadBusyEventId: null });
			if (!res.ok) {
				toast.error(
					res.message ||
						COMPANY_ADMIN_BILLING_PAGE_CONTENT.invoiceDownloadFailed,
				);
				return { ok: false };
			}
			downloadInvoicePdfBlob(res.blob, eventId);
			return { ok: true };
		},

		reset: () => set(initialState),
	}),
);
