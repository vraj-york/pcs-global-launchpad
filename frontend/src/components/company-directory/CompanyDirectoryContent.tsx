import { RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	ConfirmationModal,
	DataTable,
	SuspendCompanyModal,
	TableSkeleton,
	WhiteBox,
} from "@/components";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
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
	COMPANIES_DIRECTORY_PAGE_CONTENT,
	COMPANY_DATE_FILTER_OPTIONS,
	DATA_TABLE_CONFIG,
	FORM_PLACEHOLDERS,
} from "@/const";
import { useDebounce, useUserRoles } from "@/hooks";
import { useCompaniesStore } from "@/store";
import { getCompanyDirectoryColumns } from "@/tables";
import type {
	CompanyApiCreatedFilter,
	CompanyApiSortBy,
	CompanyApiStatusFilter,
	CompanyDirectoryItem,
} from "@/types";

const PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;
const CD = COMPANIES_DIRECTORY_PAGE_CONTENT;

export function CompanyDirectoryContent() {
	const navigate = useNavigate();
	const { isSuperAdmin, isCorporationAdmin } = useUserRoles();

	const {
		listItems,
		listTotal,
		listPage,
		listLoading,
		listSortBy,
		listSortOrder,
		listCreatedFilter,
		listStatusFilter,
		listCorporationFilter,
		listPlanTypeFilter,
		listSearch,
		filterOptions,
		filterOptionsLoading,
		fetchCompanies,
		fetchFilterOptions,
		suspendCompany,
		reinstateCompany,
		setListPage,
		setListSort,
		setListCreatedFilter,
		setListStatusFilter,
		setListCorporationFilter,
		setListPlanTypeFilter,
		setListSearch,
	} = useCompaniesStore();

	const showCorporationFilter = isSuperAdmin;
	const isCorporationAdminView = isCorporationAdmin;

	const [suspendTarget, setSuspendTarget] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [reinstateTarget, setReinstateTarget] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [isSuspending, setIsSuspending] = useState(false);
	const [isReinstating, setIsReinstating] = useState(false);

	useEffect(() => {
		fetchFilterOptions();
	}, [fetchFilterOptions]);

	const debouncedSearch = useDebounce(listSearch.trim());
	const searchForApi =
		debouncedSearch.length >= 3 || debouncedSearch === ""
			? debouncedSearch
			: "";

	const planTypeId = listPlanTypeFilter ?? undefined;

	const handleSuspendClick = useCallback((row: CompanyDirectoryItem) => {
		setSuspendTarget({ id: row.id, name: row.companyName });
	}, []);

	const handleReinstateClick = useCallback((row: CompanyDirectoryItem) => {
		setReinstateTarget({ id: row.id, name: row.companyName });
	}, []);

	const handleSuspendConfirm = useCallback(
		async (reason: string, notes: string) => {
			if (!suspendTarget) return;
			setIsSuspending(true);
			const result = await suspendCompany(suspendTarget.id, {
				suspendReason: reason.trim(),
				suspendAdditionalNotes: notes?.trim() || undefined,
			});
			setIsSuspending(false);
			if (result.ok) {
				setSuspendTarget(null);
				await fetchCompanies(listPage, PAGE_SIZE, {
					search: searchForApi || undefined,
					sortBy: listSortBy,
					sortOrder: listSortOrder,
					createdFilter: listCreatedFilter,
					status: listStatusFilter?.toLowerCase() as
						| CompanyApiStatusFilter
						| undefined,
					corporationId: listCorporationFilter,
					planTypeId,
				});
			}
		},
		[
			suspendTarget,
			suspendCompany,
			fetchCompanies,
			listPage,
			searchForApi,
			listSortBy,
			listSortOrder,
			listCreatedFilter,
			listStatusFilter,
			listCorporationFilter,
			planTypeId,
		],
	);

	const handleReinstateConfirm = useCallback(async () => {
		if (!reinstateTarget) return;
		setIsReinstating(true);
		const result = await reinstateCompany(reinstateTarget.id);
		setReinstateTarget(null);
		setIsReinstating(false);
		if (result.ok) {
			await fetchCompanies(listPage, PAGE_SIZE, {
				search: searchForApi || undefined,
				sortBy: listSortBy,
				sortOrder: listSortOrder,
				createdFilter: listCreatedFilter,
				status: listStatusFilter?.toLowerCase() as
					| CompanyApiStatusFilter
					| undefined,
				corporationId: listCorporationFilter,
				planTypeId,
			});
		}
	}, [
		reinstateTarget,
		reinstateCompany,
		fetchCompanies,
		listPage,
		searchForApi,
		listSortBy,
		listSortOrder,
		listCreatedFilter,
		listStatusFilter,
		listCorporationFilter,
		planTypeId,
	]);

	const columns = useMemo(
		() =>
			getCompanyDirectoryColumns(navigate, {
				readOnly: isCorporationAdminView,
				onSuspendClick: isCorporationAdminView ? undefined : handleSuspendClick,
				onReinstateClick: isCorporationAdminView
					? undefined
					: handleReinstateClick,
			}),
		[
			navigate,
			isCorporationAdminView,
			handleSuspendClick,
			handleReinstateClick,
		],
	);

	const lastFetched = useRef<{
		page: number;
		limit: number;
		sortBy: string;
		sortOrder: string;
		createdFilter: string | undefined;
		status: string | undefined;
		corporationId: string | undefined;
		planTypeId: string | undefined;
		search: string;
	} | null>(null);

	useEffect(() => {
		const key = {
			page: listPage,
			limit: PAGE_SIZE,
			sortBy: listSortBy,
			sortOrder: listSortOrder,
			createdFilter: listCreatedFilter,
			status: listStatusFilter,
			corporationId: listCorporationFilter,
			planTypeId,
			search: searchForApi,
		};
		if (
			lastFetched.current?.page === key.page &&
			lastFetched.current?.limit === key.limit &&
			lastFetched.current?.sortBy === key.sortBy &&
			lastFetched.current?.sortOrder === key.sortOrder &&
			lastFetched.current?.createdFilter === key.createdFilter &&
			lastFetched.current?.status === key.status &&
			lastFetched.current?.corporationId === key.corporationId &&
			lastFetched.current?.planTypeId === key.planTypeId &&
			lastFetched.current?.search === key.search
		) {
			return;
		}
		lastFetched.current = key;
		fetchCompanies(listPage, PAGE_SIZE, {
			search: searchForApi || undefined,
			sortBy: listSortBy,
			sortOrder: listSortOrder,
			createdFilter: listCreatedFilter,
			status: listStatusFilter?.toLowerCase() as
				| CompanyApiStatusFilter
				| undefined,
			corporationId: listCorporationFilter,
			planTypeId,
		});
	}, [
		listPage,
		listSortBy,
		listSortOrder,
		listCreatedFilter,
		listStatusFilter,
		listCorporationFilter,
		planTypeId,
		searchForApi,
		fetchCompanies,
	]);

	useEffect(() => {
		setListPage(1);
	}, [searchForApi, setListPage]);

	const handleSort = useCallback(
		(columnId: string) => {
			if (columnId === "actions") return;
			// Map UI column IDs to API sortBy values
			const sortByMap: Record<string, CompanyApiSortBy> = {
				companyId: "companyCode",
				companyName: "legalName",
				status: "status",
				assignedCorporation: "corporationName",
				plan: "plan",
				createdOn: "createdAt",
				lastUpdatedOn: "updatedAt",
			};
			const sortBy = sortByMap[columnId] ?? "createdAt";
			const nextOrder =
				listSortBy === sortBy && listSortOrder === "asc" ? "desc" : "asc";
			setListSort(sortBy, nextOrder);
			setListPage(1);
		},
		[listSortBy, listSortOrder, setListSort, setListPage],
	);

	const handleStatusFilterChange = useCallback(
		(value: string) => {
			// Store as-is from API (ACTIVE); list API expects lowercase - convert in fetchCompanies
			setListStatusFilter(value === "all" ? undefined : value);
			setListPage(1);
		},
		[setListStatusFilter, setListPage],
	);

	const handleCreatedFilterChange = useCallback(
		(value: string) => {
			const filter =
				value === "all" ? undefined : (value as CompanyApiCreatedFilter);
			setListCreatedFilter(filter);
			setListPage(1);
		},
		[setListCreatedFilter, setListPage],
	);

	const handlePlanFilterChange = useCallback(
		(value: string) => {
			setListPlanTypeFilter(value === "all" ? undefined : value);
			setListPage(1);
		},
		[setListPlanTypeFilter, setListPage],
	);

	const handleCorporationFilterChange = useCallback(
		(value: string | null) => {
			const normalized = value == null || value === "" ? undefined : value;
			const prev = useCompaniesStore.getState().listCorporationFilter;
			const prevNorm = prev === "" ? undefined : prev;
			if (normalized === prevNorm) return;
			setListCorporationFilter(normalized);
			setListPage(1);
		},
		[setListCorporationFilter, setListPage],
	);

	const pageIndex = listPage - 1;
	const sortColumnId = useMemo(() => {
		// Map API sortBy back to UI column IDs
		const reverseMap: Record<CompanyApiSortBy, string> = {
			companyCode: "companyId",
			legalName: "companyName",
			status: "status",
			corporationName: "assignedCorporation",
			plan: "plan",
			createdAt: "createdOn",
			updatedAt: "lastUpdatedOn",
		};
		return reverseMap[listSortBy] ?? "createdOn";
	}, [listSortBy]);

	const corporationItemIds = useMemo(
		() => filterOptions?.corporations.map((c) => c.id) ?? [],
		[filterOptions],
	);

	const corporationLabelById = useMemo(() => {
		const map = new Map<string, string>();
		for (const c of filterOptions?.corporations ?? []) {
			map.set(c.id, c.label);
		}
		return map;
	}, [filterOptions]);

	const corporationItemToStringLabel = useCallback(
		(id: string) => corporationLabelById.get(id) ?? id,
		[corporationLabelById],
	);

	const searchPlaceholder = isCorporationAdminView
		? FORM_PLACEHOLDERS.searchByCompanyName
		: FORM_PLACEHOLDERS.searchCompanyOrCorporation;

	return (
		<WhiteBox padding="sm" className="min-w-0 shadow-sm">
			<div className="flex min-w-0 flex-col gap-6">
				<div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2.5">
					<InputGroup className="h-9 min-w-48 flex-1 rounded-lg sm:min-w-64 sm:max-w-80">
						<InputGroupAddon align="inline-start">
							<Search className="size-3.5 text-muted-foreground" />
						</InputGroupAddon>
						<InputGroupInput
							type="search"
							placeholder={searchPlaceholder}
							value={listSearch}
							onChange={(e) => setListSearch(e.target.value)}
							disabled={filterOptionsLoading}
							aria-label={CD.searchAriaLabel}
						/>
					</InputGroup>
					<div className="ml-auto flex flex-wrap items-center gap-2.5">
						<Select
							value={listStatusFilter ?? "all"}
							onValueChange={handleStatusFilterChange}
							disabled={filterOptionsLoading}
						>
							<SelectTrigger
								className="h-9 w-full min-w-0 rounded-lg bg-background sm:w-50"
								aria-label={
									COMPANIES_DIRECTORY_PAGE_CONTENT.statusFilterAriaLabel
								}
							>
								<SelectValue
									placeholder={
										COMPANIES_DIRECTORY_PAGE_CONTENT.statusFilterAllLabel
									}
								/>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">
									{COMPANIES_DIRECTORY_PAGE_CONTENT.statusFilterAllLabel}
								</SelectItem>
								{filterOptions?.statuses.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{showCorporationFilter ? (
							<Combobox
								items={corporationItemIds}
								value={listCorporationFilter ?? null}
								onValueChange={(v) => handleCorporationFilterChange(v)}
								itemToStringLabel={corporationItemToStringLabel}
								disabled={filterOptionsLoading}
							>
								<ComboboxInput
									className="h-9 w-full min-w-0 sm:w-50"
									showClear
									placeholder={
										COMPANIES_DIRECTORY_PAGE_CONTENT.corporationFilterAllLabel
									}
									aria-label={
										COMPANIES_DIRECTORY_PAGE_CONTENT.corporationFilterAriaLabel
									}
								/>
								<ComboboxContent>
									<ComboboxList>
										{(item: string) => (
											<ComboboxItem key={item} value={item}>
												{corporationLabelById.get(item) ?? item}
											</ComboboxItem>
										)}
									</ComboboxList>
									<ComboboxEmpty>
										{
											COMPANIES_DIRECTORY_PAGE_CONTENT.corporationFilterNoResultsLabel
										}
									</ComboboxEmpty>
								</ComboboxContent>
							</Combobox>
						) : null}
						<Select
							value={listPlanTypeFilter ?? "all"}
							onValueChange={handlePlanFilterChange}
							disabled={filterOptionsLoading}
						>
							<SelectTrigger
								className="h-9 w-full min-w-0 rounded-lg bg-background sm:w-50"
								aria-label={
									COMPANIES_DIRECTORY_PAGE_CONTENT.planFilterAriaLabel
								}
							>
								<SelectValue
									placeholder={
										COMPANIES_DIRECTORY_PAGE_CONTENT.planFilterAllLabel
									}
								/>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">
									{COMPANIES_DIRECTORY_PAGE_CONTENT.planFilterAllLabel}
								</SelectItem>
								{(filterOptions?.plans ?? []).map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							value={listCreatedFilter ?? "all"}
							onValueChange={handleCreatedFilterChange}
							disabled={filterOptionsLoading}
						>
							<SelectTrigger
								className="h-9 w-full min-w-0 rounded-lg bg-background sm:w-50"
								aria-label={
									COMPANIES_DIRECTORY_PAGE_CONTENT.dateFilterAriaLabel
								}
							>
								<SelectValue
									placeholder={
										COMPANY_DATE_FILTER_OPTIONS.find(
											(opt) => opt.value === "all",
										)?.label
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{COMPANY_DATE_FILTER_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="min-w-0 w-full overflow-hidden">
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
							emptyMessage={COMPANIES_DIRECTORY_PAGE_CONTENT.noData}
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
			{suspendTarget && !isCorporationAdminView ? (
				<SuspendCompanyModal
					open
					onOpenChange={(open) => {
						if (!open) setSuspendTarget(null);
					}}
					companyName={suspendTarget.name}
					onConfirm={handleSuspendConfirm}
					isConfirming={isSuspending}
				/>
			) : null}
			{reinstateTarget && !isCorporationAdminView && (
				<ConfirmationModal
					open={reinstateTarget != null}
					onOpenChange={(open) => {
						if (!open) setReinstateTarget(null);
					}}
					title={CD.reinstateCompanyConfirmTitle}
					description={CD.reinstateCompanyConfirmDescription}
					icon={<RotateCcw className="size-12 text-icon-info" aria-hidden />}
					confirmLabel={CD.reinstateCompanyConfirmButton}
					confirmIcon={RotateCcw}
					cancelLabel={CD.confirmModalCancel}
					onConfirm={handleReinstateConfirm}
					isConfirming={isReinstating}
					variant="default"
				/>
			)}
		</WhiteBox>
	);
}
