import {
	CircleX,
	Eye,
	MoreVertical,
	RotateCcw,
	RotateCwSquare,
	SquarePen,
} from "lucide-react";
import { BSPBadge } from "@/components";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	BILLING_MANAGEMENT_UI,
	BILLING_PAYMENT_BADGE_LABELS,
	BILLING_PAYMENT_TYPE_LABELS,
	BILLING_ROW_ACTIONS,
	BILLING_SUBSCRIPTION_BADGE_LABELS,
	BILLING_TABLE_LABELS,
} from "@/const";
import type {
	BillingManagementColumnOptions,
	BillingManagementRow,
	ColumnDef,
} from "@/types";
import { formatDateShort, formatMoneyFromMinorUnits } from "@/utils";

export function getBillingManagementColumns(
	options?: BillingManagementColumnOptions,
): ColumnDef<BillingManagementRow>[] {
	const {
		onViewClick,
		onEditClick,
		onRetryPaymentClick,
		onCancelSubscriptionClick,
		onReinstateSubscriptionClick,
		rbac,
	} = options ?? {};
	const canEditBilling = rbac?.canEdit ?? true;
	const canCancelReinstate = rbac?.canCancelReinstate ?? true;
	return [
		{
			id: "billingId",
			header: BILLING_TABLE_LABELS.billingId,
			accessorKey: "billingId",
			sortable: true,
			minWidth: "10rem",
			cell: (row) => (
				<div className="flex min-h-10 items-center">
					{row.billingId?.trim() ? (
						<span className="truncate font-medium text-text-foreground">
							{row.billingId}
						</span>
					) : (
						<span>{BILLING_MANAGEMENT_UI.emptyCell}</span>
					)}
				</div>
			),
		},
		{
			id: "companyName",
			header: BILLING_TABLE_LABELS.company,
			accessorKey: "companyName",
			sortable: true,
			minWidth: "14rem",
			cell: (row) => (
				<div className="flex min-h-10 items-center">
					<div className="min-w-0">
						<div className="truncate text-sm font-medium text-text-foreground">
							{row.companyName}
						</div>
						{row.companyRegion ? (
							<div className="truncate text-xs text-muted-foreground">
								{row.companyRegion}
							</div>
						) : null}
					</div>
				</div>
			),
		},
		{
			id: "planLabel",
			header: BILLING_TABLE_LABELS.plan,
			accessorKey: "planLabel",
			sortable: true,
			minWidth: "12rem",
			cell: (row) => {
				const planLabel = row.planLabel?.trim();
				return (
					<div className="flex min-h-10 items-center">
						{planLabel ? (
							<BSPBadge
								type={row.planTypeId?.trim() ?? "gray"}
								className="max-w-full truncate"
								title={planLabel}
							>
								{planLabel}
							</BSPBadge>
						) : (
							<span>{BILLING_MANAGEMENT_UI.emptyCell}</span>
						)}
					</div>
				);
			},
		},
		{
			id: "billingCycle",
			header: BILLING_TABLE_LABELS.billingCycle,
			accessorKey: "billingCycle",
			sortable: true,
			minWidth: "9rem",
			cell: (row) => (
				<div className="flex min-h-10 items-center">
					{row.billingCycle ? (
						<span>{row.billingCycle}</span>
					) : (
						<span>{BILLING_MANAGEMENT_UI.emptyCell}</span>
					)}
				</div>
			),
		},
		{
			id: "subscriptionStatus",
			header: BILLING_TABLE_LABELS.subscriptionStatus,
			accessorKey: "subscriptionStatus",
			sortable: true,
			minWidth: "12rem",
			cell: (row) => (
				<div className="flex min-h-10 items-center">
					<div className="flex flex-wrap items-center gap-1">
						{row.subscriptionStatus === "none" ? (
							<span>{BILLING_MANAGEMENT_UI.emptyCell}</span>
						) : (
							<BSPBadge type={row.subscriptionStatus}>
								{BILLING_SUBSCRIPTION_BADGE_LABELS[row.subscriptionStatus] ??
									row.subscriptionStatus}
							</BSPBadge>
						)}
					</div>
				</div>
			),
		},
		{
			id: "renewalDate",
			header: BILLING_TABLE_LABELS.renewalDate,
			accessorKey: "renewalDate",
			sortable: true,
			minWidth: "10rem",
			cell: (row) => (
				<div className="flex min-h-10 items-center">
					{row.renewalDate ? (
						<span>
							{formatDateShort(new Date(`${row.renewalDate}T12:00:00Z`))}
						</span>
					) : (
						<span>{BILLING_MANAGEMENT_UI.emptyCell}</span>
					)}
				</div>
			),
		},
		{
			id: "paymentStatus",
			header: BILLING_TABLE_LABELS.paymentStatus,
			accessorKey: "paymentStatus",
			sortable: true,
			minWidth: "10rem",
			cell: (row) => (
				<div className="flex min-h-10 items-center">
					<BSPBadge type={row.paymentStatus}>
						{BILLING_PAYMENT_BADGE_LABELS[row.paymentStatus]}
					</BSPBadge>
				</div>
			),
		},
		{
			id: "nextBillingAmount",
			header: BILLING_TABLE_LABELS.nextAmount,
			accessorKey: "nextBillingAmountCents",
			sortable: true,
			minWidth: "12rem",
			cell: (row) => (
				<div className="flex min-h-10 items-center">
					{row.nextBillingAmountCents != null && row.nextBillingCurrency ? (
						<span>
							{formatMoneyFromMinorUnits(
								row.nextBillingAmountCents,
								row.nextBillingCurrency,
							)}
						</span>
					) : (
						<span>{BILLING_MANAGEMENT_UI.emptyCell}</span>
					)}
				</div>
			),
		},
		{
			id: "paymentType",
			header: BILLING_TABLE_LABELS.paymentType,
			accessorKey: "paymentType",
			sortable: true,
			minWidth: "10rem",
			cell: (row) => (
				<div className="flex min-h-10 items-center">
					{row.paymentType ? (
						<BSPBadge type={row.paymentType} className="max-w-full truncate">
							{BILLING_PAYMENT_TYPE_LABELS[row.paymentType] ?? row.paymentType}
						</BSPBadge>
					) : (
						<span>{BILLING_MANAGEMENT_UI.emptyCell}</span>
					)}
				</div>
			),
		},
		{
			id: "actions",
			header: BILLING_TABLE_LABELS.actions,
			minWidth: "92px",
			cell: (row) => {
				const rowCanEdit = row.canEdit && canEditBilling;
				const rowCanRetry = row.canRetryPayment && canEditBilling;
				const rowCanCancel = row.canCancelSubscription && canCancelReinstate;
				const rowCanReinstate =
					row.canReinstateSubscription && canCancelReinstate;
				const showMoreMenu =
					rowCanEdit || rowCanRetry || rowCanCancel || rowCanReinstate;
				const showReinstate =
					rowCanReinstate &&
					Boolean(row.stripeSubscriptionId && row.cancelAtPeriodEnd);

				return (
					<div className="flex min-h-10 items-center">
						<div className="flex gap-1">
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								className="text-muted-foreground hover:text-foreground"
								aria-label={`${BILLING_ROW_ACTIONS.viewAriaLabel} ${row.billingId ?? row.companyName}`}
								onClick={() => onViewClick?.(row)}
								icon={Eye}
							/>
							{showMoreMenu ? (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={BILLING_TABLE_LABELS.actions}
											icon={MoreVertical}
										/>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										{rowCanEdit ? (
											<DropdownMenuItem onSelect={() => onEditClick?.(row)}>
												<SquarePen
													className="size-4 text-icon-primary"
													aria-hidden
												/>
												{BILLING_ROW_ACTIONS.menuEdit}
											</DropdownMenuItem>
										) : null}
										{rowCanRetry ? (
											<DropdownMenuItem
												onSelect={() => onRetryPaymentClick?.(row)}
											>
												<RotateCwSquare
													className="size-4 text-icon-primary"
													aria-hidden
												/>
												{BILLING_ROW_ACTIONS.menuRetryPayment}
											</DropdownMenuItem>
										) : null}
										{rowCanCancel ? (
											<DropdownMenuItem
												variant="destructive"
												onSelect={() => onCancelSubscriptionClick?.(row)}
											>
												<CircleX
													className="size-4 text-icon-destructive"
													aria-hidden
												/>
												{BILLING_ROW_ACTIONS.menuCancelSubscription}
											</DropdownMenuItem>
										) : null}
										{showReinstate ? (
											<DropdownMenuItem
												onSelect={() => onReinstateSubscriptionClick?.(row)}
											>
												<RotateCcw
													className="size-4 text-icon-primary"
													aria-hidden
												/>
												{BILLING_ROW_ACTIONS.menuReinstateSubscription}
											</DropdownMenuItem>
										) : null}
									</DropdownMenuContent>
								</DropdownMenu>
							) : null}
						</div>
					</div>
				);
			},
		},
	];
}
