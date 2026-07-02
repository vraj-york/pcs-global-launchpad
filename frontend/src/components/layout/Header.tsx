import { ChevronRight, LogOut, Menu, Moon, Sun, UserPen } from "lucide-react";
import { Link } from "react-router-dom";
import { BSPLogo } from "@/components/BSPLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebarOptional } from "@/components/ui/sidebar";
import { HEADER_CONTENT, ROUTES, USER_DROPDOWN_LABELS } from "@/const";
import { useTheme } from "@/hooks";
import { useAuthStore, useUsersStore } from "@/store";
import type { HeaderProps } from "@/types";
import { getUserInitials } from "@/utils/sharedUtils";

export function Header({
	breadcrumbs = [],
	leading = "breadcrumbs",
}: HeaderProps) {
	const { theme, toggleTheme } = useTheme();
	const { logout } = useAuthStore();
	const { firstName, lastName, userProfile } = useUsersStore();
	const sidebarCtx = useSidebarOptional();
	const toggleSidebar = sidebarCtx?.toggleSidebar ?? (() => {});
	const hasSidebar = sidebarCtx !== null;

	const handleSignOut = async () => {
		await logout();
	};

	const userInitials = getUserInitials(firstName, lastName);

	return (
		<header className="z-10 flex h-15 min-w-0 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-8">
			<div className="flex min-w-0 flex-1 items-center gap-2 md:flex-initial">
				{hasSidebar ? (
					<Button
						variant="ghost"
						size="icon"
						onClick={toggleSidebar}
						className="md:hidden size-8 shrink-0 text-muted-foreground hover:text-foreground"
						aria-label="Toggle menu"
						icon={Menu}
					/>
				) : null}

				{leading === "logo" ? (
					<Link
						to={ROUTES.dashboard.root}
						className="flex min-w-0 shrink-0 items-center"
						aria-label={HEADER_CONTENT.goToDashboard}
					>
						<BSPLogo variant="app" />
					</Link>
				) : leading === "breadcrumbs" ? (
					<nav aria-label="Breadcrumb" className="min-w-0 flex-1">
						<ol className="flex min-w-0 items-center gap-2 truncate">
							{breadcrumbs.map((item, index) => (
								<li
									key={item.label}
									className="flex min-w-0 shrink-0 items-center gap-2"
								>
									{index > 0 && (
										<ChevronRight className="size-4 shrink-0 text-text-secondary" />
									)}
									{item.path && index < breadcrumbs.length - 1 ? (
										<Link
											to={item.path}
											className="truncate text-sm text-text-secondary hover:text-text-foreground transition-colors"
										>
											{item.label}
										</Link>
									) : (
										<span className="truncate text-sm font-medium text-text-foreground capitalize select-none">
											{item.label}
										</span>
									)}
								</li>
							))}
						</ol>
					</nav>
				) : null}
			</div>

			{/* Right Section */}
			<div className="flex shrink-0 items-center gap-2">
				{/* Theme Toggle */}
				<Button
					variant="ghost"
					size="icon"
					onClick={toggleTheme}
					className="text-icon-secondary hover:text-icon-primary"
					aria-label={
						theme === "light"
							? HEADER_CONTENT.themeDark
							: HEADER_CONTENT.themeLight
					}
					icon={theme === "light" ? Moon : Sun}
				/>

				{/* User Dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="rounded-full"
							aria-label={USER_DROPDOWN_LABELS.userMenu}
						>
							<Avatar className="size-7">
								<AvatarImage src={userProfile?.avatar ?? undefined} alt="" />
								<AvatarFallback className="bg-primary text-primary-foreground text-mini">
									{userInitials}
								</AvatarFallback>
							</Avatar>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="end"
						className="min-w-36 rounded-lg border border-border bg-background p-0.5"
					>
						<DropdownMenuItem
							asChild
							className="min-h-8 rounded-md px-2 py-1.5"
						>
							<Link
								to={ROUTES.settings.root}
								className="flex items-center gap-2 text-small text-text-foreground"
							>
								<UserPen className="size-5 text-icon-secondary" aria-hidden />
								{USER_DROPDOWN_LABELS.profileOverview}
							</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator className="my-0.5" />
						<DropdownMenuItem onClick={handleSignOut} variant="destructive">
							<LogOut className="size-5" aria-hidden />
							<span>{USER_DROPDOWN_LABELS.logOut}</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	);
}
