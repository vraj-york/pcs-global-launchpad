import { API_ENDPOINTS } from "@/const";
import { apiClient, isApiError } from "@/lib/apiClient";
import type {
	ListRolesParams,
	ModuleWithSubmodules,
	RoleCategoryOption,
	RoleCategoryWithRoles,
	RoleDetailResponse,
	RoleFormPayload,
	RoleListData,
	RoleListItem,
} from "@/types";

export async function getModulesWithSubmodules(roleCategoryId?: string) {
	const url = roleCategoryId?.trim()
		? `${API_ENDPOINTS.permissions.modulesWithSubmodules}?roleCategoryId=${encodeURIComponent(roleCategoryId.trim())}`
		: API_ENDPOINTS.permissions.modulesWithSubmodules;
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: ModuleWithSubmodules[];
	}>(url);
	if (isApiError(result)) return result;
	const raw = result.data?.data;
	if (!raw || !Array.isArray(raw))
		return { ok: false as const, message: "Invalid response", status: 0 };
	const data: ModuleWithSubmodules[] = raw.map((module) => ({
		id: module.id,
		name: module.name,
		submodules: Array.isArray(module.submodules) ? module.submodules : [],
	}));
	return { ok: true as const, data };
}

export async function getCategoryEnabledSubmodules(categoryId: string) {
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: { submoduleIds: string[] };
	}>(API_ENDPOINTS.roles.categoryEnabledSubmodules(categoryId));
	if (isApiError(result)) return result;
	const submoduleIds = result.data?.data?.submoduleIds;
	if (!Array.isArray(submoduleIds))
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data: submoduleIds };
}

export async function getRoleById(roleId: string) {
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: RoleDetailResponse;
	}>(API_ENDPOINTS.roles.byId(roleId));
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}

export async function createRole(payload: RoleFormPayload) {
	const result = await apiClient.post<{
		success: boolean;
		message: string;
		data: RoleListItem;
	}>(API_ENDPOINTS.roles.root, payload);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}

export async function updateRole(roleId: string, payload: RoleFormPayload) {
	const result = await apiClient.patch<{
		success: boolean;
		message: string;
		data: RoleListItem;
	}>(API_ENDPOINTS.roles.byId(roleId), payload);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}

export async function deleteRole(roleId: string) {
	const result = await apiClient.delete<{
		success: boolean;
		message: string;
		data: { id: string };
	}>(API_ENDPOINTS.roles.byId(roleId));
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}

export async function getRoles(params: ListRolesParams) {
	const { page, limit, sortBy, sortOrder, search, categoryId } = params;
	const searchParams = new URLSearchParams({
		page: String(page),
		limit: String(limit),
	});
	if (sortBy) searchParams.set("sortBy", sortBy);
	if (sortOrder) searchParams.set("sortOrder", sortOrder);
	if (search?.trim()) searchParams.set("search", search.trim());
	if (categoryId?.trim()) searchParams.set("categoryId", categoryId.trim());
	const url = `${API_ENDPOINTS.roles.root}?${searchParams.toString()}`;
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: RoleListData;
	}>(url);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return {
		ok: true as const,
		data: {
			items: data.items as RoleListItem[],
			total: data.total,
			page: data.page,
			limit: data.limit,
			totalPages: data.totalPages,
		},
	};
}

export async function getRoleCategories() {
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: RoleCategoryOption[];
	}>(API_ENDPOINTS.roles.categories);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data)
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}

/**
 * Role categories each with nested roles for user edit / assignment flows.
 * GET /roles/categories/with-roles
 */
export async function getRoleCategoriesWithRoles() {
	const result = await apiClient.get<{
		success: boolean;
		message: string;
		data: RoleCategoryWithRoles[];
	}>(API_ENDPOINTS.roles.categoriesWithRoles);
	if (isApiError(result)) return result;
	const data = result.data?.data;
	if (!data || !Array.isArray(data))
		return { ok: false as const, message: "Invalid response", status: 0 };
	return { ok: true as const, data };
}
