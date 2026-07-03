import {
	Ban,
	CalendarDays,
	CheckCircle,
	Eye,
	MoreVertical,
	Redo2,
	SquarePen,
	Trash2,
	XOctagon,
} from "lucide-react";
import { BSPBadge } from "@/components";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { USER_ACTION_LABELS, USER_TABLE_HEADERS } from "@/const";
import type { ColumnDef, UserDirectoryListItem } from "@/types";
import { formatCode } from "@/utils";

function categoryBadgeType(categoryName: string | null): string {
	if (!categoryName) return "default";
	const k = categoryName.toLowerCase();
	if (k.includes("super") && k.includes("admin")) return "internal";
	if (k.includes("corporation") && k.includes("admin")) return "internal";
	if (k.includes("corporate") && k.includes("admin")) return "internal";
	if (k.includes("company") && k.includes("admin")) return "incomplete";
	if (k.includes("executive") || k.includes("leadership")) return "active";
	if (k.includes("client") || k.includes("success")) return "annual";
	if (k.includes("finance") || k.includes("accounting")) return "annual";
	if (k.includes("sales")) return "one_time";
	if (k.includes("bdr")) return "one_time";
	return "monthly";
}

export type UserDirectoryColumnOptions = {
	onViewClick?: (row: UserDirectoryListItem) => void;
	onEditClick?: (row: UserDirectoryListItem) => void;
	onScheduleSessionClick?: (row: UserDirectoryListItem) => void;
	onBlockClick?: (row: UserDirectoryListItem) => void;
	onUnblockClick?: (row: UserDirectoryListItem) => void;
	onResendInviteClick?: (row: UserDirectoryListItem) => void;
	onCancelInvitationClick?: (row: UserDirectoryListItem) => void;
	onRemoveClick?: (row: UserDirectoryListItem) => void;
	permissions?: {
		canView: boolean;
		canEdit: boolean;
		canScheduleSession: boolean;
		canBlock: boolean;
		canRemove: boolean;
		canResendInvite: boolean;
		canCancelInvitation: boolean;
	};
};

