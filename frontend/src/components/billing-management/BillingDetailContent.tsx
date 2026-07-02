import { ChevronLeft, CircleX, RotateCcw, SquarePen } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BSPBadge, ConfirmationModal, DetailRow } from "@/components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	BILLING_DETAIL_SUBSCRIPTION_BADGE_TYPES,
	BILLING_MANAGEMENT_PAGE_CONTENT,
	BILLING_MANAGEMENT_UI,
	BILLING_PAYMENT_BADGE_LABELS,
	BILLING_PAYMENT_METHOD_FILTER_OPTIONS,
	BILLING_REINSTATE_MODAL,
	BILLING_ROW_ACTIONS,
	BILLING_SUBSCRIPTION_BADGE_LABELS,
	BILLING_TABLE_LABELS,
	ROUTES,
	SUBMODULE_KEYS,
} from "@/const";
import { usePermissions } from "@/hooks";
import { cn } from "@/lib/utils";
import { useBillingManagementStore } from "@/store";
import type {
	BillingConfirmKind,
	BillingDetailContentProps,
	BillingDetailTab,
	BillingManagementRow,
	CancelBillingSubscriptionPayload,
} from "@/types";
import { formatDateShort, formatMoneyFromMinorUnits } from "@/utils";
import { BillingHistoryContent } from "./BillingHistoryContent";
import { CancelSubscriptionModal } from "./CancelSubscriptionModal";

function paymentTypeDisplayLabel(
	paymentType: BillingManagementRow["paymentType"],
): string | null {
	if (!paymentType) {
		return null;
	}
	return (
		BILLING_PAYMENT_METHOD_FILTER_OPTIONS.find((o) => o.id === paymentType)
			?.label ?? null
	);
}

function BillingInfoCard({ row }: { row: BillingManagementRow }) {
	return (
		<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
			<CardHeader className="flex min-h-14 w-full items-center border-b border-border p-4">
				<CardTitle className="text-base font-medium text-text-secondary">
					{BILLING_MANAGEMENT_PAGE_CONTENT.billingInfoCardTitle}
				</CardTitle>
			</CardHeader>
			<CardContent className="flex w-full flex-col gap-3 p-4">
				<DetailRow
					label={BILLING_TABLE_LABELS.billingId}
					value={row.billingId?.trim() || undefined}
					emptyPlaceholder={BILLING_MANAGEMENT_UI.emptyCell}
				/>
				<DetailRow
					label={BILLING_TABLE_LABELS.plan}
					value={row.planLabel?.trim() || undefined}
					emptyPlaceholder={BILLING_MANAGEMENT_UI.emptyCell}
				/>
				<DetailRow
					label={BILLING_MANAGEMENT_PAGE_CONTENT.planLevel}
					value={row.planLevel?.trim() || undefined}
					emptyPlaceholder={BILLING_MANAGEMENT_UI.emptyCell}
				/>
				<DetailRow label={BILLING_TABLE_LABELS.subscriptionStatus}>
					{row.subscriptionStatus === "none" ? (
						<span>{BILLING_MANAGEMENT_UI.emptyCell}</span>
					) : (
						<BSPBadge
							type={
								BILLING_DETAIL_SUBSCRIPTION_BADGE_TYPES[
									row.subscriptionStatus
								] ?? row.subscriptionStatus
							}
						>
							{BILLING_SUBSCRIPTION_BADGE_LABELS[row.subscriptionStatus] ??
								row.subscriptionStatus}
						</BSPBadge>
					)}
				</DetailRow>
				<DetailRow
					label={BILLING_TABLE_LABELS.billingCycle}
					value={row.billingCycle?.trim() || undefined}
					emptyPlaceholder={BILLING_MANAGEMENT_UI.emptyCell}
				/>
				<DetailRow
					label={BILLING_TABLE_LABELS.renewalDate}
					value={
						row.renewalDate
							? formatDateShort(new Date(`${row.renewalDate}T12:00:00Z`))
							: undefined
					}
					emptyPlaceholder={BILLING_MANAGEMENT_UI.emptyCell}
				/>
			</CardContent>
		</Card>
	);
}

