import { ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DATA_TABLE_CONFIG,
	DATA_TABLE_SCROLL_HEIGHT,
	DATA_TABLE_TEXT,
} from "@/const";
import { cn } from "@/lib/utils";
import type { DataTableProps, PaginationState, SortState } from "@/types";

const DEFAULT_MIN_COLUMN_WIDTH = "100px";

function parseWidthToPx(value: string, fallbackPx: number): number {
	const num = parseFloat(value);
	if (Number.isNaN(num)) return fallbackPx;
	if (value.endsWith("rem")) return num * 16;
	if (value.endsWith("px") || value === String(num)) return num;
	return fallbackPx;
}

export function DataTable<T extends { id: string | number }>({
	data,
	columns,
	pageSize = DATA_TABLE_CONFIG.defaultPageSize,
	showPagination = true,
	emptyMessage = DATA_TABLE_TEXT.noData,
	serverPagination,
	serverSort,
	fixedHeight,
	initialSort,
	tableLayout = "fixed",
}: DataTableProps<T>) {
	/** When fixedHeight is true or a number: table body scrolls; header and pagination stay fixed. */
	const scrollAreaHeight =
		fixedHeight === true
			? DATA_TABLE_SCROLL_HEIGHT
			: typeof fixedHeight === "number"
				? fixedHeight
				: null;
	const PAGINATION_AREA_HEIGHT = 52;
	const totalHeight =
		scrollAreaHeight != null ? scrollAreaHeight + PAGINATION_AREA_HEIGHT : null;
	const [sortState, setSortState] = useState<SortState>(() => ({
		column: initialSort?.column ?? null,
		direction: initialSort?.direction ?? null,
	}));
	const [clientPagination, setClientPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize,
	});

	const isServerSide = Boolean(serverPagination);
	const useServerSort = Boolean(serverSort);
	const pageIndex = serverPagination
		? serverPagination.pageIndex
		: clientPagination.pageIndex;
	const totalCount = serverPagination
		? serverPagination.totalCount
		: data.length;
	const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
	const hasData = totalCount > 0;
	const canGoPrevious = pageIndex > 0;
	const canGoNext = pageIndex < totalPages - 1;

	// Sort data (client-side only when not using serverSort)
	const sortedData = useMemo(() => {
		if (useServerSort) return data;
		if (!sortState.column || !sortState.direction) return data;
		return [...data].sort((a, b) => {
			const column = columns.find((col) => col.id === sortState.column);
			if (!column?.accessorKey) return 0;
			const aValue = a[column.accessorKey];
			const bValue = b[column.accessorKey];
			if (aValue === bValue) return 0;
			if (aValue === null || aValue === undefined) return 1;
			if (bValue === null || bValue === undefined) return -1;
			const comparison =
				typeof aValue === "number" && typeof bValue === "number"
					? aValue - bValue
					: String(aValue).localeCompare(String(bValue), undefined, {
							numeric: true,
						});
			return sortState.direction === "asc" ? comparison : -comparison;
		});
	}, [data, sortState, columns, useServerSort]);

	// Paginate: server-side uses data as-is, client-side slices
	const paginatedData = useMemo(() => {
		if (isServerSide) return data;
		const start = clientPagination.pageIndex * clientPagination.pageSize;
		const end = start + clientPagination.pageSize;
		return sortedData.slice(start, end);
	}, [data, sortedData, clientPagination, isServerSide]);

	const handleSort = (columnId: string) => {
		if (useServerSort && serverSort) {
			serverSort.onSort(columnId);
			return;
		}
		setSortState((prev) => {
			if (prev.column !== columnId) {
				return { column: columnId, direction: "asc" };
			}
			return {
				column: columnId,
				direction: prev.direction === "asc" ? "desc" : "asc",
			};
		});
	};

	const effectiveSortColumn =
		useServerSort && serverSort ? serverSort.sortColumnId : sortState.column;
	const effectiveSortDirection =
		useServerSort && serverSort
			? serverSort.sortDirection
			: sortState.direction;

	const handlePrevious = () => {
		const next = Math.max(0, pageIndex - 1);
		if (serverPagination) serverPagination.onPageChange(next);
		else setClientPagination((prev) => ({ ...prev, pageIndex: next }));
	};

	const handleNext = () => {
		const next = Math.min(totalPages - 1, pageIndex + 1);
		if (serverPagination) serverPagination.onPageChange(next);
		else setClientPagination((prev) => ({ ...prev, pageIndex: next }));
	};

	const handlePageClick = (newPageIndex: number) => {
		if (serverPagination) serverPagination.onPageChange(newPageIndex);
		else setClientPagination((prev) => ({ ...prev, pageIndex: newPageIndex }));
	};

	const isAutoTableLayout = tableLayout === "auto";

	/** Sum of column min widths so the table never shrinks below this and headers don't overlap. */
	const tableMinWidthPx = useMemo(() => {
		if (isAutoTableLayout) return 0;
		const defaultPx = parseWidthToPx(DEFAULT_MIN_COLUMN_WIDTH, 100);
		return columns.reduce((sum, col) => {
			const w = col.minWidth ?? DEFAULT_MIN_COLUMN_WIDTH;
			return sum + parseWidthToPx(w, defaultPx);
		}, 0);
	}, [columns, isAutoTableLayout]);

	const paginationStart = pageIndex * pageSize + 1;
	const paginationEnd = Math.min((pageIndex + 1) * pageSize, totalCount);

	const renderPaginationNumbers = () => {
		const pages: (number | string)[] = [];
		const current = pageIndex;

		if (totalPages <= 7) {
			for (let i = 0; i < totalPages; i++) pages.push(i);
		} else {
			pages.push(0);
			if (current > 2) pages.push("...");

			const start = Math.max(1, current - 1);
			const end = Math.min(totalPages - 2, current + 1);

			for (let i = start; i <= end; i++) pages.push(i);

			if (current < totalPages - 3) pages.push("...");
			pages.push(totalPages - 1);
		}

		return pages.map((p, idx) =>
			typeof p === "string" ? (
				<span
					key={`ellipsis-${idx}`}
					className="px-1 text-small text-text-secondary"
				>
					{p}
				</span>
			) : (
				<button
					type="button"
					key={p}
					onClick={() => handlePageClick(p)}
					disabled={p === current}
					className={cn(
						"size-8 flex items-center justify-center text-small rounded-md transition-colors",
						p === current
							? "border border-border bg-background text-text-foreground font-medium cursor-not-allowed"
							: "text-text-secondary hover:text-text-foreground hover:bg-muted cursor-pointer",
					)}
				>
					{p + 1}
				</button>
			),
		);
	};

	return (
		<div
			className="flex flex-col"
			style={totalHeight != null ? { height: totalHeight } : undefined}
		>
			{/* Scroll area: only this part scrolls; table header is sticky inside it */}
			<div
				className={cn(
					scrollAreaHeight != null
						? "min-h-0 flex-1 overflow-auto"
						: "overflow-x-auto",
				)}
			>
				<table
					className={cn(
						"w-full caption-bottom text-sm",
						isAutoTableLayout ? "table-auto" : "table-fixed",
					)}
					style={
						!isAutoTableLayout && tableMinWidthPx > 0
							? { minWidth: `${tableMinWidthPx}px` }
							: undefined
					}
				>
					<TableHeader
						className={cn(
							"bg-card border-0",
							scrollAreaHeight != null &&
								"sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]",
						)}
					>
						<TableRow className="border-b-transparent rounded-lg overflow-hidden">
							{columns.map((column) => {
								const minWidth = column.minWidth ?? DEFAULT_MIN_COLUMN_WIDTH;
								return (
									<TableHead
										key={column.id}
										style={{ minWidth }}
										className={cn(
											"h-14 px-4 py-5 text-small font-semibold text-text-foreground bg-card first:rounded-l-lg last:rounded-r-lg whitespace-nowrap",
											column.headerClassName,
										)}
									>
										{column.renderHeader ? (
											column.renderHeader()
										) : column.sortable ? (
											<button
												type="button"
												onClick={() => handleSort(column.id)}
												className="flex items-center gap-1.5 hover:text-text-foreground transition-colors cursor-pointer"
												aria-label={`Sort by ${String(column.header)}${effectiveSortColumn === column.id ? `, ${effectiveSortDirection === "asc" ? "ascending" : "descending"}` : ""}`}
											>
												{column.header}
												{effectiveSortColumn === column.id ? (
													<ArrowUp
														className={cn(
															"size-4 text-interactive-primary transition-transform",
															effectiveSortDirection === "desc" && "rotate-180",
														)}
													/>
												) : (
													<ArrowUpDown className="size-4 text-icon-secondary font-semibold" />
												)}
											</button>
										) : (
											column.header
										)}
									</TableHead>
								);
							})}
						</TableRow>
					</TableHeader>

					<TableBody>
						{paginatedData.length === 0 ? (
							<TableRow className="hover:bg-transparent">
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center text-muted-foreground"
								>
									{emptyMessage}
								</TableCell>
							</TableRow>
						) : (
							paginatedData.map((row) => (
								<TableRow
									key={row.id}
									className="hover:bg-muted/30 border-b border-border"
								>
									{columns.map((column) => {
										const minWidth =
											column.minWidth ?? DEFAULT_MIN_COLUMN_WIDTH;
										return (
											<TableCell
												key={column.id}
												style={{ minWidth }}
												className={cn(
													"min-w-0 overflow-hidden px-4 py-5 text-small text-text-foreground",
													column.cellClassName,
												)}
											>
												{column.cell
													? column.cell(row)
													: column.accessorKey
														? String(row[column.accessorKey] ?? "")
														: null}
											</TableCell>
										);
									})}
								</TableRow>
							))
						)}
					</TableBody>
				</table>
			</div>

			{/* Pagination: only when there is data; active page button is disabled */}
			{showPagination && hasData && (
				<div className="flex shrink-0 items-center justify-between pt-6 pb-2">
					<p className="text-small text-text-secondary">
						{DATA_TABLE_TEXT.showing} {paginationStart} to {paginationEnd} of{" "}
						{totalCount} results
					</p>
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							icon={ChevronLeft}
							onClick={handlePrevious}
							disabled={!canGoPrevious}
							className="text-small text-text-secondary hover:text-text-foreground"
						>
							{DATA_TABLE_TEXT.previous}
						</Button>
						<div className="flex items-center gap-1">
							{renderPaginationNumbers()}
						</div>
						<Button
							variant="ghost"
							size="sm"
							icon={ChevronRight}
							iconPosition="end"
							onClick={handleNext}
							disabled={!canGoNext}
							className="text-small text-text-secondary hover:text-text-foreground"
						>
							{DATA_TABLE_TEXT.next}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
