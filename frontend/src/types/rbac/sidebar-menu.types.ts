import type { SidebarMenuSection } from "@/types";

export type SidebarMenuFilterContext = {
	groups: readonly string[];
	groupsReady: boolean;
	enabledKeys: ReadonlySet<string>;
	permissionsReady: boolean;
};

export type VisibleSidebarSection = {
	title: string;
	items: SidebarMenuSection["items"][number][];
};

export type SidebarAccessState = {
	groupsReady: boolean;
	permissionsReady: boolean;
	profileError: string | null;
};
