import { PLANS_PRICING_VIEW_PAGE } from "@/const";
import type { ColumnDef, PlansPricingTierRow, PricingPlanType } from "@/types";
import { formatCurrencyAmount, formatPlanEmployeeRange } from "@/utils";

function computeTierSortKey(p: PricingPlanType["plans"][number]): number {
	const isCompany = p.customerType === "company" ? 0 : 1;
	const base = isCompany * 2_000_000_000;
	const min = p.employeeRangeMin;
	if (min != null) {
		return base + min * 1_000_000 + (p.employeeRangeMax ?? min);
	}
	return base + 1_999_000_000 + (p.employeeRangeMax ?? 0);
}

function sortPlanLevels(
	plans: PricingPlanType["plans"],
): PricingPlanType["plans"] {
	return [...plans].sort((a, b) => {
		if (a.customerType !== b.customerType) {
			return a.customerType.localeCompare(b.customerType);
		}
		const amin = a.employeeRangeMin ?? -1;
		const bmin = b.employeeRangeMin ?? -1;
		if (amin !== bmin) return amin - bmin;
		const amax = a.employeeRangeMax ?? Number.MAX_SAFE_INTEGER;
		const bmax = b.employeeRangeMax ?? Number.MAX_SAFE_INTEGER;
		return amax - bmax;
	});
}

export function mapPlanTypeToTierRows(
	planType: PricingPlanType,
): PlansPricingTierRow[] {
	return sortPlanLevels(planType.plans).map((p) => ({
		id: p.id,
		tierLabel: formatPlanEmployeeRange(p.employeeRangeMin, p.employeeRangeMax),
		tierSortKey: computeTierSortKey(p),
		price: p.price,
		isCustomPricing: p.isCustomPricing,
	}));
}

export function getPlanPricingTierColumns(): ColumnDef<PlansPricingTierRow>[] {
	return [
		{
			id: "planLevel",
			header: PLANS_PRICING_VIEW_PAGE.planLevelColumn,
			accessorKey: "tierSortKey",
			sortable: true,
			headerClassName: "w-1/2",
			cell: (row) => (
				<span className="text-text-foreground">{row.tierLabel}</span>
			),
		},
		{
			id: "price",
			header: PLANS_PRICING_VIEW_PAGE.priceColumn,
			accessorKey: "price",
			sortable: true,
			headerClassName: "w-1/2",
			cell: (row) => (
				<span className="text-text-foreground">
					{row.isCustomPricing
						? PLANS_PRICING_VIEW_PAGE.customPriceLabel
						: formatCurrencyAmount(row.price)}
				</span>
			),
		},
	];
}
