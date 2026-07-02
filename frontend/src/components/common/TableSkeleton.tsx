import { Skeleton } from "@/components/ui/skeleton";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { DATA_TABLE_CONFIG, DATA_TABLE_SCROLL_HEIGHT } from "@/const";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@/types";

export type TableSkeletonProps<T = unknown> = {
	/** Column definitions (same as DataTable) for header labels and column count */
	columns: ColumnDef<T>[];
	/** Number of skeleton rows. Default from DATA_TABLE_CONFIG.defaultPageSize */
	rowCount?: number;
	showPagination?: boolean;
	/** Match DataTable fixed height layout when true or a number (px) */
	fixedHeight?: number | true;
};

const PAGINATION_AREA_HEIGHT = 52;
const DEFAULT_MIN_COLUMN_WIDTH = "100px";

function parseWidthToPx(value: string, fallbackPx: number): number {
	const num = parseFloat(value);
	if (Number.isNaN(num)) return fallbackPx;
	if (value.endsWith("rem")) return num * 16;
	if (value.endsWith("px") || value === String(num)) return num;
	return fallbackPx;
}

export function TableSkeleton<T>({
	columns,
	rowCount = DATA_TABLE_CONFIG.defaultPageSize,
	showPagination = true,
	fixedHeight,
}: TableSkeletonProps<T>) {
	const scrollAreaHeight =
		fixedHeight === true
			? DATA_TABLE_SCROLL_HEIGHT
			: typeof fixedHeight === "number"
				? fixedHeight
				: null;
	const totalHeight =
		scrollAreaHeight != null ? scrollAreaHeight + PAGINATION_AREA_HEIGHT : null;

	const defaultPx = parseWidthToPx(DEFAULT_MIN_COLUMN_WIDTH, 100);
	const tableMinWidthPx = columns.reduce((sum, col) => {
		const w = col.minWidth ?? DEFAULT_MIN_COLUMN_WIDTH;
		return sum + parseWidthToPx(w, defaultPx);
	}, 0);

	return (
		<div
			className="flex flex-col"
			style={totalHeight != null ? { height: totalHeight } : undefined}
		>
			<div
				className={cn(
					scrollAreaHeight != null
						? "min-h-0 flex-1 overflow-hidden"
						: "overflow-x-auto",
				)}
			>
				<table
					className="w-full table-fixed caption-bottom text-sm"
					style={{ minWidth: `${tableMinWidthPx}px` }}
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
										{column.renderHeader
											? column.renderHeader()
											: column.header}
									</TableHead>
								);
							})}
						</TableRow>
					</TableHeader>

					<TableBody>
						{Array.from({ length: rowCount }).map((_, rowIndex) => (
							<TableRow key={rowIndex} className="border-b border-border">
								{columns.map((column) => {
									const minWidth = column.minWidth ?? DEFAULT_MIN_COLUMN_WIDTH;
									return (
										<TableCell
											key={column.id}
											style={{ minWidth }}
											className="min-w-0 overflow-hidden px-4 py-5"
										>
											<Skeleton className="h-5 w-full" />
										</TableCell>
									);
								})}
							</TableRow>
						))}
					</TableBody>
				</table>
			</div>

			{showPagination && (
				<div className="flex shrink-0 items-center justify-between pt-6 pb-2">
					<Skeleton className="h-5 w-32" />
					<div className="flex items-center gap-2">
						<Skeleton className="h-8 w-20" />
						<div className="flex gap-1">
							<Skeleton className="size-8" />
							<Skeleton className="size-8" />
						</div>
						<Skeleton className="h-8 w-16" />
					</div>
				</div>
			)}
		</div>
	);
}
