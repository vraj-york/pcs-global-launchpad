import type { RoleCategoryWithRoles } from "../roles/role.types";

export interface UserDirectoryCompany {
	companyName: string;
	region: string;
}

export interface UserDirectoryListItem {
	id: string;
	cognitoSub: string;
	userCode: number;
	firstName: string;
	lastName: string;
	email: string;
	status: string;
	corporationName: string | null;
	corporationCode: number | null;
	roleName: string | null;
	categoryName: string | null;
	workPhone: string | null;
	timezone: string | null;
	createdAt: string;
	company: UserDirectoryCompany | null;
}

export type UserApiSortBy =
	| "userCode"
	| "name"
	| "status"
	| "corporationName"
	| "companyName"
	| "roleName"
	| "categoryName"
	| "timezone"
	| "createdAt";

export type UserApiSortOrder = "asc" | "desc";

export type ListUsersParams = {
	page: number;
	limit: number;
	sortBy?: UserApiSortBy;
	sortOrder?: UserApiSortOrder;
	status?: string;
	categoryId?: string;
	corporationIds?: string[];
	companyIds?: string[];
	timezones?: string[];
	search?: string;
};

export type UserDirectoryApiItem = Omit<UserDirectoryListItem, "id">;

export type UsersListApiData = {
	items: UserDirectoryApiItem[];
	pagination: {
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	};
};

export type UserDirectoryFilterOption = { id: string; label: string };

export type UserMoreFiltersState = {
	corporationIds: string[];
	companyIds: string[];
	timeZones: string[];
};

export type MoreFiltersDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	filters: UserMoreFiltersState;
	onApply: (filters: UserMoreFiltersState) => void;
	corporationOptions: UserDirectoryFilterOption[];
	companyOptions: UserDirectoryFilterOption[];
	optionsLoading?: boolean;
	showCorporationFilter?: boolean;
	showCompanyFilter?: boolean;
};

export type SendInviteContactDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	isSubmitting?: boolean;
	onSubmit: (payload: {
		categoryId: string;
		roleId: string;
	}) => void | Promise<void>;
};

/** POST /key-contacts/:id/invite */
export type SendKeyContactInvitePayload = {
	roleId: string;
};

/** POST /users/invite */
export type InviteUserPayload = {
	firstName: string;
	lastName: string;
	email: string;
	workPhone: string;
	timezone: string;
	inviteType: string;
	cellPhone?: string;
	nickname?: string;
	corporationId?: string;
	companyId?: string;
	roleId?: string;
};

/** Submodule access entry on GET /users/me/profile (`data.submodules[]`). */
export type UserProfileSubmoduleAccess = {
	key: string;
	enabled: boolean;
};

/** GET /users/me/profile — current user profile (`data`). */
export type UserProfile = {
	cognitoSub: string;
	corporationId: string | null;
	companyId: string | null;
	userCode: number;
	status: string;
	firstName: string;
	lastName: string;
	nickname: string | null;
	jobRole: string | null;
	avatar: string | null;
	workPhone: string | null;
	cellPhone: string | null;
	timezone: string | null;
	professionalTitle?: string | null;
	yearsOfExperience?: number | null;
	bio?: string | null;
	completedOnboardingSteps: number;
	assessmentCompletionCount: number;
	corporation: string | null;
	companyName: string | null;
	roleName: string | null;
	category: string | null;
	userType: string | null;
	inviteType: string | null;
	email: string | null;
	/** Lowercase Stripe subscription status, e.g. 'active' | 'trialing' | 'past_due' | 'canceled' | null */
	subscriptionStatus: string | null;
	/** Plan type id: 'monthly' | 'annual' | 'one_time' | null */
	planTypeId: string | null;
	/** Flat RBAC submodule access (key + enabled only). */
	submodules: UserProfileSubmoduleAccess[];
};

/** GET /users/me/subscription-access — subscription context for the current user. */
export type SubscriptionAccessData = {
	companyId: string | null;
	subscriptionStatus: string | null;
	planTypeId: string | null;
	employeeRangeMax: number | null;
	activeEmployeeCount: number | null;
	assessmentQuantity?: number | null;
	companyAssessmentCount?: number | null;
	assessmentCreditsRemaining?: number | null;
	isActive: boolean;
	isBlocked: boolean;
	employeeLimitExceeded: boolean;
	canAccessFullApp: boolean;
	canAccessChatbot: boolean;
	canStartAssessment: boolean;
	canViewResults: boolean;
	isIndividualUser?: boolean;
	paymentRequired?: boolean;
	paymentStatus?: string | null;
};

