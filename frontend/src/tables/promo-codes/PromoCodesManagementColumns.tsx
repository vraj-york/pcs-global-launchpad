import {
	CircleCheckBig,
	Eye,
	MinusCircle,
	MoreVertical,
	Pencil,
	Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { BSPBadge } from "@/components";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PROMO_CODES_PAGE_CONTENT, ROUTES } from "@/const";
import type {
	ColumnDef,
	PromoCodeListItemData,
	PromoCodesManagementColumnOptions,
} from "@/types";
import { formatDateShortUtc } from "@/utils";

const C = PROMO_CODES_PAGE_CONTENT;

function promoCodesListUsageLimitLabel(row: PromoCodeListItemData): string {
	if (row.maxRedemptions != null) {
		return `${row.timesRedeemed}/${row.maxRedemptions}`;
	}
	return `${row.timesRedeemed}/${C.detail.infoSection.noMax}`;
}

function promoCodesListStatusLabel(
	status: "active" | "inactive" | "expired",
): string {
	if (status === "inactive") return C.list.filters.status.disabled;
	if (status === "expired") return C.list.filters.status.expired;
	return C.list.filters.status.active;
}

export function getPromoCodesManagementColumns(
	options: PromoCodesManagementColumnOptions,
): ColumnDef<PromoCodeListItemData>[] {
	const {
		allOnPageSelected,
		someOnPageSelected,
		onToggleAllPage,
		onToggleRow,
		selectedIds,
		onActivation,
		activationRowId,
		onRequestDelete,
	} = options;

	return [
		{
			id: "select",
			header: "",
			minWidth: "4rem",
			headerClassName: "w-16 max-w-16 px-2",
			renderHeader: () => (
				<div className="flex items-center justify-center">
					<Checkbox
						aria-label={C.list.aria.selectAllOnPage}
						checked={
							allOnPageSelected
								? true
								: someOnPageSelected
									? "indeterminate"
									: false
						}
						onCheckedChange={(v) => onToggleAllPage(v === true)}
					/>
				</div>
			),
			cell: (row) => (
				<div className="flex items-center justify-center">
					<Checkbox
						aria-label={`${C.list.aria.selectRowPrefix}${row.code}`}
						checked={selectedIds.has(row.id)}
						onCheckedChange={(v) => onToggleRow(row.id, v === true)}
					/>
				</div>
			),
		},
		{
			id: "promoCode",
			header: C.list.columns.promoCode,
			accessorKey: "code",
			sortable: true,
			minWidth: "140px",
		},
		{
			id: "status",
			header: C.list.columns.status,
			sortable: true,
			minWidth: "120px",
			cell: (row) => (
				<BSPBadge type={row.status} data-slot="promo-status-pill">
					{promoCodesListStatusLabel(row.status)}
				</BSPBadge>
			),
		},
		{
			id: "discount",
			header: C.list.columns.discount,
			accessorKey: "discountSummary",
			sortable: true,
			minWidth: "100px",
		},
		{
			id: "plan",
			header: C.list.columns.plan,
			accessorKey: "planTypeName",
			sortable: true,
			minWidth: "16rem",
			headerClassName: "w-64 min-w-64",
			cellClassName: "w-64 min-w-64",
			cell: (row) => (
				<BSPBadge type={row.planTypeId}>{row.planTypeName}</BSPBadge>
			),
		},
		{
			id: "usageLimit",
			header: C.list.columns.usageLimit,
			sortable: true,
			minWidth: "120px",
			cell: (row) => promoCodesListUsageLimitLabel(row),
		},
		{
			id: "expiryDate",
			header: C.list.columns.expiryDate,
			sortable: true,
			minWidth: "120px",
			cell: (row) => formatDateShortUtc(row.expiresAt) || C.typography.emDash,
		},
		{
			id: "actions",
			header: C.list.columns.actions,
			minWidth: "100px",
			headerClassName: "text-center",
			cellClassName: "text-center",
			cell: (row) => (
				<div className="flex items-center justify-center gap-0.5">
					<Button variant="ghost" size="icon" className="size-8" asChild>
						<Link
							to={ROUTES.promoCodes.viewWithIdPath(row.id)}
							aria-label={C.list.aria.viewDetails}
						>
							<Eye className="size-4" />
						</Link>
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="size-8"
								aria-label={C.list.aria.moreActions}
								icon={MoreVertical}
							/>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-44">
							<DropdownMenuItem asChild>
								<Link
									to={ROUTES.promoCodes.editWithIdPath(row.id)}
									className="flex cursor-pointer items-center gap-2"
								>
									<Pencil className="size-4" />
									{C.list.rowMenu.edit}
								</Link>
							</DropdownMenuItem>
							{row.status === "active" && (
								<DropdownMenuItem
									disabled={activationRowId === row.id}
									onSelect={(e) => {
										e.preventDefault();
										void onActivation(row, false);
									}}
								>
									<MinusCircle className="size-4" aria-hidden />
									{C.list.rowMenu.disableCode}
								</DropdownMenuItem>
							)}
							{row.status === "inactive" && (
								<DropdownMenuItem
									disabled={activationRowId === row.id}
									onSelect={(e) => {
										e.preventDefault();
										void onActivation(row, true);
									}}
									className="text-emerald-700 focus:text-emerald-800"
								>
									<CircleCheckBig
										className="size-4 text-emerald-700"
										aria-hidden
									/>
									{C.list.rowMenu.activateCode}
								</DropdownMenuItem>
							)}
							<DropdownMenuItem
								variant="destructive"
								onSelect={(e) => {
									e.preventDefault();
									onRequestDelete(row);
								}}
							>
								<Trash2 className="size-4" aria-hidden />
								{C.list.rowMenu.deleteCode}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			),
		},
	];
}
