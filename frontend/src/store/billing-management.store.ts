import { toast } from "sonner";
import { create } from "zustand";
import {
	applyBillingUpgrade,
	cancelBillingSubscription,
	fetchBillingHistory as fetchBillingHistoryApi,
	fetchBillingPlanOptions,
	fetchBillingRecord,
	fetchBillingRecords,
	fetchBillingUpgradeOptions,
	previewBillingUpgrade,
	reinstateBillingSubscription,
	retryBillingPayment,
} from "@/api";
import {
	BILLING_HISTORY_PAGE_CONTENT,
	BILLING_TOAST,
	DATA_TABLE_CONFIG,
} from "@/const";
import type {
	BillingHistorySortBy,
	BillingManagementStore,
	BillingPlanOption,
	BillingSortBy,
	CancelBillingSubscriptionPayload,
} from "@/types";

const LIST_PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;
const HISTORY_PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;

const historyInitialState = {
	historyCompanyId: null as string | null,
	historyEventType: "all",
	historyPlanTypeId: undefined as string | undefined,
	historyActorKind: "all",
	historyPageIndex: 0,
	historySortColumnId: null as string | null,
	historySortDirection: null as BillingManagementStore["historySortDirection"],
	historyItems: [] as BillingManagementStore["historyItems"],
	historyTotalCount: 0,
	historyLoading: false,
	historyError: null as string | null,
};

const initialState = {
	listItems: [] as BillingManagementStore["listItems"],
	listTotalCount: 0,
	listTotalTruncated: false,
	listPageIndex: 0,
	listLoading: false,
	listError: null as string | null,
	listSortColumnId: null as string | null,
	listSortDirection: undefined as unknown as "asc" | "desc" | undefined,
	planTypeId: undefined as string | undefined,
	subscriptionStatus: "all",
	paymentStatus: "all",
	listSearch: "",
	appliedBillingCycles: [] as BillingManagementStore["appliedBillingCycles"],
	appliedTimePeriod: null as BillingManagementStore["appliedTimePeriod"],
	appliedPaymentTypes: [] as BillingManagementStore["appliedPaymentTypes"],
	planOptions: [] as BillingPlanOption[],
	planOptionsLoading: false,
	detailRow: null as BillingManagementStore["detailRow"],
	detailLoading: false,
	detailError: null as string | null,
	editCompanyId: null as string | null,
	upgradeOptions: null as BillingManagementStore["upgradeOptions"],
	upgradeOptionsLoading: false,
	upgradeOptionsError: null as string | null,
	upgradePreview: null as BillingManagementStore["upgradePreview"],
	upgradePreviewLoading: false,
	upgradePreviewError: null as string | null,
	upgradeApplyBusy: false,
	...historyInitialState,
};

