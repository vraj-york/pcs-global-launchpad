import { toast } from "sonner";
import { create } from "zustand";
import {
	bulkUploadKeyContacts as bulkUploadKeyContactsApi,
	createKeyContact as createKeyContactApi,
	deleteKeyContact as deleteKeyContactApi,
	getKeyContactById as getKeyContactByIdApi,
	getKeyContacts as getKeyContactsApi,
	sendKeyContactInvite as sendKeyContactInviteApi,
} from "@/api";
import { VIEW_CONTACT_DETAILS_PAGE } from "@/const";
import type { KeyContactsStore } from "@/types";

const initialState = {
	listItems: [] as KeyContactsStore["listItems"],
	listTotal: 0,
	listPage: 1,
	listLoading: false,
	listError: null as string | null,
	listSortBy: "contactCode" as KeyContactsStore["listSortBy"],
	listSortOrder: "asc" as KeyContactsStore["listSortOrder"],
	listSearch: "",
	listContactTypeFilter: undefined as KeyContactsStore["listContactTypeFilter"],
	contactDetail: null as KeyContactsStore["contactDetail"],
	contactDetailLoading: false,
	contactDetailError: null as string | null,
	isCreateKeyContactSubmitting: false,
	isSendKeyContactInviteSubmitting: false,
	isDeleteKeyContactSubmitting: false,
	isBulkUploadKeyContactsSubmitting: false,
};

export const useKeyContactsStore = create<KeyContactsStore>()((set, get) => ({
	...initialState,

	fetchKeyContacts: async (
		page: number,
		limit: number,
		params?: {
			sortBy?: KeyContactsStore["listSortBy"];
			sortOrder?: KeyContactsStore["listSortOrder"];
			search?: string;
			contactType?: string;
			corporationIds?: string[];
			companyIds?: string[];
			timezones?: string[];
		},
	) => {
		const { listSortBy, listSortOrder, listSearch, listContactTypeFilter } =
			get();
		const sortBy = params?.sortBy ?? listSortBy;
		const sortOrder = params?.sortOrder ?? listSortOrder;
		const search = params?.search ?? listSearch;
		const contactType = params?.contactType ?? listContactTypeFilter;
		const corporationIds = params?.corporationIds ?? [];
		const companyIds = params?.companyIds ?? [];
		const timezones = params?.timezones ?? [];
		set({ listLoading: true, listError: null });
		const result = await getKeyContactsApi({
			page,
			limit,
			sortBy,
			sortOrder,
			search: search?.trim() ? search.trim() : undefined,
			contactType: contactType?.trim() || undefined,
			corporationIds: corporationIds.length > 0 ? corporationIds : undefined,
			companyIds: companyIds.length > 0 ? companyIds : undefined,
			timezones: timezones.length > 0 ? timezones : undefined,
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

	setListPage: (page: number) => set({ listPage: page }),

	setListSort: (sortBy, sortOrder) =>
		set({ listSortBy: sortBy, listSortOrder: sortOrder }),

	setListSearch: (search) => set({ listSearch: search }),

	setListContactTypeFilter: (contactType) =>
		set({ listContactTypeFilter: contactType }),

	clearListError: () => set({ listError: null }),

	fetchKeyContactById: async (contactId: string) => {
		const id = contactId.trim();
		if (!id) {
			set({
				contactDetail: null,
				contactDetailLoading: false,
				contactDetailError: VIEW_CONTACT_DETAILS_PAGE.notFound,
			});
			return;
		}
		set({
			contactDetail: null,
			contactDetailLoading: true,
			contactDetailError: null,
		});
		const result = await getKeyContactByIdApi(id);
		if (!result.ok) {
			set({
				contactDetail: null,
				contactDetailLoading: false,
				contactDetailError:
					result.message ?? VIEW_CONTACT_DETAILS_PAGE.notFound,
			});
			return;
		}
		set({
			contactDetail: result.data,
			contactDetailLoading: false,
			contactDetailError: null,
		});
	},

	clearContactDetail: () =>
		set({
			contactDetail: null,
			contactDetailLoading: false,
			contactDetailError: null,
		}),

	createKeyContact: async (payload) => {
		set({ isCreateKeyContactSubmitting: true });
		try {
			const result = await createKeyContactApi(payload);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			toast.success(result.message);
			return true;
		} finally {
			set({ isCreateKeyContactSubmitting: false });
		}
	},

	sendKeyContactInvite: async (contactId, payload) => {
		set({ isSendKeyContactInviteSubmitting: true });
		try {
			const result = await sendKeyContactInviteApi(contactId, payload);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			const successMsg = result.message.trim();
			if (successMsg) toast.success(successMsg);
			return true;
		} finally {
			set({ isSendKeyContactInviteSubmitting: false });
		}
	},

	deleteKeyContact: async (contactId) => {
		const id = contactId.trim();
		if (!id) return false;
		set({ isDeleteKeyContactSubmitting: true });
		try {
			const result = await deleteKeyContactApi(id);
			if (!result.ok) {
				toast.error(result.message);
				return false;
			}
			const successMsg = result.message.trim();
			if (successMsg) toast.success(successMsg);
			set((state) => ({
				listItems: state.listItems.filter((item) => item.id !== id),
				listTotal: Math.max(0, state.listTotal - 1),
				contactDetail:
					state.contactDetail?.id === id ? null : state.contactDetail,
			}));
			return true;
		} finally {
			set({ isDeleteKeyContactSubmitting: false });
		}
	},

	bulkUploadKeyContacts: async (file: File) => {
		set({ isBulkUploadKeyContactsSubmitting: true });
		try {
			const result = await bulkUploadKeyContactsApi(file);
			if (!result.ok) {
				toast.error(result.message);
				return result;
			}
			const hasImportFailures = result.data.failed.length > 0;
			const successMsg = result.message.trim();
			if (successMsg && !hasImportFailures) {
				toast.success(successMsg);
			}
			return result;
		} finally {
			set({ isBulkUploadKeyContactsSubmitting: false });
		}
	},

	reset: () => set(initialState),
}));
