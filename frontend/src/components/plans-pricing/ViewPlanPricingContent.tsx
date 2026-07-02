import { ChevronLeft } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, WhiteBox } from "@/components";
import { Button } from "@/components/ui/button";
import {
	DATA_TABLE_CONFIG,
	PLANS_PRICING_PLAN_LABELS,
	PLANS_PRICING_VIEW_PAGE,
	ROUTES,
} from "@/const";
import { getPlanPricingTierColumns, mapPlanTypeToTierRows } from "@/tables";
import type { PricingPlanType } from "@/types";

const PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;

type ViewPlanPricingContentProps = {
	planType: PricingPlanType;
};

export function ViewPlanPricingContent({
	planType,
}: ViewPlanPricingContentProps) {
	const navigate = useNavigate();
	const columns = useMemo(() => getPlanPricingTierColumns(), []);
	const rows = useMemo(() => mapPlanTypeToTierRows(planType), [planType]);
	const displayName = PLANS_PRICING_PLAN_LABELS[planType.id] ?? planType.name;

	const handleBack = () => {
		navigate(ROUTES.plansPricing.root);
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-4">
				<Button
					variant="outline"
					type="button"
					icon={ChevronLeft}
					onClick={handleBack}
				>
					{PLANS_PRICING_VIEW_PAGE.backButton}
				</Button>
				<h1 className="truncate text-heading-4 font-semibold text-text-foreground">
					{displayName}
				</h1>
			</div>
			<WhiteBox>
				<DataTable
					data={rows}
					columns={columns}
					pageSize={PAGE_SIZE}
					emptyMessage={PLANS_PRICING_VIEW_PAGE.notFound}
				/>
			</WhiteBox>
		</div>
	);
}
