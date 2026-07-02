import { Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	ConfirmationModal,
	DataTable,
	TableSkeleton,
	WhiteBox,
} from "@/components";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DATA_TABLE_CONFIG,
	FORM_PLACEHOLDERS,
	ROLES_PAGE_CONTENT,
	ROUTES,
} from "@/const";
import { useDebounce } from "@/hooks";
import { useRolesStore } from "@/store";
import { getRolesDirectoryColumns } from "@/tables";
import type { RoleSortBy } from "@/types";

const PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;

export function RolesContent() {
	const navigate = useNavigate();
	const {
		listItems,
		listTotal,
		listPage,
		listLoading,
		listSortBy,
		listSortOrder,
		listCategoryFilter,
		listSearch,
		categories,
		fetchRoles,
		fetchCategories,
		deleteRole,
		setListPage,
		setListSort,
		setListCategoryFilter,
		setListSearch,
	} = useRolesStore();

	const debouncedSearch = useDebounce(listSearch.trim());
	const searchForApi =
		debouncedSearch.length >= 3 || debouncedSearch === ""
			? debouncedSearch
			: "";

	const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
	const [isDeleteInProgress, setIsDeleteInProgress] = useState(false);

	const handleDeleteClick = useCallback((roleId: string) => {
		setRoleToDelete(roleId);
	}, []);

	const handleConfirmDelete = useCallback(async () => {
		if (!roleToDelete) return;
		setIsDeleteInProgress(true);
		const success = await deleteRole(roleToDelete);
		setIsDeleteInProgress(false);
		setRoleToDelete(null);
		if (success) {
			await fetchRoles(listPage, PAGE_SIZE, {
				sortBy: listSortBy,
				sortOrder: listSortOrder,
				categoryId: listCategoryFilter,
				search: searchForApi || undefined,
			});
		}
	}, [
		roleToDelete,
		deleteRole,
		fetchRoles,
		listPage,
		listSortBy,
		listSortOrder,
		listCategoryFilter,
		searchForApi,
	]);

	const columns = useMemo(
		() =>
			getRolesDirectoryColumns((roleId: string) => {
				navigate(ROUTES.roles.editWithIdPath(roleId));
			}, handleDeleteClick),
		[navigate, handleDeleteClick],
	);

	const lastFetched = useRef<{
		page: number;
		limit: number;
		sortBy: string;
		sortOrder: string;
		categoryId: string | undefined;
		search: string;
	} | null>(null);

	useEffect(() => {
		fetchCategories();
	}, [fetchCategories]);

	useEffect(() => {
		const key = {
			page: listPage,
			limit: PAGE_SIZE,
			sortBy: listSortBy,
			sortOrder: listSortOrder,
			categoryId: listCategoryFilter,
			search: searchForApi,
		};
		if (
			lastFetched.current?.page === key.page &&
			lastFetched.current?.limit === key.limit &&
			lastFetched.current?.sortBy === key.sortBy &&
			lastFetched.current?.sortOrder === key.sortOrder &&
			lastFetched.current?.categoryId === key.categoryId &&
			lastFetched.current?.search === key.search
		) {
			return;
		}
		lastFetched.current = key;
		fetchRoles(listPage, PAGE_SIZE, {
			sortBy: listSortBy,
			sortOrder: listSortOrder,
			categoryId: listCategoryFilter,
			search: searchForApi || undefined,
		});
	}, [
		listPage,
		listSortBy,
		listSortOrder,
		listCategoryFilter,
		searchForApi,
		fetchRoles,
	]);

	const handleSort = useCallback(
		(columnId: string) => {
			if (columnId === "actions") return;
			const sortBy = columnId as RoleSortBy;
			const nextOrder =
				listSortBy === sortBy && listSortOrder === "asc" ? "desc" : "asc";
			setListSort(sortBy, nextOrder);
			setListPage(1);
		},
		[listSortBy, listSortOrder, setListSort, setListPage],
	);

	const handleCategoryFilterChange = useCallback(
		(value: string) => {
			const categoryId = value === "all" ? undefined : value;
			setListCategoryFilter(categoryId);
			setListPage(1);
		},
		[setListCategoryFilter, setListPage],
	);

	const pageIndex = listPage - 1;
	const sortColumnId = listSortBy;

	return (
		<WhiteBox>
			<ConfirmationModal
				open={roleToDelete != null}
				onOpenChange={(open) => {
					if (!open && !isDeleteInProgress) setRoleToDelete(null);
				}}
				title={ROLES_PAGE_CONTENT.deleteRoleDialogTitle}
				description={ROLES_PAGE_CONTENT.deleteRoleDialogDescription}
				icon={<Trash2 className="text-destructive size-12" aria-hidden />}
				confirmLabel={ROLES_PAGE_CONTENT.deleteRoleDialogConfirm}
				cancelLabel={ROLES_PAGE_CONTENT.deleteRoleDialogCancel}
				onConfirm={handleConfirmDelete}
				isConfirming={isDeleteInProgress}
				variant="destructive"
			/>
			<div className="flex flex-col gap-6">
				<div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<InputGroup className="h-9 w-full min-w-0 lg:max-w-xs lg:flex-1">
						<InputGroupAddon align="inline-start">
							<Search className="size-4 text-muted-foreground" />
						</InputGroupAddon>
						<InputGroupInput
							type="search"
							placeholder={FORM_PLACEHOLDERS.searchByRoleName}
							value={listSearch}
							onChange={(e) => setListSearch(e.target.value)}
							aria-label={ROLES_PAGE_CONTENT.searchAriaLabel}
						/>
					</InputGroup>
					<Select
						value={listCategoryFilter ?? "all"}
						onValueChange={handleCategoryFilterChange}
					>
						<SelectTrigger
							className="h-10 w-full min-w-0 sm:w-52 lg:shrink-0"
							aria-label={ROLES_PAGE_CONTENT.categoryFilterAriaLabel}
						>
							<SelectValue placeholder={ROLES_PAGE_CONTENT.allCategories} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">
								{ROLES_PAGE_CONTENT.allCategories}
							</SelectItem>
							{categories.map((cat) => (
								<SelectItem key={cat.id} value={cat.id}>
									{cat.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="min-w-0">
					{listLoading ? (
						<TableSkeleton
							columns={columns}
							rowCount={PAGE_SIZE}
							showPagination
							fixedHeight
						/>
					) : (
						<DataTable
							data={listItems}
							columns={columns}
							pageSize={PAGE_SIZE}
							emptyMessage={ROLES_PAGE_CONTENT.noData}
							entityLabel={{ singular: "role", plural: "roles" }}
							serverPagination={{
								totalCount: listTotal,
								pageIndex,
								onPageChange: (idx) => setListPage(idx + 1),
							}}
							serverSort={{
								sortColumnId,
								sortDirection: listSortOrder,
								onSort: handleSort,
							}}
							fixedHeight
						/>
					)}
				</div>
			</div>
		</WhiteBox>
	);
}
