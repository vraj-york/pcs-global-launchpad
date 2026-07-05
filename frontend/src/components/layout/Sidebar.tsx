import { PanelLeft } from "lucide-react";
import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { BSPLogo } from "@/components/BSPLogo";
import { Button } from "@/components/ui/button";
import {
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	Sidebar as SidebarRoot,
	useSidebar,
} from "@/components/ui/sidebar";
import { SIDEBAR_LOADING, COACH_SIDEBAR_MENU, SIDEBAR_MENU } from "@/const";
import { usePermissions, useUserGroups, useUserRoles } from "@/hooks";
import { getVisibleSidebarSections, isSidebarAccessPending } from "@/lib";
import { useUsersStore } from "@/store";

function SidebarToggle() {
	const { toggleSidebar } = useSidebar();

	return (
		<Button
			variant="ghost"
			size="icon"
			icon={PanelLeft}
			onClick={toggleSidebar}
			className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
			aria-label="Toggle Sidebar"
		/>
	);
}

function SidebarNavSkeleton() {
	return (
		<SidebarGroup
			className="py-1"
			aria-busy="true"
			aria-label={SIDEBAR_LOADING.ariaLabel}
		>
			<SidebarGroupContent>
				<SidebarMenu>
					{Array.from(
						{ length: SIDEBAR_LOADING.skeletonItemCount },
						(_, index) => (
							<SidebarMenuItem key={index}>
								<SidebarMenuSkeleton showIcon />
							</SidebarMenuItem>
						),
					)}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}

export function Sidebar() {
	const { groups, ready: groupsReady } = useUserGroups();
	const { isCoach } = useUserRoles();
	const { ready: permissionsReady, enabledKeys } = usePermissions();
	const userProfileError = useUsersStore((s) => s.userProfileError);
	const menu = isCoach ? COACH_SIDEBAR_MENU : SIDEBAR_MENU;

	const accessPending = isSidebarAccessPending({
		groupsReady,
		permissionsReady,
		profileError: userProfileError,
	});

	const visibleSections = useMemo(
		() =>
			getVisibleSidebarSections(menu, {
				groups,
				groupsReady,
				enabledKeys,
				permissionsReady,
			}),
		[menu, groups, groupsReady, enabledKeys, permissionsReady],
	);

	return (
		<SidebarRoot collapsible="icon" className="border-r border-border">
			<SidebarHeader className="flex-row items-center gap-2 border-b border-border h-15 px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
				<BSPLogo
					variant="app"
					className="group-data-[collapsible=icon]:hidden"
				/>
				<div className="flex-1" />
				<SidebarToggle />
			</SidebarHeader>

			<SidebarContent className="px-2 py-2 group-data-[collapsible=icon]:px-0">
				{accessPending ? (
					<SidebarNavSkeleton />
				) : (
					visibleSections.map((section) => (
						<SidebarGroup key={section.title} className="py-1">
							<SidebarGroupLabel className="text-muted-foreground text-xs font-semibold tracking-wider px-1 mb-1 group-data-[collapsible=icon]:hidden">
								{section.title}
							</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									{section.items.map((item) => {
										const Icon = item.icon;
										return (
											<SidebarMenuItem key={item.id}>
												<NavLink to={item.path}>
													{({ isActive }) => (
														<SidebarMenuButton
															isActive={isActive}
															tooltip={item.label}
															className="text-sidebar-foreground cursor-pointer"
														>
															<Icon className="size-4 shrink-0" />
															<span className="group-data-[collapsible=icon]:hidden">
																{item.label}
															</span>
														</SidebarMenuButton>
													)}
												</NavLink>
											</SidebarMenuItem>
										);
									})}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					))
				)}
			</SidebarContent>
		</SidebarRoot>
	);
}
