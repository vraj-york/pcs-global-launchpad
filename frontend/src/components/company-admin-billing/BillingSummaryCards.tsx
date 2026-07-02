import { CalendarSync, CircleCheck, DollarSign } from "lucide-react";
import { BSPBadge } from "@/components";
import {
	BILLING_DETAIL_SUBSCRIPTION_BADGE_TYPES,
	BILLING_MANAGEMENT_UI,
	BILLING_SUBSCRIPTION_BADGE_LABELS,
	COMPANY_ADMIN_BILLING_PAGE_CONTENT,
} from "@/const";
import type { BillingSummaryCardsProps } from "@/types";
import { formatDateShort, formatMoneyFromMinorUnits } from "@/utils";

export function BillingSummaryCards({ row }: BillingSummaryCardsProps) {
	const status = row.subscriptionStatus;
	const renewalLabel = row.renewalDate
		? formatDateShort(new Date(`${row.renewalDate}T12:00:00Z`))
		: BILLING_MANAGEMENT_UI.emptyCell;
	const amountLabel =
		row.nextBillingAmountCents != null && row.nextBillingCurrency
			? formatMoneyFromMinorUnits(
					row.nextBillingAmountCents,
					row.nextBillingCurrency,
				)
			: BILLING_MANAGEMENT_UI.emptyCell;

	return (
		<div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
			<div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4">
				<div className="flex items-start justify-between gap-2">
					<div className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg p-2.5 bg-brand-primary-bg">
						<CircleCheck className="size-4 text-brand-primary" aria-hidden />
					</div>
					{status !== "none" ? (
						<BSPBadge
							type={`${BILLING_DETAIL_SUBSCRIPTION_BADGE_TYPES[status] ?? status}_filled`}
						>
							{BILLING_SUBSCRIPTION_BADGE_LABELS[status] ?? status}
						</BSPBadge>
					) : null}
				</div>
				<div className="flex flex-col gap-2">
					<p className="text-heading-4 font-semibold leading-heading-4 text-text-foreground">
						{row.planLabel?.trim() || BILLING_MANAGEMENT_UI.emptyCell}
					</p>
					<p className="text-small font-medium leading-small text-muted-foreground">
						{COMPANY_ADMIN_BILLING_PAGE_CONTENT.currentPlanLabel}
					</p>
				</div>
			</div>

			<div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4">
				<div className="flex items-start">
					<div className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg p-2.5 bg-warning-bg">
						<CalendarSync
							className="size-4 text-interactive-warning-active"
							aria-hidden
						/>
					</div>
				</div>
				<div className="flex flex-col gap-2">
					<p className="text-heading-4 font-semibold leading-heading-4 text-text-foreground">
						{renewalLabel}
					</p>
					<p className="text-small font-medium leading-small text-muted-foreground">
						{COMPANY_ADMIN_BILLING_PAGE_CONTENT.nextRenewalLabel}
					</p>
				</div>
			</div>

			<div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4">
				<div className="flex items-start">
					<div className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg p-2.5 bg-info-bg">
						<DollarSign className="size-4 text-icon-info" aria-hidden />
					</div>
				</div>
				<div className="flex flex-col gap-2">
					<p className="text-heading-4 font-semibold leading-heading-4 text-text-foreground">
						{amountLabel}
					</p>
					<p className="text-small font-medium leading-small text-muted-foreground">
						{COMPANY_ADMIN_BILLING_PAGE_CONTENT.invoiceAmountLabel}
					</p>
				</div>
			</div>
		</div>
	);
}
