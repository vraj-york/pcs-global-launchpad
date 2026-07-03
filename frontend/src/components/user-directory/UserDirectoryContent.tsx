import {
	Ban,
	CheckCircle,
	Filter,
	PlusIcon,
	Redo2,
	Search,
	Send,
	Trash2,
	Upload,
	XOctagon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
	getActiveCompanies,
	getCorporationsList,
	getRoleCategories,
} from "@/api";
import {
	BulkUploadDirectoryModal,
	ConfirmationModal,
	DataTable,
	MoreFiltersDialog,
	PermissionGate,
	SendInviteContactDialog,
	TableSkeleton,
	WhiteBox,
} from "@/components";
import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	buildUserDirectoryListingSearch,
	COMPANY_ADMIN_ROLE_NAME,
	CONTACT_DIRECTORY_PAGE_CONTENT,
	CONTACT_REMOVE_CONFIRM_DIALOG,
	CONTACT_TYPE_FILTER_OPTIONS,
	CORPORATION_ADMIN_ROLE_NAME,
	contactRemoveConfirmDescription,
	DATA_TABLE_CONFIG,
	EMPTY_MORE_FILTERS,
	FORM_PLACEHOLDERS,
	parseUserDirectoryTabFromSearch,
	ROUTES,
	SUBMODULE_KEYS,
	USER_BLOCK_CONFIRM_DIALOG,
	USER_CANCEL_INVITE_CONFIRM_DIALOG,
	USER_DIRECTORY_PAGE_CONTENT,
	USER_DIRECTORY_TAB_SEARCH_PARAM,
	USER_DIRECTORY_TABS,
	USER_REMOVE_CONFIRM_DIALOG,
	USER_REMOVE_TOAST,
	USER_RESEND_INVITE_CONFIRM_DIALOG,
	USER_STATUS_FILTER_OPTIONS,
} from "@/const";
import { useDebounce, usePermissions, useUserRoles } from "@/hooks";
import { cn } from "@/lib/utils";
import { useKeyContactsStore, useUsersStore } from "@/store";
import { getContactDirectoryColumns, getUserDirectoryColumns } from "@/tables";
import type {
	ContactDirectoryItem,
	KeyContactApiSortBy,
	KeyContactBulkImportFailedRow,
	RoleCategoryOption,
	UserApiSortBy,
	UserDirectoryFilterOption,
	UserDirectoryListItem,
	UserDirectoryTabId,
	UserMoreFiltersState,
	UserStatusFilter,
} from "@/types";

const PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;

