import { format, parseISO } from "date-fns";
import { BSPBadge } from "@/components";
import { PROMO_CODES_PAGE_CONTENT } from "@/const";
import type { ColumnDef, PromoCodeUsageListItem } from "@/types";

const C = PROMO_CODES_PAGE_CONTENT;

function formatUsageDateTime(iso: string): string {
	try {
		return format(parseISO(iso), "MM-dd-yyyy, HH:mm:ss");
	} catch {
		return iso;
	}
}

export function getPromoCodeUsageHistoryColumns(): ColumnDef<PromoCodeUsageListItem>[] {
	return [
		{
			id: "userName",
			header: C.detail.usage.columns.userName,
			sortable: true,
			minWidth: "200px",
			cell: (row) => (
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="truncate text-foreground">
						{row.userDisplayName?.trim() || C.typography.emDash}
					</span>
					<span className="truncate text-xs text-muted-foreground">
						{row.userEmail?.trim() || C.typography.emDash}
					</span>
				</div>
			),
		},
		{
			id: "status",
			header: C.detail.usage.columns.status,
			sortable: true,
			minWidth: "110px",
			cell: (row) => (
				<BSPBadge type={row.outcome}>
					{row.outcome === "success"
						? C.detail.usage.outcome.success
						: C.detail.usage.outcome.failed}
				</BSPBadge>
			),
		},
		{
			id: "corporation",
			header: C.detail.usage.columns.corporation,
			sortable: true,
			minWidth: "180px",
			cell: (row) => {
				const has =
					Boolean(row.corporationName?.trim()) ||
					Boolean(row.corporationCodeLabel?.trim());
				if (!has) {
					return (
						<span className="text-muted-foreground">{C.detail.usage.na}</span>
					);
				}
				return (
					<div className="flex min-w-0 flex-col gap-0.5">
						<span className="truncate text-foreground">
							{row.corporationName?.trim() || C.detail.usage.na}
						</span>
						<span className="truncate text-xs text-muted-foreground">
							{row.corporationCodeLabel?.trim() || C.detail.usage.na}
						</span>
					</div>
				);
			},
		},
		{
			id: "company",
			header: C.detail.usage.columns.company,
			sortable: true,
			minWidth: "180px",
			cell: (row) => {
				const has =
					Boolean(row.companyName?.trim()) ||
					Boolean(row.companyRegion?.trim());
				if (!has) {
					return (
						<span className="text-muted-foreground">{C.detail.usage.na}</span>
					);
				}
				return (
					<div className="flex min-w-0 flex-col gap-0.5">
						<span className="truncate text-foreground">
							{row.companyName?.trim() || C.detail.usage.na}
						</span>
						<span className="truncate text-xs text-muted-foreground">
							{row.companyRegion?.trim() || C.detail.usage.na}
						</span>
					</div>
				);
			},
		},
		{
			id: "dateTime",
			header: C.detail.usage.columns.dateTime,
			sortable: true,
			minWidth: "170px",
			cell: (row) => formatUsageDateTime(row.occurredAt),
		},
	];
}
