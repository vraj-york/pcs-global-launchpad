import { BSPBadge } from "@/components";
import {
	BILLING_HISTORY_EVENT_BADGE_TYPES,
	BILLING_HISTORY_EVENT_TYPE_LABELS,
	BILLING_HISTORY_TABLE_LABELS,
	BILLING_MANAGEMENT_UI,
} from "@/const";
import type { BillingHistoryRow, ColumnDef } from "@/types";
import { formatMoneyFromMinorUnits, formatOccurredAtSeconds } from "@/utils";

export function getBillingHistoryColumns(): ColumnDef<BillingHistoryRow>[] {
	return [
		{
			id: "eventId",
			header: BILLING_HISTORY_TABLE_LABELS.eventId,
			accessorKey: "eventId",
			sortable: true,
			minWidth: "10rem",
			cell: (row) => (
				<div className="flex min-h-10 items-center">
					<span className="truncate font-medium text-text-foreground">
						{row.eventId}
					</span>
				</div>
			),
		},
		{
			id: "eventType",
			header: BILLING_HISTORY_TABLE_LABELS.eventType,
			accessorKey: "eventType",
			sortable: true,
			minWidth: "12rem",
			cell: (row) => (
				<div className="flex min-h-10 items-center">
					<BSPBadge
						type={BILLING_HISTORY_EVENT_BADGE_TYPES[row.eventType]}
						className="max-w-full truncate"
					>
						{BILLING_HISTORY_EVENT_TYPE_LABELS[row.eventType]}
					</BSPBadge>
				</div>
			),
		},
		{
			id: "planLabel",
			header: BILLING_HISTORY_TABLE_LABELS.plan,
			accessorKey: "planLabel",
			sortable: true,
			minWidth: "10rem",
			cell: (row) => (
				<div className="flex min-h-10 items-center">
					{row.planLabel?.trim() ? (
						<BSPBadge
							type={row.planTypeId?.trim() ?? "gray"}
							className="max-w-full truncate"
							title={row.planLabel}
						>
							{row.planLabel}
						</BSPBadge>
					) : (
						<span className="text-muted-foreground">
							{BILLING_MANAGEMENT_UI.emptyCell}
						</span>
					)}
				</div>
			),
		},
		{
			id: "amount",
			header: BILLING_HISTORY_TABLE_LABELS.amount,
			sortable: true,
			minWidth: "8rem",
			cell: (row) => (
				<div className="flex min-h-10 items-center">
					{row.amountCents != null && row.currency ? (
						<span className="text-text-foreground">
							{formatMoneyFromMinorUnits(row.amountCents, row.currency)}
						</span>
					) : (
						<span className="text-muted-foreground">
							{BILLING_MANAGEMENT_UI.emptyCell}
						</span>
					)}
				</div>
			),
		},
		{
			id: "actorName",
			header: BILLING_HISTORY_TABLE_LABELS.actor,
			accessorKey: "actorName",
			sortable: true,
			minWidth: "12rem",
			cell: (row) => (
				<div className="flex min-h-10 items-center">
					<div className="min-w-0">
						<div className="truncate text-sm font-medium text-text-foreground">
							{row.actorName?.trim() || BILLING_MANAGEMENT_UI.emptyCell}
						</div>
						<div className="truncate text-xs text-muted-foreground">
							{row.actorRole?.trim() || BILLING_MANAGEMENT_UI.emptyCell}
						</div>
					</div>
				</div>
			),
		},
		{
			id: "occurredAt",
			header: BILLING_HISTORY_TABLE_LABELS.invoiceDate,
			accessorKey: "occurredAt",
			sortable: true,
			minWidth: "11rem",
			cell: (row) => (
				<div className="flex min-h-10 items-center">
					<span className="text-text-foreground">
						{formatOccurredAtSeconds(row.occurredAt)}
					</span>
				</div>
			),
		},
	];
}
