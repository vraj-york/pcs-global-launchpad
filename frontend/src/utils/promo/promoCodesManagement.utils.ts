import { PROMO_CODES_PAGE_CONTENT } from "@/const";
import type {
	ListPromoCodesQuery,
	PromoCodeListItemData,
	PromoCodesListSortBy,
	PromoCodesListStatusFilter,
	SortDirection,
} from "@/types";
import { formatDateShortUtc } from "../sharedUtils";

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

export function createdAtLowerBound(timeId: string): number | null {
	if (timeId === "all") return null;
	const now = Date.now();
	const day = 86400000;
	switch (timeId) {
		case "7d":
			return now - 7 * day;
		case "30d":
			return now - 30 * day;
		case "90d":
			return now - 90 * day;
		case "1y":
			return now - 365 * day;
		default:
			return null;
	}
}

export function mapSortToApi(
	columnId: string | null,
	direction: SortDirection,
): { sortBy: PromoCodesListSortBy; sortOrder: "asc" | "desc" } {
	const sortOrder = direction === "desc" ? "desc" : "asc";
	switch (columnId) {
		case "promoCode":
			return { sortBy: "code", sortOrder };
		case "plan":
			return { sortBy: "planTypeName", sortOrder };
		case "expiryDate":
			return { sortBy: "expiresAt", sortOrder };
		case "discount":
			return { sortBy: "discount", sortOrder };
		case "status":
			return { sortBy: "status", sortOrder };
		case "usageLimit":
			return { sortBy: "usageLimit", sortOrder };
		default:
			return { sortBy: "createdAt", sortOrder: "desc" };
	}
}

export function downloadCsv(
	rows: PromoCodeListItemData[],
	filename: string,
	headers: string[],
) {
	const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
	const body = rows.map((r) =>
		[
			esc(r.code),
			esc(promoCodesListStatusLabel(r.status)),
			esc(r.discountSummary),
			esc(r.planTypeName),
			esc(promoCodesListUsageLimitLabel(r)),
			esc(formatDateShortUtc(r.expiresAt) || C.typography.emDash),
		].join(","),
	);
	const csv = `\uFEFF${[headers.join(","), ...body].join("\n")}`;
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export function buildListQuery(
	params: {
		pageIndex: number;
		debouncedSearch: string;
		planFilter: string;
		discountTypeFilter: string;
		timeFilter: string;
		statusFilter: string;
		sortColumnId: string | null;
		sortDirection: SortDirection;
	},
	pageSize: number,
): ListPromoCodesQuery {
	const { sortBy, sortOrder } = mapSortToApi(
		params.sortColumnId,
		params.sortDirection,
	);
	const tMin = createdAtLowerBound(params.timeFilter);
	const createdAfter = tMin != null ? new Date(tMin).toISOString() : undefined;

	return {
		page: params.pageIndex + 1,
		limit: pageSize,
		sortBy,
		sortOrder,
		...(params.debouncedSearch ? { search: params.debouncedSearch } : {}),
		...(params.planFilter !== "all" ? { planTypeId: params.planFilter } : {}),
		...(params.discountTypeFilter !== "all"
			? {
					discountType: params.discountTypeFilter as "percent" | "fixed_amount",
				}
			: {}),
		...(createdAfter ? { createdAfter } : {}),
		...(params.statusFilter !== "all"
			? { status: params.statusFilter as PromoCodesListStatusFilter }
			: {}),
	};
}
