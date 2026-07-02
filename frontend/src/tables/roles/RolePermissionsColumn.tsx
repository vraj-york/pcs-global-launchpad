import { Checkbox } from "@/components/ui/checkbox";
import { ROLES_PAGE_CONTENT } from "@/const";
import type { ColumnDef, RolePermissionRow } from "@/types";

const PERMISSION_ROW_CELL_CLASS =
	"min-h-16 py-2 text-text-foreground align-middle";

export function getRolePermissionColumns(
	submoduleIdSet: Set<string>,
	toggleSubmodule: (submoduleId: string, checked: boolean) => void,
): ColumnDef<RolePermissionRow>[] {
	return [
		{
			id: "module",
			header: ROLES_PAGE_CONTENT.modules,
			accessorKey: "moduleName",
			sortable: false,
			minWidth: "334px",
			cellClassName: PERMISSION_ROW_CELL_CLASS,
		},
		{
			id: "submodule",
			header: ROLES_PAGE_CONTENT.submodules,
			accessorKey: "submoduleName",
			sortable: false,
			minWidth: "537px",
			cellClassName: `${PERMISSION_ROW_CELL_CLASS} break-words whitespace-normal`,
		},
		{
			id: "enableDisable",
			header: ROLES_PAGE_CONTENT.enableDisable,
			sortable: false,
			minWidth: "209px",
			headerClassName: "text-center",
			cellClassName: `${PERMISSION_ROW_CELL_CLASS} text-center`,
			cell: (row) => (
				<div className="flex size-full items-center justify-center">
					<Checkbox
						checked={submoduleIdSet.has(row.submoduleId)}
						onCheckedChange={(v) =>
							toggleSubmodule(row.submoduleId, v === true)
						}
						aria-label={`${row.moduleName} ${row.submoduleName} ${ROLES_PAGE_CONTENT.enableDisable}`}
						className="shrink-0"
					/>
				</div>
			),
		},
	];
}
