import { toast } from "sonner";
import { create } from "zustand";
import {
	bulkDownloadInvoicesZip,
	bulkSendInvoices,
	downloadBlobAsFile,
	downloadInvoicePdfBlob,
	fetchInvoiceCompanyOptions,
	fetchInvoicePdfBlob,
	fetchInvoices,
	sendInvoiceEmail,
} from "@/api";
import {
	DATA_TABLE_CONFIG,
	INVOICE_BULK_SEND_PROGRESS,
	INVOICE_TOAST,
} from "@/const";
import type {
	BulkSendFailure,
	CachedInvoicePage,
	InvoiceListApiData,
	InvoiceListFilterKey,
	InvoiceManagementRow,
	InvoiceManagementStore,
	PageCursor,
} from "@/types";

const PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;

function buildInvoiceListFilterKey(filters: InvoiceListFilterKey): string {
	return JSON.stringify({
		s: filters.statusFilter,
		co: filters.companyFilterEnabled ? (filters.companyId ?? null) : null,
		t: filters.appliedTimePeriodId,
		p: [...filters.appliedPaymentTypes].sort(),
		q: filters.searchQuery.trim().toLowerCase(),
	});
}

function buildInvoicePageCacheKey(
	filters: InvoiceListFilterKey,
	cursor: PageCursor,
): string {
	return JSON.stringify({
		f: buildInvoiceListFilterKey(filters),
		c: cursor,
	});
}

function createdGteFromTimePeriodId(id: string | null): number | undefined {
	if (!id || id === "all") return undefined;
	const now = Math.floor(Date.now() / 1000);
	const day = 86400;
	switch (id) {
		case "1h":
			return now - 3600;
		case "7d":
			return now - 7 * day;
		case "30d":
			return now - 30 * day;
		case "3m":
			return now - 90 * day;
		case "6m":
			return now - 180 * day;
		case "1y":
			return now - 365 * day;
		default:
			return undefined;
	}
}

function mapInvoiceListItems(
	items: InvoiceListApiData["items"],
): InvoiceManagementRow[] {
	return items.map((item) => ({
		id: item.id,
		displayId: item.displayId,
		amountCents: item.amountCents,
		currency: item.currency,
		uiStatus: item.uiStatus,
		created: item.created,
		paymentType: item.paymentType,
		companyOfficeName: item.companyOfficeName,
		companyRegion: item.companyRegion,
		planLabel: item.planLabel,
		planTypeId: item.planTypeId,
		invoicePdf: item.invoicePdf,
	}));
}

function mapCachedPage(data: InvoiceListApiData): CachedInvoicePage {
	return {
		rows: mapInvoiceListItems(data.items),
		hasMore: data.hasMore,
		nextStartingAfter: data.nextStartingAfter,
		nextSearchPage: data.nextSearchPage,
		nextSearchOffset: data.nextSearchOffset,
		usesSearchPagination: data.usedSearch,
	};
}

const initialPageStack: PageCursor[] = [{}];

const initialState = {
	rows: [] as InvoiceManagementRow[],
	listLoading: true,
	listError: null as string | null,
	hasMore: false,
	nextStartingAfter: null as string | null,
	nextSearchPage: null as string | null,
	nextSearchOffset: null as number | null,
	usesSearchPagination: false,
	pageStack: initialPageStack,
	pageCache: {} as Record<string, CachedInvoicePage>,
	searchQuery: "",
	statusFilter: "all",
	companyId: undefined as string | undefined,
	appliedTimePeriodId: null as string | null,
	appliedPaymentTypes: [] as InvoiceManagementStore["appliedPaymentTypes"],
	companyOptions: [] as InvoiceManagementStore["companyOptions"],
	companyOptionsLoading: true,
	companyFilterEnabled: true,
	sendingInvoiceId: null as string | null,
	bulkDownloading: false,
	bulkSending: false,
};

function getListFilters(state: InvoiceManagementStore): InvoiceListFilterKey {
	return {
		statusFilter: state.statusFilter,
		companyId: state.companyId,
		companyFilterEnabled: state.companyFilterEnabled,
		appliedTimePeriodId: state.appliedTimePeriodId,
		appliedPaymentTypes: state.appliedPaymentTypes,
		searchQuery: state.searchQuery,
	};
}

function applyCachedPage(cached: CachedInvoicePage) {
	return {
		listLoading: false,
		listError: null,
		rows: cached.rows,
		hasMore: cached.hasMore,
		nextStartingAfter: cached.nextStartingAfter,
		nextSearchPage: cached.nextSearchPage,
		nextSearchOffset: cached.nextSearchOffset,
		usesSearchPagination: cached.usesSearchPagination,
	};
}

