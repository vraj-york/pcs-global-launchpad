import { toast } from "sonner";
import { create } from "zustand";
import {
	createCompanyNew as createCompanyNewApi,
	getCompanyById as getCompanyByIdApi,
	getCorporationsList as getCorporationsListApi,
	patchCompanyBasicInfo as patchCompanyBasicInfoApi,
	postCompanyConfirmation as postCompanyConfirmationApi,
	postKeyContacts as postKeyContactsApi,
	putCompanyConfiguration as putCompanyConfigurationApi,
	putCompanyPlanSeats as putCompanyPlanSeatsApi,
} from "@/api";
import type { AddCompanyConfigurationSchemaType } from "@/schemas";
import type {
	CompanyBasicInfoPatchPayload,
	CompanyBasicInfoPostPayload,
	CompanyDirectoryActions,
	CompanyDirectoryState,
	CompanyPlanSeatsPayload,
	KeyContactsPayload,
} from "@/types";

const initialState: CompanyDirectoryState = {
	corporationsList: [],
	corporationsListLoading: false,
	corporationsListError: null,
	companyDetail: null,
	companyDetailLoading: false,
	companyDetailError: null,
	companyDetailErrorStatus: null,
	companyActionLoading: false,
};

export const useCompanyDirectoryStore = create<
	CompanyDirectoryState & CompanyDirectoryActions
>()((set) => ({
	...initialState,

	fetchCorporationsList: async () => {
		set({ corporationsListLoading: true, corporationsListError: null });
		const result = await getCorporationsListApi();
		if (!result.ok) {
			set({
				corporationsListLoading: false,
				corporationsListError: result.message,
			});
			return;
		}
		set({
			corporationsList: result.data,
			corporationsListLoading: false,
			corporationsListError: null,
		});
	},

	createCompany: async (
		corporationId: string,
		body: CompanyBasicInfoPostPayload,
	) => {
		set({ companyActionLoading: true });
		const result = await createCompanyNewApi(corporationId, body);
		set({ companyActionLoading: false });
		if (!result.ok) {
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		const id = result.data?.data?.id;
		if (typeof id !== "string") {
			toast.error("Invalid response");
			return { ok: false as const, error: "Invalid response" };
		}
		return { ok: true as const, id };
	},

	updateCompanyBasicInfo: async (
		companyId: string,
		body: CompanyBasicInfoPatchPayload,
	) => {
		set({ companyActionLoading: true });
		const result = await patchCompanyBasicInfoApi(companyId, body);
		set({ companyActionLoading: false });
		if (!result.ok) {
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		return { ok: true as const, id: companyId };
	},

	submitKeyContacts: async (companyId: string, body: KeyContactsPayload) => {
		set({ companyActionLoading: true });
		const result = await postKeyContactsApi(companyId, body);
		set({ companyActionLoading: false });
		if (!result.ok) {
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		return { ok: true as const };
	},

	submitPlanSeats: async (companyId: string, body: CompanyPlanSeatsPayload) => {
		set({ companyActionLoading: true });
		const result = await putCompanyPlanSeatsApi(companyId, body);
		set({ companyActionLoading: false });
		if (!result.ok) {
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		return { ok: true as const };
	},

	submitCompanyConfiguration: async (
		companyId: string,
		values: AddCompanyConfigurationSchemaType,
	) => {
		set({ companyActionLoading: true });
		const result = await putCompanyConfigurationApi(companyId, values);
		set({ companyActionLoading: false });
		if (!result.ok) {
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		return { ok: true as const };
	},

	submitCompanyConfirmation: async (companyId: string) => {
		set({ companyActionLoading: true });
		const result = await postCompanyConfirmationApi(companyId);
		set({ companyActionLoading: false });
		if (!result.ok) {
			toast.error(result.message);
			return { ok: false as const, error: result.message };
		}
		return { ok: true as const };
	},

	fetchCompanyById: async (companyId: string) => {
		set({
			companyDetailLoading: true,
			companyDetailError: null,
			companyDetailErrorStatus: null,
		});
		const result = await getCompanyByIdApi(companyId);
		if (!result.ok) {
			set({
				companyDetailLoading: false,
				companyDetailError: result.message,
				companyDetailErrorStatus: result.status ?? null,
			});
			return;
		}
		set({
			companyDetail: result.data,
			companyDetailLoading: false,
			companyDetailError: null,
			companyDetailErrorStatus: null,
		});
	},

	clearCompanyDetail: () => {
		set({
			companyDetail: null,
			companyDetailError: null,
			companyDetailErrorStatus: null,
		});
	},

	reset: () => {
		set(initialState);
	},
}));