/** PATCH /users/me/profile */
export type PatchMyProfilePayload = {
	nickname?: string;
	workPhone?: string;
	cellPhone?: string;
	timezone?: string;
	professionalTitle?: string;
	yearsOfExperience?: number;
	bio?: string;
};

/** PATCH /users/me/onboarding-steps */
export type ManageOnboardingStepType = "consent" | "intro_video";

/** PATCH /users/me/onboarding-steps */
export type ManageOnboardingStepPayload = {
	type: ManageOnboardingStepType;
};

export type UsersState = {
	listItems: UserDirectoryListItem[];
	listTotal: number;
	listPage: number;
	listLoading: boolean;
	listError: string | null;
	listSortBy: UserApiSortBy;
	listSortOrder: UserApiSortOrder;
	listStatusFilter: string | undefined;
	listCategoryIdFilter: string | undefined;
	listSearch: string;
	userDetail: UserDetails | null;
	userDetailLoading: boolean;
	userDetailError: string | null;
	isBlockConfirming: boolean;
	isRemoveConfirming: boolean;
	isCancelInviteConfirming: boolean;
	isResendInviteConfirming: boolean;
	isInviteUserSubmitting: boolean;
	isBulkInviteUsersSubmitting: boolean;
	userProfile: UserProfile | null;
	userProfileLoading: boolean;
	userProfileError: string | null;
	isMyProfileSaving: boolean;
	isMyAvatarUploading: boolean;
	isMyAvatarRemoving: boolean;
	firstName: string | null;
	lastName: string | null;
	fullName: string | null;
};

export type UsersActions = {
	fetchUsers: (
		page: number,
		limit: number,
		params?: {
			sortBy?: UserApiSortBy;
			sortOrder?: UserApiSortOrder;
			status?: string;
			categoryId?: string;
			corporationIds?: string[];
			companyIds?: string[];
			timezones?: string[];
			search?: string;
		},
	) => Promise<void>;
	setListPage: (page: number) => void;
	setListSort: (sortBy: UserApiSortBy, sortOrder: UserApiSortOrder) => void;
	setListStatusFilter: (status: string | undefined) => void;
	setListCategoryIdFilter: (categoryId: string | undefined) => void;
	setListSearch: (search: string) => void;
	clearListError: () => void;
	fetchUserById: (userId: string) => Promise<void>;
	clearUserDetail: () => void;
	blockUser: (userId: string, blocked: boolean) => Promise<boolean>;
	removeUser: (userId: string) => Promise<boolean>;
	cancelUserInvitation: (userId: string) => Promise<boolean>;
	resendUserInvitation: (userId: string) => Promise<boolean>;
	inviteUser: (payload: InviteUserPayload) => Promise<boolean>;
	bulkInviteUsers: (file: File) => Promise<boolean>;
	fetchUserProfile: () => Promise<boolean>;
	updateMyProfile: (payload: PatchMyProfilePayload) => Promise<boolean>;
	uploadMyAvatar: (file: File) => Promise<boolean>;
	removeMyAvatar: () => Promise<boolean>;
	clearUserProfile: () => void;
	reset: () => void;
};

export type UsersStore = UsersState & UsersActions;

export type UserStatusFilter =
	| "active"
	| "pending"
	| "expired"
	| "blocked"
	| "cancelled";

/** Key contact list row — aligned with GET /key-contacts items. */
export interface ContactDirectoryItem {
	id: string;
	contactCode: number;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	corporationName: string | null;
	corporationCode: number | null;
	companyName: string | null;
	corporationRegion: string | null;
	/** Display label from API (stored key resolved server-side). */
	contactType: string | null;
	jobRole: string | null;
	workPhone: string | null;
	timezone: string | null;
	createdAt: string;
}

