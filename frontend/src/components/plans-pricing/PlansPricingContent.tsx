import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, TableSkeleton, WhiteBox } from "@/components";
import { DATA_TABLE_CONFIG, PLANS_PRICING_PAGE_CONTENT, ROUTES } from "@/const";
import { usePlansPricingStore } from "@/store";
import { getPlansPricingColumns } from "@/tables";
import type { PlansPricingSummaryRow } from "@/types";

const PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;

export function PlansPricingContent() {
	const navigate = useNavigate();
	const { summaryRows, loading, error, fetchPricingPlans } =
		usePlansPricingStore();

	useEffect(() => {
		fetchPricingPlans();
	}, [fetchPricingPlans]);

	const handleViewClick = useCallback(
		(row: PlansPricingSummaryRow) => {
			navigate(ROUTES.plansPricing.viewWithIdPath(row.id));
		},
		[navigate],
	);

	const columns = useMemo(
		() => getPlansPricingColumns({ onViewClick: handleViewClick }),
		[handleViewClick],
	);

	if (error) {
		return (
			<WhiteBox>
				<p className="m-0 text-small text-destructive" role="alert">
					{error}
				</p>
			</WhiteBox>
		);
	}

	return (
		<WhiteBox>
			{loading ? (
				<TableSkeleton columns={columns} rowCount={PAGE_SIZE} showPagination />
			) : (
				<DataTable
					data={summaryRows}
					columns={columns}
					pageSize={PAGE_SIZE}
					emptyMessage={PLANS_PRICING_PAGE_CONTENT.noData}
					showPagination={false}
				/>
			)}
		</WhiteBox>
	);
}
