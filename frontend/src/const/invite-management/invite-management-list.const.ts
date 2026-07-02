export const INVITE_MANAGEMENT_LIST_INVITEE_TYPE = {
	user: "User",
} as const;

export const INVITE_MANAGEMENT_LIST_STATUS = {
	invited: "invited",
	inProgress: "in_progress",
	completed: "completed",
	expired: "expired",
} as const;

export type InviteManagementListStatus =
	(typeof INVITE_MANAGEMENT_LIST_STATUS)[keyof typeof INVITE_MANAGEMENT_LIST_STATUS];

export const INVITE_MANAGEMENT_LIST_STATUS_FILTER_OPTIONS = [
	{ value: "all", label: "All Status" },
	{ value: INVITE_MANAGEMENT_LIST_STATUS.invited, label: "Invited" },
	{ value: INVITE_MANAGEMENT_LIST_STATUS.inProgress, label: "In Progress" },
	{ value: INVITE_MANAGEMENT_LIST_STATUS.completed, label: "Completed" },
	{ value: INVITE_MANAGEMENT_LIST_STATUS.expired, label: "Expired" },
] as const;

export const INVITE_MANAGEMENT_LIST_TIME_FILTER_OPTIONS = [
	{ value: "all", label: "All Time" },
	{ value: "thisWeek", label: "This Week" },
	{ value: "lastWeek", label: "Last Week" },
	{ value: "thisMonth", label: "This Month" },
	{ value: "lastMonth", label: "Last Month" },
] as const;

export const INVITE_MANAGEMENT_LIST_TABLE_HEADERS = {
	name: "Name",
	inviteeType: "Invitee Type",
	status: "Status",
	progress: "Progress",
	invitedOn: "Invited On",
	lastActivity: "Last Activity",
	actions: "Actions",
} as const;

export const INVITE_MANAGEMENT_LIST_STATUS_LABELS: Record<
	InviteManagementListStatus,
	string
> = {
	invited: "Invited",
	in_progress: "In Progress",
	completed: "Completed",
	expired: "Expired",
};

export const INVITE_MANAGEMENT_LIST_STATUS_BADGE_TYPES: Record<
	InviteManagementListStatus,
	string
> = {
	invited: "pending",
	in_progress: "in_progress",
	completed: "completed",
	expired: "expired_invite",
};

export const INVITE_MANAGEMENT_LIST_SUMMARY = {
	totalAssessments: "Total Assessments",
	completedAssessments: "Completed",
	completionRate: "Completion rate",
} as const;

export const INVITE_MANAGEMENT_LIST_ACTIONS = {
	resendInvite: "Resend invite",
	resendInviteAria: "Resend invitation",
} as const;

export const INVITE_MANAGEMENT_LIST_MESSAGES = {
	searchPlaceholder: "Search name or email...",
	noResults: "No Results Found",
	listLoadError: "Could not load assessment invites.",
	notAvailable: "N/A",
	resendCompletedError:
		"Completed assessments cannot be resent. View or download the result instead.",
} as const;
