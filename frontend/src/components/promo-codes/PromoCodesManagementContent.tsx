import { Search, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	deletePromoCode,
	getPricingPlans,
	getPromoCodesList,
	getPromoCodesListAllMatching,
	patchPromoCodePromotionActive,
} from "@/api";
import {
	ConfirmationModal,
	DataTable,
	TableSkeleton,
	WhiteBox,
} from "@/components";
import { Button } from "@/components/ui/button";
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
	PROMO_CODE_DISCOUNT_TYPE_OPTIONS,
	PROMO_CODE_STATUS_OPTIONS,
	PROMO_CODE_TIME_OPTIONS,
	PROMO_CODES_PAGE_CONTENT,
} from "@/const";
import { useDebounce } from "@/hooks";
import { getPromoCodesManagementColumns } from "@/tables";
import type {
	ListPromoCodesQuery,
	PricingPlanType,
	PromoCodeListItemData,
	SortDirection,
} from "@/types";
import { buildListQuery, downloadCsv } from "@/utils";

const C = PROMO_CODES_PAGE_CONTENT;
const PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;
const filterSelectTriggerClass =
	"h-9 w-full min-w-0 rounded-lg bg-background sm:w-50";

export function PromoCodesManagementContent() {
	const [items, setItems] = useState<PromoCodeListItemData[]>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search.trim(), 400);
	const [planFilter, setPlanFilter] = useState("all");
	const [discountTypeFilter, setDiscountTypeFilter] = useState("all");
	const [timeFilter, setTimeFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");

	const [planTypes, setPlanTypes] = useState<PricingPlanType[]>([]);

	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
	const [pageIndex, setPageIndex] = useState(0);
	const [sortColumnId, setSortColumnId] = useState<string | null>("promoCode");
	const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
	const [activationRowId, setActivationRowId] = useState<string | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteTargets, setDeleteTargets] = useState<PromoCodeListItemData[]>(
		[],
	);
	const [deleteInProgress, setDeleteInProgress] = useState(false);
	const [csvExportInProgress, setCsvExportInProgress] = useState(false);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			const res = await getPricingPlans();
			if (cancelled || !res.ok) return;
			setPlanTypes(res.data);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const listQuery = useMemo(
		() =>
			buildListQuery(
				{
					pageIndex,
					debouncedSearch,
					planFilter,
					discountTypeFilter,
					timeFilter,
					statusFilter,
					sortColumnId,
					sortDirection,
				},
				PAGE_SIZE,
			),
		[
			pageIndex,
			debouncedSearch,
			planFilter,
			discountTypeFilter,
			timeFilter,
			statusFilter,
			sortColumnId,
			sortDirection,
		],
	);

	const csvBaseQuery = useMemo((): Omit<
		ListPromoCodesQuery,
		"page" | "limit"
	> => {
		const { page: _p, limit: _l, ...rest } = listQuery;
		return rest;
	}, [listQuery]);

	const fetchList = useCallback(async () => {
		setLoading(true);
		setError(null);
		const res = await getPromoCodesList(listQuery);
		if (!res.ok) {
			setItems([]);
			setTotalCount(0);
			setError(C.list.loadError);
			setLoading(false);
			return;
		}
		setItems(res.data.items);
		setTotalCount(res.data.pagination.total);
		setLoading(false);
	}, [listQuery]);

	useEffect(() => {
		void fetchList();
	}, [fetchList]);

	useEffect(() => {
		setPageIndex(0);
	}, [
		debouncedSearch,
		planFilter,
		discountTypeFilter,
		timeFilter,
		statusFilter,
	]);

	useEffect(() => {
		setPageIndex(0);
	}, [sortColumnId, sortDirection]);

	useEffect(() => {
		setSelectedIds(new Set());
	}, [
		debouncedSearch,
		planFilter,
		discountTypeFilter,
		timeFilter,
		statusFilter,
	]);

	const onToggleRow = useCallback((id: string, checked: boolean) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	}, []);

	const onToggleAllPage = useCallback(
		(checked: boolean) => {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				for (const r of items) {
					if (checked) next.add(r.id);
					else next.delete(r.id);
				}
				return next;
			});
		},
		[items],
	);

	const allOnPageSelected =
		items.length > 0 && items.every((r) => selectedIds.has(r.id));
	const someOnPageSelected = items.some((r) => selectedIds.has(r.id));

	const serverSort = useMemo(
		() => ({
			sortColumnId,
			sortDirection,
			onSort: (columnId: string) => {
				if (sortColumnId !== columnId) {
					setSortColumnId(columnId);
					setSortDirection("asc");
				} else {
					setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
				}
			},
		}),
		[sortColumnId, sortDirection],
	);

	const handleActivation = useCallback(
		async (row: PromoCodeListItemData, active: boolean) => {
			setActivationRowId(row.id);
			try {
				const res = await patchPromoCodePromotionActive(row.id, active);
				if (!res.ok) {
					toast.error(res.message || C.list.activationFailed);
					return;
				}
				toast.success(C.list.activationUpdated);
				await fetchList();
			} finally {
				setActivationRowId(null);
			}
		},
		[fetchList],
	);

	const openDeleteDialog = useCallback((rows: PromoCodeListItemData[]) => {
		if (rows.length === 0) return;
		setDeleteTargets(rows);
		setDeleteDialogOpen(true);
	}, []);

	const onRequestDeleteRow = useCallback(
		(row: PromoCodeListItemData) => {
			openDeleteDialog([row]);
		},
		[openDeleteDialog],
	);

	const onRequestBulkDelete = useCallback(() => {
		const rows = items.filter((r) => selectedIds.has(r.id));
		if (rows.length === 0) {
			toast.error(C.list.empty);
			return;
		}
		openDeleteDialog(rows);
	}, [items, openDeleteDialog, selectedIds]);

	const confirmDelete = useCallback(async () => {
		if (deleteTargets.length === 0) return;
		setDeleteInProgress(true);
		try {
			for (const row of deleteTargets) {
				const res = await deletePromoCode(row.id);
				if (!res.ok) {
					toast.error(
						typeof res.message === "string" ? res.message : C.list.deleteFailed,
					);
					return;
				}
			}
			toast.success(
				deleteTargets.length > 1
					? C.list.bulkDeleteSuccess
					: C.list.deleteSuccess,
			);
			setDeleteDialogOpen(false);
			setDeleteTargets([]);
			setSelectedIds((prev) => {
				const next = new Set(prev);
				for (const r of deleteTargets) next.delete(r.id);
				return next;
			});
			await fetchList();
		} finally {
			setDeleteInProgress(false);
		}
	}, [deleteTargets, fetchList]);

	const exportCsv = useCallback(async () => {
		setCsvExportInProgress(true);
		try {
			const res = await getPromoCodesListAllMatching(csvBaseQuery);
			if (!res.ok) {
				toast.error(C.list.loadError);
				return;
			}
			let rows = res.data.items;
			if (selectedIds.size > 0) {
				rows = rows.filter((r) => selectedIds.has(r.id));
			}
			if (rows.length === 0) {
				toast.error(C.list.empty);
				return;
			}
			downloadCsv(rows, C.list.csvFilename, [
				C.list.columns.promoCode,
				C.list.columns.status,
				C.list.columns.discount,
				C.list.columns.plan,
				C.list.columns.usageLimit,
				C.list.columns.expiryDate,
			]);
			toast.success(C.list.csvExported);
		} finally {
			setCsvExportInProgress(false);
		}
	}, [csvBaseQuery, selectedIds]);

	const columns = useMemo(
		() =>
			getPromoCodesManagementColumns({
				allOnPageSelected,
				someOnPageSelected,
				onToggleAllPage,
				onToggleRow,
				selectedIds,
				onActivation: handleActivation,
				activationRowId,
				onRequestDelete: onRequestDeleteRow,
			}),
		[
			allOnPageSelected,
			someOnPageSelected,
			onToggleAllPage,
			onToggleRow,
			selectedIds,
			handleActivation,
			activationRowId,
			onRequestDeleteRow,
		],
	);

	const deleteDialogDescription =
		deleteTargets.length === 1
			? C.list.deleteDialog.description.replace(
					"{code}",
					deleteTargets[0]?.code ?? "",
				)
			: C.list.bulkDeleteDialog.description.replace(
					"{count}",
					String(deleteTargets.length),
				);

	const deleteDialogTitle =
		deleteTargets.length === 1
			? C.list.deleteDialog.title
			: C.list.bulkDeleteDialog.title;

	const selectedCount = selectedIds.size;
	const bulkLabel = C.list.bulk.itemsSelected.replace(
		"{count}",
		String(selectedCount),
	);

	return (
		<WhiteBox padding="md" className="shadow-sm">
			{selectedCount > 0 ? (
				<div className="flex h-9 w-full min-w-0 items-center gap-4">
					<p className="min-w-0 flex-1 text-base font-semibold text-text-secondary">
						{bulkLabel}
					</p>
					<div className="flex shrink-0 flex-wrap items-center gap-2.5">
						<Button
							type="button"
							variant="outline"
							className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
							icon={Trash2}
							onClick={onRequestBulkDelete}
						>
							{C.list.bulk.deleteSelected}
						</Button>
						<Button
							type="button"
							variant="secondary"
							icon={Upload}
							isLoading={csvExportInProgress}
							onClick={() => void exportCsv()}
						>
							{csvExportInProgress
								? C.list.bulk.exportCsvLoading
								: C.list.bulk.exportCsv}
						</Button>
					</div>
				</div>
			) : (
				<div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2.5">
					<InputGroup className="h-9 min-w-48 flex-1 rounded-lg sm:min-w-64 sm:max-w-80">
						<InputGroupAddon align="inline-start">
							<Search className="size-3.5 text-muted-foreground" aria-hidden />
						</InputGroupAddon>
						<InputGroupInput
							type="search"
							placeholder={FORM_PLACEHOLDERS.searchByPromoCodeOrDescription}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							aria-label={FORM_PLACEHOLDERS.searchByPromoCodeOrDescription}
						/>
					</InputGroup>
					<div className="ml-auto flex flex-wrap items-center gap-2.5">
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className={filterSelectTriggerClass}>
								<SelectValue placeholder={C.list.filters.allRowStatus} />
							</SelectTrigger>
							<SelectContent>
								{PROMO_CODE_STATUS_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select value={planFilter} onValueChange={setPlanFilter}>
							<SelectTrigger className={filterSelectTriggerClass}>
								<SelectValue placeholder={C.list.filters.allPlans} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{C.list.filters.allPlans}</SelectItem>
								{planTypes.map((pt) => (
									<SelectItem key={pt.id} value={pt.id}>
										{pt.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							value={discountTypeFilter}
							onValueChange={setDiscountTypeFilter}
						>
							<SelectTrigger className={filterSelectTriggerClass}>
								<SelectValue placeholder={C.list.filters.allDiscountTypes} />
							</SelectTrigger>
							<SelectContent>
								{PROMO_CODE_DISCOUNT_TYPE_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select value={timeFilter} onValueChange={setTimeFilter}>
							<SelectTrigger className={filterSelectTriggerClass}>
								<SelectValue placeholder={C.list.filters.allTime} />
							</SelectTrigger>
							<SelectContent>
								{PROMO_CODE_TIME_OPTIONS.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			)}

			<div className="mt-6 min-w-0">
				{loading ? (
					<TableSkeleton
						columns={columns}
						rowCount={PAGE_SIZE}
						showPagination
						fixedHeight
					/>
				) : error ? (
					<p className="text-sm text-destructive" role="alert">
						{error}
					</p>
				) : (
					<DataTable<PromoCodeListItemData>
						data={items}
						columns={columns}
						pageSize={PAGE_SIZE}
						emptyMessage={C.list.empty}
						fixedHeight
						serverPagination={{
							totalCount,
							pageIndex,
							onPageChange: setPageIndex,
						}}
						serverSort={serverSort}
					/>
				)}
			</div>

			<ConfirmationModal
				open={deleteDialogOpen}
				onOpenChange={(open) => {
					setDeleteDialogOpen(open);
					if (!open) setDeleteTargets([]);
				}}
				title={deleteDialogTitle}
				description={deleteDialogDescription}
				icon={<Trash2 className="text-destructive size-12" aria-hidden />}
				confirmLabel={
					deleteTargets.length === 1
						? C.list.deleteDialog.confirm
						: C.list.bulkDeleteDialog.confirm
				}
				cancelLabel={
					deleteTargets.length === 1
						? C.list.deleteDialog.cancel
						: C.list.bulkDeleteDialog.cancel
				}
				onConfirm={confirmDelete}
				isConfirming={deleteInProgress}
				variant="destructive"
				confirmIcon={Trash2}
			/>
		</WhiteBox>
	);
}
