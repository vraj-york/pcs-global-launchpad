import {
	COGNITO_COMPANY_ADMIN_GROUP,
	COGNITO_CORPORATION_ADMIN_GROUP,
	COGNITO_SUPER_ADMIN_GROUP,
	COGNITO_USER_GROUP,
} from "@/const";
import { useUserGroups } from "./useUserGroups";

export function useUserRoles() {
	const { groups, ready } = useUserGroups();

	const isSuperAdmin = groups.includes(COGNITO_SUPER_ADMIN_GROUP);
	const isCorporationAdmin =
		groups.includes(COGNITO_CORPORATION_ADMIN_GROUP) && !isSuperAdmin;
	const isCompanyAdmin =
		groups.includes(COGNITO_COMPANY_ADMIN_GROUP) && !isSuperAdmin;
	const isEndUser =
		groups.includes(COGNITO_USER_GROUP) &&
		!isSuperAdmin &&
		!isCorporationAdmin &&
		!isCompanyAdmin;

	return {
		groups,
		ready,
		isSuperAdmin,
		isCorporationAdmin,
		isCompanyAdmin,
		isEndUser,
	};
}

export function useIsSuperAdmin() {
	const { isSuperAdmin, ready, groups } = useUserRoles();
	return { isSuperAdmin, ready, groups };
}

export function useIsCorporationAdmin() {
	const { isCorporationAdmin, ready, groups } = useUserRoles();
	return { isCorporationAdmin, ready, groups };
}

export function useIsCompanyAdmin() {
	const { isCompanyAdmin, ready, groups } = useUserRoles();
	return { isCompanyAdmin, ready, groups };
}

export function useIsEndUser() {
	const { isEndUser, ready, groups } = useUserRoles();
	return { isEndUser, ready, groups };
}
