import { useCallback, useEffect, useMemo } from "react";
import { DataTable, TableSkeleton, WhiteBox } from "@/components";
import {
	BILLING_HISTORY_PAGE_CONTENT,
	DATA_TABLE_CONFIG,
	DATA_TABLE_TEXT,
} from "@/const";
import { useBillingManagementStore } from "@/store";
import { getBillingHistoryColumns } from "@/tables";
import type {
	BillingHistoryContentProps,
	BillingHistoryTableRow,
} from "@/types";
import { BillingHistoryFiltersGroup } from "./BillingHistoryFiltersGroup";

const PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;

export function BillingHistoryContent({
	companyId,
	active,
}: BillingHistoryContentProps) {
	const {
		planOptions,
		planOptionsLoading,
		fetchPlanOptions,
		historyEventType,
		historyPlanTypeId,
		historyActorKind,
		historyPageIndex,
		historySortColumnId,
		historySortDirection,
		historyItems,
		historyTotalCount,
		historyLoading,
		historyError,
		initHistoryForCompany,
		fetchBillingHistory,
		setHistoryEventType,
		setHistoryPlanTypeId,
		setHistoryActorKind,
		setHistoryPageIndex,
		setHistorySort,
	} = useBillingManagementStore();

	useEffect(() => {
		if (!active) {
			return;
		}
		void fetchPlanOptions();
	}, [active, fetchPlanOptions]);

	useEffect(() => {
		if (!active) {
			return;
		}
		initHistoryForCompany(companyId);
	}, [active, companyId, initHistoryForCompany]);

	useEffect(() => {
		if (!active) {
			return;
		}
		void fetchBillingHistory(companyId);
	}, [
		active,
		companyId,
		fetchBillingHistory,
		historyPageIndex,
		historyEventType,
		historyPlanTypeId,
		historyActorKind,
		historySortColumnId,
		historySortDirection,
	]);

	const columns = useMemo(() => getBillingHistoryColumns(), []);

	const tableRows = useMemo<BillingHistoryTableRow[]>(
		() => historyItems.map((row) => ({ ...row, id: row.eventId })),
		[historyItems],
	);

	const handleSort = useCallback(
		(columnId: string) => {
			setHistorySort(columnId);
		},
		[setHistorySort],
	);

	return (
		<WhiteBox padding="sm" className="rounded-xl">
			<div className="flex flex-col gap-6">
				<BillingHistoryFiltersGroup
					className="w-full"
					eventType={historyEventType}
					onEventTypeChange={setHistoryEventType}
					planTypeId={historyPlanTypeId}
					onPlanTypeChange={setHistoryPlanTypeId}
					actorKind={historyActorKind}
					onActorKindChange={setHistoryActorKind}
					planOptions={planOptions}
					optionsLoading={planOptionsLoading}
				/>

				<div className="min-w-0">
					{historyLoading ? (
						<TableSkeleton
							columns={columns}
							rowCount={PAGE_SIZE}
							showPagination
							fixedHeight
						/>
					) : historyError ? (
						<p className="text-sm text-destructive" role="alert">
							{historyError}
						</p>
					) : (
						<DataTable
							data={tableRows}
							columns={columns}
							pageSize={PAGE_SIZE}
							emptyMessage={
								historyTotalCount === 0
									? BILLING_HISTORY_PAGE_CONTENT.noRecords
									: DATA_TABLE_TEXT.noData
							}
							serverPagination={{
								totalCount: historyTotalCount,
								pageIndex: historyPageIndex,
								onPageChange: setHistoryPageIndex,
							}}
							serverSort={{
								sortColumnId: historySortColumnId,
								sortDirection: historySortDirection,
								onSort: handleSort,
							}}
							fixedHeight
						/>
					)}
				</div>
			</div>
		</WhiteBox>
	);
}