function PaymentInfoCard({ row }: { row: BillingManagementRow }) {
	const paymentTypeLabel = paymentTypeDisplayLabel(row.paymentType);

	return (
		<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
			<CardHeader className="flex min-h-14 w-full items-center border-b border-border p-4">
				<CardTitle className="text-base font-medium text-text-secondary">
					{BILLING_MANAGEMENT_PAGE_CONTENT.paymentInfoCardTitle}
				</CardTitle>
			</CardHeader>
			<CardContent className="flex w-full flex-col gap-3 p-4">
				<DetailRow label={BILLING_TABLE_LABELS.paymentStatus}>
					<BSPBadge type={row.paymentStatus}>
						{BILLING_PAYMENT_BADGE_LABELS[row.paymentStatus]}
					</BSPBadge>
				</DetailRow>
				<DetailRow
					label={BILLING_TABLE_LABELS.paymentType}
					value={paymentTypeLabel ?? undefined}
					emptyPlaceholder={BILLING_MANAGEMENT_UI.emptyCell}
				/>
				<DetailRow
					label={BILLING_TABLE_LABELS.nextAmount}
					value={
						row.nextBillingAmountCents != null && row.nextBillingCurrency
							? formatMoneyFromMinorUnits(
									row.nextBillingAmountCents,
									row.nextBillingCurrency,
								)
							: undefined
					}
					emptyPlaceholder={BILLING_MANAGEMENT_UI.emptyCell}
				/>
			</CardContent>
		</Card>
	);
}

