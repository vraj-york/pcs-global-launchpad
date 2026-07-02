import { toast } from "sonner";
import { create } from "zustand";
import {
	createRole as createRoleApi,
	deleteRole as deleteRoleApi,
	getCategoryEnabledSubmodules as getCategoryEnabledSubmodulesApi,
	getModulesWithSubmodules as getModulesWithSubmodulesApi,
	getRoleById as getRoleByIdApi,
	getRoleCategories as getRoleCategoriesApi,
	getRoles as getRolesApi,
	updateRole as updateRoleApi,
} from "@/api";
import { ROLES_PAGE_CONTENT } from "@/const";
import type {
	RolesStore as IRolesStore,
	ModuleWithSubmodules,
	RoleCategoryOption,
	RoleFormPayload,
} from "@/types";

const initialState = {
	listItems: [] as IRolesStore["listItems"],
	listTotal: 0,
	listPage: 1,
	listLoading: false,
	listSortBy: "name" as IRolesStore["listSortBy"],
	listSortOrder: "asc" as IRolesStore["listSortOrder"],
	listCategoryFilter: undefined as string | undefined,
	listSearch: "",
	listError: null as string | null,
	categories: [] as RoleCategoryOption[],
	categoriesLoading: false,
	modules: [] as ModuleWithSubmodules[],
	modulesLoading: false,
	formDataError: null as string | null,
	createRoleLoading: false,
	updateRoleLoading: false,
	editRoleId: null as string | null,
	editRoleInitialValues: null as Partial<RoleFormPayload> | null,
	editRoleLoading: false,
	editRoleError: null as string | null,
};

export const useRolesStore = create<
	IRolesStore & {
		categories: RoleCategoryOption[];
		categoriesLoading: boolean;
		fetchCategories: () => Promise<void>;
		modules: ModuleWithSubmodules[];
		modulesLoading: boolean;
		formDataError: string | null;
		fetchRoleFormData: () => Promise<void>;
		fetchModulesForCategory: (roleCategoryId: string) => Promise<string[]>;
		createRoleLoading: boolean;
		createRole: (payload: RoleFormPayload) => Promise<boolean>;
		updateRoleLoading: boolean;
		updateRole: (roleId: string, payload: RoleFormPayload) => Promise<boolean>;
		deleteRole: (roleId: string) => Promise<boolean>;
		editRoleId: string | null;
		editRoleInitialValues: Partial<RoleFormPayload> | null;
		editRoleLoading: boolean;
		editRoleError: string | null;
		fetchRoleForEdit: (roleId: string | null) => Promise<void>;
		clearEditRoleState: () => void;
	}
