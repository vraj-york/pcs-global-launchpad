import type { SubscriptionAccessData } from "./user.types";

export type SubscriptionAccess = SubscriptionAccessData & {
	loading: boolean;
	refreshing: boolean;
	hasResolvedAccess: boolean;
	isAdminRole: boolean;
	isSuperAdmin: boolean;
	canAccessApp: boolean;
	canAccessFullApp: boolean;
	canAccessChatbot: boolean;
	canStartAssessment: boolean;
	canViewResults: boolean;
	refresh: () => Promise<void>;
};