export const useInvoiceManagementStore = create<InvoiceManagementStore>()(
	(set, get) => ({
		...initialState,

		setCompanyFilterEnabled: (enabled) => {
			set({
				companyFilterEnabled: enabled,
				companyOptions: enabled ? get().companyOptions : [],
				companyOptionsLoading: enabled ? get().companyOptionsLoading : false,
			});
		},

		fetchCompanyOptions: async () => {
			const { companyFilterEnabled } = get();
			if (!companyFilterEnabled) {
				set({ companyOptions: [], companyOptionsLoading: false });
				return;
			}
			set({ companyOptionsLoading: true });
			const res = await fetchInvoiceCompanyOptions();
			if (!res.ok) {
				set({ companyOptionsLoading: false });
				return;
			}
			set({
				companyOptions: res.data,
				companyOptionsLoading: false,
			});
		},

		fetchInvoices: async () => {
			const state = get();
			const {
				pageStack,
				statusFilter,
				companyId,
				companyFilterEnabled,
				appliedTimePeriodId,
				appliedPaymentTypes,
				searchQuery,
				pageCache,
			} = state;

			const filters = getListFilters(state);
			const cursor = pageStack[pageStack.length - 1];
			const cacheKey = buildInvoicePageCacheKey(filters, cursor);
			const cached = pageCache[cacheKey];
			if (cached) {
				set(applyCachedPage(cached));
				return;
			}

			set({ listLoading: true, listError: null });

			const paymentMethodsParam =
				appliedPaymentTypes.length > 0
					? appliedPaymentTypes.join(",")
					: undefined;
			const trimmedSearch = searchQuery.trim();

			const res = await fetchInvoices({
				limit: PAGE_SIZE,
				status: statusFilter,
				companyId: companyFilterEnabled ? companyId : undefined,
				startingAfter: cursor.startingAfter,
				searchPage: cursor.searchPage,
				searchOffset: cursor.searchOffset,
				search: trimmedSearch || undefined,
				createdGte: createdGteFromTimePeriodId(appliedTimePeriodId),
				paymentMethods: paymentMethodsParam,
			});

			if (!res.ok) {
				set({
					listLoading: false,
					listError: res.message,
					rows: [],
					hasMore: false,
				});
				return;
			}

			const cachedPage = mapCachedPage(res.data);
			set({
				...applyCachedPage(cachedPage),
				pageCache: { ...get().pageCache, [cacheKey]: cachedPage },
			});
		},

		setSearchQuery: (searchQuery) => {
			if (get().searchQuery === searchQuery) {
				return;
			}
			set({
				searchQuery,
				pageStack: initialPageStack,
				pageCache: {},
			});
		},

		setStatusFilter: (statusFilter) =>
			set({ statusFilter, pageStack: initialPageStack, pageCache: {} }),

		setCompanyId: (companyId) =>
			set({ companyId, pageStack: initialPageStack, pageCache: {} }),

		setAppliedMoreFilters: (timePeriodId, paymentTypes) =>
			set({
				appliedTimePeriodId: timePeriodId,
				appliedPaymentTypes: paymentTypes,
				pageStack: initialPageStack,
				pageCache: {},
			}),

		goPrevPage: () => {
			const { pageStack } = get();
			if (pageStack.length <= 1) return;
			set({ pageStack: pageStack.slice(0, -1) });
		},

		goNextPage: () => {
			const {
				hasMore,
				usesSearchPagination,
				nextSearchPage,
				nextSearchOffset,
				nextStartingAfter,
				pageStack,
			} = get();
			if (!hasMore) return;
			if (usesSearchPagination) {
				const canContinueSearch =
					nextSearchPage != null || nextSearchOffset != null;
				if (!canContinueSearch) return;
				const cursor: PageCursor = {};
				if (nextSearchPage != null) {
					cursor.searchPage = nextSearchPage;
				}
				if (nextSearchOffset != null && nextSearchOffset > 0) {
					cursor.searchOffset = nextSearchOffset;
				}
				set({ pageStack: [...pageStack, cursor] });
				return;
			}
			if (!nextStartingAfter) return;
			set({
				pageStack: [...pageStack, { startingAfter: nextStartingAfter }],
			});
		},

		downloadInvoice: async (row) => {
			const res = await fetchInvoicePdfBlob(row.id);
			if (!res.ok) {
				toast.error(res.message);
				return;
			}
			downloadInvoicePdfBlob(res.blob, row.displayId);
		},

		sendInvoice: async (invoiceId) => {
			set({ sendingInvoiceId: invoiceId });
			try {
				const res = await sendInvoiceEmail(invoiceId);
				if (res.ok) {
					toast.success(INVOICE_TOAST.sent);
				} else {
					toast.error(res.message);
				}
			} finally {
				set({ sendingInvoiceId: null });
			}
		},

		bulkDownload: async (invoiceIds) => {
			if (invoiceIds.length === 0) return;
			set({ bulkDownloading: true });
			try {
				const res = await bulkDownloadInvoicesZip(invoiceIds);
				if (res.ok) {
					downloadBlobAsFile(res.blob, "invoices.zip");
				} else {
					toast.error(res.message);
				}
			} finally {
				set({ bulkDownloading: false });
			}
		},

		bulkSend: async (invoiceIds, additionalEmails, displayIdById) => {
			if (invoiceIds.length === 0) return [];
			set({ bulkSending: true });
			const failures: BulkSendFailure[] = [];
			try {
				if (additionalEmails.length > 0) {
					for (const email of additionalEmails) {
						const res = await bulkSendInvoices(invoiceIds, [email]);
						if (!res.ok) {
							failures.push({ target: email, message: res.message });
						}
					}
				} else {
					for (const invoiceId of invoiceIds) {
						const res = await bulkSendInvoices([invoiceId], []);
						if (!res.ok) {
							failures.push({
								target: displayIdById.get(invoiceId) ?? invoiceId,
								message: res.message,
							});
						}
					}
				}
			} finally {
				set({ bulkSending: false });
			}
			if (failures.length === 0) {
				toast.success(INVOICE_BULK_SEND_PROGRESS.allSent);
			}
			return failures;
		},

		fetchInvoicePdf: async (invoiceId) => {
			const res = await fetchInvoicePdfBlob(invoiceId);
			if (!res.ok) {
				return { ok: false as const, message: res.message };
			}
			return { ok: true as const, blob: res.blob };
		},

		reset: () => set(initialState),
	}),
);