export function BillingDetailContent({
	row,
	onBack,
}: BillingDetailContentProps) {
	const navigate = useNavigate();
	const [tab, setTab] = useState<BillingDetailTab>("info");
	const [confirmKind, setConfirmKind] = useState<BillingConfirmKind>(null);
	const [confirmBusy, setConfirmBusy] = useState(false);

	const { cancelSubscription, reinstateSubscription, fetchBillingDetail } =
		useBillingManagementStore();
	const { can } = usePermissions();

	const showCancel =
		row.canCancelSubscription &&
		can(SUBMODULE_KEYS.BILLING_MANAGEMENT_CANCEL_REINSTATE);
	const showReinstate =
		row.canReinstateSubscription &&
		Boolean(row.stripeSubscriptionId && row.cancelAtPeriodEnd) &&
		!showCancel &&
		can(SUBMODULE_KEYS.BILLING_MANAGEMENT_CANCEL_REINSTATE);
	const showEdit = row.canEdit && can(SUBMODULE_KEYS.BILLING_MANAGEMENT_EDIT);
	const showHeaderActions = showCancel || showReinstate || showEdit;

	const handleTabInfo = useCallback(() => {
		setTab("info");
	}, []);

	const handleTabHistory = useCallback(() => {
		setTab("history");
	}, []);

	const handleCancelSubscription = useCallback(() => {
		setConfirmKind("cancel");
	}, []);

	const handleReinstateSubscription = useCallback(() => {
		if (!row.stripeSubscriptionId || !row.cancelAtPeriodEnd) {
			return;
		}
		setConfirmKind("reinstate");
	}, [row.stripeSubscriptionId, row.cancelAtPeriodEnd]);

	const handleConfirmModalOpenChange = useCallback((open: boolean) => {
		if (!open) {
			setConfirmKind(null);
		}
	}, []);

	const handleCancelConfirm = useCallback(
		async (payload: CancelBillingSubscriptionPayload) => {
			setConfirmBusy(true);
			try {
				const res = await cancelSubscription(row.companyId, payload);
				if (res.ok) {
					setConfirmKind(null);
					await fetchBillingDetail(row.companyId);
				}
			} finally {
				setConfirmBusy(false);
			}
		},
		[row.companyId, cancelSubscription, fetchBillingDetail],
	);

	const handleReinstateConfirm = useCallback(async () => {
		setConfirmBusy(true);
		try {
			const res = await reinstateSubscription(row.companyId);
			if (res.ok) {
				setConfirmKind(null);
				await fetchBillingDetail(row.companyId);
			}
		} finally {
			setConfirmBusy(false);
		}
	}, [row.companyId, reinstateSubscription, fetchBillingDetail]);

	const handleEditDetails = useCallback(() => {
		navigate(ROUTES.finance.billingEditWithIdPath(row.companyId));
	}, [navigate, row.companyId]);

	return (
		<div className="-m-6 flex min-h-full flex-col bg-content-bg p-6 pt-3">
			<div className="flex shrink-0 flex-col gap-4">
				<div className="flex min-h-12 w-full flex-wrap items-end justify-between gap-4 pt-4">
					<div className="flex min-w-0 flex-1 flex-wrap items-end gap-4">
						<Button
							type="button"
							variant="outline"
							icon={ChevronLeft}
							onClick={onBack}
							aria-label={BILLING_MANAGEMENT_PAGE_CONTENT.backButton}
						>
							{BILLING_MANAGEMENT_PAGE_CONTENT.backButton}
						</Button>
						<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
							<h1
								className="min-w-0 truncate text-heading-4 font-semibold text-text-foreground"
								title={row.companyName}
							>
								{row.companyName}
							</h1>
							{row.planLabel?.trim() ? (
								<BSPBadge
									type={
										row.planTypeId?.trim()
											? `${row.planTypeId.trim()}_filled`
											: "gray"
									}
									className="max-w-full truncate"
									title={row.planLabel}
								>
									{row.planLabel}
								</BSPBadge>
							) : null}
						</div>
					</div>
					{showHeaderActions ? (
						<div className="flex shrink-0 flex-wrap items-center gap-2.5">
							{showCancel ? (
								<Button
									type="button"
									variant="outline"
									className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
									icon={CircleX}
									onClick={handleCancelSubscription}
									tabIndex={0}
									aria-label={BILLING_ROW_ACTIONS.menuCancelSubscription}
								>
									{BILLING_ROW_ACTIONS.menuCancelSubscription}
								</Button>
							) : null}
							{showReinstate ? (
								<Button
									type="button"
									icon={RotateCcw}
									onClick={handleReinstateSubscription}
									tabIndex={0}
									aria-label={BILLING_ROW_ACTIONS.menuReinstateSubscription}
								>
									{BILLING_ROW_ACTIONS.menuReinstateSubscription}
								</Button>
							) : null}
							{showEdit ? (
								<Button
									type="button"
									icon={SquarePen}
									tabIndex={0}
									onClick={handleEditDetails}
									aria-label={BILLING_MANAGEMENT_PAGE_CONTENT.editDetails}
								>
									{BILLING_MANAGEMENT_PAGE_CONTENT.editDetails}
								</Button>
							) : null}
						</div>
					) : null}
				</div>

				<div
					className="flex h-11 min-h-11 w-full items-center rounded-xl bg-card-foreground p-1"
					role="tablist"
					aria-label={BILLING_MANAGEMENT_PAGE_CONTENT.tabsListAriaLabel}
				>
					<button
						type="button"
						role="tab"
						tabIndex={0}
						aria-selected={tab === "info"}
						className={cn(
							"inline-flex h-9 min-h-9 flex-1 cursor-pointer items-center justify-center rounded-lg border-0 px-2.5 py-1.5 text-small font-semibold transition-colors sm:flex-none sm:px-4",
							tab === "info"
								? "bg-background text-brand-primary"
								: "bg-transparent text-text-secondary hover:text-text-foreground",
						)}
						onClick={handleTabInfo}
					>
						{BILLING_MANAGEMENT_PAGE_CONTENT.tabBillingPaymentInfo}
					</button>
					<button
						type="button"
						role="tab"
						tabIndex={0}
						aria-selected={tab === "history"}
						className={cn(
							"inline-flex h-9 min-h-9 flex-1 cursor-pointer items-center justify-center rounded-lg border-0 px-2.5 py-1.5 text-small font-semibold transition-colors sm:flex-none sm:px-4",
							tab === "history"
								? "bg-background text-brand-primary"
								: "bg-transparent text-text-secondary hover:text-text-foreground",
						)}
						onClick={handleTabHistory}
					>
						{BILLING_MANAGEMENT_PAGE_CONTENT.tabBillingHistory}
					</button>
				</div>
			</div>

			<div className="mt-6 flex min-h-0 flex-1 flex-col">
				{tab === "info" ? (
					<div className="grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-2">
						<BillingInfoCard row={row} />
						<PaymentInfoCard row={row} />
					</div>
				) : null}
				{tab === "history" ? (
					<BillingHistoryContent companyId={row.companyId} active />
				) : null}
			</div>

			{confirmKind === "cancel" ? (
				<CancelSubscriptionModal
					open
					onOpenChange={handleConfirmModalOpenChange}
					row={row}
					onConfirm={handleCancelConfirm}
					isConfirming={confirmBusy}
				/>
			) : null}
			{confirmKind === "reinstate" ? (
				<ConfirmationModal
					open
					onOpenChange={handleConfirmModalOpenChange}
					title={BILLING_REINSTATE_MODAL.title}
					description={BILLING_REINSTATE_MODAL.description}
					icon={<RotateCcw className="size-12 text-icon-info" aria-hidden />}
					confirmLabel={BILLING_REINSTATE_MODAL.confirm}
					confirmIcon={RotateCcw}
					cancelLabel={BILLING_REINSTATE_MODAL.cancel}
					onConfirm={handleReinstateConfirm}
					isConfirming={confirmBusy}
					variant="default"
				/>
			) : null}
		</div>
	);
}
