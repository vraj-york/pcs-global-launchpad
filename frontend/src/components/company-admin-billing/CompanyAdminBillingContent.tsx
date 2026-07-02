import {
	AlertTriangle,
	CircleX,
	Loader2,
	RotateCcw,
	SquarePen,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
	BillingEventsTimeline,
	BillingSummaryCards,
	CancelSubscriptionModal,
	ConfirmationModal,
} from "@/components";
import { Button } from "@/components/ui/button";
import {
	BILLING_CONFIRM,
	BILLING_REINSTATE_MODAL,
	BILLING_ROW_ACTIONS,
	COMPANY_ADMIN_BILLING_PAGE_CONTENT,
	SUBMODULE_KEYS,
} from "@/const";
import { usePermissions } from "@/hooks";
import { useCompanyAdminBillingStore, useUsersStore } from "@/store";
import type { CancelBillingSubscriptionPayload } from "@/types";

function CompanyAdminBillingPageHeader({
	showCancel,
	onCancelClick,
	showReinstate,
	onReinstateClick,
	onChangePlanClick,
	changePlanBusy,
	showChangePlan,
}: {
	showCancel: boolean;
	onCancelClick: () => void;
	showReinstate: boolean;
	onReinstateClick: () => void;
	onChangePlanClick: () => void;
	changePlanBusy: boolean;
	showChangePlan: boolean;
}) {
	return (
		<div className="flex flex-wrap items-end justify-between gap-4">
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<h1 className="text-heading-4 font-semibold text-text-foreground">
					{COMPANY_ADMIN_BILLING_PAGE_CONTENT.title}
				</h1>
				<p className="text-small text-text-secondary">
					{COMPANY_ADMIN_BILLING_PAGE_CONTENT.subtitle}
				</p>
			</div>
			<div className="flex shrink-0 flex-wrap items-center gap-2">
				{showCancel ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
						onClick={onCancelClick}
						tabIndex={0}
						aria-label={BILLING_ROW_ACTIONS.menuCancelSubscription}
						icon={CircleX}
					>
						{BILLING_ROW_ACTIONS.menuCancelSubscription}
					</Button>
				) : null}
				{showReinstate ? (
					<Button
						type="button"
						variant="default"
						size="sm"
						onClick={onReinstateClick}
						tabIndex={0}
						aria-label={BILLING_ROW_ACTIONS.menuReinstateSubscription}
						icon={RotateCcw}
					>
						{BILLING_ROW_ACTIONS.menuReinstateSubscription}
					</Button>
				) : null}
				{showChangePlan ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onChangePlanClick}
						tabIndex={0}
						aria-label={COMPANY_ADMIN_BILLING_PAGE_CONTENT.changePlanLevel}
						icon={SquarePen}
						isLoading={changePlanBusy}
					>
						{COMPANY_ADMIN_BILLING_PAGE_CONTENT.changePlanLevel}
					</Button>
				) : null}
				<Button
					type="button"
					variant="default"
					size="sm"
					disabled
					tabIndex={-1}
					aria-label={COMPANY_ADMIN_BILLING_PAGE_CONTENT.upgradePlan}
					icon={SquarePen}
				>
					{COMPANY_ADMIN_BILLING_PAGE_CONTENT.upgradePlan}
				</Button>
			</div>
		</div>
	);
}