export const useBillingManagementStore = create<BillingManagementStore>()(
	(set, get) => ({
		...initialState,

		fetchPlanOptions: async () => {
			set({ planOptionsLoading: true });
			const res = await fetchBillingPlanOptions();
			if (!res.ok) {
				set({ planOptionsLoading: false });
				toast.error(res.message);
				return;
			}
			const unique = new Map<string, BillingPlanOption>();
			for (const opt of res.data) {
				if (!unique.has(opt.value)) {
					unique.set(opt.value, opt);
				}
			}
			set({
				planOptions: [...unique.values()],
				planOptionsLoading: false,
			});
		},

		fetchBillingList: async () => {
			const {
				listPageIndex,
				planTypeId,
				subscriptionStatus,
				paymentStatus,
				appliedBillingCycles,
				appliedTimePeriod,
				appliedPaymentTypes,
				listSortColumnId,
				listSortDirection,
				listSearch,
			} = get();
			set({ listLoading: true, listError: null });
			const res = await fetchBillingRecords({
				page: listPageIndex + 1,
				limit: LIST_PAGE_SIZE,
				planTypeId,
				subscriptionStatus,
				paymentStatus,
				billingCycles: appliedBillingCycles,
				timePeriod: appliedTimePeriod,
				paymentTypes: appliedPaymentTypes,
				sortBy: (listSortColumnId as BillingSortBy | null) ?? undefined,
				sortOrder:
					listSortDirection === "asc" || listSortDirection === "desc"
						? listSortDirection
						: undefined,
				search: listSearch || undefined,
			});
			if (!res.ok) {
				set({
					listLoading: false,
					listError: res.message,
					listItems: [],
					listTotalCount: 0,
					listTotalTruncated: false,
				});
				return;
			}
			set({
				listLoading: false,
				listError: null,
				listItems: res.data.items,
				listTotalCount: res.data.totalCount,
				listTotalTruncated: res.data.totalTruncated,
			});
		},

		setListPageIndex: (pageIndex) => set({ listPageIndex: pageIndex }),

		setListSort: (columnId, direction) =>
			set({
				listSortColumnId: columnId,
				listSortDirection: direction,
				listPageIndex: 0,
			}),

		setPlanTypeId: (planTypeId) => set({ planTypeId, listPageIndex: 0 }),

		setSubscriptionStatus: (subscriptionStatus) =>
			set({ subscriptionStatus, listPageIndex: 0 }),

		setPaymentStatus: (paymentStatus) =>
			set({ paymentStatus, listPageIndex: 0 }),

		setListSearch: (search) => set({ listSearch: search, listPageIndex: 0 }),

		setAppliedMoreFilters: (params) =>
			set({
				appliedBillingCycles: params.billingCycles,
				appliedTimePeriod: params.timePeriod,
				appliedPaymentTypes: params.paymentTypes,
				listPageIndex: 0,
			}),

		fetchBillingDetail: async (companyId) => {
			set({ detailLoading: true, detailError: null });
			const res = await fetchBillingRecord(companyId);
			if (!res.ok) {
				toast.error(res.message);
				set({
					detailLoading: false,
					detailError: res.message,
					detailRow: null,
				});
				return;
			}
			set({
				detailLoading: false,
				detailError: null,
				detailRow: res.data,
			});
		},

		clearBillingDetail: () =>
			set({
				detailRow: null,
				detailLoading: false,
				detailError: null,
			}),

		initHistoryForCompany: (companyId) => {
			const { historyCompanyId } = get();
			if (historyCompanyId === companyId) {
				return;
			}
			set({
				...historyInitialState,
				historyCompanyId: companyId,
			});
		},

		fetchBillingHistory: async (companyId) => {
			const {
				historyPageIndex,
				historyEventType,
				historyPlanTypeId,
				historyActorKind,
				historySortColumnId,
				historySortDirection,
			} = get();
			set({ historyLoading: true, historyError: null });
			const sortBy = historySortColumnId
				? (historySortColumnId as BillingHistorySortBy)
				: undefined;
			const res = await fetchBillingHistoryApi(companyId, {
				page: historyPageIndex + 1,
				limit: HISTORY_PAGE_SIZE,
				eventType: historyEventType,
				planTypeId: historyPlanTypeId,
				actorKind: historyActorKind,
				sortBy,
				sortOrder:
					historySortDirection === "asc" || historySortDirection === "desc"
						? historySortDirection
						: undefined,
			});
			if (!res.ok) {
				set({
					historyLoading: false,
					historyError: res.message || BILLING_HISTORY_PAGE_CONTENT.loadError,
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
				historyCompanyId: companyId,
			});
		},

		setHistoryEventType: (historyEventType) =>
			set({ historyEventType, historyPageIndex: 0 }),

		setHistoryPlanTypeId: (historyPlanTypeId) =>
			set({ historyPlanTypeId, historyPageIndex: 0 }),

		setHistoryActorKind: (historyActorKind) =>
			set({ historyActorKind, historyPageIndex: 0 }),

		setHistoryPageIndex: (historyPageIndex) => set({ historyPageIndex }),

		setHistorySort: (columnId) => {
			const { historySortColumnId, historySortDirection } = get();
			if (historySortColumnId !== columnId) {
				set({
					historySortColumnId: columnId,
					historySortDirection: "asc",
					historyPageIndex: 0,
				});
				return;
			}
			set({
				historySortDirection: historySortDirection === "asc" ? "desc" : "asc",
				historyPageIndex: 0,
			});
		},

		cancelSubscription: async (
			companyId,
			payload: CancelBillingSubscriptionPayload,
		) => {
			const res = await cancelBillingSubscription(companyId, payload);
			if (!res.ok) {
				toast.error(res.message);
				return { ok: false as const, error: res.message };
			}
			toast.success(BILLING_TOAST.cancelScheduled);
			return { ok: true as const };
		},

		retryPayment: async (companyId) => {
			const res = await retryBillingPayment(companyId);
			if (!res.ok) {
				toast.error(res.message);
				return { ok: false as const, error: res.message };
			}
			toast.success(BILLING_TOAST.retryAttempted);
			return { ok: true as const };
		},

		reinstateSubscription: async (companyId) => {
			const res = await reinstateBillingSubscription(companyId);
			if (!res.ok) {
				toast.error(res.message);
				return { ok: false as const, error: res.message };
			}
			toast.success(BILLING_TOAST.reinstateSuccess);
			return { ok: true as const };
		},

		fetchUpgradeOptions: async (companyId) => {
			set({
				editCompanyId: companyId,
				upgradeOptionsLoading: true,
				upgradeOptionsError: null,
			});
			const res = await fetchBillingUpgradeOptions(companyId);
			if (!res.ok) {
				toast.error(res.message);
				set({
					upgradeOptionsLoading: false,
					upgradeOptionsError: res.message,
					upgradeOptions: null,
				});
				return;
			}
			set({
				upgradeOptionsLoading: false,
				upgradeOptionsError: null,
				upgradeOptions: res.data,
			});
		},

		previewUpgrade: async (companyId, targetPricingPlanId) => {
			set({ upgradePreviewLoading: true, upgradePreviewError: null });
			const res = await previewBillingUpgrade(companyId, targetPricingPlanId);
			if (!res.ok) {
				toast.error(res.message);
				set({
					upgradePreviewLoading: false,
					upgradePreviewError: res.message,
					upgradePreview: null,
				});
				return;
			}
			set({
				upgradePreviewLoading: false,
				upgradePreviewError: null,
				upgradePreview: res.data,
			});
		},

		applyUpgrade: async (companyId, targetPricingPlanId) => {
			set({ upgradeApplyBusy: true });
			const res = await applyBillingUpgrade(companyId, targetPricingPlanId);
			set({ upgradeApplyBusy: false });
			if (!res.ok) {
				toast.error(res.message || BILLING_TOAST.upgradeFailed);
				return { ok: false as const, error: res.message };
			}
			toast.success(BILLING_TOAST.upgradeSuccess);
			return { ok: true as const };
		},

		clearUpgradePreview: () =>
			set({
				upgradePreview: null,
				upgradePreviewLoading: false,
				upgradePreviewError: null,
			}),

		clearUpgradeState: () =>
			set({
				editCompanyId: null,
				upgradeOptions: null,
				upgradeOptionsLoading: false,
				upgradeOptionsError: null,
				upgradePreview: null,
				upgradePreviewLoading: false,
				upgradePreviewError: null,
				upgradeApplyBusy: false,
			}),

		reset: () => set(initialState),
	}),
);
