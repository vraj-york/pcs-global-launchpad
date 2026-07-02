import type { ReactNode } from "react";

export type SortDirection = "asc" | "desc" | null;

export type SortState = {
	column: string | null;
	direction: SortDirection;
};

export type ColumnDef<T> = {
	id: string;
	header: string;
	/** When set, replaces `header` in the table head (e.g. select-all checkbox). */
	renderHeader?: () => ReactNode;
	accessorKey?: keyof T;
	sortable?: boolean;
	minWidth?: string;
	/** Merged into header `<th>` (e.g. width, alignment). */
	headerClassName?: string;
	cellClassName?: string;
	cell?: (row: T) => ReactNode;
};

export type PaginationState = {
	pageIndex: number;
	pageSize: number;
};

export type DataTableProps<T> = {
	data: T[];
	columns: ColumnDef<T>[];
	pageSize?: number;
	showPagination?: boolean;
	emptyMessage?: string;
	entityLabel?: { singular: string; plural: string };
	/** Server-side pagination: total count from API, controlled page, callback on page change */
	serverPagination?: {
		totalCount: number;
		pageIndex: number;
		onPageChange: (pageIndex: number) => void;
	};
	/** Server-side sort: controlled sort column/direction, callback when user clicks column header. When provided with serverPagination, data is not sorted client-side. */
	serverSort?: {
		sortColumnId: string | null;
		sortDirection: SortDirection;
		onSort: (columnId: string) => void;
	};
	/** Fixed height for table area; header stays fixed, body scrolls. Use number (px) or true for default height. */
	fixedHeight?: number | true;
	/** Initial client-side sort (e.g. default column). */
	initialSort?: SortState;
	/**
	 * `fixed` (default): equal-ish column distribution, min-width sum on table.
	 * `auto`: content-based widths — use for compact or uneven content (e.g. modals).
	 */
	tableLayout?: "fixed" | "auto";
};
