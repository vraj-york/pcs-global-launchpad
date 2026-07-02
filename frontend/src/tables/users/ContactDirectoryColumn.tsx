import { Eye, MoreVertical, Send, SquarePen, Trash2 } from "lucide-react";
import { BSPBadge } from "@/components";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	CONTACT_ACTION_LABELS,
	CONTACT_SEND_INVITE_REQUIRES_CORP_AND_COMPANY_TOOLTIP,
	CONTACT_TABLE_HEADERS,
	CONTACT_TYPE_FILTER_OPTIONS,
} from "@/const";
import type {
	ColumnDef,
	ContactDirectoryColumnOptions,
	ContactDirectoryItem,
} from "@/types";
import { formatCode } from "@/utils";

/** Resolves API display label to `contactType` key for BSPBadge. */
function contactTypeKeyForBadge(label: string | null): string {
	if (!label) return "default";
	const opt = CONTACT_TYPE_FILTER_OPTIONS.find((o) => o.label === label);
	if (opt && opt.value !== "all") return opt.value;
	return "default";
}

export function getContactDirectoryColumns(
	options?: ContactDirectoryColumnOptions,
): ColumnDef<ContactDirectoryItem>[] {
	const {
		onViewClick,
		onEditClick,
		onSendInviteClick,
		onRemoveClick,
		permissions,
	} = options ?? {};
	const canView = permissions?.canView ?? true;
	const canInvite = permissions?.canInvite ?? true;
	const canEdit = permissions?.canEdit ?? true;
	const canRemove = permissions?.canRemove ?? true;
	return [
		{
			id: "contactCode",
			header: CONTACT_TABLE_HEADERS.contactCode,
			accessorKey: "contactCode",
			sortable: true,
			minWidth: "120px",
			cell: (row) => formatCode(row.contactCode, "CNT"),
		},
		{
			id: "name",
			header: CONTACT_TABLE_HEADERS.name,
			sortable: true,
			minWidth: "220px",
			cell: (row) => {
				const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
				return (
					<div className="flex min-w-0 flex-col">
						<span className="truncate text-text-foreground" title={name}>
							{name || "N/A"}
						</span>
						<span className="text-mini text-muted-foreground">
							{row.email ?? ""}
						</span>
					</div>
				);
			},
		},
		{
			id: "corporationName",
			header: CONTACT_TABLE_HEADERS.corporationName,
			sortable: true,
			minWidth: "236px",
			cell: (row) => {
				const name = row.corporationName ?? "N/A";
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
			header: CONTACT_TABLE_HEADERS.companyName,
			sortable: true,
			minWidth: "236px",
			cell: (row) => (
				<div className="flex min-w-0 flex-col">
					<span
						className="truncate text-text-foreground"
						title={row.companyName ?? undefined}
					>
						{row.companyName ?? "N/A"}
					</span>
					<span className="text-mini text-muted-foreground">
						{row.corporationRegion ?? ""}
					</span>
				</div>
			),
		},
		{
			id: "contactType",
			header: CONTACT_TABLE_HEADERS.contactType,
			sortable: true,
			minWidth: "236px",
			cell: (row) => {
				if (!row.contactType) {
					return <span className="text-text-foreground">N/A</span>;
				}
				return (
					<BSPBadge type={contactTypeKeyForBadge(row.contactType)}>
						{row.contactType}
					</BSPBadge>
				);
			},
		},
		{
			id: "jobRole",
			header: CONTACT_TABLE_HEADERS.jobRole,
			accessorKey: "jobRole",
			sortable: true,
			minWidth: "210px",
			cell: (row) => row.jobRole ?? "N/A",
		},
		{
			id: "workPhone",
			header: CONTACT_TABLE_HEADERS.workPhone,
			accessorKey: "workPhone",
			sortable: false,
			minWidth: "236px",
			cell: (row) => row.workPhone ?? "N/A",
		},
		{
			id: "timezone",
			header: CONTACT_TABLE_HEADERS.timezone,
			accessorKey: "timezone",
			sortable: true,
			minWidth: "236px",
			cell: (row) => row.timezone ?? "N/A",
		},
		{
			id: "createdAt",
			header: CONTACT_TABLE_HEADERS.createdAt,
			accessorKey: "createdAt",
			sortable: true,
			minWidth: "236px",
		},
		{
			id: "actions",
			header: CONTACT_TABLE_HEADERS.actions,
			minWidth: "100px",
			cell: (row) => {
				const canSendInvite = Boolean(
					row.corporationName?.trim() && row.companyName?.trim(),
				);
				const hasMenuActions =
					(canEdit && Boolean(onEditClick)) ||
					(canRemove && Boolean(onRemoveClick)) ||
					canInvite;

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
										aria-label={CONTACT_TABLE_HEADERS.actions}
										icon={MoreVertical}
									/>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									{canEdit && onEditClick ? (
										<DropdownMenuItem onSelect={() => onEditClick(row)}>
											<SquarePen
												className="size-4 text-icon-primary"
												aria-hidden
											/>
											{CONTACT_ACTION_LABELS.edit}
										</DropdownMenuItem>
									) : null}
									{canInvite ? (
										canSendInvite ? (
											<DropdownMenuItem
												onSelect={() => onSendInviteClick?.(row)}
											>
												<Send
													className="size-4 text-icon-primary"
													aria-hidden
												/>
												{CONTACT_ACTION_LABELS.sendInvite}
											</DropdownMenuItem>
										) : (
											<Tooltip>
												<TooltipTrigger asChild>
													<div className="w-full">
														<DropdownMenuItem
															disabled
															aria-label={`${CONTACT_ACTION_LABELS.sendInvite}: ${CONTACT_SEND_INVITE_REQUIRES_CORP_AND_COMPANY_TOOLTIP}`}
															onSelect={(e) => e.preventDefault()}
														>
															<Send
																className="size-4 text-icon-primary"
																aria-hidden
															/>
															{CONTACT_ACTION_LABELS.sendInvite}
														</DropdownMenuItem>
													</div>
												</TooltipTrigger>
												<TooltipContent side="left" className="max-w-xs">
													{
														CONTACT_SEND_INVITE_REQUIRES_CORP_AND_COMPANY_TOOLTIP
													}
												</TooltipContent>
											</Tooltip>
										)
									) : null}
									{canRemove && onRemoveClick ? (
										<DropdownMenuItem
											variant="destructive"
											onSelect={() => onRemoveClick(row)}
										>
											<Trash2
												className="size-4 text-icon-destructive"
												aria-hidden
											/>
											{CONTACT_ACTION_LABELS.removeContact}
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
