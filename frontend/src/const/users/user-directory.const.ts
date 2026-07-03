import type {
	UserDirectoryTabId,
	UserMoreFiltersState,
	UserStatusFilter,
	ViewUserTabId,
} from "@/types";
import { ROUTES } from "../common/routes.const";

/** `inviteType` for POST /users/invite */
export const INVITE_USER_TYPE = {
	assessmentOnly: "Assessment Only",
	bspBlueprint: "BSPBlueprint",
} as const;

/** `userType` stored on `app_users.user_type`. */
export const APP_USER_TYPE = {
	individual: "individual",
} as const;

export const USER_DIRECTORY_PAGE_CONTENT = {
	breadcrumbsTitle: "User Directory",
	title: "User Directory",
	subtitle: "Manage users across overall organization",
	bulkUploadButton: "Bulk Upload",
	inviteUserButton: "Invite User",
	searchAriaLabel: "Search users",
	statusFilterAriaLabel: "Filter by status",
	statusFilterAllLabel: "All Status",
	categoriesFilterAriaLabel: "Filter by categories",
	categoriesFilterAllLabel: "All Categories",
	companiesFilterAriaLabel: "Filter by company",
	companiesFilterAllLabel: "All Companies",
	moreFiltersButton: "Filters",
	noData: "No users found.",
} as const;

/** Bulk upload modal (contacts: POST /key-contacts/bulk; users: POST /users/invite/bulk). */
export const USER_DIRECTORY_BULK_UPLOAD = {
	title: "Bulk Upload",
	noteTitle: "Note",
	noteDescription: "You can download the sample data file.",
	contactTypePresetNote:
		"Contact Type must use the preset values from the sample file.",
	downloadSample: "Download Sample File",
	sampleFileHrefContacts: "/samples/key-contacts-bulk-sample.csv",
	sampleFileHrefUsers: "/samples/users-bulk-sample.csv",
	uploadLabel: "Click to upload or drag-&-drop file",
	uploadHint: "Supported file format is CSV up to 1MB",
	filePickerAriaLabel: "Choose file for bulk upload",
	cancel: "Cancel",
	submit: "Submit",
	submitting: "Submitting…",
	validationUnsupported: "Use a CSV file.",
	validationTooLarge: "File size must be 1MB or less.",
	bulkImportFailedTitle: "Rows not imported",
	bulkImportFailedDescription:
		"Fix the issues below, then upload a corrected CSV file.",
	bulkImportFailedRowColumn: "Row No.",
	bulkImportFailedEmailColumn: "Email",
	bulkImportFailedMessageColumn: "Error Message",
	reuploadButton: "Reupload",
	maxFileSizeBytes: 1024 * 1024,
	fileAccept: ".csv",
	allowedExtensions: [".csv"],
	allowedMimeTypes: ["text/csv", "text/plain", "application/csv"],
} as const;

export const INVITE_USER_PAGE = {
	breadcrumbCurrent: "Invite User",
	title: "Invite User",
	subtitle: "Provide details for the new user with access to the platform.",
	cardBasicInfo: "Basic Info.",
	cardCorporationCompany: "Corporation & Company Info.",
	cardRoleTeam: "Role Info.",
	fieldFirstName: "First Name",
	fieldLastName: "Last Name",
	fieldNickname: "Nickname",
	fieldEmail: "Email",
	fieldWorkPhone: "Work Phone No.",
	fieldCellPhone: "Cell Phone No.",
	fieldTimezone: "Time Zone (Personal)",
	fieldCorporation: "Corporation",
	fieldCompany: "Company",
	fieldCategory: "Category",
	fieldRoleName: "Role Name",
	fieldTeam: "Team",
	fieldTeamManager: "Team Manager",
	cancelButton: "Cancel",
	sendInviteButton: "Send Invite",
	rolesLoadError: "Could not load role categories.",
	noRolesInCategory: "No roles available for this category.",
	errCorporationRequired: "Corporation is required.",
	errCompanyRequired: "Company is required.",
	errCategoryRequired: "Category is required.",
	errRoleRequired: "Role name is required.",
	errEmailInvalid: "Enter a valid email address.",
} as const;

export const USER_DIRECTORY_TABS: {
	id: UserDirectoryTabId;
	label: string;
}[] = [
	{ id: "users", label: "Users" },
	{ id: "contacts", label: "Contacts" },
];

/** Listing tab on `/user-directory` via query string (`users` default when absent). */
export const USER_DIRECTORY_TAB_SEARCH_PARAM = "tab" as const;

export function parseUserDirectoryTabFromSearch(
	params: URLSearchParams,
): UserDirectoryTabId {
	const raw = params.get(USER_DIRECTORY_TAB_SEARCH_PARAM);
	return raw === "contacts" ? "contacts" : "users";
}

