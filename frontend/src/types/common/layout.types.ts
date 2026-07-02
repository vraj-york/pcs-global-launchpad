import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { SubmoduleKey } from "@/const";
import type { PermissionCheckMode } from "@/types";

export type SidebarMenuItem = {
	id: string;
	label: string;
	icon: LucideIcon;
	path: string;
	badge?: string | number;
	/**
	 * When set, the item is shown only to users who belong to at least one
	 * of the listed Cognito groups. Omit to show to all authenticated users.
	 */
	allowedGroups?: string[];
	/** Submodule RBAC gate (RBAC-eligible items only). */
	requiredSubmodule?: SubmoduleKey | readonly SubmoduleKey[];
	requiredSubmoduleMode?: PermissionCheckMode;
};

export type SidebarMenuSection = {
	title: string;
	items: readonly SidebarMenuItem[];
};

export type BreadcrumbItem = {
	label: string;
	path?: string;
};

export type AppLayoutProps = {
	children: ReactNode;
	/** When false, main content is full-width without the app sidebar. */
	showSidebar?: boolean;
};

export type AppLayoutWithBreadcrumbProps = AppLayoutProps & {
	breadcrumbs?: BreadcrumbItem[];
};

export type HeaderLeadingMode = "breadcrumbs" | "logo" | "none";

export type HeaderProps = {
	breadcrumbs?: BreadcrumbItem[];
	leading?: HeaderLeadingMode;
};
