import { AlertTriangle, RotateCcw, Search } from "lucide-react";
import {
	type ChangeEvent,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
	BillingManagementFiltersGroup,
	BillingMoreFiltersDialog,
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
	BILLING_CONFIRM,
	BILLING_MANAGEMENT_PAGE_CONTENT,
	BILLING_REINSTATE_MODAL,
	DATA_TABLE_CONFIG,
	DATA_TABLE_TEXT,
	FORM_PLACEHOLDERS,
	ROUTES,
	SUBMODULE_KEYS,
} from "@/const";
import { usePermissions } from "@/hooks";
import { useBillingManagementStore } from "@/store";
import { getBillingManagementColumns } from "@/tables";
import type {
	BillingConfirmKind,
	BillingCycleFilterId,
	BillingManagementRow,
	BillingPaymentMethodType,
	BillingTimePeriodId,
	CancelBillingSubscriptionPayload,
	SortDirection,
} from "@/types";
import { CancelSubscriptionModal } from "./CancelSubscriptionModal";

const PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;

export function BillingManagementContent() {
	const navigate = useNavigate();
	const { can } = usePermissions();
	const billingRbac = useMemo(
		() => ({
			canEdit: can(SUBMODULE_KEYS.BILLING_MANAGEMENT_EDIT),
			canCancelReinstate: can(
				SUBMODULE_KEYS.BILLING_MANAGEMENT_CANCEL_REINSTATE,
			),
		}),
		[can],
	);
	const {
		listItems,
		listTotalCount,
		listTotalTruncated,
		listPageIndex,
		listLoading,
		listError,
		listSortColumnId,
		listSortDirection,
		planTypeId,
		subscriptionStatus,
		paymentStatus,
		listSearch,
		appliedBillingCycles,
		appliedTimePeriod,
		appliedPaymentTypes,
		planOptions,
		planOptionsLoading,
		fetchPlanOptions,
		fetchBillingList,
		setListPageIndex,
		setListSort,
		setPlanTypeId,
		setSubscriptionStatus,
		setPaymentStatus,
		setListSearch,
		setAppliedMoreFilters,
		cancelSubscription,
		retryPayment,
		reinstateSubscription,
	} = useBillingManagementStore();

	const [searchDraft, setSearchDraft] = useState("");
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [confirmKind, setConfirmKind] = useState<BillingConfirmKind>(null);
	const [confirmTarget, setConfirmTarget] =
		useState<BillingManagementRow | null>(null);
	const [confirmBusy, setConfirmBusy] = useState(false);

	useEffect(() => {
		const t = setTimeout(() => setListSearch(searchDraft), 400);
		return () => clearTimeout(t);
	}, [searchDraft, setListSearch]);

	useEffect(() => {
		void fetchPlanOptions();
	}, [fetchPlanOptions]);

	useEffect(() => {
		void fetchBillingList();
	}, [
		fetchBillingList,
		listPageIndex,
		planTypeId,
		subscriptionStatus,
		paymentStatus,
		appliedBillingCycles,
		appliedTimePeriod,
		appliedPaymentTypes,
		listSortColumnId,
		listSortDirection,
		listSearch,
	]);

	const handleRetryPayment = useCallback((row: BillingManagementRow) => {
		setConfirmKind("retry");
		setConfirmTarget(row);
	}, []);

	const handleCancelSubscription = useCallback((row: BillingManagementRow) => {
		setConfirmKind("cancel");
		setConfirmTarget(row);
	}, []);

	const handleReinstateSubscription = useCallback(
		(row: BillingManagementRow) => {
			if (!row.stripeSubscriptionId || !row.cancelAtPeriodEnd) {
				return;
			}
			setConfirmKind("reinstate");
			setConfirmTarget(row);
		},
		[],
	);

	const handleView = useCallback(
		(row: BillingManagementRow) => {
			navigate(ROUTES.finance.billingDetailWithIdPath(row.companyId));
		},
		[navigate],
	);

	const handleEdit = useCallback(
		(row: BillingManagementRow) => {
			navigate(ROUTES.finance.billingEditWithIdPath(row.companyId));
		},
		[navigate],
	);

	const columns = useMemo(
		() =>
			getBillingManagementColumns({
				onViewClick: handleView,
				onEditClick: handleEdit,
				onRetryPaymentClick: handleRetryPayment,
				onCancelSubscriptionClick: handleCancelSubscription,
				onReinstateSubscriptionClick: handleReinstateSubscription,
				rbac: billingRbac,
			}),
		[
			handleView,
			handleEdit,
			handleRetryPayment,
			handleCancelSubscription,
			handleReinstateSubscription,
			billingRbac,
		],
	);

	const handleSort = useCallback(
		(columnId: string) => {
			if (listSortColumnId !== columnId) {
				setListSort(columnId, "asc");
				return;
			}
			setListSort(columnId, listSortDirection === "asc" ? "desc" : "asc");
		},
		[listSortColumnId, listSortDirection, setListSort],
	);

	const handleCancelConfirm = useCallback(
		async (payload: CancelBillingSubscriptionPayload) => {
			if (!confirmTarget) {
				return;
			}
			setConfirmBusy(true);
			try {
				const res = await cancelSubscription(confirmTarget.companyId, payload);
				if (res.ok) {
					setConfirmKind(null);
					setConfirmTarget(null);
					await fetchBillingList();
				}
			} finally {
				setConfirmBusy(false);
			}
		},
		[confirmTarget, cancelSubscription, fetchBillingList],
	);

	const handleConfirm = useCallback(async () => {
		if (!confirmTarget || !confirmKind) return;
		setConfirmBusy(true);
		try {
			let ok = false;
			if (confirmKind === "retry") {
				const res = await retryPayment(confirmTarget.companyId);
				ok = res.ok;
			} else if (confirmKind === "reinstate") {
				const res = await reinstateSubscription(confirmTarget.companyId);
				ok = res.ok;
			}
			if (ok) {
				setConfirmKind(null);
				setConfirmTarget(null);
				await fetchBillingList();
			}
		} finally {
			setConfirmBusy(false);
		}
	}, [
		confirmKind,
		confirmTarget,
		retryPayment,
		reinstateSubscription,
		fetchBillingList,
	]);

	const moreFiltersAppliedCount = useMemo(() => {
		let n = 0;
		n += appliedBillingCycles.length;
		n += appliedPaymentTypes.length;
		if (appliedTimePeriod) n += 1;
		return n;
	}, [appliedBillingCycles, appliedPaymentTypes, appliedTimePeriod]);

	const handleSearchDraftChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			setSearchDraft(e.target.value);
		},
		[],
	);

	const handleOpenMoreFilters = useCallback(() => {
		setFiltersOpen(true);
	}, []);

	const handleConfirmModalOpenChange = useCallback((open: boolean) => {
		if (!open) {
			setConfirmKind(null);
			setConfirmTarget(null);
		}
	}, []);

	const handleApplyMoreFilters = useCallback(
		(params: {
			billingCycles: BillingCycleFilterId[];
			timePeriod: BillingTimePeriodId | null;
			paymentTypes: Array<Exclude<BillingPaymentMethodType, null>>;
		}) => {
			setAppliedMoreFilters(params);
		},
		[setAppliedMoreFilters],
	);

	const confirmCopy =
		confirmKind === "retry"
			? {
					title: BILLING_CONFIRM.retryPaymentTitle,
					description: BILLING_CONFIRM.retryPaymentDescription,
				}
			: { title: "", description: "" };

	return (
		<WhiteBox>
			<div className="flex flex-col gap-6">
				<div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2.5">
					<InputGroup className="h-9 min-w-48 flex-1 rounded-lg sm:min-w-64 sm:max-w-80">
						<InputGroupAddon align="inline-start">
							<Search className="size-3.5 text-muted-foreground" aria-hidden />
						</InputGroupAddon>
						<InputGroupInput
							type="search"
							value={searchDraft}
							onChange={handleSearchDraftChange}
							placeholder={FORM_PLACEHOLDERS.searchByCompanyName}
							aria-label={FORM_PLACEHOLDERS.searchByCompanyName}
							disabled={planOptionsLoading}
						/>
					</InputGroup>
					<BillingManagementFiltersGroup
						planTypeId={planTypeId}
						onPlanTypeChange={setPlanTypeId}
						subscriptionStatus={subscriptionStatus}
						onSubscriptionStatusChange={setSubscriptionStatus}
						paymentStatus={paymentStatus}
						onPaymentStatusChange={setPaymentStatus}
						planOptions={planOptions}
						optionsLoading={planOptionsLoading}
						onOpenMoreFilters={handleOpenMoreFilters}
						moreFiltersAppliedCount={moreFiltersAppliedCount}
					/>
				</div>

				<BillingMoreFiltersDialog
					open={filtersOpen}
					onOpenChange={setFiltersOpen}
					appliedBillingCycles={appliedBillingCycles}
					appliedTimePeriod={appliedTimePeriod}
					appliedPaymentTypes={appliedPaymentTypes}
					onApply={handleApplyMoreFilters}
				/>

				{listTotalTruncated ? (
					<p className="text-small text-muted-foreground">
						{BILLING_MANAGEMENT_PAGE_CONTENT.truncatedTotalNote}
					</p>
				) : null}

				<div className="min-w-0">
					{listLoading ? (
						<TableSkeleton
							columns={columns}
							rowCount={PAGE_SIZE}
							showPagination
							fixedHeight
						/>
					) : listError ? (
						<p className="text-sm text-destructive" role="alert">
							{listError}
						</p>
					) : (
						<DataTable<BillingManagementRow>
							data={listItems}
							columns={columns}
							pageSize={PAGE_SIZE}
							emptyMessage={
								listTotalCount === 0
									? BILLING_MANAGEMENT_PAGE_CONTENT.noRecords
									: DATA_TABLE_TEXT.noData
							}
							serverPagination={{
								totalCount: listTotalCount,
								pageIndex: listPageIndex,
								onPageChange: setListPageIndex,
							}}
							serverSort={{
								sortColumnId: listSortColumnId,
								sortDirection: listSortDirection as SortDirection,
								onSort: handleSort,
							}}
							fixedHeight
							tableLayout="auto"
						/>
					)}
				</div>
			</div>

			{confirmTarget && confirmKind === "cancel" ? (
				<CancelSubscriptionModal
					open
					onOpenChange={handleConfirmModalOpenChange}
					row={confirmTarget}
					onConfirm={handleCancelConfirm}
					isConfirming={confirmBusy}
				/>
			) : null}
			{confirmTarget && confirmKind === "reinstate" ? (
				<ConfirmationModal
					open
					onOpenChange={handleConfirmModalOpenChange}
					title={BILLING_REINSTATE_MODAL.title}
					description={BILLING_REINSTATE_MODAL.description}
					icon={<RotateCcw className="size-12 text-icon-info" aria-hidden />}
					confirmLabel={BILLING_REINSTATE_MODAL.confirm}
					confirmIcon={RotateCcw}
					cancelLabel={BILLING_REINSTATE_MODAL.cancel}
					onConfirm={handleConfirm}
					isConfirming={confirmBusy}
					variant="default"
				/>
			) : confirmTarget && confirmKind === "retry" ? (
				<ConfirmationModal
					open
					onOpenChange={handleConfirmModalOpenChange}
					title={confirmCopy.title}
					description={confirmCopy.description}
					icon={
						<AlertTriangle className="size-12 text-icon-warning" aria-hidden />
					}
					confirmLabel={BILLING_CONFIRM.confirm}
					cancelLabel={BILLING_CONFIRM.cancel}
					onConfirm={handleConfirm}
					isConfirming={confirmBusy}
					variant="default"
				/>
			) : null}
		</WhiteBox>
	);
}
