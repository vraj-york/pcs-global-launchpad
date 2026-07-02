import { RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	ConfirmationModal,
	CorporationActionModal,
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
	CORPORATE_DIRECTORY_PAGE_CONTENT,
	CORPORATION_CREATED_FILTER_OPTIONS,
	CORPORATION_STATUS_FILTER_OPTIONS,
	DATA_TABLE_CONFIG,
	FORM_PLACEHOLDERS,
	REINSTATE_CORPORATION_MODAL,
} from "@/const";
import { useDebounce } from "@/hooks";
import { useCorporationsStore } from "@/store";
import { getCorporationDirectoryColumns } from "@/tables";
import type {
	Corporation,
	CorporationActionType,
	CorporationCreatedFilter,
	CorporationSortBy,
	CorporationStatus,
} from "@/types";

const PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;

export function CorporateDirectoryContent() {
	const navigate = useNavigate();
	const {
		listItems,
		listTotal,
		listPage,
		listLoading,
		listSortBy,
		listSortOrder,
		listCreatedFilter,
		listStatusFilter,
		listSearch,
		fetchCorporations,
		setListPage,
		setListSort,
		setListCreatedFilter,
		setListStatusFilter,
		setListSearch,
		updateCorporationStatus,
		reinstateCorporation,
	} = useCorporationsStore();

	const debouncedSearch = useDebounce(listSearch.trim());
	const searchForApi =
		debouncedSearch.length >= 3 || debouncedSearch === ""
			? debouncedSearch
			: "";

	const [actionModal, setActionModal] = useState<{
		open: boolean;
		corporationId: string | null;
		corporationName: string;
		action: CorporationActionType;
	} | null>(null);

	const [reinstateTarget, setReinstateTarget] = useState<{
		id: string;
		name: string;
	} | null>(null);
	const [isReinstating, setIsReinstating] = useState(false);

	const handleSuspendClick = useCallback((row: Corporation) => {
		setActionModal({
			open: true,
			corporationId: row.id,
			corporationName: row.name,
			action: "suspend",
		});
	}, []);

	const handleReinstateClick = useCallback((row: Corporation) => {
		setReinstateTarget({ id: row.id, name: row.name });
	}, []);

	const handleReinstateConfirm = useCallback(async () => {
		if (!reinstateTarget) return;
		setIsReinstating(true);
		const ok = await reinstateCorporation(reinstateTarget.id);
		setReinstateTarget(null);
		setIsReinstating(false);
		if (ok)
			await fetchCorporations(listPage, PAGE_SIZE, {
				search: searchForApi || undefined,
			});
	}, [
		reinstateTarget,
		reinstateCorporation,
		fetchCorporations,
		listPage,
		searchForApi,
	]);

	const handleActionConfirm = useCallback(
		async (_action: CorporationActionType, reason: string, notes: string) => {
			if (!actionModal?.corporationId) return;
			const status = actionModal.action === "close" ? "CLOSED" : "SUSPENDED";
			const ok = await updateCorporationStatus(actionModal.corporationId, {
				status,
				suspendCloseReason: reason.trim(),
				suspendCloseAdditionalNotes: notes?.trim() ?? "",
			});
			if (ok) {
				setActionModal(null);
				await fetchCorporations(listPage, PAGE_SIZE, {
					search: searchForApi || undefined,
				});
			}
		},
		[
			actionModal,
			updateCorporationStatus,
			fetchCorporations,
			listPage,
			searchForApi,
		],
	);

	const columns = useMemo(
		() =>
			getCorporationDirectoryColumns(navigate, {
				onSuspendClick: handleSuspendClick,
				onReinstateClick: handleReinstateClick,
			}),
		[navigate, handleSuspendClick, handleReinstateClick],
	);

	const lastFetched = useRef<{
		page: number;
		limit: number;
		sortBy: string;
		sortOrder: string;
		createdFilter: string | undefined;
		status: string | undefined;
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
			search: searchForApi,
		};
		if (
			lastFetched.current?.page === key.page &&
			lastFetched.current?.limit === key.limit &&
			lastFetched.current?.sortBy === key.sortBy &&
			lastFetched.current?.sortOrder === key.sortOrder &&
			lastFetched.current?.createdFilter === key.createdFilter &&
			lastFetched.current?.status === key.status &&
			lastFetched.current?.search === key.search
		) {
			return;
		}
		lastFetched.current = key;
		fetchCorporations(listPage, PAGE_SIZE, {
			search: searchForApi || undefined,
		});
	}, [
		listPage,
		listSortBy,
		listSortOrder,
		listCreatedFilter,
		listStatusFilter,
		searchForApi,
		fetchCorporations,
	]);

	useEffect(() => {
		setListPage(1);
	}, [searchForApi, setListPage]);

	const handleSort = useCallback(
		(columnId: string) => {
			if (columnId === "actions") return;
			const sortBy = columnId as CorporationSortBy;
			const nextOrder =
				listSortBy === sortBy && listSortOrder === "asc" ? "desc" : "asc";
			setListSort(sortBy, nextOrder);
			setListPage(1);
		},
		[listSortBy, listSortOrder, setListSort, setListPage],
	);

	const handleStatusFilterChange = useCallback(
		(value: string) => {
			const status = value === "all" ? undefined : (value as CorporationStatus);
			setListStatusFilter(status);
			setListPage(1);
		},
		[setListStatusFilter, setListPage],
	);

	const handleCreatedFilterChange = useCallback(
		(value: string) => {
			const filter =
				value === "all" ? undefined : (value as CorporationCreatedFilter);
			setListCreatedFilter(filter);
			setListPage(1);
		},
		[setListCreatedFilter, setListPage],
	);

	const pageIndex = listPage - 1;
	const sortColumnId = listSortBy;

	return (
		<WhiteBox>
			<div className="flex flex-col gap-6">
				<div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<InputGroup className="h-9 w-full min-w-0 lg:max-w-80 lg:flex-1 rounded-lg">
						<InputGroupAddon align="inline-start">
							<Search className="size-3.5 text-muted-foreground" />
						</InputGroupAddon>
						<InputGroupInput
							type="search"
							placeholder={FORM_PLACEHOLDERS.searchCorporationOrAdmin}
							value={listSearch}
							onChange={(e) => setListSearch(e.target.value)}
							aria-label={CORPORATE_DIRECTORY_PAGE_CONTENT.searchAriaLabel}
						/>
					</InputGroup>
					<div className="flex w-full flex-col gap-4 sm:flex-row sm:gap-4 lg:w-auto lg:shrink-0">
						<Select
							value={listStatusFilter ?? "all"}
							onValueChange={handleStatusFilterChange}
						>
							<SelectTrigger
								className="h-10 w-full min-w-0 sm:w-[250px]"
								aria-label={
									CORPORATE_DIRECTORY_PAGE_CONTENT.statusFilterAriaLabel
								}
							>
								<SelectValue
									placeholder={
										CORPORATE_DIRECTORY_PAGE_CONTENT.statusFilterAllLabel
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{CORPORATION_STATUS_FILTER_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							value={listCreatedFilter ?? "all"}
							onValueChange={handleCreatedFilterChange}
						>
							<SelectTrigger
								className="h-10 w-full min-w-0 sm:w-[250px]"
								aria-label={
									CORPORATE_DIRECTORY_PAGE_CONTENT.createdFilterAriaLabel
								}
							>
								<SelectValue
									placeholder={
										CORPORATE_DIRECTORY_PAGE_CONTENT.createdFilterAllLabel
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{CORPORATION_CREATED_FILTER_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
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
							emptyMessage={CORPORATE_DIRECTORY_PAGE_CONTENT.noData}
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
			{actionModal?.open && actionModal.corporationId && (
				<CorporationActionModal
					open={actionModal.open}
					onOpenChange={(open) => {
						if (!open) setActionModal(null);
					}}
					action={actionModal.action}
					corporationName={actionModal.corporationName}
					onConfirm={handleActionConfirm}
					contentClassName="w-full max-w-2xl p-0"
				/>
			)}
			{reinstateTarget && (
				<ConfirmationModal
					open={reinstateTarget != null}
					onOpenChange={(open) => {
						if (!open) setReinstateTarget(null);
					}}
					title={REINSTATE_CORPORATION_MODAL.title}
					description={REINSTATE_CORPORATION_MODAL.description}
					icon={<RotateCcw className="size-12 text-icon-info" aria-hidden />}
					confirmLabel={REINSTATE_CORPORATION_MODAL.confirm}
					confirmIcon={RotateCcw}
					cancelLabel={REINSTATE_CORPORATION_MODAL.cancel}
					onConfirm={handleReinstateConfirm}
					isConfirming={isReinstating}
					variant="default"
				/>
			)}
		</WhiteBox>
	);
}
