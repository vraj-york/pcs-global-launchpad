import { Loader2 } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { APP_LOADING_MESSAGE, ROUTES } from "@/const";
import { useUserGroups } from "@/hooks";
import type { RoleGuardRouteProps } from "@/types";

export function RoleGuardRoute({
	children,
	allowedGroups,
}: RoleGuardRouteProps) {
	const location = useLocation();
	const { groups, ready } = useUserGroups();

	if (!ready) {
		return (
			<div
				className="flex min-h-[40vh] items-center justify-center"
				role="status"
				aria-live="polite"
			>
				<Loader2
					className="size-6 animate-spin text-muted-foreground"
					aria-hidden
				/>
				<span className="sr-only">{APP_LOADING_MESSAGE}</span>
			</div>
		);
	}

	const isAllowed = allowedGroups.some((group) => groups.includes(group));
	if (!isAllowed) {
		return (
			<Navigate to={ROUTES.dashboard.root} state={{ from: location }} replace />
		);
	}

	return <>{children}</>;
}
