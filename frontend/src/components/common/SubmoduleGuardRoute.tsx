import { Navigate, useLocation } from "react-router-dom";
import { ROUTES } from "@/const";
import { usePermissions } from "@/hooks";
import { useUsersStore } from "@/store";
import type { SubmoduleGuardRouteProps } from "@/types";
import { AppLoader } from "./AppLoader";

export function SubmoduleGuardRoute({
	children,
	required,
	mode = "any",
	redirectTo = ROUTES.dashboard.root,
}: SubmoduleGuardRouteProps) {
	const location = useLocation();
	const { userProfile } = useUsersStore();
	const { can, canAny, canAll } = usePermissions();

	// Only block when profile is missing (initial load). Refetch with existing profile does not block.
	if (userProfile == null) {
		return <AppLoader fullScreen showMessage />;
	}

	const keys = Array.isArray(required) ? required : [required];
	const isAllowed =
		mode === "all"
			? canAll(keys)
			: keys.length === 1
				? can(keys[0])
				: canAny(keys);

	if (!isAllowed) {
		return <Navigate to={redirectTo} state={{ from: location }} replace />;
	}

	return <>{children}</>;
}
