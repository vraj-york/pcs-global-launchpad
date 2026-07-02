import { toast } from "sonner";
import { create } from "zustand";
import {
	getAllCompaniesByCorporation,
	getAllCorporations,
	getSuperAdminSystemAnalytics,
} from "@/api";
import type {
	SuperAdminDashboardFilterValue,
	SuperAdminDashboardStore,
	SuperAdminDashboardTimeFilter,
	SuperAdminSystemAnalyticsQuery,
} from "@/types";

const initialState = {
	corporationFilter: "all" as SuperAdminDashboardFilterValue,
	companyFilter: "all" as SuperAdminDashboardFilterValue,
	timeFilter: "all" as SuperAdminDashboardTimeFilter,
	corporationOptions: [] as SuperAdminDashboardStore["corporationOptions"],
	companyOptions: [] as SuperAdminDashboardStore["companyOptions"],
	corporationsLoading: false,
	companiesLoading: false,
	analytics: null as SuperAdminDashboardStore["analytics"],
	analyticsLoading: false,
	analyticsError: null as string | null,
};

function buildAnalyticsQuery(
	state: Pick<
		SuperAdminDashboardStore,
		"corporationFilter" | "companyFilter" | "timeFilter"
	>,
): SuperAdminSystemAnalyticsQuery {
	const query: SuperAdminSystemAnalyticsQuery = {};
	if (state.corporationFilter !== "all") {
		query.corporationId = state.corporationFilter;
	}
	if (state.companyFilter !== "all") {
		query.companyId = state.companyFilter;
	}
	if (state.timeFilter !== "all") {
		query.timeFilter = state.timeFilter;
	}
	return query;
}

export const useSuperAdminDashboardStore = create<SuperAdminDashboardStore>()(
	(set, get) => ({
		...initialState,

		fetchCorporationOptions: async () => {
			const { corporationOptions, corporationsLoading } = get();
			if (corporationsLoading || corporationOptions.length > 0) {
				return;
			}
			set({ corporationsLoading: true });
			const result = await getAllCorporations();
			set({ corporationsLoading: false });
			if (!result.ok) {
				toast.error(result.message);
				return;
			}
			set({ corporationOptions: result.data });
		},

		fetchCompanyOptions: async (corporationId) => {
			set({ companiesLoading: true, companyOptions: [] });
			const result = await getAllCompaniesByCorporation(corporationId);
			set({ companiesLoading: false });
			if (!result.ok) {
				toast.error(result.message);
				return;
			}
			set({ companyOptions: result.data });
		},

		fetchSystemAnalytics: async () => {
			set({ analyticsLoading: true, analyticsError: null });
			const result = await getSuperAdminSystemAnalytics(
				buildAnalyticsQuery(get()),
			);
			set({ analyticsLoading: false });
			if (!result.ok) {
				set({ analytics: null, analyticsError: result.message });
				return;
			}
			set({ analytics: result.data, analyticsError: null });
		},

		setCorporationFilter: async (value) => {
			if (value === "all") {
				set({
					corporationFilter: "all",
					companyFilter: "all",
					companyOptions: [],
					companiesLoading: false,
				});
				await get().fetchSystemAnalytics();
				return;
			}
			set({
				corporationFilter: value,
				companyFilter: "all",
				companyOptions: [],
				companiesLoading: true,
			});
			await get().fetchCompanyOptions(value);
			await get().fetchSystemAnalytics();
		},

		setCompanyFilter: async (value) => {
			set({ companyFilter: value });
			await get().fetchSystemAnalytics();
		},

		setTimeFilter: async (value) => {
			set({ timeFilter: value });
			await get().fetchSystemAnalytics();
		},

		initializeDashboard: async () => {
			await get().fetchCorporationOptions();
			await get().fetchSystemAnalytics();
		},

		reset: () => set(initialState),
	}),
);