/** Value for React Router `navigate({ search })` — no leading `?`. Empty when tab is users. */
export function buildUserDirectoryListingSearch(
	tab: UserDirectoryTabId,
): string {
	if (tab === "users") return "";
	return `${USER_DIRECTORY_TAB_SEARCH_PARAM}=${tab}`;
}

/** Full path to user directory with Contacts tab (contact view/edit back navigation). */
export const CONTACT_DIRECTORY_ROOT_PATH = (() => {
	const search = buildUserDirectoryListingSearch("contacts");
	return search.length > 0
		? `${ROUTES.userDirectory.root}?${search}`
		: ROUTES.userDirectory.root;
})();

/** `navigate()` target for returning to Contacts listing from contact detail/edit. */
export const CONTACT_DIRECTORY_NAV = {
	pathname: ROUTES.userDirectory.root,
	search: buildUserDirectoryListingSearch("contacts"),
} as const;

export const USER_STATUS_FILTER_OPTIONS: ReadonlyArray<{
	value: "all" | UserStatusFilter;
	label: string;
}> = [
	{ value: "all", label: "All Status" },
	{ value: "active", label: "Active" },
	{ value: "pending", label: "Pending" },
	{ value: "expired", label: "Expired" },
	{ value: "blocked", label: "Blocked" },
	{ value: "cancelled", label: "Cancelled" },
];

export const USER_TABLE_HEADERS = {
	userCode: "User ID",
	userName: "User Name",
	status: "Status",
	corporation: "Corporation",
	company: "Company",
	roleName: "Role Name",
	category: "Category",
	workPhone: "Work Phone No.",
	timeZone: "Time Zone",
	createdOn: "Created On",
	actions: "Actions",
} as const;

export const CONTACT_TABLE_HEADERS = {
	contactCode: "Contact ID",
	name: "Contact Name",
	corporationName: "Corporation",
	companyName: "Company",
	contactType: "Contact Type",
	jobRole: "Job Role",
	workPhone: "Work Phone No.",
	timezone: "Time Zone",
	createdAt: "Created On",
	actions: "Actions",
} as const;

export const CONTACT_ACTION_LABELS = {
	edit: "Edit",
	sendInvite: "Send Invite",
	removeContact: "Remove Contact",
} as const;

/** Shown when Send Invite is disabled (contact has no corporation/company on record). */
export const CONTACT_SEND_INVITE_REQUIRES_CORP_AND_COMPANY_TOOLTIP =
	"You can only invite contacts that already have a corporation and company." as const;

export const CONTACT_DIRECTORY_PAGE_CONTENT = {
	addContactButton: "Add Contact",
	contactTypesFilterAriaLabel: "Filter by contact type",
	contactTypesFilterAllLabel: "All Contact Types",
	noData: "No contacts found.",
} as const;

/** `contactType` options for GET /key-contacts?contactType=. */
export const CONTACT_TYPE_FILTER_OPTIONS = [
	{ value: "all", label: "All Contact Types" },
	{ value: "exec_sponsor", label: "Executive Sponsor" },
	{ value: "budget_owner", label: "Budget Owner" },
	{ value: "primary_contact", label: "Primary Contact" },
	{ value: "implementation_lead", label: "Implementation Lead" },
	{ value: "project_manager", label: "Project Manager" },
	{ value: "technical_it_lead", label: "Technical / IT Lead" },
	{ value: "platform_administrator", label: "Platform Administrator" },
	{ value: "hr_program_owner", label: "HR / Program Owner" },
	{ value: "training_coordinator", label: "Training Coordinator" },
	{ value: "finance_billing_contact", label: "Finance / Billing Contact" },
	{ value: "legal_compliance_contact", label: "Legal / Compliance Contact" },
	{ value: "power_user_champion", label: "Power User / Champion" },
	{
		value: "behavioral_assessment_administrator",
		label: "Behavioral Assessment Administrator",
	},
	{ value: "team_leader_manager", label: "Team Leader / Manager" },
	{
		value: "culture_leadership_program_owner",
		label: "Culture / Leadership Program Owner",
	},
	{
		value: "hr_talent_development_owner",
		label: "HR / Talent Development Owner",
	},
] as const;

export const EMPTY_MORE_FILTERS: UserMoreFiltersState = {
	corporationIds: [],
	companyIds: [],
	timeZones: [],
};

export const MORE_FILTERS_CONTENT = {
	title: "More Filters",
	corporationLabel: "Corporation",
	companyLabel: "Company",
	timeZoneLabel: "Time Zone",
	clearAllButton: "Clear All",
	cancelButton: "Cancel",
	applyFiltersButton: "Apply Filters",
} as const;

