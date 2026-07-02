import { USER_DIRECTORY_BULK_UPLOAD } from "@/const";
import type { ColumnDef, KeyContactBulkImportTableRow } from "@/types";

const H = USER_DIRECTORY_BULK_UPLOAD;

/** Column defs for bulk-import failures; use with `DataTable` `tableLayout="auto"`. */
export function getKeyContactBulkImportFailedColumns(): ColumnDef<KeyContactBulkImportTableRow>[] {
	return [
		{
			id: "row",
			header: H.bulkImportFailedRowColumn,
			accessorKey: "row",
			minWidth: "4.5rem",
			headerClassName: "text-left whitespace-nowrap px-3",
			cellClassName: "text-left align-top tabular-nums whitespace-nowrap px-3",
			cell: (row) => String(row.row),
		},
		{
			id: "email",
			header: H.bulkImportFailedEmailColumn,
			accessorKey: "email",
			minWidth: "11rem",
			headerClassName: "text-left",
			cellClassName:
				"min-w-0 max-w-md text-left align-top whitespace-normal break-all",
			cell: (row) => (
				<span className="block min-w-0" title={row.email}>
					{row.email}
				</span>
			),
		},
		{
			id: "message",
			header: H.bulkImportFailedMessageColumn,
			accessorKey: "message",
			minWidth: "12rem",
			headerClassName: "text-left",
			cellClassName:
				"min-w-0 text-left align-top whitespace-normal break-words text-destructive",
			cell: (row) => (
				<span className="block min-w-0" title={row.message}>
					{row.message}
				</span>
			),
		},
	];
}
