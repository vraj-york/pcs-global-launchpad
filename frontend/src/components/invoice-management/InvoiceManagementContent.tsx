import {
	ChevronLeft,
	ChevronRight,
	Download,
	Search,
	Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, TableSkeleton, WhiteBox } from "@/components";
import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	DATA_TABLE_CONFIG,
	DATA_TABLE_TEXT,
	FORM_PLACEHOLDERS,
	INVOICE_BULK_ACTIONS,
	INVOICE_MANAGEMENT_PAGE_CONTENT,
	INVOICE_MANAGEMENT_UI,
	SUBMODULE_KEYS,
} from "@/const";
import { useDebounce, usePermissions, useUserRoles } from "@/hooks";
import { useInvoiceManagementStore } from "@/store";
import { getInvoiceManagementColumns } from "@/tables";
import type {
	BulkSendFailure,
	InvoiceManagementRow,
	InvoicePaymentType,
} from "@/types";
import { BulkSendInvoiceModal } from "./BulkSendInvoiceModal";
import { InvoiceDetailsModal } from "./InvoiceDetailsModal";
import { InvoiceManagementFiltersGroup } from "./InvoiceManagementFiltersGroup";
import { InvoiceMoreFiltersDialog } from "./InvoiceMoreFiltersDialog";

const PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;