export const MORE_FILTERS_TIMEZONE_OPTIONS = [
	{ value: "EST (Eastern Time)", label: "EST (Eastern Time)" },
	{ value: "CST (Central Time)", label: "CST (Central Time)" },
	{ value: "MST (Mountain Time)", label: "MST (Mountain Time)" },
	{ value: "PST (Pacific Time)", label: "PST (Pacific Time)" },
	{ value: "AKST (Alaska Time)", label: "AKST (Alaska Time)" },
	{ value: "HST (Hawaii Time)", label: "HST (Hawaii Time)" },
] as const;

export const USER_BLOCK_TOAST = {
	blocked: "User blocked successfully.",
	unblocked: "User unblocked successfully.",
} as const;

/** Block / unblock confirmation  */
export const USER_BLOCK_CONFIRM_DIALOG = {
	blockTitle: "Block user?",
	blockDescription: "This user will not be able to sign in.",
	blockConfirm: "Block",
	unblockTitle: "Unblock user?",
	unblockDescription: "This user will be able to sign in again.",
	unblockConfirm: "Unblock",
	cancel: "Cancel",
} as const;

/** Seeded role names; must match backend `roles.name`. */
export const CORPORATION_ADMIN_ROLE_NAME = "Corporation Admin" as const;
export const COMPANY_ADMIN_ROLE_NAME = "Company Admin" as const;

export const USER_REMOVE_TOAST = {
	removed: "User removed successfully.",
	corpCompanyAdminBlocked:
		"Corporation Admin and Company Admin users cannot be removed from the user directory.",
} as const;

export const USER_INVITE_TOAST = {
	cancelled: "Invitation canceled.",
	resent: "Invitation resent successfully.",
} as const;

export const USER_CANCEL_INVITE_CONFIRM_DIALOG = {
	title: "Cancel invitation?",
	description:
		"This will expire the pending invitation. The user will need a new invite to join.",
	confirm: "Cancel invitation",
	cancel: "Cancel",
} as const;

export const USER_RESEND_INVITE_CONFIRM_DIALOG = {
	title: "Resend invitation?",
	description:
		"A new invitation email will be sent to this user at their registered address.",
	confirm: "Resend invitation",
	cancel: "Cancel",
} as const;

export const USER_REMOVE_CONFIRM_DIALOG = {
	title: "Remove user?",
	description:
		"This will permanently remove this user from the directory. This action cannot be undone.",
	confirm: "Remove",
	cancel: "Cancel",
} as const;

export const CONTACT_REMOVE_CONFIRM_DIALOG = {
	title: "Remove user?",
	contactTypeFallback: "contact",
	confirm: "Remove",
	cancel: "Cancel",
} as const;

/** Contact remove modal body; `contactType` is the display label from the API. */
export function contactRemoveConfirmDescription(contactType: string): string {
	const label =
		contactType.trim() || CONTACT_REMOVE_CONFIRM_DIALOG.contactTypeFallback;
	return `This will remove the ${label} from the directory. This action cannot be undone.`;
}

export const USER_ACTION_LABELS = {
	edit: "Edit",
	blockUser: "Block User",
	unblockUser: "Unblock User",
	resendInvite: "Resend Invite",
	cancelInvitation: "Cancel Invitation",
	removeUser: "Remove User",
} as const;

export const SEND_INVITE_DIALOG_CONTENT = {
	title: "Send Invite",
	description: "This action will send an invitation to this contact.",
	sendInviteButton: "Send Invite",
	cancelButton: "Cancel",
} as const;

/** Role category names excluded from the contact send-invite category list. */
export const SEND_INVITE_CONTACT_EXCLUDED_ROLE_CATEGORY_NAMES = [
	"Corporation Admin",
	"Company Admin",
] as const;

/** Set lookup for excluded role categories (invite + user edit category pickers). */
export const INVITE_EXCLUDED_CATEGORY_NAME_SET = new Set<string>([
	...SEND_INVITE_CONTACT_EXCLUDED_ROLE_CATEGORY_NAMES,
]);

const VIEW_DIRECTORY_DETAIL_SHARED = {
	backButton: "Back",
	cardBasicInfo: "Basic Info.",
	cardCorporationCompany: "Corporation & Company Info.",
	cardRoleTeam: "Role Info.",
	fieldFullName: "Full Name",
	fieldNickname: "Nickname",
	fieldEmail: "Email",
	fieldWorkPhone: "Work Phone No.",
	fieldCellPhone: "Cell Phone No.",
	fieldTimezone: "Time Zone (Personal)",
	fieldCreatedOn: "Created On",
	fieldCorporation: "Corporation",
	fieldCompany: "Company",
	fieldTeam: "Team",
	fieldTeamManagement: "Team Management",
	nicknameEmptyDisplay: "N/A",
} as const;

