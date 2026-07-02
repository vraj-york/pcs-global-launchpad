import { toast } from "sonner";
import { create } from "zustand";
import {
	createCompany as createCompanyApi,
	createCorporation as createCorporationApi,
	deleteCompany as deleteCompanyApi,
	getCorporationById as getCorporationByIdApi,
	getCorporations as getCorporationsApi,
	reinstateCorporation as reinstateCorporationApi,
	submitCorporationStep as submitCorporationStepApi,
	updateCompany as updateCompanyApi,
	updateCorporation as updateCorporationApi,
	updateCorporationStatus as updateCorporationStatusApi,
	updateKeyContact as updateKeyContactApi,
} from "@/api";
import { isApiError } from "@/lib/apiClient";
import type {
	CorporationDetailAppKeyContact,
	CorporationStepType,
	CorporationsStore,
	CreateCompanyBody,
	CreateCorporationBody,
	UpdateCorporationStatusBody,
	UpdateKeyContactBody,
	UpdateKeyContactResponse,
} from "@/types";

const initialState = {
	corporationId: null as string | null,
	isLoading: false,
	companyActionLoading: false,
	error: null as string | null,
	listItems: [] as CorporationsStore["listItems"],
	listTotal: 0,
	listPage: 1,
	listLoading: false,
	listError: null as string | null,
	listSortBy: "createdAt" as CorporationsStore["listSortBy"],
	listSortOrder: "desc" as CorporationsStore["listSortOrder"],
	listCreatedFilter: undefined as CorporationsStore["listCreatedFilter"],
	listStatusFilter: undefined as CorporationsStore["listStatusFilter"],
	listSearch: "",
	corporationDetail: null as CorporationsStore["corporationDetail"],
	corporationDetailLoading: false,
	corporationDetailError: null as string | null,
	corporationDetailErrorStatus: null as number | null,
};

