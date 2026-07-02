import { useCallback, useMemo } from "react";
import type { SubmoduleKey } from "@/const";
import {
	buildEnabledSubmoduleSet,
	canAccess,
	canAccessAll,
	canAccessAny,
} from "@/lib/rbac/permissions";
import { useUsersStore } from "@/store/users.store";

/**
 * RBAC permissions from `GET /users/me/profile` → `data.submodules`.
 *
 * @example Route guard
 * ```tsx
 * <SubmoduleGuardRoute required={SUBMODULE_KEYS.USER_DIRECTORY_VIEW}>
 * ```
 *
 * @example Inline check
 * ```tsx
 * const { can } = usePermissions();
 * {can(SUBMODULE_KEYS.USER_DIRECTORY_INVITE) && <Button>Invite</Button>}
 * ```
 *
 * @example Declarative gate
 * ```tsx
 * <PermissionGate permission={SUBMODULE_KEYS.USER_DIRECTORY_EDIT}>
 *   <EditButton />
 * </PermissionGate>
 * ```
 */
export function usePermissions() {
	const userProfile = useUsersStore((s) => s.userProfile);
	const userProfileLoading = useUsersStore((s) => s.userProfileLoading);

	const enabledKeys = useMemo(
		() => buildEnabledSubmoduleSet(userProfile?.submodules ?? []),
		[userProfile?.submodules],
	);

	const ready = userProfile != null;

	const can = useCallback(
		(key: SubmoduleKey) => canAccess(enabledKeys, key),
		[enabledKeys],
	);
	const canAny = useCallback(
		(keys: readonly SubmoduleKey[]) => canAccessAny(enabledKeys, keys),
		[enabledKeys],
	);
	const canAll = useCallback(
		(keys: readonly SubmoduleKey[]) => canAccessAll(enabledKeys, keys),
		[enabledKeys],
	);

	return {
		ready,
		loading: userProfileLoading,
		enabledKeys,
		can,
		canAny,
		canAll,
	};
}
