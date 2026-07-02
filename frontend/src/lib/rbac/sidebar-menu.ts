import type {
	SidebarAccessState,
	SidebarMenuFilterContext,
	SidebarMenuSection,
	VisibleSidebarSection,
} from "@/types";
import { canAccessAll, canAccessAny } from "./permissions";

/** True while sidebar should show a loading skeleton instead of a partial menu. */
export function isSidebarAccessPending({
	groupsReady,
	permissionsReady,
	profileError,
}: SidebarAccessState): boolean {
	if (!groupsReady) return true;
	if (permissionsReady) return false;
	if (profileError) return false;
	return true;
}

export function getVisibleSidebarSections(
	menu: readonly SidebarMenuSection[],
	ctx: SidebarMenuFilterContext,
): VisibleSidebarSection[] {
	const { groups, groupsReady, enabledKeys, permissionsReady } = ctx;

	return menu
		.map((section) => {
			const visibleItems = section.items.filter((item) => {
				if (item.allowedGroups?.length) {
					if (!groupsReady && groups.length === 0) return false;
					const groupMatch = item.allowedGroups.some((g) => groups.includes(g));
					if (!groupMatch) return false;
				}

				if (item.requiredSubmodule) {
					if (!permissionsReady) return false;
					const keys = Array.isArray(item.requiredSubmodule)
						? item.requiredSubmodule
						: [item.requiredSubmodule];
					const mode = item.requiredSubmoduleMode ?? "any";
					const submoduleMatch =
						mode === "all"
							? canAccessAll(enabledKeys, keys)
							: canAccessAny(enabledKeys, keys);
					if (!submoduleMatch) return false;
				}

				return true;
			});

			if (visibleItems.length === 0) return null;

			return { title: section.title, items: [...visibleItems] };
		})
		.filter((section): section is VisibleSidebarSection => section !== null);
}