export function InvoiceManagementContent() {
	const {
		isCompanyAdmin,
		isCorporationAdmin,
		ready: rolesReady,
	} = useUserRoles();
	const { can } = usePermissions();
	const invoicePermissions = useMemo(
		() => ({
			canSendIndividual: can(SUBMODULE_KEYS.INVOICE_MANAGEMENT_SEND_INDIVIDUAL),
			canSendBulk: can(SUBMODULE_KEYS.INVOICE_MANAGEMENT_SEND_BULK),
			canDownload: can(SUBMODULE_KEYS.INVOICE_MANAGEMENT_DOWNLOAD),
			canBulkDownload: can(SUBMODULE_KEYS.INVOICE_MANAGEMENT_BULK_DOWNLOAD),
		}),
		[can],
	);
	const isCompanyAdminOnly = isCompanyAdmin && !isCorporationAdmin;
	const showCompanyFilter = !isCompanyAdminOnly;
	const searchPlaceholder = isCompanyAdminOnly
		? FORM_PLACEHOLDERS.searchByInvoiceId
		: FORM_PLACEHOLDERS.searchByInvoiceIdOrCompany;

	const {
		rows,
		listLoading,
		listError,
		hasMore,
		nextStartingAfter,
		nextSearchPage,
		nextSearchOffset,
		usesSearchPagination,
		pageStack,
		statusFilter,
		companyId,
		appliedTimePeriodId,
		appliedPaymentTypes,
		companyOptions,
		companyOptionsLoading,
		sendingInvoiceId,
		bulkDownloading,
		bulkSending,
		setCompanyFilterEnabled,
		fetchCompanyOptions,
		fetchInvoices,
		searchQuery,
		setSearchQuery,
		setStatusFilter,
		setCompanyId,
		setAppliedMoreFilters,
		goPrevPage,
		goNextPage,
		downloadInvoice,
		sendInvoice,
		bulkDownload,
		bulkSend,
	} = useInvoiceManagementStore();

	const [searchInput, setSearchInput] = useState(searchQuery);
	const debouncedSearch = useDebounce(searchInput.trim());
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
	const [previewInvoice, setPreviewInvoice] =
		useState<InvoiceManagementRow | null>(null);
	const [bulkSendOpen, setBulkSendOpen] = useState(false);
	const [bulkSendFailures, setBulkSendFailures] = useState<
		BulkSendFailure[] | null
	>(null);

	const pageIndex = pageStack.length - 1;
	const pageStackSerialized = JSON.stringify(pageStack);
	const appliedPaymentKey = useMemo(
		() => [...appliedPaymentTypes].sort().join(","),
		[appliedPaymentTypes],
	);

	const invoiceIdToDisplayId = useMemo(() => {
		const m = new Map<string, string>();
		for (const r of rows) {
			m.set(r.id, r.displayId);
		}
		return m;
	}, [rows]);

	const pageRowIds = useMemo(() => rows.map((r) => r.id), [rows]);

	const onToggleRow = useCallback((id: string, checked: boolean) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	}, []);

	const onToggleAll = useCallback(
		(checked: boolean) => {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				if (checked) {
					for (const id of pageRowIds) next.add(id);
				} else {
					for (const id of pageRowIds) next.delete(id);
				}
				return next;
			});
		},
		[pageRowIds],
	);

	const handleViewInvoice = useCallback((row: InvoiceManagementRow) => {
		setPreviewInvoice(row);
	}, []);

	const handleDownloadInvoice = useCallback(
		(row: InvoiceManagementRow) => {
			void downloadInvoice(row);
		},
		[downloadInvoice],
	);

	const handleSendInvoice = useCallback(
		(row: InvoiceManagementRow) => {
			void sendInvoice(row.id);
		},
		[sendInvoice],
	);

	const selectedInvoiceIds = useMemo(
		() => Array.from(selectedIds),
		[selectedIds],
	);

	const handleBulkDownload = useCallback(() => {
		void bulkDownload(selectedInvoiceIds);
	}, [bulkDownload, selectedInvoiceIds]);

	const handleBulkSendConfirm = useCallback(
		async (additionalEmails: string[]) => {
			const failures = await bulkSend(
				selectedInvoiceIds,
				additionalEmails,
				invoiceIdToDisplayId,
			);
			if (failures.length === 0) {
				setBulkSendOpen(false);
				setBulkSendFailures(null);
			} else {
				setBulkSendFailures(failures);
			}
		},
		[bulkSend, selectedInvoiceIds, invoiceIdToDisplayId],
	);

	const handleBulkSendOpenChange = useCallback((open: boolean) => {
		setBulkSendOpen(open);
		if (!open) {
			setBulkSendFailures(null);
		}
	}, []);

	const hasBulkActions =
		invoicePermissions.canSendBulk || invoicePermissions.canBulkDownload;
	const hasRowActions =
		invoicePermissions.canSendIndividual || invoicePermissions.canDownload;

	const columns = useMemo(
		() =>
			getInvoiceManagementColumns(
				hasBulkActions
					? {
							pageRowIds,
							selectedIds,
							onToggleRow,
							onToggleAll,
						}
					: undefined,
				hasRowActions
					? {
							onView: handleViewInvoice,
							onSend: handleSendInvoice,
							onDownload: handleDownloadInvoice,
							permissions: {
								canSendIndividual: invoicePermissions.canSendIndividual,
								canDownload: invoicePermissions.canDownload,
							},
						}
					: undefined,
			),
		[
			pageRowIds,
			selectedIds,
			onToggleRow,
			onToggleAll,
			handleViewInvoice,
			handleSendInvoice,
			handleDownloadInvoice,
			hasBulkActions,
			hasRowActions,
			invoicePermissions,
		],
	);

	useEffect(() => {
		setSelectedIds((prev) => {
			const next = new Set<string>();
			for (const id of prev) {
				if (pageRowIds.includes(id)) next.add(id);
			}
			return next;
		});
	}, [pageRowIds]);

	const moreFiltersAppliedCount = useMemo(() => {
		let n = appliedTimePeriodId ? 1 : 0;
		n += appliedPaymentTypes.length;
		return n;
	}, [appliedTimePeriodId, appliedPaymentTypes]);

	useEffect(() => {
		if (!rolesReady) return;
		setCompanyFilterEnabled(showCompanyFilter);
	}, [rolesReady, showCompanyFilter, setCompanyFilterEnabled]);

	useEffect(() => {
		if (!rolesReady) return;
		void fetchCompanyOptions();
	}, [rolesReady, fetchCompanyOptions, showCompanyFilter]);

	useEffect(() => {
		if (!rolesReady) return;
		setSearchQuery(debouncedSearch);
	}, [rolesReady, debouncedSearch, setSearchQuery]);

	useEffect(() => {
		if (!rolesReady) return;
		void fetchInvoices();
	}, [
		rolesReady,
		fetchInvoices,
		pageStackSerialized,
		statusFilter,
		companyId,
		showCompanyFilter,
		appliedTimePeriodId,
		appliedPaymentKey,
		searchQuery,
	]);

	const canGoPrev = pageIndex > 0;
	const canGoNext =
		hasMore &&
		(usesSearchPagination
			? nextSearchPage != null || nextSearchOffset != null
			: Boolean(nextStartingAfter));

	const paginationStart = rows.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
	const paginationEnd = pageIndex * PAGE_SIZE + rows.length;
	const serverPageEnd = pageIndex * PAGE_SIZE + rows.length;

	const handleApplyMoreFilters = useCallback(
		(timeId: string | null, payments: InvoicePaymentType[]) => {
			setAppliedMoreFilters(timeId, payments);
		},
		[setAppliedMoreFilters],
	);

	return (
		<WhiteBox>
			<div className="flex flex-col gap-6">
				<div className="flex w-full min-w-0 flex-wrap items-center gap-2.5">
					<InputGroup className="min-w-48 flex-1 rounded-lg sm:min-w-64 sm:max-w-80">
						<InputGroupAddon align="inline-start">
							<Search className="size-3.5 text-muted-foreground" aria-hidden />
						</InputGroupAddon>
						<InputGroupInput
							type="search"
							placeholder={searchPlaceholder}
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							disabled={!rolesReady || companyOptionsLoading}
							aria-label={INVOICE_MANAGEMENT_UI.searchAriaLabel}
						/>
					</InputGroup>
					{selectedIds.size > 0 && !listLoading && !listError ? (
						<div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-3 sm:gap-4">
							<p className="text-sm whitespace-nowrap text-text-secondary">
								{INVOICE_BULK_ACTIONS.itemsSelected(selectedIds.size)}
							</p>
							<div className="flex flex-wrap items-center gap-2">
								{invoicePermissions.canSendBulk ? (
									<Button
										type="button"
										variant="outline"
										icon={Send}
										onClick={() => handleBulkSendOpenChange(true)}
										disabled={bulkDownloading}
									>
										{INVOICE_BULK_ACTIONS.bulkSendInvoice}
									</Button>
								) : null}
								{invoicePermissions.canBulkDownload ? (
									<Button
										type="button"
										icon={Download}
										isLoading={bulkDownloading}
										onClick={handleBulkDownload}
									>
										{bulkDownloading
											? INVOICE_BULK_ACTIONS.downloadAllLoading
											: INVOICE_BULK_ACTIONS.downloadAll}
									</Button>
								) : null}
							</div>
						</div>
					) : (
						<InvoiceManagementFiltersGroup
							className="ml-auto"
							statusFilter={statusFilter}
							onStatusChange={setStatusFilter}
							companyId={companyId}
							onCompanyChange={setCompanyId}
							companyOptions={companyOptions}
							optionsLoading={!rolesReady || companyOptionsLoading}
							showCompanyFilter={showCompanyFilter}
							onOpenMoreFilters={() => setFiltersOpen(true)}
							moreFiltersAppliedCount={moreFiltersAppliedCount}
						/>
					)}
				</div>

				<InvoiceMoreFiltersDialog
					open={filtersOpen}
					onOpenChange={setFiltersOpen}
					appliedTimePeriodId={appliedTimePeriodId}
					appliedPaymentTypes={appliedPaymentTypes}
					onApply={handleApplyMoreFilters}
				/>

				<BulkSendInvoiceModal
					open={bulkSendOpen}
					onOpenChange={handleBulkSendOpenChange}
					onSend={handleBulkSendConfirm}
					isSending={bulkSending}
					sendFailures={bulkSendFailures}
				/>

				<InvoiceDetailsModal
					open={previewInvoice !== null}
					onOpenChange={(open) => {
						if (!open) setPreviewInvoice(null);
					}}
					invoice={previewInvoice}
					sendPending={
						previewInvoice ? sendingInvoiceId === previewInvoice.id : false
					}
					permissions={{
						canSendIndividual: invoicePermissions.canSendIndividual,
						canDownload: invoicePermissions.canDownload,
					}}
					onSend={async () => {
						if (previewInvoice) {
							await sendInvoice(previewInvoice.id);
						}
					}}
				/>

				<div className="min-w-0">
					{listLoading ? (
						<TableSkeleton
							columns={columns}
							rowCount={PAGE_SIZE}
							showPagination={false}
							fixedHeight
						/>
					) : listError ? (
						<p className="text-sm text-destructive" role="alert">
							{listError}
						</p>
					) : (
						<>
							<DataTable<InvoiceManagementRow>
								data={rows}
								columns={columns}
								pageSize={PAGE_SIZE}
								showPagination={false}
								emptyMessage={INVOICE_MANAGEMENT_PAGE_CONTENT.noData}
								fixedHeight
								initialSort={{
									column: "created",
									direction: "desc",
								}}
								tableLayout="auto"
							/>
							{rows.length > 0 && (
								<div className="flex shrink-0 flex-col items-stretch justify-between gap-4 border-t border-border pt-4 sm:flex-row sm:items-center">
									<p className="text-small text-text-secondary">
										{searchQuery.trim() && rows.length === 0 ? (
											INVOICE_MANAGEMENT_UI.searchNoMatch
										) : hasMore ? (
											<>
												{DATA_TABLE_TEXT.showing} {paginationStart} to{" "}
												{paginationEnd} results{" "}
												{INVOICE_MANAGEMENT_UI.moreAvailableSuffix}
											</>
										) : (
											<>
												{DATA_TABLE_TEXT.showing} {paginationStart} to{" "}
												{paginationEnd} of {serverPageEnd} results
											</>
										)}
									</p>
									<div className="flex items-center gap-2">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											icon={ChevronLeft}
											onClick={goPrevPage}
											disabled={!canGoPrev}
											className="text-small text-text-secondary hover:text-text-foreground"
										>
											{DATA_TABLE_TEXT.previous}
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											icon={ChevronRight}
											iconPosition="end"
											onClick={goNextPage}
											disabled={!canGoNext}
											className="text-small text-text-secondary hover:text-text-foreground"
										>
											{DATA_TABLE_TEXT.next}
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</WhiteBox>
	);
}
