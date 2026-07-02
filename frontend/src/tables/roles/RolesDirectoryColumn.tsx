import { SquarePen, Trash2 } from "lucide-react";
import { BSPBadge } from "@/components";
import { Button } from "@/components/ui/button";
import { ROLES_PAGE_CONTENT, SUPER_ADMIN_CATEGORY_NAME } from "@/const";
import type { ColumnDef, RoleListItem } from "@/types";

function RoleTypeBadges({
	isPrivate,
	isExternal,
}: {
	isPrivate: boolean;
	isExternal: boolean;
}) {
	const visibility = isPrivate ? "Private" : "Public";
	const scope = isExternal ? "External" : "Internal";
	return (
		<div className="flex flex-wrap gap-1.5">
			<BSPBadge type={visibility}>{visibility}</BSPBadge>
			<BSPBadge type={scope}>{scope}</BSPBadge>
		</div>
	);
}

export function getRolesDirectoryColumns(
	onEdit?: (roleId: string) => void,
	onDelete?: (roleId: string) => void,
): ColumnDef<RoleListItem>[] {
	return [
		{
			id: "name",
			header: ROLES_PAGE_CONTENT.roleName,
			accessorKey: "name",
			sortable: true,
			minWidth: "180px",
			cell: (row) => (
				<span className="text-text-foreground truncate block" title={row.name}>
					{row.name}
				</span>
			),
		},
		{
			id: "category",
			header: ROLES_PAGE_CONTENT.category,
			accessorKey: "category",
			sortable: true,
			minWidth: "180px",
			cell: (row) => (
				<span
					className="text-text-foreground truncate block"
					title={row.category}
				>
					{row.category}
				</span>
			),
		},
		{
			id: "roleType",
			header: ROLES_PAGE_CONTENT.roleType,
			sortable: false,
			minWidth: "160px",
			cell: (row) => (
				<RoleTypeBadges isPrivate={row.isPrivate} isExternal={row.isExternal} />
			),
		},
		{
			id: "description",
			header: ROLES_PAGE_CONTENT.description,
			accessorKey: "description",
			sortable: false,
			minWidth: "280px",
			cellClassName: "!whitespace-normal align-top",
			cell: (row) => (
				<span
					className="text-text-foreground text-small line-clamp-2 block break-words max-w-xs"
					title={row.description ?? undefined}
				>
					{row.description ?? "—"}
				</span>
			),
		},
		{
			id: "actions",
			header: ROLES_PAGE_CONTENT.actions,
			minWidth: "100px",
			cell: (row) => (
				<div className="flex items-center gap-1">
					{row.category !== SUPER_ADMIN_CATEGORY_NAME && onEdit && onDelete ? (
						<>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={ROLES_PAGE_CONTENT.edit}
								onClick={() => onEdit(row.id)}
								icon={SquarePen}
							/>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={ROLES_PAGE_CONTENT.delete}
								onClick={() => onDelete(row.id)}
								icon={Trash2}
							/>
						</>
					) : null}
				</div>
			),
		},
	];
}