export function UserDirectoryContent() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const [activeTab, setActiveTab] = useState<UserDirectoryTabId>(() =>
		parseUserDirectoryTabFromSearch(searchParams),
	);
	const [moreFilters, setMoreFilters] = useState<UserMoreFiltersState>(() => ({
		...EMPTY_MORE_FILTERS,
	}));
	const [contactMoreFilters, setContactMoreFilters] =
		useState<UserMoreFiltersState>(() => ({ ...EMPTY_MORE_FILTERS }));
	const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
	const [contactMoreFiltersOpen, setContactMoreFiltersOpen] = useState(false);
	const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
	const [contactBulkImportFailures, setContactBulkImportFailures] = useState<
		KeyContactBulkImportFailedRow[] | null
	>(null);
	const [sendInviteOpen, setSendInviteOpen] = useState(false);
	const [sendInviteContact, setSendInviteContact] =
		useState<ContactDirectoryItem | null>(null);
	const [contactToRemove, setContactToRemove] =
		useState<ContactDirectoryItem | null>(null);
	const [userBlockDialog, setUserBlockDialog] = useState<{
		row: UserDirectoryListItem;
		mode: "block" | "unblock";
	} | null>(null);
	const [userToRemove, setUserToRemove] =
		useState<UserDirectoryListItem | null>(null);
	const [userToCancelInvite, setUserToCancelInvite] =
		useState<UserDirectoryListItem | null>(null);
	const [userToResendInvite, setUserToResendInvite] =
		useState<UserDirectoryListItem | null>(null);
	const [roleCategories, setRoleCategories] = useState<RoleCategoryOption[]>(
		[],
	);
	const [roleCategoriesLoading, setRoleCategoriesLoading] = useState(false);
	const [
		corporationOptionsForMoreFilters,
		setCorporationOptionsForMoreFilters,
	] = useState<UserDirectoryFilterOption[]>([]);
	const [
		corporationsForMoreFiltersLoading,
		setCorporationsForMoreFiltersLoading,
	] = useState(false);
	const [companiesForMoreFilters, setCompaniesForMoreFilters] = useState<
		UserDirectoryFilterOption[]
	>([]);
	const [companiesForMoreFiltersLoading, setCompaniesForMoreFiltersLoading] =
		useState(false);
	// Top-level "All Companies" quick filter (users tab). `undefined` = all companies.
	const [listCompanyFilter, setListCompanyFilter] = useState<
		string | undefined
	>(undefined);

	const {
		listItems,
		listTotal,
		listPage,
		listLoading,
		listSortBy,
		listSortOrder,
		listStatusFilter,
		listCategoryIdFilter,
		listSearch,
		fetchUsers,
		blockUser,
		isBlockConfirming,
		removeUser,
		isRemoveConfirming,
		cancelUserInvitation,
		isCancelInviteConfirming,
		resendUserInvitation,
		isResendInviteConfirming,
		bulkInviteUsers,
		isBulkInviteUsersSubmitting,
		setListPage,
		setListSort,
		setListStatusFilter,
		setListCategoryIdFilter,
		setListSearch,
	} = useUsersStore();

	const {
		listItems: contactListItems,
		listTotal: contactListTotal,
		listPage: contactListPage,
		listLoading: contactsListLoading,
		listSortBy: contactListSortBy,
		listSortOrder: contactListSortOrder,
		listSearch: contactListSearch,
		listContactTypeFilter,
		fetchKeyContacts,
		sendKeyContactInvite,
		isSendKeyContactInviteSubmitting,
		deleteKeyContact,
		isDeleteKeyContactSubmitting,
		bulkUploadKeyContacts,
		isBulkUploadKeyContactsSubmitting,
		setListPage: setContactListPage,
		setListSort: setContactListSort,
		setListSearch: setContactListSearch,
		setListContactTypeFilter,
		reset: resetKeyContactsStore,
	} = useKeyContactsStore();

	const userFiltersBusy =
		corporationsForMoreFiltersLoading ||
		roleCategoriesLoading ||
		companiesForMoreFiltersLoading;

	const {
		isSuperAdmin,
		isCorporationAdmin,
		ready: groupsReady,
	} = useUserRoles();
	const { can } = usePermissions();
	const userDirectoryPermissions = useMemo(
		() => ({
			canView: can(SUBMODULE_KEYS.USER_DIRECTORY_VIEW),
			canEdit: can(SUBMODULE_KEYS.USER_DIRECTORY_EDIT),
			canBlock: can(SUBMODULE_KEYS.USER_DIRECTORY_BLOCK),
			canRemove: can(SUBMODULE_KEYS.USER_DIRECTORY_REMOVE),
			canResendInvite: can(SUBMODULE_KEYS.USER_DIRECTORY_RESEND_INVITE),
			canCancelInvitation: can(SUBMODULE_KEYS.USER_DIRECTORY_CANCEL_INVITATION),
		}),
		[can],
	);
	const contactDirectoryPermissions = useMemo(
		() => ({
			canView: can(SUBMODULE_KEYS.USER_DIRECTORY_VIEW),
			canInvite: can(SUBMODULE_KEYS.USER_DIRECTORY_INVITE),
			canEdit: can(SUBMODULE_KEYS.USER_DIRECTORY_EDIT_CONTACT),
			canRemove: can(SUBMODULE_KEYS.USER_DIRECTORY_REMOVE_CONTACT),
		}),
		[can],
	);
	const showMoreFiltersCorporation = isSuperAdmin;
	const showMoreFiltersCompany = isSuperAdmin || isCorporationAdmin;

	const resolveMoreFiltersForApi = useCallback(
		(filters: UserMoreFiltersState): UserMoreFiltersState => ({
			corporationIds: showMoreFiltersCorporation ? filters.corporationIds : [],
			companyIds: showMoreFiltersCompany ? filters.companyIds : [],
			timeZones: filters.timeZones,
		}),
		[showMoreFiltersCorporation, showMoreFiltersCompany],
	);

	const appliedUserMoreFilters = useMemo(
		() => resolveMoreFiltersForApi(moreFilters),
		[moreFilters, resolveMoreFiltersForApi],
	);

	const appliedContactMoreFilters = useMemo(
		() => resolveMoreFiltersForApi(contactMoreFilters),
		[contactMoreFilters, resolveMoreFiltersForApi],
	);

	const isContactsTab = activeTab === "contacts";

	useEffect(() => {
		setActiveTab(parseUserDirectoryTabFromSearch(searchParams));
	}, [searchParams]);

	const debouncedUserSearch = useDebounce(listSearch.trim());
	const searchForUsersApi =
		debouncedUserSearch.length >= 3 || debouncedUserSearch === ""
			? debouncedUserSearch
			: "";

	const moreFiltersAppliedCount = useMemo(() => {
		let count = 0;
		if (appliedUserMoreFilters.corporationIds.length > 0) count++;
		if (appliedUserMoreFilters.companyIds.length > 0) count++;
		if (appliedUserMoreFilters.timeZones.length > 0) count++;
		return count;
	}, [appliedUserMoreFilters]);

	const debouncedContactSearch = useDebounce(contactListSearch.trim());
	const searchForContactsApi =
		debouncedContactSearch.length >= 3 || debouncedContactSearch === ""
			? debouncedContactSearch
			: "";

	const contactMoreFiltersAppliedCount = useMemo(() => {
		let count = 0;
		if (appliedContactMoreFilters.corporationIds.length > 0) count++;
		if (appliedContactMoreFilters.companyIds.length > 0) count++;
		if (appliedContactMoreFilters.timeZones.length > 0) count++;
		return count;
	}, [appliedContactMoreFilters]);

	useEffect(() => {
		if (!groupsReady) return;

		if (!showMoreFiltersCorporation) {
			setCorporationOptionsForMoreFilters([]);
			setCorporationsForMoreFiltersLoading(false);
			return;
		}

		let cancelled = false;
		setCorporationsForMoreFiltersLoading(true);
		void getCorporationsList().then((result) => {
			if (cancelled) return;
			setCorporationsForMoreFiltersLoading(false);
			if (!result.ok) {
				toast.error(result.message);
				return;
			}
			setCorporationOptionsForMoreFilters(
				result.data.map((c) => ({ id: c.id, label: c.legalName })),
			);
		});
		return () => {
			cancelled = true;
		};
	}, [groupsReady, showMoreFiltersCorporation]);

	useEffect(() => {
		let cancelled = false;
		setRoleCategoriesLoading(true);
		void getRoleCategories().then((result) => {
			if (cancelled) return;
			setRoleCategoriesLoading(false);
			if (!result.ok) {
				toast.error(result.message);
				return;
			}
			if (result.data) setRoleCategories(result.data);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!groupsReady) return;

		if (!showMoreFiltersCompany) {
			setCompaniesForMoreFilters([]);
			setCompaniesForMoreFiltersLoading(false);
			return;
		}

		let cancelled = false;
		setCompaniesForMoreFiltersLoading(true);
		void getActiveCompanies().then((result) => {
			if (cancelled) return;
			setCompaniesForMoreFiltersLoading(false);
			if (!result.ok) {
				toast.error(result.message);
				return;
			}
			setCompaniesForMoreFilters(
				result.data.map((c) => ({ id: c.id, label: c.legalName })),
			);
		});
		return () => {
			cancelled = true;
		};
	}, [groupsReady, showMoreFiltersCompany]);

	const lastFetched = useRef<{
		page: number;
		limit: number;
		sortBy: string;
		sortOrder: string;
		status: string | undefined;
		categoryId: string | undefined;
		corpIds: string;
		compIds: string;
		tzs: string;
		search: string;
	} | null>(null);

	const lastFetchedContacts = useRef<{
		page: number;
		limit: number;
		sortBy: string;
		sortOrder: string;
		contactType: string | undefined;
		corpIds: string;
		compIds: string;
		tzs: string;
		search: string;
	} | null>(null);

	useEffect(() => {
		if (isContactsTab) return;
		// The top-level company quick filter takes precedence over the
		// multi-select company filter from the "Filters" dialog when set.
		const effectiveCompanyIds =
			showMoreFiltersCompany && listCompanyFilter
				? [listCompanyFilter]
				: appliedUserMoreFilters.companyIds;
		const corpKey = [...appliedUserMoreFilters.corporationIds].sort().join(",");
		const compKey = [...effectiveCompanyIds].sort().join(",");
		const tzKey = [...appliedUserMoreFilters.timeZones].sort().join(",");
		const key = {
			page: listPage,
			limit: PAGE_SIZE,
			sortBy: listSortBy,
			sortOrder: listSortOrder,
			status: listStatusFilter,
			categoryId: listCategoryIdFilter,
			corpIds: corpKey,
			compIds: compKey,
			tzs: tzKey,
			search: searchForUsersApi,
		};
		if (
			lastFetched.current?.page === key.page &&
			lastFetched.current?.limit === key.limit &&
			lastFetched.current?.sortBy === key.sortBy &&
			lastFetched.current?.sortOrder === key.sortOrder &&
			lastFetched.current?.status === key.status &&
			lastFetched.current?.categoryId === key.categoryId &&
			lastFetched.current?.corpIds === key.corpIds &&
			lastFetched.current?.compIds === key.compIds &&
			lastFetched.current?.tzs === key.tzs &&
			lastFetched.current?.search === key.search
		) {
			return;
		}
		lastFetched.current = key;
		void fetchUsers(listPage, PAGE_SIZE, {
			search: searchForUsersApi || undefined,
			sortBy: listSortBy,
			sortOrder: listSortOrder,
			status: listStatusFilter,
			categoryId: listCategoryIdFilter,
			corporationIds:
				appliedUserMoreFilters.corporationIds.length > 0
					? appliedUserMoreFilters.corporationIds
					: undefined,
			companyIds:
				effectiveCompanyIds.length > 0 ? effectiveCompanyIds : undefined,
			timezones:
				appliedUserMoreFilters.timeZones.length > 0
					? appliedUserMoreFilters.timeZones
					: undefined,
		});
	}, [
		isContactsTab,
		listPage,
		listSortBy,
		listSortOrder,
		listStatusFilter,
		listCategoryIdFilter,
		listCompanyFilter,
		showMoreFiltersCompany,
		appliedUserMoreFilters.corporationIds,
		appliedUserMoreFilters.companyIds,
		appliedUserMoreFilters.timeZones,
		searchForUsersApi,
		fetchUsers,
	]);

	useEffect(() => {
		if (isContactsTab) return;
		setListPage(1);
	}, [isContactsTab, searchForUsersApi, setListPage]);

	useEffect(() => {
		if (!isContactsTab) return;
		const corpKey = [...appliedContactMoreFilters.corporationIds]
			.sort()
			.join(",");
		const compKey = [...appliedContactMoreFilters.companyIds].sort().join(",");
		const tzKey = [...appliedContactMoreFilters.timeZones].sort().join(",");
		const key = {
			page: contactListPage,
			limit: PAGE_SIZE,
			sortBy: contactListSortBy,
			sortOrder: contactListSortOrder,
			contactType: listContactTypeFilter,
			corpIds: corpKey,
			compIds: compKey,
			tzs: tzKey,
			search: searchForContactsApi,
		};
		if (
			lastFetchedContacts.current?.page === key.page &&
			lastFetchedContacts.current?.limit === key.limit &&
			lastFetchedContacts.current?.sortBy === key.sortBy &&
			lastFetchedContacts.current?.sortOrder === key.sortOrder &&
			lastFetchedContacts.current?.contactType === key.contactType &&
			lastFetchedContacts.current?.corpIds === key.corpIds &&
			lastFetchedContacts.current?.compIds === key.compIds &&
			lastFetchedContacts.current?.tzs === key.tzs &&
			lastFetchedContacts.current?.search === key.search
		) {
			return;
		}
		lastFetchedContacts.current = key;
		void fetchKeyContacts(contactListPage, PAGE_SIZE, {
			search: searchForContactsApi || undefined,
			sortBy: contactListSortBy,
			sortOrder: contactListSortOrder,
			contactType: listContactTypeFilter,
			corporationIds:
				appliedContactMoreFilters.corporationIds.length > 0
					? appliedContactMoreFilters.corporationIds
					: undefined,
			companyIds:
				appliedContactMoreFilters.companyIds.length > 0
					? appliedContactMoreFilters.companyIds
					: undefined,
			timezones:
				appliedContactMoreFilters.timeZones.length > 0
					? appliedContactMoreFilters.timeZones
					: undefined,
		});
	}, [
		isContactsTab,
		contactListPage,
		contactListSortBy,
		contactListSortOrder,
		listContactTypeFilter,
		appliedContactMoreFilters.corporationIds,
		appliedContactMoreFilters.companyIds,
		appliedContactMoreFilters.timeZones,
		searchForContactsApi,
		fetchKeyContacts,
	]);

	useEffect(() => {
		if (!isContactsTab) return;
		setContactListPage(1);
	}, [isContactsTab, searchForContactsApi, setContactListPage]);

	const userPageIndex = listPage - 1;
	const contactPageIndex = contactListPage - 1;

	const handleSort = useCallback(
		(columnId: string) => {
			if (columnId === "actions") return;
			const sortBy = columnId as UserApiSortBy;
			const nextOrder =
				listSortBy === sortBy && listSortOrder === "asc" ? "desc" : "asc";
			setListSort(sortBy, nextOrder);
			setListPage(1);
		},
		[listSortBy, listSortOrder, setListSort, setListPage],
	);

	const handleContactSort = useCallback(
		(columnId: string) => {
			if (columnId === "actions") return;
			const sortBy = columnId as KeyContactApiSortBy;
			const nextOrder =
				contactListSortBy === sortBy && contactListSortOrder === "asc"
					? "desc"
					: "asc";
			setContactListSort(sortBy, nextOrder);
			setContactListPage(1);
		},
		[
			contactListSortBy,
			contactListSortOrder,
			setContactListSort,
			setContactListPage,
		],
	);

	const handleViewClick = useCallback(
		(row: UserDirectoryListItem) => {
			navigate(ROUTES.userDirectory.viewWithIdPath(row.id));
		},
		[navigate],
	);
	const handleEditClick = useCallback(
		(row: UserDirectoryListItem) => {
			navigate(ROUTES.userDirectory.editWithIdPath(row.id));
		},
		[navigate],
	);

	const refetchUsersList = useCallback(() => {
		return fetchUsers(listPage, PAGE_SIZE, {
			search: searchForUsersApi || undefined,
			sortBy: listSortBy,
			sortOrder: listSortOrder,
			status: listStatusFilter,
			categoryId: listCategoryIdFilter,
			corporationIds:
				appliedUserMoreFilters.corporationIds.length > 0
					? appliedUserMoreFilters.corporationIds
					: undefined,
			companyIds:
				appliedUserMoreFilters.companyIds.length > 0
					? appliedUserMoreFilters.companyIds
					: undefined,
			timezones:
				appliedUserMoreFilters.timeZones.length > 0
					? appliedUserMoreFilters.timeZones
					: undefined,
		});
	}, [
		fetchUsers,
		listPage,
		listSortBy,
		listSortOrder,
		listStatusFilter,
		listCategoryIdFilter,
		appliedUserMoreFilters.corporationIds,
		appliedUserMoreFilters.companyIds,
		appliedUserMoreFilters.timeZones,
		searchForUsersApi,
	]);

	const handleBlockClick = useCallback((row: UserDirectoryListItem) => {
		setUserBlockDialog({ row, mode: "block" });
	}, []);

	const handleUnblockClick = useCallback((row: UserDirectoryListItem) => {
		setUserBlockDialog({ row, mode: "unblock" });
	}, []);

	const handleConfirmUserBlock = useCallback(async () => {
		if (!userBlockDialog) return;
		const { row, mode } = userBlockDialog;
		const ok = await blockUser(row.id, mode === "block");
		if (ok) {
			refetchUsersList();
			setUserBlockDialog(null);
		}
	}, [userBlockDialog, blockUser, refetchUsersList]);
	const handleResendInviteClick = useCallback((row: UserDirectoryListItem) => {
		setUserToResendInvite(row);
	}, []);
	const handleCancelInvitationClick = useCallback(
		(row: UserDirectoryListItem) => {
			setUserToCancelInvite(row);
		},
		[],
	);

	const handleConfirmCancelInvite = useCallback(async () => {
		if (!userToCancelInvite) return;
		const ok = await cancelUserInvitation(userToCancelInvite.id);
		if (ok) {
			refetchUsersList();
			setUserToCancelInvite(null);
		}
	}, [userToCancelInvite, cancelUserInvitation, refetchUsersList]);

	const handleConfirmResendInvite = useCallback(async () => {
		if (!userToResendInvite) return;
		const ok = await resendUserInvitation(userToResendInvite.id);
		if (ok) {
			refetchUsersList();
			setUserToResendInvite(null);
		}
	}, [userToResendInvite, resendUserInvitation, refetchUsersList]);

	const handleRemoveClick = useCallback((row: UserDirectoryListItem) => {
		const roleName = row.roleName?.trim();
		const categoryName = row.categoryName?.trim();
		if (
			roleName === CORPORATION_ADMIN_ROLE_NAME ||
			roleName === COMPANY_ADMIN_ROLE_NAME ||
			categoryName === CORPORATION_ADMIN_ROLE_NAME ||
			categoryName === COMPANY_ADMIN_ROLE_NAME
		) {
			toast.error(USER_REMOVE_TOAST.corpCompanyAdminBlocked);
			return;
		}
		setUserToRemove(row);
	}, []);

	const handleConfirmRemoveUser = useCallback(async () => {
		if (!userToRemove) return;
		const ok = await removeUser(userToRemove.id);
		if (ok) {
			refetchUsersList();
			setUserToRemove(null);
		}
	}, [userToRemove, removeUser, refetchUsersList]);

	const handleContactViewClick = useCallback(
		(row: ContactDirectoryItem) => {
			navigate(ROUTES.userDirectory.contactViewWithIdPath(row.id));
		},
		[navigate],
	);
	const handleContactEditClick = useCallback(
		(row: ContactDirectoryItem) => {
			navigate(ROUTES.userDirectory.contactEditWithIdPath(row.id));
		},
		[navigate],
	);
	const handleContactSendInviteClick = useCallback(
		(row: ContactDirectoryItem) => {
			if (!row.corporationName?.trim() || !row.companyName?.trim()) {
				return;
			}
			setSendInviteContact(row);
			setSendInviteOpen(true);
		},
		[],
	);
	const handleContactRemoveClick = useCallback((row: ContactDirectoryItem) => {
		setContactToRemove(row);
	}, []);

	const handleConfirmRemoveContact = useCallback(async () => {
		if (!contactToRemove) return;
		const ok = await deleteKeyContact(contactToRemove.id);
		if (ok) setContactToRemove(null);
	}, [contactToRemove, deleteKeyContact]);

	const userColumns = useMemo(
		() =>
			getUserDirectoryColumns({
				onViewClick: handleViewClick,
				onEditClick: handleEditClick,
				onBlockClick: handleBlockClick,
				onUnblockClick: handleUnblockClick,
				onResendInviteClick: handleResendInviteClick,
				onCancelInvitationClick: handleCancelInvitationClick,
				onRemoveClick: handleRemoveClick,
				permissions: userDirectoryPermissions,
			}),
		[
			handleViewClick,
			handleEditClick,
			handleBlockClick,
			handleUnblockClick,
			handleResendInviteClick,
			handleCancelInvitationClick,
			handleRemoveClick,
			userDirectoryPermissions,
		],
	);

	const contactColumns = useMemo(
		() =>
			getContactDirectoryColumns({
				onViewClick: handleContactViewClick,
				onEditClick: handleContactEditClick,
				onSendInviteClick: handleContactSendInviteClick,
				onRemoveClick: handleContactRemoveClick,
				permissions: contactDirectoryPermissions,
			}),
		[
			handleContactViewClick,
			handleContactEditClick,
			handleContactSendInviteClick,
			handleContactRemoveClick,
			contactDirectoryPermissions,
		],
	);

	const handleTabChange = useCallback(
		(tabId: UserDirectoryTabId) => {
			setActiveTab(tabId);
			setListSearch("");
			setListStatusFilter(undefined);
			setListCategoryIdFilter(undefined);
			setListCompanyFilter(undefined);
			setMoreFilters({ ...EMPTY_MORE_FILTERS });
			setContactMoreFilters({ ...EMPTY_MORE_FILTERS });
			setListPage(1);
			lastFetched.current = null;
			resetKeyContactsStore();
			lastFetchedContacts.current = null;
			setContactMoreFiltersOpen(false);
			setMoreFiltersOpen(false);
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					if (tabId === "users") {
						next.delete(USER_DIRECTORY_TAB_SEARCH_PARAM);
					} else {
						next.set(USER_DIRECTORY_TAB_SEARCH_PARAM, tabId);
					}
					return next;
				},
				{ replace: true },
			);
		},
		[
			setListSearch,
			setListStatusFilter,
			setListCategoryIdFilter,
			setMoreFilters,
			setContactMoreFilters,
			setListPage,
			resetKeyContactsStore,
			setSearchParams,
		],
	);

	const handleApplyMoreFilters = useCallback(
		(newFilters: UserMoreFiltersState) => {
			setMoreFilters(newFilters);
			setListPage(1);
			lastFetched.current = null;
		},
		[setMoreFilters, setListPage],
	);

	const handleApplyContactMoreFilters = useCallback(
		(newFilters: UserMoreFiltersState) => {
			setContactMoreFilters(newFilters);
			setContactListPage(1);
			lastFetchedContacts.current = null;
		},
		[setContactMoreFilters, setContactListPage],
	);

	const handleStatusFilterChange = useCallback(
		(value: string) => {
			const status = value === "all" ? undefined : (value as UserStatusFilter);
			setListStatusFilter(status);
			setListPage(1);
			lastFetched.current = null;
		},
		[setListStatusFilter, setListPage],
	);

	const handleCompanyFilterChange = useCallback(
		(value: string) => {
			setListCompanyFilter(value === "all" ? undefined : value);
			setListPage(1);
			lastFetched.current = null;
		},
		[setListPage],
	);

	const handleCategoryFilterChange = useCallback(
		(value: string) => {
			setListCategoryIdFilter(value === "all" ? undefined : value);
			setListPage(1);
			lastFetched.current = null;
		},
		[setListCategoryIdFilter, setListPage],
	);

	const handleContactTypeFilterChange = useCallback(
		(value: string) => {
			setListContactTypeFilter(value === "all" ? undefined : value);
			setContactListPage(1);
			lastFetchedContacts.current = null;
		},
		[setListContactTypeFilter, setContactListPage],
	);

	const handleBulkUploadOpenChange = useCallback((open: boolean) => {
		setBulkUploadOpen(open);
		if (!open) {
			setContactBulkImportFailures(null);
		}
	}, []);

	const handleOpenBulkUploadClick = useCallback(() => {
		setContactBulkImportFailures(null);
		setBulkUploadOpen(true);
	}, []);

	const handleBulkUploadSubmit = useCallback(
		async (file: File) => {
			if (isContactsTab) {
				const result = await bulkUploadKeyContacts(file);
				if (!result.ok) return;
				const refetchContacts = () =>
					fetchKeyContacts(contactListPage, PAGE_SIZE, {
						search: searchForContactsApi || undefined,
						sortBy: contactListSortBy,
						sortOrder: contactListSortOrder,
						contactType: listContactTypeFilter,
						corporationIds:
							appliedContactMoreFilters.corporationIds.length > 0
								? appliedContactMoreFilters.corporationIds
								: undefined,
						companyIds:
							appliedContactMoreFilters.companyIds.length > 0
								? appliedContactMoreFilters.companyIds
								: undefined,
						timezones:
							appliedContactMoreFilters.timeZones.length > 0
								? appliedContactMoreFilters.timeZones
								: undefined,
					});
				if (result.data.failed.length > 0) {
					setContactBulkImportFailures(result.data.failed);
					await refetchContacts();
					return;
				}
				setContactBulkImportFailures(null);
				setBulkUploadOpen(false);
				await refetchContacts();
				return;
			}
			const ok = await bulkInviteUsers(file);
			if (!ok) return;
			setBulkUploadOpen(false);
			await refetchUsersList();
		},
		[
			isContactsTab,
			bulkUploadKeyContacts,
			bulkInviteUsers,
			refetchUsersList,
			contactListPage,
			searchForContactsApi,
			contactListSortBy,
			contactListSortOrder,
			listContactTypeFilter,
			appliedContactMoreFilters.corporationIds,
			appliedContactMoreFilters.companyIds,
			appliedContactMoreFilters.timeZones,
			fetchKeyContacts,
		],
	);

	const handleConfirmSendInvite = useCallback(
		async (selection: { categoryId: string; roleId: string }) => {
			void selection.categoryId;
			if (!sendInviteContact) return;
			const ok = await sendKeyContactInvite(sendInviteContact.id, {
				roleId: selection.roleId,
			});
			if (!ok) return;
			setSendInviteOpen(false);
			setSendInviteContact(null);
			await fetchKeyContacts(contactListPage, PAGE_SIZE, {
				search: searchForContactsApi || undefined,
				sortBy: contactListSortBy,
				sortOrder: contactListSortOrder,
				contactType: listContactTypeFilter,
				corporationIds:
					appliedContactMoreFilters.corporationIds.length > 0
						? appliedContactMoreFilters.corporationIds
						: undefined,
				companyIds:
					appliedContactMoreFilters.companyIds.length > 0
						? appliedContactMoreFilters.companyIds
						: undefined,
				timezones:
					appliedContactMoreFilters.timeZones.length > 0
						? appliedContactMoreFilters.timeZones
						: undefined,
			});
		},
		[
			sendInviteContact,
			sendKeyContactInvite,
			fetchKeyContacts,
			contactListPage,
			searchForContactsApi,
			contactListSortBy,
			contactListSortOrder,
			listContactTypeFilter,
			appliedContactMoreFilters.corporationIds,
			appliedContactMoreFilters.companyIds,
			appliedContactMoreFilters.timeZones,
		],
	);

	return (
		<>
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex h-11 min-h-11 items-center rounded-xl bg-card-foreground p-1">
					<nav
						className="flex flex-1 flex-wrap items-center gap-4"
						aria-label="User directory tabs"
					>
						{USER_DIRECTORY_TABS.map((tab) => (
							<button
								key={tab.id}
								type="button"
								onClick={() => handleTabChange(tab.id)}
								className={cn(
									"inline-flex h-9 min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 px-2.5 py-1.5 text-small font-semibold transition-colors",
									activeTab === tab.id
										? "bg-background text-brand-primary"
										: "bg-transparent text-text-secondary hover:text-text-foreground",
								)}
							>
								{tab.label}
							</button>
						))}
					</nav>
				</div>

				<div className="flex items-center gap-2.5">
					<PermissionGate
						permission={SUBMODULE_KEYS.USER_DIRECTORY_BULK_UPLOAD}
					>
						<Button
							type="button"
							variant="outline"
							icon={Upload}
							onClick={handleOpenBulkUploadClick}
						>
							{USER_DIRECTORY_PAGE_CONTENT.bulkUploadButton}
						</Button>
					</PermissionGate>
					{isContactsTab ? (
						<PermissionGate permission={SUBMODULE_KEYS.USER_DIRECTORY_INVITE}>
							<Button
								type="button"
								icon={PlusIcon}
								onClick={() =>
									void navigate({
										pathname: ROUTES.userDirectory.addContact,
										search: buildUserDirectoryListingSearch(activeTab),
									})
								}
							>
								{CONTACT_DIRECTORY_PAGE_CONTENT.addContactButton}
							</Button>
						</PermissionGate>
					) : (
						<PermissionGate permission={SUBMODULE_KEYS.USER_DIRECTORY_INVITE}>
							<Button
								type="button"
								icon={Send}
								onClick={() => void navigate(ROUTES.userDirectory.invite)}
							>
								{USER_DIRECTORY_PAGE_CONTENT.inviteUserButton}
							</Button>
						</PermissionGate>
					)}
				</div>
			</div>

			<WhiteBox padding="md">
				<div className="flex flex-col gap-6">
					<div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
						<InputGroup className="h-9 w-full min-w-0 rounded-lg lg:max-w-80 lg:flex-1">
							<InputGroupAddon align="inline-start">
								<Search className="size-3.5 text-muted-foreground" />
							</InputGroupAddon>
							<InputGroupInput
								type="search"
								placeholder={
									isContactsTab
										? FORM_PLACEHOLDERS.searchContactNameOrEmail
										: FORM_PLACEHOLDERS.searchUsernameOrEmail
								}
								value={isContactsTab ? contactListSearch : listSearch}
								onChange={(e) => {
									if (isContactsTab) {
										setContactListSearch(e.target.value);
									} else {
										setListSearch(e.target.value);
									}
								}}
								aria-label={USER_DIRECTORY_PAGE_CONTENT.searchAriaLabel}
								disabled={userFiltersBusy}
							/>
						</InputGroup>

						<div className="flex w-full flex-col gap-2.5 sm:flex-row sm:gap-2.5 lg:w-auto lg:shrink-0">
							{isContactsTab ? (
								<>
									<Select
										value={listContactTypeFilter ?? "all"}
										onValueChange={handleContactTypeFilterChange}
										disabled={userFiltersBusy}
									>
										<SelectTrigger
											className="h-9 w-full min-w-0 sm:w-44"
											aria-label={
												CONTACT_DIRECTORY_PAGE_CONTENT.contactTypesFilterAriaLabel
											}
										>
											<SelectValue
												placeholder={
													CONTACT_DIRECTORY_PAGE_CONTENT.contactTypesFilterAllLabel
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{CONTACT_TYPE_FILTER_OPTIONS.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>

									<Button
										variant="outline"
										icon={Filter}
										className={
											contactMoreFiltersAppliedCount > 0
												? "text-link"
												: undefined
										}
										onClick={() => setContactMoreFiltersOpen(true)}
										disabled={userFiltersBusy}
									>
										{USER_DIRECTORY_PAGE_CONTENT.moreFiltersButton}
										{contactMoreFiltersAppliedCount > 0 &&
											` (${contactMoreFiltersAppliedCount})`}
									</Button>
								</>
							) : (
								<>
									<Select
										value={listStatusFilter ?? "all"}
										onValueChange={handleStatusFilterChange}
										disabled={userFiltersBusy}
									>
										<SelectTrigger
											className="h-9 w-full min-w-0 sm:w-44"
											aria-label={
												USER_DIRECTORY_PAGE_CONTENT.statusFilterAriaLabel
											}
										>
											<SelectValue
												placeholder={
													USER_DIRECTORY_PAGE_CONTENT.statusFilterAllLabel
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{USER_STATUS_FILTER_OPTIONS.map((opt) => (
												<SelectItem key={opt.value} value={opt.value}>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>

									<Select
										value={listCategoryIdFilter ?? "all"}
										onValueChange={handleCategoryFilterChange}
										disabled={userFiltersBusy}
									>
										<SelectTrigger
											className="h-9 w-full min-w-0 sm:w-44"
											aria-label={
												USER_DIRECTORY_PAGE_CONTENT.categoriesFilterAriaLabel
											}
										>
											<SelectValue
												placeholder={
													USER_DIRECTORY_PAGE_CONTENT.categoriesFilterAllLabel
												}
											/>
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">
												{USER_DIRECTORY_PAGE_CONTENT.categoriesFilterAllLabel}
											</SelectItem>
											{roleCategories.map((cat) => (
												<SelectItem key={cat.id} value={cat.id}>
													{cat.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>

									{showMoreFiltersCompany && (
										<Select
											value={listCompanyFilter ?? "all"}
											onValueChange={handleCompanyFilterChange}
											disabled={userFiltersBusy}
										>
											<SelectTrigger
												className="h-9 w-full min-w-0 sm:w-44"
												aria-label={
													USER_DIRECTORY_PAGE_CONTENT.companiesFilterAriaLabel
												}
											>
												<SelectValue
													placeholder={
														USER_DIRECTORY_PAGE_CONTENT.companiesFilterAllLabel
													}
												/>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">
													{USER_DIRECTORY_PAGE_CONTENT.companiesFilterAllLabel}
												</SelectItem>
												{companiesForMoreFilters.map((company) => (
													<SelectItem key={company.id} value={company.id}>
														{company.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								</>
							)}

							{!isContactsTab && (
								<Button
									variant="outline"
									icon={Filter}
									className={
										moreFiltersAppliedCount > 0 ? "text-link" : undefined
									}
									onClick={() => setMoreFiltersOpen(true)}
									disabled={userFiltersBusy}
								>
									{USER_DIRECTORY_PAGE_CONTENT.moreFiltersButton}
									{moreFiltersAppliedCount > 0 &&
										` (${moreFiltersAppliedCount})`}
								</Button>
							)}
						</div>
					</div>

					<div className="min-w-0">
						{isContactsTab ? (
							contactsListLoading ? (
								<TableSkeleton
									columns={contactColumns}
									rowCount={PAGE_SIZE}
									showPagination
									fixedHeight
								/>
							) : (
								<DataTable
									data={contactListItems}
									columns={contactColumns}
									pageSize={PAGE_SIZE}
									emptyMessage={CONTACT_DIRECTORY_PAGE_CONTENT.noData}
									serverPagination={{
										totalCount: contactListTotal,
										pageIndex: contactPageIndex,
										onPageChange: (idx) => setContactListPage(idx + 1),
									}}
									serverSort={{
										sortColumnId: contactListSortBy,
										sortDirection: contactListSortOrder,
										onSort: handleContactSort,
									}}
									fixedHeight
								/>
							)
						) : listLoading ? (
							<TableSkeleton
								columns={userColumns}
								rowCount={PAGE_SIZE}
								showPagination
								fixedHeight
							/>
						) : (
							<DataTable
								data={listItems}
								columns={userColumns}
								pageSize={PAGE_SIZE}
								emptyMessage={USER_DIRECTORY_PAGE_CONTENT.noData}
								serverPagination={{
									totalCount: listTotal,
									pageIndex: userPageIndex,
									onPageChange: (idx) => setListPage(idx + 1),
								}}
								serverSort={{
									sortColumnId: listSortBy,
									sortDirection: listSortOrder,
									onSort: handleSort,
								}}
								fixedHeight
							/>
						)}
					</div>
				</div>
			</WhiteBox>

			<MoreFiltersDialog
				open={moreFiltersOpen}
				onOpenChange={setMoreFiltersOpen}
				filters={moreFilters}
				onApply={handleApplyMoreFilters}
				corporationOptions={corporationOptionsForMoreFilters}
				companyOptions={companiesForMoreFilters}
				optionsLoading={userFiltersBusy}
				showCorporationFilter={showMoreFiltersCorporation}
				showCompanyFilter={showMoreFiltersCompany}
			/>

			<MoreFiltersDialog
				open={contactMoreFiltersOpen}
				onOpenChange={setContactMoreFiltersOpen}
				filters={contactMoreFilters}
				onApply={handleApplyContactMoreFilters}
				corporationOptions={corporationOptionsForMoreFilters}
				companyOptions={companiesForMoreFilters}
				optionsLoading={userFiltersBusy}
				showCorporationFilter={showMoreFiltersCorporation}
				showCompanyFilter={showMoreFiltersCompany}
			/>

			<SendInviteContactDialog
				open={sendInviteOpen}
				onOpenChange={setSendInviteOpen}
				isSubmitting={isSendKeyContactInviteSubmitting}
				onSubmit={handleConfirmSendInvite}
			/>

			<ConfirmationModal
				open={userBlockDialog != null}
				onOpenChange={(open) => {
					if (!open && !isBlockConfirming) setUserBlockDialog(null);
				}}
				title={
					userBlockDialog?.mode === "unblock"
						? USER_BLOCK_CONFIRM_DIALOG.unblockTitle
						: USER_BLOCK_CONFIRM_DIALOG.blockTitle
				}
				description={
					userBlockDialog?.mode === "unblock"
						? USER_BLOCK_CONFIRM_DIALOG.unblockDescription
						: USER_BLOCK_CONFIRM_DIALOG.blockDescription
				}
				icon={
					userBlockDialog?.mode === "unblock" ? (
						<CheckCircle
							className="size-12 text-interactive-success"
							aria-hidden
						/>
					) : (
						<Ban className="size-12 text-destructive" aria-hidden />
					)
				}
				confirmLabel={
					userBlockDialog?.mode === "unblock"
						? USER_BLOCK_CONFIRM_DIALOG.unblockConfirm
						: USER_BLOCK_CONFIRM_DIALOG.blockConfirm
				}
				cancelLabel={USER_BLOCK_CONFIRM_DIALOG.cancel}
				onConfirm={handleConfirmUserBlock}
				isConfirming={isBlockConfirming}
				variant={
					userBlockDialog?.mode === "unblock" ? "default" : "destructive"
				}
				confirmIcon={userBlockDialog?.mode === "unblock" ? CheckCircle : Ban}
			/>

			<ConfirmationModal
				open={userToRemove != null}
				onOpenChange={(open) => {
					if (!open && !isRemoveConfirming) setUserToRemove(null);
				}}
				title={USER_REMOVE_CONFIRM_DIALOG.title}
				description={USER_REMOVE_CONFIRM_DIALOG.description}
				icon={<Trash2 className="size-12 text-destructive" aria-hidden />}
				confirmLabel={USER_REMOVE_CONFIRM_DIALOG.confirm}
				cancelLabel={USER_REMOVE_CONFIRM_DIALOG.cancel}
				onConfirm={handleConfirmRemoveUser}
				isConfirming={isRemoveConfirming}
				variant="destructive"
				confirmIcon={Trash2}
			/>

			<ConfirmationModal
				open={contactToRemove != null}
				onOpenChange={(open) => {
					if (!open && !isDeleteKeyContactSubmitting) setContactToRemove(null);
				}}
				title={CONTACT_REMOVE_CONFIRM_DIALOG.title}
				description={contactRemoveConfirmDescription(
					contactToRemove?.contactType ?? "",
				)}
				icon={<Trash2 className="size-12 text-destructive" aria-hidden />}
				confirmLabel={CONTACT_REMOVE_CONFIRM_DIALOG.confirm}
				cancelLabel={CONTACT_REMOVE_CONFIRM_DIALOG.cancel}
				onConfirm={handleConfirmRemoveContact}
				isConfirming={isDeleteKeyContactSubmitting}
				variant="destructive"
				confirmIcon={Trash2}
			/>

			<ConfirmationModal
				open={userToCancelInvite != null}
				onOpenChange={(open) => {
					if (!open && !isCancelInviteConfirming) setUserToCancelInvite(null);
				}}
				title={USER_CANCEL_INVITE_CONFIRM_DIALOG.title}
				description={USER_CANCEL_INVITE_CONFIRM_DIALOG.description}
				icon={<XOctagon className="size-12 text-destructive" aria-hidden />}
				confirmLabel={USER_CANCEL_INVITE_CONFIRM_DIALOG.confirm}
				cancelLabel={USER_CANCEL_INVITE_CONFIRM_DIALOG.cancel}
				onConfirm={handleConfirmCancelInvite}
				isConfirming={isCancelInviteConfirming}
				variant="destructive"
				confirmIcon={XOctagon}
			/>

			<ConfirmationModal
				open={userToResendInvite != null}
				onOpenChange={(open) => {
					if (!open && !isResendInviteConfirming) setUserToResendInvite(null);
				}}
				title={USER_RESEND_INVITE_CONFIRM_DIALOG.title}
				description={USER_RESEND_INVITE_CONFIRM_DIALOG.description}
				icon={<Redo2 className="size-12 text-icon-info" aria-hidden />}
				confirmLabel={USER_RESEND_INVITE_CONFIRM_DIALOG.confirm}
				cancelLabel={USER_RESEND_INVITE_CONFIRM_DIALOG.cancel}
				onConfirm={handleConfirmResendInvite}
				isConfirming={isResendInviteConfirming}
				variant="default"
				confirmIcon={Redo2}
			/>

			<BulkUploadDirectoryModal
				open={bulkUploadOpen}
				onOpenChange={handleBulkUploadOpenChange}
				activeTab={activeTab}
				onSubmit={handleBulkUploadSubmit}
				isSubmitting={
					isContactsTab
						? isBulkUploadKeyContactsSubmitting
						: isBulkInviteUsersSubmitting
				}
				contactBulkImportFailures={
					isContactsTab ? contactBulkImportFailures : null
				}
				onClearContactBulkImportFailures={() =>
					setContactBulkImportFailures(null)
				}
			/>
		</>
	);
}
