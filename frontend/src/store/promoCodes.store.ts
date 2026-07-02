import { toast } from "sonner";
import { create } from "zustand";

import {
	deletePromoCode as deletePromoCodeApi,
	getPromoCodeById as getPromoCodeByIdApi,
	getPromoCodesList as getPromoCodesListApi,
	getPromoCodeUsageList as getPromoCodeUsageListApi,
	patchPromoCodePromotionActive as patchPromoCodePromotionActiveApi,
	patchUpdatePromoCode as patchUpdatePromoCodeApi,
	postCreatePromoCode as postCreatePromoCodeApi,
} from "@/api";
import type {
	CreatePromoCodePayload,
	ListPromoCodesQuery,
	ListPromoCodeUsageQuery,
	PromoCodesListSortBy,
	PromoCodesListStatusFilter,
	PromoCodesStore,
	UpdatePromoCodePayload,
} from "@/types";

const initialState = {
	listItems: [] as PromoCodesStore["listItems"],
	listTotal: 0,
	listPage: 1,
	listLoading: false,
	listError: null as string | null,
	listSortBy: "createdAt" as PromoCodesListSortBy,
	listSortOrder: "desc" as PromoCodesStore["listSortOrder"],
	listSearch: "",
	listStatusFilter: undefined as PromoCodesListStatusFilter | undefined,
	listPlanTypeFilter: undefined as string | undefined,
	listDiscountTypeFilter: undefined as "percent" | "fixed_amount" | undefined,
	listCreatedAfterFilter: undefined as string | undefined,
	promoDetail: null as PromoCodesStore["promoDetail"],
	promoDetailLoading: false,
	promoDetailError: null as string | null,
	promoDetailErrorStatus: null as number | null,
	usageItems: [] as PromoCodesStore["usageItems"],
	usageTotal: 0,
	usagePage: 1,
	usageLoading: false,
	usageError: null as string | null,
	mutationLoading: false,
};

export const usePromoCodesStore = create<PromoCodesStore>()((set, get) => ({
	...initialState,

	fetchPromoCodesList: async (
		page: number,
		limit: number,
		params?: Partial<ListPromoCodesQuery>,
	) => {
		const {
			listSortBy,
			listSortOrder,
			listSearch,
			listStatusFilter,
			listPlanTypeFilter,
			listDiscountTypeFilter,
			listCreatedAfterFilter,
		} = get();
		set({ listLoading: true, listError: null });
		const result = await getPromoCodesListApi({
			page,
			limit,
			sortBy: params?.sortBy ?? listSortBy,
			sortOrder: params?.sortOrder ?? listSortOrder,
			search: params?.search ?? listSearch,
			status: params?.status ?? listStatusFilter,
			planTypeId: params?.planTypeId ?? listPlanTypeFilter,
			discountType: params?.discountType ?? listDiscountTypeFilter,
			createdAfter: params?.createdAfter ?? listCreatedAfterFilter,
		});
		set({ listLoading: false });
		if (!result.ok) {
			set({ listError: result.message });
			toast.error(result.message);
			return;
		}
		if (result.data) {
			set({
				listItems: result.data.items,
				listTotal: result.data.pagination.total,
				listPage: result.data.pagination.page,
				listError: null,
			});
		}
	},

	fetchPromoCodeById: async (id: string) => {
		set({
			promoDetailLoading: true,
			promoDetailError: null,
			promoDetailErrorStatus: null,
		});
		const result = await getPromoCodeByIdApi(id);
		set({ promoDetailLoading: false });
		if (!result.ok) {
			set({
				promoDetailError: result.message,
				promoDetailErrorStatus: result.status,
			});
			toast.error(result.message);
			return;
		}
		if (result.data) {
			set({
				promoDetail: result.data,
				promoDetailError: null,
				promoDetailErrorStatus: null,
			});
		}
	},

	fetchPromoCodeUsage: async (
		id: string,
		query: ListPromoCodeUsageQuery = {},
	) => {
		set({ usageLoading: true, usageError: null });
		const result = await getPromoCodeUsageListApi(id, query);
		set({ usageLoading: false });
		if (!result.ok) {
			set({ usageError: result.message });
			toast.error(result.message);
			return;
		}
		if (result.data) {
			set({
				usageItems: result.data.items,
				usageTotal: result.data.pagination.total,
				usagePage: result.data.pagination.page,
				usageError: null,
			});
		}
	},

	createPromoCode: async (payload: CreatePromoCodePayload) => {
		set({ mutationLoading: true });
		const result = await postCreatePromoCodeApi(payload);
		set({ mutationLoading: false });
		if (!result.ok) {
			toast.error(result.message);
			return { ok: false as const, message: result.message };
		}
		return { ok: true as const, data: result.data };
	},

	updatePromoCode: async (id: string, payload: UpdatePromoCodePayload) => {
		set({ mutationLoading: true });
		const result = await patchUpdatePromoCodeApi(id, payload);
		set({ mutationLoading: false });
		if (!result.ok) {
			toast.error(result.message);
			return { ok: false as const, message: result.message };
		}
		// Refresh detail if currently loaded
		if (get().promoDetail?.id === id) {
			await get().fetchPromoCodeById(id);
		}
		return { ok: true as const };
	},

	togglePromotionActive: async (id: string, active: boolean) => {
		set({ mutationLoading: true });
		const result = await patchPromoCodePromotionActiveApi(id, active);
		set({ mutationLoading: false });
		if (!result.ok) {
			toast.error(result.message);
			return { ok: false as const, message: result.message };
		}
		// Reflect change in detail if loaded
		const { promoDetail } = get();
		if (promoDetail?.id === id) {
			set({
				promoDetail: { ...promoDetail, stripePromotionCodeActive: active },
			});
		}
		return { ok: true as const };
	},

	deletePromoCode: async (id: string) => {
		set({ mutationLoading: true });
		const result = await deletePromoCodeApi(id);
		set({ mutationLoading: false });
		if (!result.ok) {
			toast.error(result.message);
			return { ok: false as const, message: result.message };
		}
		return { ok: true as const };
	},

	setListPage: (page: number) =>
		set((state) => {
			if (state.listPage === page) return {};
			return { listPage: page, listLoading: true };
		}),

	setListSort: (sortBy: PromoCodesListSortBy, sortOrder: "asc" | "desc") =>
		set({ listSortBy: sortBy, listSortOrder: sortOrder }),

	setListSearch: (search: string) => set({ listSearch: search }),

	setListStatusFilter: (status: PromoCodesListStatusFilter | undefined) =>
		set({ listStatusFilter: status }),

	setListPlanTypeFilter: (planTypeId: string | undefined) =>
		set({ listPlanTypeFilter: planTypeId }),

	setListDiscountTypeFilter: (
		discountType: "percent" | "fixed_amount" | undefined,
	) => set({ listDiscountTypeFilter: discountType }),

	setListCreatedAfterFilter: (createdAfter: string | undefined) =>
		set({ listCreatedAfterFilter: createdAfter }),

	clearListError: () => set({ listError: null }),

	clearPromoDetail: () =>
		set({
			promoDetail: null,
			promoDetailError: null,
			promoDetailErrorStatus: null,
		}),

	reset: () => set(initialState),
}));