export function getUserDirectoryColumns(
	options?: UserDirectoryColumnOptions,
): ColumnDef<UserDirectoryListItem>[] {
	const {
		onViewClick,
		onEditClick,
		onScheduleSessionClick,
		onBlockClick,
		onUnblockClick,
		onResendInviteClick,
		onCancelInvitationClick,
		onRemoveClick,
		permissions,
	} = options ?? {};
	const canView = permissions?.canView ?? true;
	const canEdit = permissions?.canEdit ?? true;
	const canScheduleSession = permissions?.canScheduleSession ?? false;
	const canBlock = permissions?.canBlock ?? true;
	const canRemove = permissions?.canRemove ?? true;
	const canResendInvite = permissions?.canResendInvite ?? true;
	const canCancelInvitation = permissions?.canCancelInvitation ?? true;
	return [
		{
			id: "userCode",
			header: USER_TABLE_HEADERS.userCode,
			accessorKey: "userCode",
			sortable: true,
			minWidth: "120px",
			cell: (row) => formatCode(row.userCode, "USER"),
		},
		{
			id: "name",
			header: USER_TABLE_HEADERS.userName,
			sortable: true,
			minWidth: "220px",
			cell: (row) => {
				const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
				return (
					<div className="flex min-w-0 flex-col">
						<span className="truncate text-text-foreground" title={name}>
							{name || "N/A"}
						</span>
						<span className="text-mini text-muted-foreground">{row.email}</span>
					</div>
				);
			},
		},
		{
			id: "status",
			header: USER_TABLE_HEADERS.status,
			accessorKey: "status",
			sortable: true,
			minWidth: "130px",
			cell: (row) => (
				<BSPBadge type={row.status} className="capitalize">
					{row.status}
				</BSPBadge>
			),
		},
		{
			id: "corporationName",
			header: USER_TABLE_HEADERS.corporation,
			sortable: true,
			minWidth: "170px",
			cell: (row) => {
				const name = row.corporationName || "N/A";
				if (row.corporationCode != null) {
					return (
						<div className="flex min-w-0 flex-col">
							<span className="truncate text-text-foreground" title={name}>
								{name}
							</span>
							<span className="text-mini text-muted-foreground">
								{formatCode(row.corporationCode, "CORP")}
							</span>
						</div>
					);
				}
				return <span className="text-text-foreground">{name}</span>;
			},
		},
		{
			id: "companyName",
			header: USER_TABLE_HEADERS.company,
			sortable: true,
			minWidth: "210px",
			cell: (row) => (
				<div className="flex min-w-0 flex-col">
					<span
						className="truncate text-text-foreground"
						title={row.company?.companyName}
					>
						{row.company?.companyName || "N/A"}
					</span>
					<span className="text-mini text-muted-foreground">
						{row.company?.region ?? ""}
					</span>
				</div>
			),
		},
		{
			id: "roleName",
			header: USER_TABLE_HEADERS.roleName,
			accessorKey: "roleName",
			sortable: true,
			minWidth: "210px",
			cell: (row) => row.roleName || "N/A",
		},
		{
			id: "categoryName",
			header: USER_TABLE_HEADERS.category,
			sortable: true,
			minWidth: "300px",
			cell: (row) =>
				row.categoryName ? (
					<span title={row.categoryName}>
						<BSPBadge type={categoryBadgeType(row.categoryName)}>
							{row.categoryName}
						</BSPBadge>
					</span>
				) : (
					"N/A"
				),
		},
		{
			id: "workPhone",
			header: USER_TABLE_HEADERS.workPhone,
			accessorKey: "workPhone",
			minWidth: "200px",
			cell: (row) => row.workPhone || "N/A",
		},
		{
			id: "timezone",
			header: USER_TABLE_HEADERS.timeZone,
			accessorKey: "timezone",
			sortable: true,
			minWidth: "220px",
			cell: (row) => row.timezone || "N/A",
		},
		{
			id: "createdAt",
			header: USER_TABLE_HEADERS.createdOn,
			accessorKey: "createdAt",
			sortable: true,
			minWidth: "220px",
		},
		{
			id: "actions",
			header: USER_TABLE_HEADERS.actions,
			minWidth: "100px",
			cell: (row) => {
				const s = row.status.toLowerCase();
				const isPending = s === "pending";
				const isBlocked = s === "blocked";
				const isExpired = s === "expired";
				const isCancelled = s === "cancelled";
				const isActive = !isPending && !isBlocked && !isExpired && !isCancelled;
				const canShowScheduleSession = isActive && canScheduleSession;

				const renderStatusActions = () => {
					if (isPending) {
						return (
							<>
								{canResendInvite ? (
									<DropdownMenuItem onSelect={() => onResendInviteClick?.(row)}>
										<Redo2 className="size-4 text-icon-primary" aria-hidden />
										{USER_ACTION_LABELS.resendInvite}
									</DropdownMenuItem>
								) : null}
								{canCancelInvitation ? (
									<DropdownMenuItem
										variant="destructive"
										onSelect={() => onCancelInvitationClick?.(row)}
									>
										<XOctagon
											className="size-4 text-icon-destructive"
											aria-hidden
										/>
										{USER_ACTION_LABELS.cancelInvitation}
									</DropdownMenuItem>
								) : null}
							</>
						);
					}

					if (isExpired || isCancelled) {
						return canResendInvite ? (
							<DropdownMenuItem onSelect={() => onResendInviteClick?.(row)}>
								<Redo2 className="size-4 text-icon-primary" aria-hidden />
								{USER_ACTION_LABELS.resendInvite}
							</DropdownMenuItem>
						) : null;
					}

					if (isBlocked) {
						return canBlock ? (
							<DropdownMenuItem onSelect={() => onUnblockClick?.(row)}>
								<CheckCircle
									className="size-4 text-interactive-success"
									aria-hidden
								/>
								<span className="text-interactive-success">
									{USER_ACTION_LABELS.unblockUser}
								</span>
							</DropdownMenuItem>
						) : null;
					}

					return canBlock ? (
						<DropdownMenuItem
							variant="destructive"
							onSelect={() => onBlockClick?.(row)}
						>
							<Ban className="size-4 text-icon-destructive" aria-hidden />
							{USER_ACTION_LABELS.blockUser}
						</DropdownMenuItem>
					) : null;
				};

				const hasMenuActions =
					canEdit ||
					canShowScheduleSession ||
					canRemove ||
					canBlock ||
					canResendInvite ||
					canCancelInvitation;

				return (
					<div className="flex gap-1">
						{canView ? (
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={() => onViewClick?.(row)}
								icon={Eye}
							/>
						) : null}
						{hasMenuActions ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label={USER_TABLE_HEADERS.actions}
										icon={MoreVertical}
									/>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									{canEdit ? (
										<DropdownMenuItem onSelect={() => onEditClick?.(row)}>
											<SquarePen
												className="size-4 text-icon-primary"
												aria-hidden
											/>
											{USER_ACTION_LABELS.edit}
										</DropdownMenuItem>
									) : null}
									{canShowScheduleSession ? (
										<DropdownMenuItem
											onSelect={() => onScheduleSessionClick?.(row)}
										>
											<CalendarDays
												className="size-4 text-icon-primary"
												aria-hidden
											/>
											{USER_ACTION_LABELS.scheduleSession}
										</DropdownMenuItem>
									) : null}
									{renderStatusActions()}
									{canRemove ? (
										<DropdownMenuItem
											variant="destructive"
											onSelect={() => onRemoveClick?.(row)}
										>
											<Trash2
												className="size-4 text-icon-destructive"
												aria-hidden
											/>
											{USER_ACTION_LABELS.removeUser}
										</DropdownMenuItem>
									) : null}
								</DropdownMenuContent>
							</DropdownMenu>
						) : null}
					</div>
				);
			},
		},
	];
}
