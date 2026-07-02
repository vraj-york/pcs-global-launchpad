import type {
	InviteManagementListItem,
	InviteManagementListSummary,
} from "./invite-management.types";

/** Standard `{ success, message, data }` wrapper from invite-management HTTP endpoints. */
export type InviteManagementApiEnvelope<T> = {
	success: boolean;
	message: string;
	data?: T;
};

export type AssessmentInvitesListData = {
	items: InviteManagementListItem[];
	summary: InviteManagementListSummary;
	pagination: {
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	};
};
