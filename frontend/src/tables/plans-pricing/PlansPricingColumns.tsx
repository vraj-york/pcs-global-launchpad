import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	PLANS_PRICING_PAGE_CONTENT,
	PLANS_PRICING_TABLE_HEADERS,
} from "@/const";
import type {
	ColumnDef,
	PlansPricingColumnOptions,
	PlansPricingSummaryRow,
} from "@/types";
import { formatCurrencyAmount } from "@/utils";

export function getPlansPricingColumns(
	options: PlansPricingColumnOptions,
): ColumnDef<PlansPricingSummaryRow>[] {
	const { onViewClick } = options;
	return [
		{
			id: "planName",
			header: PLANS_PRICING_TABLE_HEADERS.plans,
			accessorKey: "planName",
			headerClassName: "w-3/12",
			cell: (row) => (
				<span className="truncate text-text-foreground" title={row.planName}>
					{row.planName}
				</span>
			),
		},
		{
			id: "price",
			header: PLANS_PRICING_TABLE_HEADERS.price,
			accessorKey: "price",
			sortable: true,
			headerClassName: "w-2/12",
			cell: (row) => (
				<span className="text-text-foreground">
					{formatCurrencyAmount(row.price)}
				</span>
			),
		},
		{
			id: "description",
			header: PLANS_PRICING_TABLE_HEADERS.description,
			accessorKey: "description",
			headerClassName: "w-6/12",
			cellClassName: "whitespace-normal",
			cell: (row) => (
				<p className="m-0 text-pretty text-small leading-normal text-text-foreground">
					{row.description}
				</p>
			),
		},
		{
			id: "actions",
			header: PLANS_PRICING_TABLE_HEADERS.actions,
			headerClassName: "w-1/12 text-center",
			cellClassName: "text-center",
			cell: (row) => {
				const handleClick = () => onViewClick(row);
				return (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						icon={Eye}
						onClick={handleClick}
						aria-label={PLANS_PRICING_PAGE_CONTENT.viewPlanAriaLabel}
					/>
				);
			},
		},
	];
}
