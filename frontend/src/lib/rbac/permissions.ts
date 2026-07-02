import type { SubmoduleKey } from "@/const";
import type { UserProfileSubmoduleAccess } from "@/types";

export function buildEnabledSubmoduleSet(
	submodules: readonly UserProfileSubmoduleAccess[],
): Set<string> {
	const enabled = new Set<string>();
	for (const entry of submodules) {
		if (entry.enabled) {
			enabled.add(entry.key);
		}
	}
	return enabled;
}

export function canAccess(
	enabledKeys: ReadonlySet<string>,
	key: SubmoduleKey,
): boolean {
	return enabledKeys.has(key);
}

export function canAccessAny(
	enabledKeys: ReadonlySet<string>,
	keys: readonly SubmoduleKey[],
): boolean {
	return keys.some((key) => enabledKeys.has(key));
}

export function canAccessAll(
	enabledKeys: ReadonlySet<string>,
	keys: readonly SubmoduleKey[],
): boolean {
	return keys.length > 0 && keys.every((key) => enabledKeys.has(key));
}
