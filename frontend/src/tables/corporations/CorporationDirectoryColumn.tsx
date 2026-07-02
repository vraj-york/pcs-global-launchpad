import {
	Ban,
	Eye,
	MoreVertical,
	PlayCircle,
	RotateCcw,
	SquarePen,
} from "lucide-react";
import type { NavigateFunction } from "react-router-dom";
import { BSPBadge } from "@/components";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	CORPORATE_DIRECTORY_PAGE_CONTENT,
	CORPORATION_TABLE_HEADERS,
	ROUTES,
} from "@/const";
import type { ColumnDef, Corporation } from "@/types";
import { formatCode } from "@/utils/sharedUtils";

export type CorporationDirectoryColumnOptions = {
	onSuspendClick?: (row: Corporation) => void;
	onReinstateClick?: (row: Corporation) => void;
};

export function getCorporationDirectoryColumns(
	navigate: NavigateFunction,
	options?: CorporationDirectoryColumnOptions,
): ColumnDef<Corporation>[] {
	const { onSuspendClick, onReinstateClick } = options ?? {};
	return [
		{
			id: "corporationCode",
			header: CORPORATION_TABLE_HEADERS.corpId,
			accessorKey: "corpId",
			sortable: true,
			minWidth: "90px",
			cell: (row) => <span>{formatCode(row.corpId, "CORP")}</span>,
		},
		{
			id: "legalName",
			header: CORPORATION_TABLE_HEADERS.corporationName,
			accessorKey: "name",
			sortable: true,
			minWidth: "300px",
			cell: (row) => (
				<div className="flex min-w-0 flex-col">
					<span className="truncate text-text-foreground" title={row.name}>
						{row.name}
					</span>
					<span className="text-mini text-muted-foreground">{row.region}</span>
				</div>
			),
		},
		{
			id: "status",
			header: CORPORATION_TABLE_HEADERS.status,
			accessorKey: "status",
			sortable: true,
			minWidth: "100px",
			cell: (row) => (
				<BSPBadge type={row.status} className="capitalize">
					{row.status}
				</BSPBadge>
			),
		},
		{
			id: "adminName",
			header: CORPORATION_TABLE_HEADERS.corporationAdmin,
			sortable: true,
			minWidth: "160px",
			cell: (row) => (
				<>
					{row.corporationAdmin.name && row.corporationAdmin.email ? (
						<div className="flex flex-col">
							<span className="text-text-foreground">
								{row.corporationAdmin.name}
							</span>
							<span className="text-mini text-muted-foreground">
								{row.corporationAdmin.email}
							</span>
						</div>
					) : (
						<span className="text-text-foreground">N/A</span>
					)}
				</>
			),
		},
		{
			id: "companyCount",
			header: CORPORATION_TABLE_HEADERS.companies,
			accessorKey: "companies",
			sortable: true,
			minWidth: "90px",
			cell: (row) => <span>{row.companies}</span>,
		},
		{
			id: "createdAt",
			header: CORPORATION_TABLE_HEADERS.createdOn,
			accessorKey: "createdOn",
			sortable: true,
			minWidth: "120px",
		},
		{
			id: "actions",
			header: CORPORATION_TABLE_HEADERS.actions,
			minWidth: "100px",
			cell: (row) => {
				const steps = row.submittedSteps ?? 0;
				const isIncomplete = row.status === "incomplete";

				const handleResume = () => {
					const step = Math.max(0, steps);
					const path =
						row.mode === "quick"
							? ROUTES.corporateDirectory.addWithIdPath(row.id)
							: ROUTES.corporateDirectory.addAdvancedWithIdPath(row.id);
					navigate(`${path}?flow=edit`, { state: { editStep: step } });
				};

				const handleEdit = () => {
					navigate(ROUTES.corporateDirectory.viewWithIdPath(row.id), {
						state: { flow: "edit" },
					});
				};

				if (isIncomplete) {
					return (
						<div className="flex gap-1">
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={handleResume}
								aria-label={CORPORATE_DIRECTORY_PAGE_CONTENT.tableResumeButton}
								icon={PlayCircle}
							/>
						</div>
					);
				}

				return (
					<div className="flex gap-1">
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() =>
								navigate(ROUTES.corporateDirectory.viewWithIdPath(row.id))
							}
							icon={Eye}
						/>
						{row.status !== "closed" && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label={CORPORATION_TABLE_HEADERS.actions}
										icon={MoreVertical}
									/>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onSelect={handleEdit}>
										<SquarePen
											className="size-4 text-icon-primary"
											aria-hidden
										/>
										Edit
									</DropdownMenuItem>
									{row.status === "suspended" ? (
										<DropdownMenuItem
											onSelect={() => onReinstateClick?.(row)}
											aria-label={
												CORPORATE_DIRECTORY_PAGE_CONTENT.reinstateButton
											}
										>
											<RotateCcw
												className="size-4 text-icon-primary"
												aria-hidden
											/>
											{CORPORATE_DIRECTORY_PAGE_CONTENT.reinstateButton}
										</DropdownMenuItem>
									) : (
										<DropdownMenuItem
											variant="destructive"
											onSelect={() => onSuspendClick?.(row)}
											aria-label={
												CORPORATE_DIRECTORY_PAGE_CONTENT.tableSuspendButton
											}
										>
											<Ban
												className="size-4 text-icon-destructive"
												aria-hidden
											/>
											{CORPORATE_DIRECTORY_PAGE_CONTENT.tableSuspendButton}
										</DropdownMenuItem>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				);
			},
		},
	];
}
