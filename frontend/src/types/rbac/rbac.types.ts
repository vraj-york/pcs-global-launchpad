import type { ReactNode } from "react";
import type { SubmoduleKey } from "@/const";

export type PermissionCheckMode = "any" | "all";

export type SubmoduleGuardRouteProps = {
	children: ReactNode;
	required: SubmoduleKey | readonly SubmoduleKey[];
	mode?: PermissionCheckMode;
	redirectTo?: string;
};

export type PermissionGateProps = {
	permission: SubmoduleKey | readonly SubmoduleKey[];
	mode?: PermissionCheckMode;
	fallback?: ReactNode;
	children: ReactNode;
};