export const useCorporationsStore = create<CorporationsStore>()((set, get) => ({
	...initialState,

	createCorporation: async (body: CreateCorporationBody) => {
		set({ isLoading: true, error: null });
		const result = await createCorporationApi(body);
		if (isApiError(result)) {
			set({ isLoading: false, error: result.message });
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		const id = result.data?.data?.id;
		if (id) {
			set({ corporationId: id, isLoading: false, error: null });
			return { ok: true as const, id };
		}
		set({ isLoading: false, error: "Invalid response" });
		toast.error("Invalid response");
		return { ok: false as const, error: "Invalid response" };
	},

	createCompany: async (body: CreateCompanyBody) => {
		const { corporationId } = get();
		if (!corporationId) {
			const msg = "Corporation ID is missing.";
			set({ error: msg });
			toast.error(msg);
			return { ok: false as const, error: msg };
		}
		set({ companyActionLoading: true, error: null });
		const result = await createCompanyApi(corporationId, body);
		if (isApiError(result)) {
			set({ companyActionLoading: false, error: result.message });
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		set({ companyActionLoading: false, error: null });
		await get().fetchCorporationById(corporationId);
		return { ok: true as const };
	},

	updateCorporation: async (
		corporationId: string,
		body: Parameters<typeof updateCorporationApi>[1],
	) => {
		set({ isLoading: true, error: null });
		const result = await updateCorporationApi(corporationId, body);
		if (isApiError(result)) {
			set({ isLoading: false, error: result.message });
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		const data = result.data?.data;
		if (data) {
			set({ corporationDetail: data, isLoading: false, error: null });
		} else {
			set({ isLoading: false });
		}
		return { ok: true as const };
	},

	updateCompany: async (
		corporationId: string,
		companyId: string,
		body: Parameters<typeof updateCompanyApi>[2],
	) => {
		set({ companyActionLoading: true, error: null });
		const result = await updateCompanyApi(corporationId, companyId, body);
		if (isApiError(result)) {
			set({ companyActionLoading: false, error: result.message });
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		set({ companyActionLoading: false, error: null });
		// Refetch corporation detail so confirmation step and store stay in sync
		await get().fetchCorporationById(corporationId);
		return { ok: true as const };
	},

	updateCorporationStatus: async (
		corporationId: string,
		body: UpdateCorporationStatusBody,
	) => {
		set({ isLoading: true, error: null });
		const result = await updateCorporationStatusApi(corporationId, body);
		if (isApiError(result)) {
			set({ isLoading: false, error: result.message });
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		set({ isLoading: false, error: null });
		toast.success(result.data?.message);
		await get().fetchCorporationById(corporationId);
		return { ok: true as const };
	},

	reinstateCorporation: async (corporationId: string) => {
		set({ isLoading: true, error: null });
		const result = await reinstateCorporationApi(corporationId);
		if (isApiError(result)) {
			set({ isLoading: false, error: result.message });
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		set({ isLoading: false, error: null });
		const msg = (result.data as { message?: string })?.message;
		if (msg) toast.success(msg);
		await get().fetchCorporationById(corporationId);
		return { ok: true as const };
	},

	updateKeyContact: async (
		corporationId: string,
		body: UpdateKeyContactBody,
	) => {
		set({ isLoading: true, error: null });
		const result = await updateKeyContactApi(corporationId, body);
		if (isApiError(result)) {
			set({ isLoading: false, error: result.message });
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		const successData = result.data as { data: UpdateKeyContactResponse };
		const keyContactData: UpdateKeyContactResponse | null =
			successData?.data ?? null;
		const { corporationDetail } = get();
		if (corporationDetail && corporationDetail.id === corporationId) {
			const contacts = [...(corporationDetail.appKeyContacts ?? [])];
			const idx = contacts.findIndex(
				(c) => c.contactType === "legal_compliance_contact",
			);
			let appKeyContacts: CorporationDetailAppKeyContact[];
			if (!body.complianceContact || !keyContactData) {
				appKeyContacts = contacts.filter(
					(c) => c.contactType !== "legal_compliance_contact",
				);
			} else {
				const row: CorporationDetailAppKeyContact = {
					id: keyContactData.id,
					corporationId,
					firstName: keyContactData.firstName,
					lastName: keyContactData.lastName,
					nickname: keyContactData.nickname,
					email: keyContactData.email,
					contactType: keyContactData.contactType,
					jobRole: keyContactData.jobRole,
					workPhone: keyContactData.workPhone,
					cellPhone: keyContactData.cellPhone,
					sameAsCorpAdmin: false,
				};
				if (idx >= 0) contacts[idx] = row;
				else contacts.push(row);
				appKeyContacts = contacts;
			}
			set({
				corporationDetail: {
					...corporationDetail,
					appKeyContacts,
				},
				isLoading: false,
				error: null,
			});
			return { ok: true as const };
		}
		set({ isLoading: false, error: null });
		return { ok: true as const };
	},

	deleteCompany: async (corporationId: string, companyId: string) => {
		set({ companyActionLoading: true, error: null });
		const result = await deleteCompanyApi(corporationId, companyId);
		if (isApiError(result)) {
			set({ companyActionLoading: false, error: result.message });
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		set({ companyActionLoading: false, error: null });
		toast.success(result.data?.message);
		await get().fetchCorporationById(corporationId);
		return { ok: true as const };
	},

	submitStep: async (type: CorporationStepType) => {
		const { corporationId } = get();
		if (!corporationId) {
			const msg = "Corporation ID is missing.";
			set({ error: msg });
			toast.error(msg);
			return { ok: false as const, error: msg };
		}
		set({ isLoading: true, error: null });
		const result = await submitCorporationStepApi(corporationId, type);
		if (isApiError(result)) {
			set({ isLoading: false, error: result.message });
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		set({ isLoading: false, error: null });
		return { ok: true as const };
	},

	clearError: () => set({ error: null }),

	fetchCorporationById: async (corporationId: string) => {
		set({
			corporationDetailLoading: true,
			corporationDetailError: null,
			corporationDetailErrorStatus: null,
		});
		const result = await getCorporationByIdApi(corporationId);
		set({ corporationDetailLoading: false });
		if (!result.ok) {
			set({
				corporationDetailError: result.message,
				corporationDetailErrorStatus: result.status,
			});
			toast.error(result.message);
			return;
		}
		if (result.data) {
			set({
				corporationDetail: result.data,
				corporationId,
				corporationDetailError: null,
				corporationDetailErrorStatus: null,
			});
		}
	},

	fetchCorporations: async (
		page: number,
		limit: number,
		params?: {
			sortBy?: CorporationsStore["listSortBy"];
			sortOrder?: CorporationsStore["listSortOrder"];
			createdFilter?: CorporationsStore["listCreatedFilter"];
			status?: CorporationsStore["listStatusFilter"];
			search?: string;
		},
	) => {
		const { listSortBy, listSortOrder, listCreatedFilter, listStatusFilter } =
			get();
		const sortBy = params?.sortBy ?? listSortBy;
		const sortOrder = params?.sortOrder ?? listSortOrder;
		const createdFilter = params?.createdFilter ?? listCreatedFilter;
		const status = params?.status ?? listStatusFilter;
		const search = params?.search;
		set({ listLoading: true, listError: null });
		const result = await getCorporationsApi({
			page,
			limit,
			sortBy,
			sortOrder,
			createdFilter,
			status,
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

	setListSort: (
		sortBy: CorporationsStore["listSortBy"],
		sortOrder: CorporationsStore["listSortOrder"],
	) => set({ listSortBy: sortBy, listSortOrder: sortOrder }),

	setListCreatedFilter: (
		createdFilter: CorporationsStore["listCreatedFilter"],
	) => set({ listCreatedFilter: createdFilter }),

	setListStatusFilter: (status: CorporationsStore["listStatusFilter"]) =>
		set({ listStatusFilter: status }),

	setListSearch: (search: string) => set({ listSearch: search }),

	clearListError: () => set({ listError: null }),

	clearCorporationDetail: () =>
		set({
			corporationDetail: null,
			corporationDetailError: null,
			corporationDetailErrorStatus: null,
		}),

	reset: () => set(initialState),
}));
