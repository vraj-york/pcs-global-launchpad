import { CirclePlay, Download, Eye, Share2 } from "lucide-react";
import { BSPBadge } from "@/components";
import { Button } from "@/components/ui/button";
import {
	ASSESSMENT_DIRECTORY_TABLE_HEADERS,
	ASSESSMENTS_DIRECTORY_PAGE_CONTENT,
} from "@/const";
import type {
	AssessmentDirectoryColumnOptions,
	AssessmentDirectoryItem,
	ColumnDef,
} from "@/types";
import { formatDateTimeShort } from "@/utils";

const AD = ASSESSMENTS_DIRECTORY_PAGE_CONTENT;

export function getAssessmentDirectoryColumns(
	options?: AssessmentDirectoryColumnOptions,
): ColumnDef<AssessmentDirectoryItem>[] {
	const {
		actionMode = "self",
		onResumeClick,
		onViewClick,
		onDownloadClick,
		onShareClick,
		downloadingReportKey,
		permissions,
		showActionsColumn: showActionsColumnOption,
	} = options ?? {};
	const canTake = permissions?.canTake ?? true;
	const canViewResult = permissions?.canViewResult ?? true;
	const showActionsColumn =
		showActionsColumnOption ??
		(actionMode === "adminUser" || canTake || canViewResult);

	const columns: ColumnDef<AssessmentDirectoryItem>[] = [
		{
			id: "assessmentName",
			header: ASSESSMENT_DIRECTORY_TABLE_HEADERS.assessmentName,
			accessorKey: "assessmentName",
			sortable: true,
			minWidth: "180px",
			headerClassName: "min-w-44",
			cellClassName: "min-w-44",
			cell: (row) => (
				<span className="text-small text-text-foreground">
					{row.assessmentName}
				</span>
			),
		},
		{
			id: "startDate",
			header: ASSESSMENT_DIRECTORY_TABLE_HEADERS.startDate,
			sortable: true,
			minWidth: "180px",
			headerClassName: "min-w-44",
			cellClassName: "min-w-44",
			cell: (row) => (
				<span className="text-small text-text-foreground">
					{formatDateTimeShort(row.startedAt)}
				</span>
			),
		},
		{
			id: "endDate",
			header: ASSESSMENT_DIRECTORY_TABLE_HEADERS.endDate,
			sortable: true,
			minWidth: "180px",
			headerClassName: "min-w-44",
			cellClassName: "min-w-44",
			cell: (row) => (
				<span className="text-small text-text-foreground">
					{row.completedAt
						? formatDateTimeShort(row.completedAt)
						: AD.notAvailableLabel}
				</span>
			),
		},
		{
			id: "status",
			header: ASSESSMENT_DIRECTORY_TABLE_HEADERS.status,
			sortable: true,
			minWidth: "140px",
			headerClassName: "min-w-36",
			cellClassName: "min-w-36",
			cell: (row) => {
				const isComplete = row.status === "complete";
				return (
					<BSPBadge type={isComplete ? "success" : "pending"}>
						{isComplete ? AD.statusCompletedLabel : AD.statusIncompleteLabel}
					</BSPBadge>
				);
			},
		},
	];

	if (showActionsColumn) {
		columns.push({
			id: "actions",
			header: ASSESSMENT_DIRECTORY_TABLE_HEADERS.actions,
			minWidth: "120px",
			headerClassName: "min-w-32",
			cellClassName: "min-w-32 overflow-visible",
			cell: (row) => {
				if (row.status === "incomplete") {
					if (actionMode === "adminUser" || !canTake) {
						return null;
					}
					return (
						<div className="flex gap-1">
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={AD.tableResumeAriaLabel}
								onClick={() => onResumeClick?.(row)}
								icon={CirclePlay}
							/>
						</div>
					);
				}

				if (!canViewResult) {
					return null;
				}

				return (
					<div className="flex gap-1">
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={AD.tableViewAriaLabel}
							onClick={() => onViewClick?.(row)}
							icon={Eye}
						/>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={AD.tableDownloadAriaLabel}
							onClick={() => onDownloadClick?.(row)}
							disabled={!row.reportKey}
							isLoading={
								Boolean(row.reportKey?.trim()) &&
								downloadingReportKey === row.reportKey?.trim()
							}
							icon={Download}
						/>
						{actionMode === "self" ? (
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={AD.tableShareAriaLabel}
								onClick={() => onShareClick?.(row)}
								icon={Share2}
							/>
						) : null}
					</div>
				);
			},
		});
	}

	return columns;
}
