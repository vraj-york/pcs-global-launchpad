import { toast } from "sonner";
import { create } from "zustand";
import {
	getAssessmentsDirectory as getAssessmentsDirectoryApi,
	getAssessmentsDirectoryByUser as getAssessmentsDirectoryByUserApi,
} from "@/api";
import type { AssessmentDirectoryStore } from "@/types";

const initialState = {
	listItems: [] as AssessmentDirectoryStore["listItems"],
	listTotal: 0,
	listPage: 1,
	listLoading: false,
	listError: null as string | null,
	listSortBy: "startedAt" as AssessmentDirectoryStore["listSortBy"],
	listSortOrder: "desc" as AssessmentDirectoryStore["listSortOrder"],
	listStatusFilter: undefined as AssessmentDirectoryStore["listStatusFilter"],
	listTimeFilter: undefined as AssessmentDirectoryStore["listTimeFilter"],
	listCognitoSub: undefined as AssessmentDirectoryStore["listCognitoSub"],
};

export const useAssessmentDirectoryStore = create<AssessmentDirectoryStore>()(
	(set, get) => ({
		...initialState,

		fetchAssessments: async (page, limit, params) => {
			const {
				listSortBy,
				listSortOrder,
				listStatusFilter,
				listTimeFilter,
				listCognitoSub,
			} = get();
			const sortBy = params?.sortBy ?? listSortBy;
			const sortOrder = params?.sortOrder ?? listSortOrder;
			const status = params?.status ?? listStatusFilter;
			const timeFilter = params?.timeFilter ?? listTimeFilter;
			const requestParams = {
				page,
				limit,
				sortBy,
				sortOrder,
				status,
				timeFilter,
			};

			set({ listLoading: true, listError: null });
			const result = listCognitoSub
				? await getAssessmentsDirectoryByUserApi(listCognitoSub, requestParams)
				: await getAssessmentsDirectoryApi(requestParams);
			set({ listLoading: false });

			if (!result.ok) {
				set({ listError: result.message });
				toast.error(result.message);
				return;
			}

			if (result.data) {
				set({
					listItems: result.data.items,
					listTotal: result.data.total,
					listPage: result.data.page,
					listError: null,
				});
			}
		},

		setListPage: (page) =>
			set((state) => {
				if (state.listPage === page) return {};
				return { listPage: page, listLoading: true };
			}),

		setListSort: (sortBy, sortOrder) =>
			set({ listSortBy: sortBy, listSortOrder: sortOrder }),

		setListStatusFilter: (status) => set({ listStatusFilter: status }),

		setListTimeFilter: (timeFilter) => set({ listTimeFilter: timeFilter }),

		setListCognitoSub: (cognitoSub) => set({ listCognitoSub: cognitoSub }),

		clearListError: () => set({ listError: null }),

		reset: () => set(initialState),
	}),
);
