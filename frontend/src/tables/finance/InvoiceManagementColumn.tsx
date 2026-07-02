import { Download, Eye, MoreVertical, Send } from "lucide-react";
import { BSPBadge } from "@/components";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	INVOICE_MANAGEMENT_UI,
	INVOICE_PAYMENT_TYPE_LABELS,
	INVOICE_ROW_ACTIONS,
	INVOICE_TABLE_LABELS,
} from "@/const";
import type {
	ColumnDef,
	InvoiceColumnSelection,
	InvoiceManagementRow,
	InvoiceRowActions,
} from "@/types";
import { formatDateShort, formatMoneyFromMinorUnits } from "@/utils";

export function getInvoiceManagementColumns(
	selection?: InvoiceColumnSelection,
	actions?: InvoiceRowActions,
): ColumnDef<InvoiceManagementRow>[] {
	const allSelected =
		Boolean(selection?.pageRowIds.length) &&
		Boolean(selection?.pageRowIds.every((id) => selection.selectedIds.has(id)));
	const someSelected =
		Boolean(
			selection?.pageRowIds.some((id) => selection.selectedIds.has(id)),
		) && !allSelected;

	return [
		...(selection
			? [
					{
						id: "select",
						header: "",
						minWidth: "4rem",
						headerClassName: "w-16 max-w-16 px-2",
						renderHeader: () => (
							<div className="flex items-center justify-center">
								<Checkbox
									checked={
										allSelected ? true : someSelected ? "indeterminate" : false
									}
									onCheckedChange={(v) => selection.onToggleAll(v === true)}
									aria-label="Select all invoices on this page"
								/>
							</div>
						),
						cell: (row: InvoiceManagementRow) => (
							<div className="flex items-center justify-center">
								<Checkbox
									checked={selection.selectedIds.has(row.id)}
									onCheckedChange={(v) =>
										selection.onToggleRow(row.id, v === true)
									}
									aria-label={`Select invoice ${row.displayId}`}
								/>
							</div>
						),
					},
				]
			: []),
		{
			id: "displayId",
			header: INVOICE_TABLE_LABELS.invoiceId,
			accessorKey: "displayId",
			sortable: true,
			minWidth: "180px",
		},
		{
			id: "amount",
			header: INVOICE_TABLE_LABELS.amount,
			accessorKey: "amountCents",
			sortable: true,
			minWidth: "130px",
			cell: (row) => formatMoneyFromMinorUnits(row.amountCents, row.currency),
		},
		{
			id: "uiStatus",
			header: INVOICE_TABLE_LABELS.status,
			accessorKey: "uiStatus",
			sortable: true,
			minWidth: "140px",
			cell: (row) => (
				<BSPBadge type={row.uiStatus}>
					<span className="capitalize">{row.uiStatus}</span>
				</BSPBadge>
			),
		},
		{
			id: "created",
			header: INVOICE_TABLE_LABELS.invoiceDate,
			accessorKey: "created",
			sortable: true,
			minWidth: "180px",
			cell: (row) => formatDateShort(new Date(row.created * 1000)),
		},
		{
			id: "paymentType",
			header: INVOICE_TABLE_LABELS.paymentType,
			accessorKey: "paymentType",
			sortable: true,
			minWidth: "160px",
			cell: (row) =>
				row.paymentType ? (
					<BSPBadge
						type={row.paymentType.toLowerCase()}
						className="max-w-full truncate"
					>
						{INVOICE_PAYMENT_TYPE_LABELS[row.paymentType] ?? row.paymentType}
					</BSPBadge>
				) : (
					<span>{INVOICE_MANAGEMENT_UI.emptyCell}</span>
				),
		},
		{
			id: "company",
			header: INVOICE_TABLE_LABELS.company,
			accessorKey: "companyOfficeName",
			sortable: true,
			minWidth: "210px",
			cell: (row) => {
				if (!row.companyOfficeName) {
					return <span>{INVOICE_MANAGEMENT_UI.emptyCell}</span>;
				}
				return (
					<div className="min-w-0">
						<div className="truncate text-sm font-normal text-text-foreground">
							{row.companyOfficeName}
						</div>
						{row.companyRegion ? (
							<div className="truncate text-xs font-normal leading-snug text-muted-foreground">
								{row.companyRegion}
							</div>
						) : null}
					</div>
				);
			},
		},
		{
			id: "planLabel",
			header: INVOICE_TABLE_LABELS.plan,
			accessorKey: "planLabel",
			sortable: true,
			minWidth: "220px",
			cell: (row) => {
				const planLabel = row.planLabel?.trim();
				if (!planLabel) {
					return <span>{INVOICE_MANAGEMENT_UI.emptyCell}</span>;
				}
				return (
					<BSPBadge
						type={row.planTypeId?.trim() ?? "gray"}
						className="max-w-full truncate"
						title={planLabel}
					>
						{planLabel}
					</BSPBadge>
				);
			},
		},
		...(actions
			? [
					{
						id: "actions",
						header: INVOICE_TABLE_LABELS.actions,
						minWidth: "92px",
						cell: (row: InvoiceManagementRow) => {
							const canSend = actions.permissions?.canSendIndividual ?? true;
							const canDownload = actions.permissions?.canDownload ?? true;
							const hasMenu = canSend || canDownload;

							return (
								<div className="flex gap-1">
									{canDownload ? (
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											className="text-muted-foreground hover:text-foreground"
											aria-label={`${INVOICE_ROW_ACTIONS.viewAriaLabel} ${row.displayId}`}
											onClick={() => actions.onView(row)}
											icon={Eye}
										/>
									) : null}
									{hasMenu ? (
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													type="button"
													variant="ghost"
													size="icon-sm"
													className="text-muted-foreground hover:text-foreground"
													aria-label={`${INVOICE_ROW_ACTIONS.moreActionsAriaLabel} ${row.displayId}`}
													icon={MoreVertical}
												/>
											</DropdownMenuTrigger>
											<DropdownMenuContent
												align="end"
												className="min-w-40 border-border/60 shadow-md"
											>
												{canSend ? (
													<DropdownMenuItem
														onSelect={() => actions.onSend(row)}
													>
														<Send className="size-4" aria-hidden />
														{INVOICE_ROW_ACTIONS.menuSendInvoice}
													</DropdownMenuItem>
												) : null}
												{canDownload ? (
													<DropdownMenuItem
														onSelect={() => actions.onDownload(row)}
													>
														<Download className="size-4" aria-hidden />
														{INVOICE_ROW_ACTIONS.menuDownload}
													</DropdownMenuItem>
												) : null}
											</DropdownMenuContent>
										</DropdownMenu>
									) : null}
								</div>
							);
						},
					},
				]
			: []),
	];
}