export type ContactDirectoryColumnOptions = {
	onViewClick?: (row: ContactDirectoryItem) => void;
	onEditClick?: (row: ContactDirectoryItem) => void;
	onSendInviteClick?: (row: ContactDirectoryItem) => void;
	onRemoveClick?: (row: ContactDirectoryItem) => void;
	permissions?: {
		canView: boolean;
		canInvite: boolean;
		canEdit: boolean;
		canRemove: boolean;
	};
};

/** Allowed `sortBy` for GET /key-contacts (backend DTO). */
export type KeyContactApiSortBy =
	| "contactCode"
	| "name"
	| "corporationName"
	| "companyName"
	| "contactType"
	| "jobRole"
	| "timezone"
	| "createdAt";

export type KeyContactApiSortOrder = "asc" | "desc";

export type ListKeyContactsParams = {
	page: number;
	limit: number;
	sortBy?: KeyContactApiSortBy;
	sortOrder?: KeyContactApiSortOrder;
	search?: string;
	contactType?: string;
	corporationIds?: string[];
	companyIds?: string[];
	timezones?: string[];
};

/** Single row error from POST /key-contacts/bulk (`data.failed[]`). */
export type KeyContactBulkImportFailedRow = {
	row: number;
	email: string;
	message: string;
};

/** POST /key-contacts/bulk success payload (`data`). */
export type KeyContactBulkImportData = {
	createdCount: number;
	createdIds: string[];
	failed: KeyContactBulkImportFailedRow[];
};

export type KeyContactBulkImportTableRow = KeyContactBulkImportFailedRow & {
	id: string;
};

export type BulkUploadKeyContactsResult =
	| { ok: false; message: string; status?: number }
	| { ok: true; message: string; data: KeyContactBulkImportData };

export type KeyContactsListApiData = {
	items: ContactDirectoryItem[];
	pagination: {
		total: number;
		page: number;
		pageSize: number;
		totalPages: number;
	};
};

export type KeyContactsState = {
	listItems: ContactDirectoryItem[];
	listTotal: number;
	listPage: number;
	listLoading: boolean;
	listError: string | null;
	listSortBy: KeyContactApiSortBy;
	listSortOrder: KeyContactApiSortOrder;
	listSearch: string;
	listContactTypeFilter: string | undefined;
	contactDetail: KeyContactDetails | null;
	contactDetailLoading: boolean;
	contactDetailError: string | null;
	isCreateKeyContactSubmitting: boolean;
	isSendKeyContactInviteSubmitting: boolean;
	isDeleteKeyContactSubmitting: boolean;
	isBulkUploadKeyContactsSubmitting: boolean;
};

export type KeyContactsActions = {
	fetchKeyContacts: (
		page: number,
		limit: number,
		params?: {
			sortBy?: KeyContactApiSortBy;
			sortOrder?: KeyContactApiSortOrder;
			search?: string;
			contactType?: string;
			corporationIds?: string[];
			companyIds?: string[];
			timezones?: string[];
		},
	) => Promise<void>;
	setListPage: (page: number) => void;
	setListSort: (
		sortBy: KeyContactApiSortBy,
		sortOrder: KeyContactApiSortOrder,
	) => void;
	setListSearch: (search: string) => void;
	setListContactTypeFilter: (contactType: string | undefined) => void;
	clearListError: () => void;
	fetchKeyContactById: (contactId: string) => Promise<void>;
	clearContactDetail: () => void;
	createKeyContact: (payload: CreateKeyContactPayload) => Promise<boolean>;
	sendKeyContactInvite: (
		contactId: string,
		payload: SendKeyContactInvitePayload,
	) => Promise<boolean>;
	deleteKeyContact: (contactId: string) => Promise<boolean>;
	bulkUploadKeyContacts: (file: File) => Promise<BulkUploadKeyContactsResult>;
	reset: () => void;
};

export type KeyContactsStore = KeyContactsState & KeyContactsActions;

export type UserDirectoryTabId = "users" | "contacts";

/** GET /users/:id — user detail payload (`data`). */
export interface UserDetailsCorporation {
	legalName: string;
	corporationCode: number;
}

export interface UserDetailsCompany {
	legalName: string;
}

export interface UserDetails {
	cognitoSub: string;
	userCode: number;
	status: string;
	firstName: string;
	lastName: string;
	nickname: string | null;
	email: string;
	workPhone: string | null;
	cellPhone: string | null;
	timezone: string | null;
	createdOn: string;
	corporation: UserDetailsCorporation | null;
	company: UserDetailsCompany | null;
	category: string | null;
	roleName: string | null;
	roleId?: string | null;
	categoryId?: string | null;
	inviteType?: string | null;
}