export function CompanyAdminBillingContent() {
	const [searchParams] = useSearchParams();
	const { can } = usePermissions();
	const canEditBilling = can(SUBMODULE_KEYS.BILLING_MANAGEMENT_EDIT);
	const canCancelReinstate = can(
		SUBMODULE_KEYS.BILLING_MANAGEMENT_CANCEL_REINSTATE,
	);
	const [cancelOpen, setCancelOpen] = useState(false);
	const [reinstateOpen, setReinstateOpen] = useState(false);
	const [retryOpen, setRetryOpen] = useState(false);

	const { userProfile, userProfileLoading, fetchUserProfile } = useUsersStore();

	const {
		companyId,
		billingRow,
		billingLoading,
		billingError,
		historyItems,
		historyLoading,
		historyError,
		invoiceDownloadBusyEventId,
		retryBusy,
		cancelBusy,
		reinstateBusy,
		changePlanBusy,
		setCompanyId,
		fetchBilling,
		fetchHistory,
		cancelSubscription,
		reinstateSubscription,
		requestPlanChange,
		retryPayment,
		downloadInvoice,
		reset,
	} = useCompanyAdminBillingStore();

	const queryCompanyId = searchParams.get("companyId")?.trim() || null;

	const resolvedCompanyId = useMemo(() => {
		if (queryCompanyId) {
			return queryCompanyId;
		}
		return userProfile?.companyId?.trim() || null;
	}, [queryCompanyId, userProfile?.companyId]);

	useEffect(() => {
		if (!queryCompanyId && !userProfile && !userProfileLoading) {
			void fetchUserProfile();
		}
	}, [queryCompanyId, userProfile, userProfileLoading, fetchUserProfile]);

	useEffect(() => {
		setCompanyId(resolvedCompanyId);
	}, [resolvedCompanyId, setCompanyId]);

	useEffect(() => {
		if (!companyId) {
			return;
		}
		void fetchBilling();
		void fetchHistory();
	}, [companyId, fetchBilling, fetchHistory]);

	useEffect(() => () => reset(), [reset]);

	const canCancelRow = Boolean(billingRow?.canCancelSubscription);
	const canReinstateRow = Boolean(
		billingRow?.canReinstateSubscription &&
			billingRow.stripeSubscriptionId &&
			billingRow.cancelAtPeriodEnd &&
			!canCancelRow,
	);
	const showCancel = canCancelRow && canCancelReinstate;
	const showReinstate = canReinstateRow && canCancelReinstate;
	const showRetry = Boolean(billingRow?.canRetryPayment) && canEditBilling;

	const handleCancelOpen = useCallback(() => {
		setCancelOpen(true);
	}, []);

	const handleCancelOpenChange = useCallback((open: boolean) => {
		setCancelOpen(open);
	}, []);

	const handleReinstateOpen = useCallback(() => {
		if (!billingRow?.stripeSubscriptionId || !billingRow.cancelAtPeriodEnd) {
			return;
		}
		setReinstateOpen(true);
	}, [billingRow?.stripeSubscriptionId, billingRow?.cancelAtPeriodEnd]);

	const handleCancelConfirm = useCallback(
		async (payload: CancelBillingSubscriptionPayload) => {
			const res = await cancelSubscription(payload);
			if (res.ok) {
				setCancelOpen(false);
			}
		},
		[cancelSubscription],
	);

	const handleReinstateConfirm = useCallback(async () => {
		const res = await reinstateSubscription();
		if (res.ok) {
			setReinstateOpen(false);
		}
	}, [reinstateSubscription]);

	const handleRetryConfirm = useCallback(async () => {
		const res = await retryPayment();
		if (res.ok) {
			setRetryOpen(false);
		}
	}, [retryPayment]);

	const handleChangePlanClick = useCallback(() => {
		void requestPlanChange();
	}, [requestPlanChange]);

	const handleDownloadInvoice = useCallback(
		(invoiceId: string, eventId: string) => {
			void downloadInvoice(invoiceId, eventId);
		},
		[downloadInvoice],
	);

	const handleTimelineRetry = useCallback(() => {
		setRetryOpen(true);
	}, []);

	const isLoading =
		billingLoading || (!queryCompanyId && userProfileLoading && !billingRow);

	const pageHeader = (
		<CompanyAdminBillingPageHeader
			showCancel={showCancel}
			onCancelClick={handleCancelOpen}
			showReinstate={showReinstate}
			onReinstateClick={handleReinstateOpen}
			onChangePlanClick={handleChangePlanClick}
			changePlanBusy={changePlanBusy}
			showChangePlan={canEditBilling}
		/>
	);

	if (!companyId && !isLoading) {
		return (
			<div className="flex flex-col gap-6">
				{pageHeader}
				<p className="text-sm text-destructive" role="alert">
					{COMPANY_ADMIN_BILLING_PAGE_CONTENT.missingCompanyId}
				</p>
			</div>
		);
	}

	if (isLoading && !billingRow) {
		return (
			<div className="flex flex-col gap-6">
				{pageHeader}
				<div
					className="flex min-h-40 items-center justify-center"
					role="status"
					aria-live="polite"
				>
					<Loader2
						className="size-6 animate-spin text-muted-foreground"
						aria-hidden
					/>
					<span className="sr-only">
						{COMPANY_ADMIN_BILLING_PAGE_CONTENT.loading}
					</span>
				</div>
			</div>
		);
	}

	if (billingError && !billingRow) {
		return (
			<div className="flex flex-col gap-6">
				{pageHeader}
				<p className="text-sm text-destructive" role="alert">
					{billingError}
				</p>
			</div>
		);
	}

	if (!billingRow) {
		return null;
	}

	return (
		<div className="flex flex-col gap-6">
			{pageHeader}

			<BillingSummaryCards row={billingRow} />

			<div>
				<h2 className="mb-4 text-base font-semibold text-text-foreground">
					{COMPANY_ADMIN_BILLING_PAGE_CONTENT.allEventsTitle}
				</h2>
				<BillingEventsTimeline
					events={historyItems}
					loading={historyLoading}
					error={historyError}
					canRetryPayment={showRetry}
					invoiceDownloadBusyEventId={invoiceDownloadBusyEventId}
					retryBusy={retryBusy}
					onDownloadInvoice={handleDownloadInvoice}
					onRetryPayment={handleTimelineRetry}
				/>
			</div>

			{cancelOpen ? (
				<CancelSubscriptionModal
					open
					onOpenChange={handleCancelOpenChange}
					row={billingRow}
					onConfirm={handleCancelConfirm}
					isConfirming={cancelBusy}
				/>
			) : null}

			{reinstateOpen ? (
				<ConfirmationModal
					open
					onOpenChange={setReinstateOpen}
					title={BILLING_REINSTATE_MODAL.title}
					description={BILLING_REINSTATE_MODAL.description}
					icon={<RotateCcw className="size-12 text-icon-info" aria-hidden />}
					confirmLabel={BILLING_REINSTATE_MODAL.confirm}
					confirmIcon={RotateCcw}
					cancelLabel={BILLING_REINSTATE_MODAL.cancel}
					onConfirm={handleReinstateConfirm}
					isConfirming={reinstateBusy}
					variant="default"
				/>
			) : null}

			{retryOpen ? (
				<ConfirmationModal
					open
					onOpenChange={setRetryOpen}
					title={BILLING_CONFIRM.retryPaymentTitle}
					description={BILLING_CONFIRM.retryPaymentDescription}
					icon={
						<AlertTriangle className="size-12 text-icon-warning" aria-hidden />
					}
					confirmLabel={BILLING_CONFIRM.confirm}
					cancelLabel={BILLING_CONFIRM.cancel}
					onConfirm={handleRetryConfirm}
					isConfirming={retryBusy}
					variant="default"
				/>
			) : null}
		</div>
	);
}
