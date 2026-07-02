import { toast } from "sonner";
import { create } from "zustand";
import {
	getAssessmentInviteOptions as getAssessmentInviteOptionsApi,
	getAssessmentInvitesList as getAssessmentInvitesListApi,
	sendAssessmentInvite as sendAssessmentInviteApi,
} from "@/api";
import {
	INVITE_MANAGEMENT_LIST_MESSAGES,
	INVITE_MANAGEMENT_PAGE_CONTENT,
} from "@/const";
import type { InviteManagementStore } from "@/types";

const listInitialState = {
	listItems: [] as InviteManagementStore["listItems"],
	listSummary: null as InviteManagementStore["listSummary"],
	listTotal: 0,
	listPage: 1,
	listLoading: false,
	listError: null as string | null,
	listSearch: "",
	listSortBy: "invitedOn" as InviteManagementStore["listSortBy"],
	listSortOrder: "desc" as InviteManagementStore["listSortOrder"],
	listStatusFilter: undefined as InviteManagementStore["listStatusFilter"],
	listTimeFilter: undefined as InviteManagementStore["listTimeFilter"],
};

const initialState = {
	assessmentInviteOptions:
		null as InviteManagementStore["assessmentInviteOptions"],
	assessmentInviteOptionsLoading: false,
	assessmentInviteOptionsError: null as string | null,
	isSendAssessmentInviteSubmitting: false,
	...listInitialState,
};

export const useInviteManagementStore = create<InviteManagementStore>()(
	(set, get) => ({
		...initialState,

		fetchAssessmentInviteOptions: async () => {
			set({
				assessmentInviteOptionsLoading: true,
				assessmentInviteOptionsError: null,
			});
			const result = await getAssessmentInviteOptionsApi();
			if (!result.ok) {
				set({
					assessmentInviteOptionsLoading: false,
					assessmentInviteOptionsError:
						result.message || INVITE_MANAGEMENT_PAGE_CONTENT.optionsLoadError,
				});
				return;
			}
			set({
				assessmentInviteOptions: result.data,
				assessmentInviteOptionsLoading: false,
				assessmentInviteOptionsError: null,
			});
		},

		sendAssessmentInvite: async (payload) => {
			set({ isSendAssessmentInviteSubmitting: true });
			const result = await sendAssessmentInviteApi(payload);
			set({ isSendAssessmentInviteSubmitting: false });
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			toast.success(
				result.message || INVITE_MANAGEMENT_PAGE_CONTENT.inviteSuccess,
			);
			return true;
		},

		fetchAssessmentInvites: async (page, limit, params) => {
			const {
				listSortBy,
				listSortOrder,
				listStatusFilter,
				listTimeFilter,
				listSearch,
			} = get();
			const requestParams = {
				page,
				limit,
				search: params?.search ?? listSearch,
				sortBy: params?.sortBy ?? listSortBy,
				sortOrder: params?.sortOrder ?? listSortOrder,
				status: params?.status ?? listStatusFilter,
				timeFilter: params?.timeFilter ?? listTimeFilter,
			};

			set({ listLoading: true, listError: null });
			const result = await getAssessmentInvitesListApi(requestParams);
			set({ listLoading: false });

			if (!result.ok) {
				set({ listError: result.message });
				toast.error(
					result.message || INVITE_MANAGEMENT_LIST_MESSAGES.listLoadError,
				);
				return;
			}

			if (result.data) {
				set({
					listItems: result.data.items.map((item) => ({
						...item,
						id: item.cognitoSub,
					})),
					listSummary: result.data.summary,
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

		setListSearch: (search) => set({ listSearch: search }),

		setListSort: (sortBy, sortOrder) =>
			set({ listSortBy: sortBy, listSortOrder: sortOrder }),

		setListStatusFilter: (status) => set({ listStatusFilter: status }),

		setListTimeFilter: (timeFilter) => set({ listTimeFilter: timeFilter }),

		resetList: () => set(listInitialState),
	}),
);