/** PATCH /users/:id — body accepted by the users API. */
export type PatchUserPayload = {
	status: string;
	firstName: string;
	lastName: string;
	nickname: string;
	workPhone: string;
	cellPhone: string;
	timezone: string;
	roleId?: string;
};

/** Toolbar for user detail view + edit routes (rendered by `ViewUserDetailsPage`). */
export type UserDetailsPageToolbarProps = {
	variant: "view" | "edit";
	user: UserDetails;
	onBack: () => void;
	onEditClick?: () => void;
	onRemoveClick?: () => void;
	onBlockClick?: () => void;
	onUnblockClick?: () => void;
	isBlockActionPending?: boolean;
	isRemoveActionPending?: boolean;
	onCancelInvitationClick?: () => void;
	isCancelInvitationPending?: boolean;
	onResendInviteClick?: () => void;
	isResendInvitePending?: boolean;
};

export type ViewUserTabId = "basic" | "assessments";

export type ViewUserDetailsLocationState = {
	activeTab?: ViewUserTabId;
};

export type ViewUserDetailsContentProps = {
	user: UserDetails;
};

export type EditUserDetailsContentProps = {
	user: UserDetails;
	categoriesWithRoles: RoleCategoryWithRoles[];
	rolesTreeLoading: boolean;
	rolesTreeError: string | null;
	onCancel: () => void;
	onSave: (payload: PatchUserPayload) => Promise<boolean>;
	isSaving: boolean;
	formId?: string;
};

/** Corporation block on GET /key-contacts/:id (includes id for PATCH body). */
export interface KeyContactCorporationDetail {
	id: string;
	legalName: string;
	corporationCode: number;
}

/** Company block on GET /key-contacts/:id (includes id for PATCH body). */
export interface KeyContactCompanyDetail {
	id: string;
	legalName: string;
}

/** GET /key-contacts/:id — key contact detail payload (`data`). */
export interface KeyContactDetails {
	id: string;
	contactCode: number;
	firstName: string | null;
	lastName: string | null;
	nickname: string | null;
	email: string | null;
	workPhone: string | null;
	cellPhone: string | null;
	timezone: string | null;
	contactType: string;
	jobRole: string | null;
	createdOn: string;
	corporation: KeyContactCorporationDetail | null;
	company: KeyContactCompanyDetail | null;
}

/** PATCH /key-contacts/:id */
export type PatchKeyContactPayload = {
	firstName: string;
	lastName: string;
	nickname: string;
	email: string;
	workPhone: string;
	cellPhone: string;
	timezone: string;
	contactType: string;
	jobRole: string;
	corporationId?: string;
	companyId?: string;
};

/** POST /key-contacts — create standalone directory contact. */
export type CreateKeyContactPayload = {
	firstName: string;
	lastName: string;
	email: string;
	workPhone: string;
	contactType: string;
	nickname?: string;
	timezone?: string;
	cellPhone?: string;
	corporationId?: string;
	companyId?: string;
	jobRole?: string;
};

export type ContactDetailsPageToolbarProps = {
	variant: "view" | "edit";
	contact: KeyContactDetails;
	onBack: () => void;
	onEditClick?: () => void;
	onRemoveClick?: () => void;
	canSendInvite?: boolean;
	onSendInviteClick?: () => void;
};

export type ViewContactDetailsContentProps = {
	contact: KeyContactDetails;
};

/** Modal opened from User Directory “Bulk Upload” (shared layout for Users and Contacts tabs). */
export type UserDirectoryBulkUploadModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	activeTab: UserDirectoryTabId;
	onSubmit: (file: File) => Promise<void>;
	isSubmitting: boolean;
	contactBulkImportFailures?: KeyContactBulkImportFailedRow[] | null;
	onClearContactBulkImportFailures?: () => void;
};

export type EditContactDetailsContentProps = {
	contact: KeyContactDetails;
	onCancel: () => void;
	onSave: (payload: PatchKeyContactPayload) => Promise<boolean>;
	isSaving: boolean;
	formId?: string;
};