export const VIEW_USER_TABS: { id: ViewUserTabId; label: string }[] = [
	{ id: "basic", label: "Basic Details" },
	{ id: "assessments", label: "Assessments & Results" },
];

export const VIEW_USER_DETAILS_PAGE = {
	...VIEW_DIRECTORY_DETAIL_SHARED,
	breadcrumbViewDetails: "View User Details",
	tabNavAriaLabel: "User detail sections",
	removeUserButton: "Remove",
	cancelInvitationButton: "Cancel Invitation",
	resendInviteButton: "Resend Invite",
	blockUserButton: "Block",
	unblockUserButton: "Unblock User",
	editUserButton: "Edit User",
	notFound: "User not found or could not be loaded.",
	fieldUserId: "User ID",
	fieldStatus: "Status",
	fieldCategory: "Category",
	fieldRoleName: "Role Name",
} as const;

/** PATCH /users/:id uses capitalized status labels (e.g. Active). */
export const EDIT_USER_STATUS_OPTIONS = [
	{ value: "Active", label: "Active" },
	{ value: "Blocked", label: "Blocked" },
	{ value: "Pending", label: "Pending" },
	{ value: "Expired", label: "Expired" },
] as const;

export const EDIT_USER_PAGE = {
	...VIEW_DIRECTORY_DETAIL_SHARED,
	breadcrumbEdit: "Edit User Details",
	formTitle: "Edit User Details",
	subtitle: "Update the invited user details as per the requirements.",
	cancelButton: "Cancel",
	saveButton: "Save & Update",
	saveSuccess: "User updated successfully.",
	rolesLoadError: "Could not load role categories.",
	noRolesInCategory: "No roles available for this category.",
	fieldStatus: "Status",
	fieldCategory: "Category",
	fieldRoleName: "Role Name",
	fieldFirstName: "First Name",
	fieldLastName: "Last Name",
	fieldUserId: "User ID",
	errStatusRequired: "Status is required.",
	errFirstNameRequired: "First name is required.",
	errLastNameRequired: "Last name is required.",
	errWorkPhoneRequired: "Work phone is required.",
	errTimezoneRequired: "Time zone is required.",
	errCategoryRequired: "Category is required.",
	errRoleRequired: "Role is required.",
	errRoleInvalid: "Select a valid role.",
} as const;

export const VIEW_CONTACT_DETAILS_PAGE = {
	...VIEW_DIRECTORY_DETAIL_SHARED,
	breadcrumbViewDetails: "View Contact Details",
	removeContactButton: "Remove",
	editContactButton: "Edit Contact",
	sendInviteButton: SEND_INVITE_DIALOG_CONTENT.sendInviteButton,
	notFound: "Contact not found or could not be loaded.",
	fieldContactId: "Contact ID",
	fieldContactType: "Contact Type",
	fieldJobRole: "Job Role",
} as const;

export const EDIT_CONTACT_SAVE_ACK_DIALOG = {
	title: "Key Contact Updated",
	description:
		"You've updated the key contact details successfully. It'll reflect everywhere within the system.",
	confirm: "Okay, Understood",
} as const;

export const EDIT_CONTACT_PAGE = {
	...VIEW_DIRECTORY_DETAIL_SHARED,
	breadcrumbEdit: "Edit Contact Details",
	formTitle: "Edit Contact Details",
	subtitle: "Update the key contact details as required.",
	cancelButton: "Cancel",
	saveButton: "Save & Update",
	fieldFirstName: "First Name",
	fieldLastName: "Last Name",
	fieldContactType: "Contact Type",
	fieldJobRole: "Job Role",
	errFirstNameRequired: "First name is required.",
	errLastNameRequired: "Last name is required.",
	errEmailRequired: "Email is required.",
	errEmailInvalid: "Enter a valid email address.",
	errWorkPhoneRequired: "Work phone is required.",
	errTimezoneRequired: "Time zone is required.",
	errContactTypeRequired: "Contact type is required.",
} as const;

export const ADD_CONTACT_PAGE = {
	...VIEW_DIRECTORY_DETAIL_SHARED,
	breadcrumbCurrent: "Add Contact",
	title: "Add Contact",
	subtitle: "Provide the contact details to add them to the directory.",
	noteTitle: "Note",
	noteBody:
		"The contact will be added to the directory only. No invitation will be sent.",
	fieldFirstName: EDIT_CONTACT_PAGE.fieldFirstName,
	fieldLastName: EDIT_CONTACT_PAGE.fieldLastName,
	fieldContactType: EDIT_CONTACT_PAGE.fieldContactType,
	fieldJobRole: EDIT_CONTACT_PAGE.fieldJobRole,
	fieldTeamManager: "Team Manager",
	teamSelectAriaLabel: "Team",
	cancelButton: "Cancel",
	addContactSubmitButton: "Add Contact",
} as const;
