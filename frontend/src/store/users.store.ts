import { toast } from "sonner";
import { create } from "zustand";
import {
	bulkInviteUsers as bulkInviteUsersApi,
	deleteMyAvatar as deleteMyAvatarApi,
	deleteUser as deleteUserApi,
	getUserById as getUserByIdApi,
	getUserProfile as getUserProfileApi,
	getUsers as getUsersApi,
	inviteUser as inviteUserApi,
	patchCancelUserInvitation as patchCancelUserInvitationApi,
	patchMyAvatar as patchMyAvatarApi,
	patchMyProfile as patchMyProfileApi,
	patchUserBlock as patchUserBlockApi,
	postResendUserInvitation as postResendUserInvitationApi,
} from "@/api/users.api";
import {
	SETTINGS_PAGE_CONTENT,
	USER_BLOCK_TOAST,
	USER_INVITE_TOAST,
	USER_REMOVE_TOAST,
	VIEW_USER_DETAILS_PAGE,
} from "@/const";
import type { UsersStore } from "@/types";
import { formatFullName } from "@/utils";

const SETTINGS_TOAST = SETTINGS_PAGE_CONTENT;

const initialState = {
	listItems: [] as UsersStore["listItems"],
	listTotal: 0,
	listPage: 1,
	listLoading: false,
	listError: null as string | null,
	listSortBy: "createdAt" as UsersStore["listSortBy"],
	listSortOrder: "desc" as UsersStore["listSortOrder"],
	listStatusFilter: undefined as UsersStore["listStatusFilter"],
	listCategoryIdFilter: undefined as UsersStore["listCategoryIdFilter"],
	listSearch: "",
	userDetail: null as UsersStore["userDetail"],
	userDetailLoading: false,
	userDetailError: null as string | null,
	isBlockConfirming: false,
	isRemoveConfirming: false,
	isCancelInviteConfirming: false,
	isResendInviteConfirming: false,
	isInviteUserSubmitting: false,
	isBulkInviteUsersSubmitting: false,
	userProfile: null as UsersStore["userProfile"],
	userProfileLoading: false,
	userProfileError: null as string | null,
	isMyProfileSaving: false,
	isMyAvatarUploading: false,
	isMyAvatarRemoving: false,
	firstName: null as string | null,
	lastName: null as string | null,
	fullName: null as string | null,
};

