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
	COMPANIES_DIRECTORY_PAGE_CONTENT,
	COMPANY_TABLE_HEADERS,
	ROUTES,
} from "@/const";
import type {
	ColumnDef,
	CompanyDirectoryColumnOptions,
	CompanyDirectoryItem,
} from "@/types";

export function getCompanyDirectoryColumns(
	navigate: NavigateFunction,
	options?: CompanyDirectoryColumnOptions,
): ColumnDef<CompanyDirectoryItem>[] {
	const { onSuspendClick, onReinstateClick, readOnly = false } = options ?? {};
	const columns: ColumnDef<CompanyDirectoryItem>[] = [
		{
			id: "companyId",
			header: COMPANY_TABLE_HEADERS.companyId,
			accessorKey: "companyId",
			sortable: true,
			minWidth: "130px",
			headerClassName: "w-32 min-w-32",
			cellClassName: "w-32 min-w-32",
		},
		{
			id: "companyName",
			header: COMPANY_TABLE_HEADERS.companyName,
			accessorKey: "companyName",
			sortable: true,
			minWidth: "246px",
			headerClassName: "w-64 min-w-64 overflow-hidden",
			cellClassName: "w-64 min-w-64 overflow-hidden",
			cell: (row) => (
				<div className="flex min-w-0 flex-col gap-1 overflow-hidden">
					<span
						className="block truncate text-small text-text-foreground"
						title={row.companyName}
					>
						{row.companyName}
					</span>
					{row.region ? (
						<span
							className="block truncate text-mini text-muted-foreground"
							title={row.region}
						>
							{row.region}
						</span>
					) : null}
				</div>
			),
		},
		{
			id: "status",
			header: COMPANY_TABLE_HEADERS.status,
			accessorKey: "status",
			sortable: true,
			minWidth: "154px",
			headerClassName: "w-40 min-w-40 overflow-hidden",
			cellClassName: "w-40 min-w-40",
			cell: (row) => {
				const label =
					row.status === "incomplete" && row.completionPercentage != null
						? `${row.status} (${row.completionPercentage}%)`
						: row.status;

				return (
					<div className="flex flex-col gap-1.5">
						<BSPBadge type={row.status} className="capitalize">
							{label}
						</BSPBadge>
						{row.status === "incomplete" &&
							row.completionPercentage != null && (
								<div className="h-0.5 w-full max-w-[122px] overflow-hidden rounded-full bg-brand-gray-bg">
									<div
										className="h-full rounded-full bg-destructive"
										style={{
											width: `${row.completionPercentage}%`,
										}}
									/>
								</div>
							)}
					</div>
				);
			},
		},
		{
			id: "assignedCorporation",
			header: COMPANY_TABLE_HEADERS.assignedCorporation,
			sortable: true,
			minWidth: "220px",
			headerClassName: "w-60 min-w-60 overflow-hidden",
			cellClassName: "w-60 min-w-60 overflow-hidden",
			cell: (row) => {
				if (!row.assignedCorporation) {
					return <span className="text-text-foreground">NA</span>;
				}
				return (
					<div className="flex min-w-0 flex-col gap-1 overflow-hidden">
						<span
							className="block truncate text-text-foreground"
							title={row.assignedCorporation.name}
						>
							{row.assignedCorporation.name}
						</span>
						<span
							className="block truncate text-mini text-muted-foreground"
							title={row.assignedCorporation.corporationCode}
						>
							{row.assignedCorporation.corporationCode}
						</span>
					</div>
				);
			},
		},
		{
			id: "plan",
			header: COMPANY_TABLE_HEADERS.plan,
			accessorKey: "plan",
			sortable: true,
			minWidth: "192px",
			headerClassName: "w-48 min-w-48 overflow-hidden",
			cellClassName: "w-48 min-w-48 overflow-hidden",
			cell: (row) =>
				row.planName ? (
					<BSPBadge type={row.planTypeId}>{row.planName}</BSPBadge>
				) : (
					<span className="text-muted-foreground">N/A</span>
				),
		},
		{
			id: "createdOn",
			header: COMPANY_TABLE_HEADERS.createdOn,
			accessorKey: "createdOn",
			sortable: true,
			minWidth: "134px",
			headerClassName: "w-36 min-w-36",
			cellClassName: "w-36 min-w-36",
		},
		{
			id: "lastUpdatedOn",
			header: COMPANY_TABLE_HEADERS.lastUpdatedOn,
			accessorKey: "lastUpdatedOn",
			sortable: true,
			minWidth: "160px",
			headerClassName: "w-40 min-w-40",
			cellClassName: "w-40 min-w-40",
		},
		{
			id: "actions",
			header: COMPANY_TABLE_HEADERS.actions,
			minWidth: "100px",
			headerClassName: "w-28 min-w-28",
			cellClassName: "w-28 min-w-28 overflow-visible",
			cell: (row) => {
				const handleView = () =>
					navigate(ROUTES.companyDirectory.viewWithIdPath(row.id));

				if (readOnly) {
					return (
						<div className="flex gap-1">
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={COMPANIES_DIRECTORY_PAGE_CONTENT.tableViewButton}
								onClick={handleView}
								icon={Eye}
							/>
						</div>
					);
				}

				if (row.status === "incomplete") {
					const steps = row.submittedSteps ?? 0;
					const handleResume = () => {
						const step = Math.max(0, steps);
						const path = ROUTES.companyDirectory.addWithIdPath(row.id);
						navigate(`${path}?flow=edit`, { state: { editStep: step } });
					};

					return (
						<div className="flex gap-1">
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={handleResume}
								aria-label={COMPANIES_DIRECTORY_PAGE_CONTENT.tableResumeButton}
								icon={PlayCircle}
							/>
						</div>
					);
				}

				const handleEdit = () => {
					navigate(ROUTES.companyDirectory.viewWithIdPath(row.id), {
						state: { flow: "edit" },
					});
				};

				return (
					<div className="flex gap-1">
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label={COMPANIES_DIRECTORY_PAGE_CONTENT.tableViewButton}
							onClick={() =>
								navigate(ROUTES.companyDirectory.viewWithIdPath(row.id))
							}
							icon={Eye}
						/>
						{row.status !== "closed" && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label={COMPANY_TABLE_HEADERS.actions}
										icon={MoreVertical}
									/>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onSelect={handleEdit}>
										<SquarePen
											className="size-4 text-icon-primary"
											aria-hidden
										/>
										{COMPANIES_DIRECTORY_PAGE_CONTENT.tableEditButton}
									</DropdownMenuItem>
									{row.status === "suspended" ? (
										<DropdownMenuItem
											onSelect={() => onReinstateClick?.(row)}
											aria-label={
												COMPANIES_DIRECTORY_PAGE_CONTENT.reinstateButton
											}
										>
											<RotateCcw
												className="size-4 text-icon-primary"
												aria-hidden
											/>
											{COMPANIES_DIRECTORY_PAGE_CONTENT.reinstateButton}
										</DropdownMenuItem>
									) : (
										<DropdownMenuItem
											variant="destructive"
											onSelect={() => onSuspendClick?.(row)}
											aria-label={
												COMPANIES_DIRECTORY_PAGE_CONTENT.tableSuspendButton
											}
										>
											<Ban
												className="size-4 text-icon-destructive"
												aria-hidden
											/>
											{COMPANIES_DIRECTORY_PAGE_CONTENT.tableSuspendButton}
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
	return readOnly
		? columns.filter((column) => column.id !== "assignedCorporation")
		: columns;
}
