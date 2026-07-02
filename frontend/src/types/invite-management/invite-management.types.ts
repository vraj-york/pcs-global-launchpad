import type { LucideIcon } from "lucide-react";
import type { PromoCodeAvailableForCompanySetupItem } from "@/types";

export type AssessmentInvitePromoSelectProps = {
	id: string;
	value: string;
	onChange: (value: string) => void;
	error?: string;
	options: PromoCodeAvailableForCompanySetupItem[];
	loading: boolean;
	loadError: string | null;
};

export type AssessmentInviteOptions = {
	assessmentType: string;
	invoiceAmount: number;
	promoCodes: PromoCodeAvailableForCompanySetupItem[];
};

export type SendAssessmentInvitePayload = {
	firstName: string;
	lastName: string;
	email: string;
	workPhone: string;
	timezone: string;
	hasPromoCode: boolean;
	nickname?: string;
	cellPhone?: string;
	promoCodeId?: string;
};

export type InviteManagementListStatus =
	| "invited"
	| "in_progress"
	| "completed"
	| "expired";

export type InviteManagementListSortBy =
	| "name"
	| "inviteeType"
	| "status"
	| "progress"
	| "invitedOn"
	| "lastActivity";

export type InviteManagementListSortOrder = "asc" | "desc";

export type InviteManagementListTimeFilter =
	| "thisWeek"
	| "lastWeek"
	| "thisMonth"
	| "lastMonth";

export type InviteManagementListItem = {
	id: string;
	cognitoSub: string;
	name: string;
	email: string | null;
	inviteeType: string;
	status: InviteManagementListStatus;
	progressPercent: number;
	invitedOn: string | null;
	lastActivity: string | null;
	assessmentId: string | null;
	completedAt: string | null;
	reportKey: string | null;
};

export type InviteManagementListSummary = {
	totalAssessments: number;
	completedAssessments: number;
	completionRatePercent: number;
};

export type InviteManagementListParams = {
	page?: number;
	limit?: number;
	search?: string;
	status?: InviteManagementListStatus;
	timeFilter?: InviteManagementListTimeFilter;
	sortBy?: InviteManagementListSortBy;
	sortOrder?: InviteManagementListSortOrder;
};

export type InviteManagementColumnOptions = {
	onViewClick?: (row: InviteManagementListItem) => void;
	onDownloadClick?: (row: InviteManagementListItem) => void;
	onResendClick?: (row: InviteManagementListItem) => void;
	resendingCognitoSub?: string | null;
	downloadingReportKey?: string | null;
	showActionsColumn?: boolean;
};

export type InviteManagementSummaryCardsProps = {
	summary: InviteManagementListSummary | null;
	loading?: boolean;
};

export type InviteManagementSummaryCardConfig = {
	key: string;
	label: string;
	icon: LucideIcon;
	iconShellClassName: string;
	iconClassName: string;
	alignTop?: boolean;
	getValue: (summary: InviteManagementListSummary | null) => string;
};

export type InviteManagementStore = {
	assessmentInviteOptions: AssessmentInviteOptions | null;
	assessmentInviteOptionsLoading: boolean;
	assessmentInviteOptionsError: string | null;
	isSendAssessmentInviteSubmitting: boolean;
	listItems: InviteManagementListItem[];
	listSummary: InviteManagementListSummary | null;
	listTotal: number;
	listPage: number;
	listLoading: boolean;
	listError: string | null;
	listSearch: string;
	listSortBy: InviteManagementListSortBy;
	listSortOrder: InviteManagementListSortOrder;
	listStatusFilter: InviteManagementListStatus | undefined;
	listTimeFilter: InviteManagementListTimeFilter | undefined;
	fetchAssessmentInviteOptions: () => Promise<void>;
	sendAssessmentInvite: (
		payload: SendAssessmentInvitePayload,
	) => Promise<boolean>;
	fetchAssessmentInvites: (
		page: number,
		limit: number,
		params?: Partial<InviteManagementListParams>,
	) => Promise<void>;
	setListPage: (page: number) => void;
	setListSearch: (search: string) => void;
	setListSort: (
		sortBy: InviteManagementListSortBy,
		sortOrder: InviteManagementListSortOrder,
	) => void;
	setListStatusFilter: (status: InviteManagementListStatus | undefined) => void;
	setListTimeFilter: (
		timeFilter: InviteManagementListTimeFilter | undefined,
	) => void;
	resetList: () => void;
};