export const useUsersStore = create<UsersStore>()((set, get) => ({
	...initialState,

	fetchUsers: async (
		page: number,
		limit: number,
		params?: {
			sortBy?: UsersStore["listSortBy"];
			sortOrder?: UsersStore["listSortOrder"];
			status?: string;
			categoryId?: string;
			corporationIds?: string[];
			companyIds?: string[];
			timezones?: string[];
			search?: string;
		},
	) => {
		const {
			listSortBy,
			listSortOrder,
			listStatusFilter,
			listCategoryIdFilter,
		} = get();
		const sortBy = params?.sortBy ?? listSortBy;
		const sortOrder = params?.sortOrder ?? listSortOrder;
		const status = params?.status ?? listStatusFilter;
		const categoryId = params?.categoryId ?? listCategoryIdFilter;
		const corporationIds = params?.corporationIds ?? [];
		const companyIds = params?.companyIds ?? [];
		const timezones = params?.timezones ?? [];
		const search = params?.search;
		set({ listLoading: true, listError: null });
		const result = await getUsersApi({
			page,
			limit,
			sortBy,
			sortOrder,
			status: status?.trim() ? status.trim().toLowerCase() : undefined,
			categoryId: categoryId?.trim() || undefined,
			corporationIds: corporationIds.length > 0 ? corporationIds : undefined,
			companyIds: companyIds.length > 0 ? companyIds : undefined,
			timezones: timezones.length > 0 ? timezones : undefined,
			search,
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
				listTotal: result.data.total,
				listPage: result.data.page,
				listError: null,
			});
		}
	},

	setListPage: (page: number) => set({ listPage: page, listLoading: true }),

	setListSort: (sortBy, sortOrder) =>
		set({ listSortBy: sortBy, listSortOrder: sortOrder }),

	setListStatusFilter: (status) => set({ listStatusFilter: status }),

	setListCategoryIdFilter: (categoryId) =>
		set({ listCategoryIdFilter: categoryId }),

	setListSearch: (search) => set({ listSearch: search }),

	clearListError: () => set({ listError: null }),

	fetchUserById: async (userId: string) => {
		const id = userId.trim();
		if (!id) {
			set({
				userDetail: null,
				userDetailLoading: false,
				userDetailError: VIEW_USER_DETAILS_PAGE.notFound,
			});
			return;
		}
		set({
			userDetail: null,
			userDetailLoading: true,
			userDetailError: null,
		});
		const result = await getUserByIdApi(id);
		if (!result.ok) {
			set({
				userDetail: null,
				userDetailLoading: false,
				userDetailError: result.message ?? VIEW_USER_DETAILS_PAGE.notFound,
			});
			return;
		}
		set({
			userDetail: result.data,
			userDetailLoading: false,
			userDetailError: null,
		});
	},

	clearUserDetail: () =>
		set({
			userDetail: null,
			userDetailLoading: false,
			userDetailError: null,
		}),

	blockUser: async (userId: string, blocked: boolean) => {
		const id = userId.trim();
		if (!id) return false;
		set({ isBlockConfirming: true });
		try {
			const result = await patchUserBlockApi(id, blocked);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			toast.success(
				blocked ? USER_BLOCK_TOAST.blocked : USER_BLOCK_TOAST.unblocked,
			);
			set((state) => {
				const nextStatus = blocked ? "blocked" : "active";
				return {
					listItems: state.listItems.map((item) =>
						item.id === id || item.cognitoSub === id
							? { ...item, status: nextStatus }
							: item,
					),
					userDetail:
						state.userDetail?.cognitoSub === id
							? { ...state.userDetail, status: nextStatus }
							: state.userDetail,
				};
			});
			return true;
		} finally {
			set({ isBlockConfirming: false });
		}
	},

	removeUser: async (userId: string) => {
		const id = userId.trim();
		if (!id) return false;
		set({ isRemoveConfirming: true });
		try {
			const result = await deleteUserApi(id);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			toast.success(USER_REMOVE_TOAST.removed);
			set((state) => ({
				listItems: state.listItems.filter(
					(item) => item.id !== id && item.cognitoSub !== id,
				),
				listTotal: Math.max(0, state.listTotal - 1),
				userDetail:
					state.userDetail?.cognitoSub === id ? null : state.userDetail,
			}));
			return true;
		} finally {
			set({ isRemoveConfirming: false });
		}
	},

	cancelUserInvitation: async (userId: string) => {
		const id = userId.trim();
		if (!id) return false;
		set({ isCancelInviteConfirming: true });
		try {
			const result = await patchCancelUserInvitationApi(id);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			toast.success(USER_INVITE_TOAST.cancelled);
			const nextStatus = "expired";
			set((state) => ({
				listItems: state.listItems.map((item) =>
					item.id === id || item.cognitoSub === id
						? { ...item, status: nextStatus }
						: item,
				),
				userDetail:
					state.userDetail?.cognitoSub === id
						? { ...state.userDetail, status: nextStatus }
						: state.userDetail,
			}));
			return true;
		} finally {
			set({ isCancelInviteConfirming: false });
		}
	},

	resendUserInvitation: async (userId: string) => {
		const id = userId.trim();
		if (!id) return false;
		set({ isResendInviteConfirming: true });
		try {
			const result = await postResendUserInvitationApi(id);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			toast.success(USER_INVITE_TOAST.resent);
			return true;
		} finally {
			set({ isResendInviteConfirming: false });
		}
	},

	inviteUser: async (payload) => {
		set({ isInviteUserSubmitting: true });
		try {
			const result = await inviteUserApi(payload);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			const successMsg = result.message.trim();
			if (successMsg) toast.success(successMsg);
			return true;
		} finally {
			set({ isInviteUserSubmitting: false });
		}
	},

	bulkInviteUsers: async (file: File) => {
		set({ isBulkInviteUsersSubmitting: true });
		try {
			const result = await bulkInviteUsersApi(file);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			const successMsg = result.message.trim();
			if (successMsg) toast.success(successMsg);
			return true;
		} finally {
			set({ isBulkInviteUsersSubmitting: false });
		}
	},

	fetchUserProfile: async () => {
		const hasCachedProfile = get().userProfile != null;
		if (!hasCachedProfile) {
			set({ userProfileLoading: true, userProfileError: null });
		}
		const result = await getUserProfileApi();
		if (!result.ok) {
			set({
				userProfile: null,
				firstName: null,
				lastName: null,
				fullName: null,
				userProfileLoading: false,
				userProfileError: result.message,
			});
			return false;
		}
		const { firstName, lastName } = result.data;
		set({
			userProfile: result.data,
			firstName,
			lastName,
			fullName: formatFullName(firstName, lastName) || null,
			userProfileLoading: false,
			userProfileError: null,
		});
		return true;
	},

	updateMyProfile: async (payload) => {
		if (Object.keys(payload).length === 0) return false;
		set({ isMyProfileSaving: true });
		try {
			const result = await patchMyProfileApi(payload);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			toast.success(SETTINGS_TOAST.saveSuccess);
			await get().fetchUserProfile();
			return true;
		} finally {
			set({ isMyProfileSaving: false });
		}
	},

	uploadMyAvatar: async (file) => {
		set({ isMyAvatarUploading: true });
		try {
			const result = await patchMyAvatarApi(file);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			toast.success(SETTINGS_TOAST.avatarUploadSuccess);
			await get().fetchUserProfile();
			return true;
		} finally {
			set({ isMyAvatarUploading: false });
		}
	},

	removeMyAvatar: async () => {
		set({ isMyAvatarRemoving: true });
		try {
			const result = await deleteMyAvatarApi();
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			toast.success(SETTINGS_TOAST.avatarRemoveSuccess);
			await get().fetchUserProfile();
			return true;
		} finally {
			set({ isMyAvatarRemoving: false });
		}
	},

	clearUserProfile: () => {
		set({
			userProfile: null,
			firstName: null,
			lastName: null,
			fullName: null,
			userProfileLoading: false,
			userProfileError: null,
		});
	},

	reset: () => set(initialState),
}));
