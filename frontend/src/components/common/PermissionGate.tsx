import type { ReactNode } from "react";
import { usePermissions } from "@/hooks";
import type { PermissionGateProps } from "@/types";

export function PermissionGate({
	permission,
	mode = "any",
	fallback = null,
	children,
}: PermissionGateProps) {
	const { ready, can, canAny, canAll } = usePermissions();

	if (!ready) {
		return null;
	}

	const keys = Array.isArray(permission) ? permission : [permission];
	const isAllowed =
		mode === "all"
			? canAll(keys)
			: keys.length === 1
				? can(keys[0])
				: canAny(keys);

	if (!isAllowed) {
		return <>{fallback}</>;
	}

	return <>{children as ReactNode}</>;
}
