import { Download, Eye, RotateCw } from "lucide-react";
import { BSPBadge } from "@/components";
import { Button } from "@/components/ui/button";
import {
	ASSESSMENTS_DIRECTORY_PAGE_CONTENT,
	INVITE_MANAGEMENT_LIST_ACTIONS,
	INVITE_MANAGEMENT_LIST_MESSAGES,
	INVITE_MANAGEMENT_LIST_STATUS,
	INVITE_MANAGEMENT_LIST_STATUS_BADGE_TYPES,
	INVITE_MANAGEMENT_LIST_STATUS_LABELS,
	INVITE_MANAGEMENT_LIST_TABLE_HEADERS,
} from "@/const";
import type {
	ColumnDef,
	InviteManagementColumnOptions,
	InviteManagementListItem,
} from "@/types";
import { formatDateShort } from "@/utils";

export function getInviteManagementColumns(
	options?: InviteManagementColumnOptions,
): ColumnDef<InviteManagementListItem>[] {
	const {
		onViewClick,
		onDownloadClick,
		onResendClick,
		resendingCognitoSub,
		downloadingReportKey,
		showActionsColumn = true,
	} = options ?? {};
	const AD = ASSESSMENTS_DIRECTORY_PAGE_CONTENT;

	const columns: ColumnDef<InviteManagementListItem>[] = [
		{
			id: "name",
			header: INVITE_MANAGEMENT_LIST_TABLE_HEADERS.name,
			accessorKey: "name",
			sortable: true,
			minWidth: "200px",
			headerClassName: "min-w-48",
			cellClassName: "min-w-48",
			cell: (row) => (
				<div className="flex min-w-0 flex-col gap-1">
					<span
						className="truncate text-small font-normal leading-small text-text-foreground"
						title={row.name}
					>
						{row.name}
					</span>
					{row.email ? (
						<span
							className="truncate text-mini font-normal leading-mini text-muted-foreground"
							title={row.email}
						>
							{row.email}
						</span>
					) : null}
				</div>
			),
		},
		{
			id: "inviteeType",
			header: INVITE_MANAGEMENT_LIST_TABLE_HEADERS.inviteeType,
			accessorKey: "inviteeType",
			sortable: true,
			minWidth: "120px",
			cell: (row) => (
				<span className="text-small text-text-foreground">
					{row.inviteeType}
				</span>
			),
		},
		{
			id: "status",
			header: INVITE_MANAGEMENT_LIST_TABLE_HEADERS.status,
			sortable: true,
			minWidth: "130px",
			cell: (row) => (
				<BSPBadge type={INVITE_MANAGEMENT_LIST_STATUS_BADGE_TYPES[row.status]}>
					{INVITE_MANAGEMENT_LIST_STATUS_LABELS[row.status]}
				</BSPBadge>
			),
		},
		{
			id: "progress",
			header: INVITE_MANAGEMENT_LIST_TABLE_HEADERS.progress,
			sortable: true,
			minWidth: "100px",
			cell: (row) => (
				<span className="text-small text-text-foreground">
					{row.progressPercent}%
				</span>
			),
		},
		{
			id: "invitedOn",
			header: INVITE_MANAGEMENT_LIST_TABLE_HEADERS.invitedOn,
			sortable: true,
			minWidth: "130px",
			cell: (row) => (
				<span className="text-small text-text-foreground">
					{row.invitedOn
						? formatDateShort(new Date(row.invitedOn))
						: INVITE_MANAGEMENT_LIST_MESSAGES.notAvailable}
				</span>
			),
		},
		{
			id: "lastActivity",
			header: INVITE_MANAGEMENT_LIST_TABLE_HEADERS.lastActivity,
			sortable: true,
			minWidth: "130px",
			cell: (row) => (
				<span className="text-small text-text-foreground">
					{row.lastActivity
						? formatDateShort(new Date(row.lastActivity))
						: INVITE_MANAGEMENT_LIST_MESSAGES.notAvailable}
				</span>
			),
		},
	];

	if (showActionsColumn) {
		columns.push({
			id: "actions",
			header: INVITE_MANAGEMENT_LIST_TABLE_HEADERS.actions,
			minWidth: "120px",
			headerClassName: "min-w-32",
			cellClassName: "min-w-32 overflow-visible",
			cell: (row) => {
				if (row.status === INVITE_MANAGEMENT_LIST_STATUS.completed) {
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
						</div>
					);
				}

				if (row.status === INVITE_MANAGEMENT_LIST_STATUS.invited) {
					return (
						<div className="flex gap-1">
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={INVITE_MANAGEMENT_LIST_ACTIONS.resendInviteAria}
								disabled={resendingCognitoSub === row.cognitoSub}
								onClick={() => onResendClick?.(row)}
								icon={RotateCw}
							/>
						</div>
					);
				}

				return null;
			},
		});
	}

	return columns;
}