>()((set, get) => ({
	...initialState,

	fetchRoles: async (
		page: number,
		limit: number,
		params?: {
			sortBy?: IRolesStore["listSortBy"];
			sortOrder?: IRolesStore["listSortOrder"];
			search?: string;
			categoryId?: string;
		},
	) => {
		const { listSortBy, listSortOrder, listCategoryFilter } = get();
		const sortBy = params?.sortBy ?? listSortBy;
		const sortOrder = params?.sortOrder ?? listSortOrder;
		const categoryId = params?.categoryId ?? listCategoryFilter;
		const search = params?.search;
		set({ listLoading: true, listError: null });
		const result = await getRolesApi({
			page,
			limit,
			sortBy,
			sortOrder,
			search,
			categoryId,
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

	setListSort: (
		sortBy: IRolesStore["listSortBy"],
		sortOrder: IRolesStore["listSortOrder"],
	) => set({ listSortBy: sortBy, listSortOrder: sortOrder }),

	setListCategoryFilter: (categoryId: string | undefined) =>
		set({ listCategoryFilter: categoryId }),

	setListSearch: (search: string) => set({ listSearch: search }),

	clearListError: () => set({ listError: null }),

	fetchCategories: async () => {
		set({ categoriesLoading: true });
		const result = await getRoleCategoriesApi();
		set({ categoriesLoading: false });
		if (!result.ok) {
			toast.error(result.message);
			return;
		}
		if (result.data) set({ categories: result.data });
	},

	fetchRoleFormData: async () => {
		set({ modulesLoading: true, categoriesLoading: true, formDataError: null });
		const [catRes, modRes] = await Promise.all([
			getRoleCategoriesApi(),
			getModulesWithSubmodulesApi(),
		]);
		set({ modulesLoading: false, categoriesLoading: false });
		if (catRes.ok && catRes.data) set({ categories: catRes.data });
		else if (!catRes.ok) toast.error((catRes as { message: string }).message);
		if (modRes.ok && modRes.data)
			set({ modules: modRes.data, formDataError: null });
		else {
			const errMsg = !modRes.ok
				? (modRes as { message: string }).message
				: ROLES_PAGE_CONTENT.submoduleDataUnavailable;
			set({ formDataError: errMsg });
			toast.error(errMsg);
		}
	},

	fetchModulesForCategory: async (
		roleCategoryId: string,
	): Promise<string[]> => {
		if (!roleCategoryId.trim()) return [];
		set({ modulesLoading: true, formDataError: null });
		const [modRes, subRes] = await Promise.all([
			getModulesWithSubmodulesApi(roleCategoryId),
			getCategoryEnabledSubmodulesApi(roleCategoryId),
		]);
		set({ modulesLoading: false });
		if (modRes.ok && modRes.data) {
			set({ modules: modRes.data, formDataError: null });
		} else {
			const errMsg = !modRes.ok
				? (modRes as { message: string }).message
				: ROLES_PAGE_CONTENT.submoduleDataUnavailable;
			set({ formDataError: errMsg });
			toast.error(errMsg);
			return [];
		}
		if (!subRes.ok) {
			const errMsg = (subRes as { message: string }).message;
			set({ formDataError: errMsg });
			toast.error(errMsg);
			return [];
		}
		return subRes.data;
	},

	createRole: async (payload: RoleFormPayload) => {
		set({ createRoleLoading: true });
		const result = await createRoleApi(payload);
		set({ createRoleLoading: false });
		if (!result.ok) {
			const m = (result as { message: string | string[] }).message;
			const msg =
				typeof m === "string"
					? m
					: Array.isArray(m)
						? m.join(", ")
						: ROLES_PAGE_CONTENT.failedToCreateRole;
			toast.error(msg);
			return false;
		}
		toast.success(ROLES_PAGE_CONTENT.roleCreatedSuccess);
		return true;
	},

	updateRole: async (roleId: string, payload: RoleFormPayload) => {
		set({ updateRoleLoading: true });
		const result = await updateRoleApi(roleId, payload);
		set({ updateRoleLoading: false });
		if (!result.ok) {
			const m = (result as { message: string | string[] }).message;
			const msg =
				typeof m === "string"
					? m
					: Array.isArray(m)
						? m.join(", ")
						: ROLES_PAGE_CONTENT.failedToUpdateRole;
			toast.error(msg);
			return false;
		}
		toast.success(ROLES_PAGE_CONTENT.roleUpdatedSuccess);
		return true;
	},

	deleteRole: async (roleId: string) => {
		const result = await deleteRoleApi(roleId);
		if (!result.ok) {
			const m = (result as { message: string | string[] }).message;
			const msg =
				typeof m === "string"
					? m
					: Array.isArray(m)
						? m.join(", ")
						: ROLES_PAGE_CONTENT.failedToDeleteRole;
			toast.error(msg);
			return false;
		}
		toast.success(ROLES_PAGE_CONTENT.roleDeletedSuccess);
		return true;
	},

	clearEditRoleState: () =>
		set({
			editRoleId: null,
			editRoleInitialValues: null,
			editRoleLoading: false,
			editRoleError: null,
			updateRoleLoading: false,
		}),

	fetchRoleForEdit: async (roleId: string | null) => {
		if (!roleId) {
			set({
				editRoleId: null,
				editRoleInitialValues: null,
				editRoleLoading: false,
				editRoleError: ROLES_PAGE_CONTENT.roleIdMissing,
			});
			return;
		}
		set({
			editRoleId: roleId,
			editRoleLoading: true,
			editRoleError: null,
			editRoleInitialValues: null,
		});
		await get().fetchRoleFormData();
		if (get().editRoleId !== roleId) return;
		const roleRes = await getRoleByIdApi(roleId);
		if (get().editRoleId !== roleId) return;
		if (roleRes.ok && roleRes.data) {
			const categoryId = roleRes.data.categoryId;
			set({
				editRoleInitialValues: {
					name: roleRes.data.name,
					categoryId,
					description: roleRes.data.description ?? "",
					isPrivate: roleRes.data.isPrivate,
					isExternal: roleRes.data.isExternal,
					submoduleIds: roleRes.data.submoduleIds,
				},
				editRoleLoading: false,
				editRoleError: null,
			});
			await get().fetchModulesForCategory(categoryId);
		} else {
			const roleErrMsg = !roleRes.ok
				? (roleRes as { message: string }).message
				: ROLES_PAGE_CONTENT.roleNotFound;
			set({
				editRoleLoading: false,
				editRoleError: roleErrMsg,
				editRoleInitialValues: null,
			});
			toast.error(roleErrMsg);
		}
	},
}));
