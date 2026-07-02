export interface RoleListItem {
	id: string;
	name: string;
	category: string;
	categoryId: string;
	isPrivate: boolean;
	isExternal: boolean;
	description: string | null;
}

export interface RoleListData {
	items: RoleListItem[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface RoleCategoryOption {
	id: string;
	name: string;
}

/** Role row inside GET /roles/categories/with-roles `data[].roles[]`. */
export interface RoleSummaryInCategory {
	id: string;
	name: string;
	description: string | null;
	isPrivate: boolean;
	isExternal: boolean;
}

/** Category with nested roles — GET /roles/categories/with-roles. */
export interface RoleCategoryWithRoles {
	id: string;
	name: string;
	description: string | null;
	roles: RoleSummaryInCategory[];
}

export type RoleSortBy = "name" | "category" | "roleType" | "description";

export type RoleSortOrder = "asc" | "desc";

export interface ListRolesParams {
	page: number;
	limit: number;
	sortBy?: RoleSortBy;
	sortOrder?: RoleSortOrder;
	search?: string;
	categoryId?: string;
}

export interface RolesStore {
	listItems: RoleListItem[];
	listTotal: number;
	listPage: number;
	listLoading: boolean;
	listSortBy: RoleSortBy;
	listSortOrder: RoleSortOrder;
	listCategoryFilter: string | undefined;
	listSearch: string;
	listError: string | null;
	fetchRoles: (
		page: number,
		limit: number,
		params?: {
			sortBy?: RoleSortBy;
			sortOrder?: RoleSortOrder;
			search?: string;
			categoryId?: string;
		},
	) => Promise<void>;
	setListPage: (page: number) => void;
	setListSort: (sortBy: RoleSortBy, sortOrder: RoleSortOrder) => void;
	setListCategoryFilter: (categoryId: string | undefined) => void;
	setListSearch: (search: string) => void;
	clearListError: () => void;
}

export interface SubmoduleOption {
	id: string;
	key: string;
	name: string;
}

export interface ModuleWithSubmodules {
	id: string;
	name: string;
	submodules: SubmoduleOption[];
}

/** Flattened row for the role permissions DataTable. */
export interface RolePermissionRow {
	id: string;
	submoduleId: string;
	moduleName: string;
	submoduleName: string;
}

export interface RoleFormPayload {
	name: string;
	categoryId: string;
	description: string;
	isPrivate: boolean;
	isExternal: boolean;
	submoduleIds: string[];
}

export type RoleFormProps = {
	/** Form id for external submit button (e.g. in page header) via form="..." */
	formId: string;
	initialValues?: Partial<RoleFormPayload>;
	modules: ModuleWithSubmodules[];
	categories: RoleCategoryOption[];
	onSubmit: (payload: RoleFormPayload) => Promise<void>;
	submitLabel: string;
	isSubmitting?: boolean;
	/** Refetch permission grid modules when the role category changes. */
	onCategoryChange?: (categoryId: string) => Promise<string[] | undefined>;
};

export interface RoleDetailResponse {
	id: string;
	name: string;
	categoryId: string;
	category: string;
	description: string | null;
	isPrivate: boolean;
	isExternal: boolean;
	submoduleIds: string[];
}
