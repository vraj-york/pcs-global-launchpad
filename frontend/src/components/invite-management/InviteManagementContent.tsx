import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DataTable, TableSkeleton, WhiteBox } from "@/components";
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
	DATA_TABLE_CONFIG,
	INVITE_MANAGEMENT_LIST_MESSAGES,
	INVITE_MANAGEMENT_LIST_STATUS,
	INVITE_MANAGEMENT_LIST_STATUS_FILTER_OPTIONS,
	INVITE_MANAGEMENT_LIST_TIME_FILTER_OPTIONS,
	ROUTES,
} from "@/const";
import { useDebounce } from "@/hooks";
import { useInviteManagementStore, useUsersStore } from "@/store";
import { getInviteManagementColumns } from "@/tables";
import type {
	InviteManagementListItem,
	InviteManagementListSortBy,
	InviteManagementListStatus,
	InviteManagementListTimeFilter,
} from "@/types";
import {
	downloadAssessmentReport,
	navigateToAssessmentReportResults,
} from "@/utils";
import { InviteManagementSummaryCards } from "./InviteManagementSummaryCards";

const PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;

export function InviteManagementContent() {
	const navigate = useNavigate();
	const { resendUserInvitation } = useUsersStore();
	const {
		listItems,
		listSummary,
		listTotal,
		listPage,
		listLoading,
		listSearch,
		listSortBy,
		listSortOrder,
		listStatusFilter,
		listTimeFilter,
		fetchAssessmentInvites,
		setListPage,
		setListSearch,
		setListSort,
		setListStatusFilter,
		setListTimeFilter,
	} = useInviteManagementStore();

	const [searchInput, setSearchInput] = useState(listSearch);
	const [resendingCognitoSub, setResendingCognitoSub] = useState<string | null>(
		null,
	);
	const [downloadingReportKey, setDownloadingReportKey] = useState<
		string | null
	>(null);
	const debouncedSearch = useDebounce(searchInput, 400);

	useEffect(() => {
		setListSearch(debouncedSearch);
		setListPage(1);
	}, [debouncedSearch, setListSearch, setListPage]);

	const lastFetched = useRef<{
		page: number;
		limit: number;
		sortBy: string;
		sortOrder: string;
		status: string | undefined;
		timeFilter: string | undefined;
		search: string;
	} | null>(null);

	useEffect(() => {
		const key = {
			page: listPage,
			limit: PAGE_SIZE,
			sortBy: listSortBy,
			sortOrder: listSortOrder,
			status: listStatusFilter,
			timeFilter: listTimeFilter,
			search: listSearch,
		};
		if (
			lastFetched.current?.page === key.page &&
			lastFetched.current?.limit === key.limit &&
			lastFetched.current?.sortBy === key.sortBy &&
			lastFetched.current?.sortOrder === key.sortOrder &&
			lastFetched.current?.status === key.status &&
			lastFetched.current?.timeFilter === key.timeFilter &&
			lastFetched.current?.search === key.search
		) {
			return;
		}
		lastFetched.current = key;
		fetchAssessmentInvites(listPage, PAGE_SIZE, {
			sortBy: listSortBy,
			sortOrder: listSortOrder,
			status: listStatusFilter,
			timeFilter: listTimeFilter,
			search: listSearch,
		});
	}, [
		listPage,
		listSortBy,
		listSortOrder,
		listStatusFilter,
		listTimeFilter,
		listSearch,
		fetchAssessmentInvites,
	]);

	const handleViewClick = useCallback(
		(row: InviteManagementListItem) => {
			const assessmentId = row.assessmentId?.trim();
			if (!assessmentId) {
				return;
			}
			navigateToAssessmentReportResults(
				navigate,
				{
					id: assessmentId,
					reportKey: row.reportKey,
					completedAt: row.completedAt,
				},
				{ path: ROUTES.inviteManagement.root },
			);
		},
		[navigate],
	);

	const handleDownloadClick = useCallback(
		async (row: InviteManagementListItem) => {
			const key = row.reportKey?.trim();
			if (!key || downloadingReportKey) {
				return;
			}
			setDownloadingReportKey(key);
			try {
				await downloadAssessmentReport(key);
			} finally {
				setDownloadingReportKey(null);
			}
		},
		[downloadingReportKey],
	);

	const handleResendClick = useCallback(
		async (row: InviteManagementListItem) => {
			if (row.status === "completed") {
				toast.error(INVITE_MANAGEMENT_LIST_MESSAGES.resendCompletedError);
				return;
			}
			if (resendingCognitoSub) {
				return;
			}
			setResendingCognitoSub(row.cognitoSub);
			try {
				const ok = await resendUserInvitation(row.cognitoSub);
				if (!ok) return;
				setListPage(1);
				fetchAssessmentInvites(1, PAGE_SIZE, {
					sortBy: listSortBy,
					sortOrder: listSortOrder,
					status: listStatusFilter,
					timeFilter: listTimeFilter,
					search: listSearch,
				});
			} finally {
				setResendingCognitoSub(null);
			}
		},
		[
			resendingCognitoSub,
			resendUserInvitation,
			setListPage,
			fetchAssessmentInvites,
			listSortBy,
			listSortOrder,
			listStatusFilter,
			listTimeFilter,
			listSearch,
		],
	);

	const showActionsColumn = useMemo(
		() =>
			listItems.some(
				(row) =>
					row.status === INVITE_MANAGEMENT_LIST_STATUS.completed ||
					row.status === INVITE_MANAGEMENT_LIST_STATUS.invited,
			),
		[listItems],
	);

	const columns = useMemo(
		() =>
			getInviteManagementColumns({
				onViewClick: handleViewClick,
				onDownloadClick: handleDownloadClick,
				onResendClick: handleResendClick,
				resendingCognitoSub,
				downloadingReportKey,
				showActionsColumn,
			}),
		[
			handleViewClick,
			handleDownloadClick,
			handleResendClick,
			resendingCognitoSub,
			downloadingReportKey,
			showActionsColumn,
		],
	);

	const handleSort = useCallback(
		(columnId: string) => {
			if (columnId === "actions") return;
			const sortByMap: Record<string, InviteManagementListSortBy> = {
				name: "name",
				inviteeType: "inviteeType",
				status: "status",
				progress: "progress",
				invitedOn: "invitedOn",
				lastActivity: "lastActivity",
			};
			const sortBy = sortByMap[columnId] ?? "invitedOn";
			const nextOrder =
				listSortBy === sortBy && listSortOrder === "asc" ? "desc" : "asc";
			setListSort(sortBy, nextOrder);
			setListPage(1);
		},
		[listSortBy, listSortOrder, setListSort, setListPage],
	);

	const handleStatusFilterChange = useCallback(
		(value: string) => {
			setListStatusFilter(
				value === "all" ? undefined : (value as InviteManagementListStatus),
			);
			setListPage(1);
		},
		[setListStatusFilter, setListPage],
	);

	const handleTimeFilterChange = useCallback(
		(value: string) => {
			setListTimeFilter(
				value === "all" ? undefined : (value as InviteManagementListTimeFilter),
			);
			setListPage(1);
		},
		[setListTimeFilter, setListPage],
	);

	const statusFilterValue = listStatusFilter ?? "all";
	const timeFilterValue = listTimeFilter ?? "all";

	const sortColumnId = useMemo(() => {
		const reverseMap: Record<InviteManagementListSortBy, string> = {
			name: "name",
			inviteeType: "inviteeType",
			status: "status",
			progress: "progress",
			invitedOn: "invitedOn",
			lastActivity: "lastActivity",
		};
		return reverseMap[listSortBy] ?? "invitedOn";
	}, [listSortBy]);

	const pageIndex = listPage - 1;
	const emptyMessage =
		listSearch.trim().length > 0 || listStatusFilter || listTimeFilter
			? INVITE_MANAGEMENT_LIST_MESSAGES.noResults
			: undefined;

	return (
		<div className="flex flex-col gap-6">
			<InviteManagementSummaryCards
				summary={listSummary}
				loading={listLoading && !listSummary}
			/>

			<WhiteBox className="flex flex-col gap-4 p-4">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<InputGroup className="w-full max-w-md">
						<InputGroupAddon>
							<Search className="size-4 text-muted-foreground" aria-hidden />
						</InputGroupAddon>
						<InputGroupInput
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							placeholder={INVITE_MANAGEMENT_LIST_MESSAGES.searchPlaceholder}
							aria-label={INVITE_MANAGEMENT_LIST_MESSAGES.searchPlaceholder}
						/>
					</InputGroup>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Select
							value={statusFilterValue}
							onValueChange={handleStatusFilterChange}
						>
							<SelectTrigger className="min-w-36" aria-label="Status filter">
								<SelectValue
									placeholder={
										INVITE_MANAGEMENT_LIST_STATUS_FILTER_OPTIONS[0].label
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{INVITE_MANAGEMENT_LIST_STATUS_FILTER_OPTIONS.map((opt) => (
									<SelectItem key={opt.label} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={timeFilterValue}
							onValueChange={handleTimeFilterChange}
						>
							<SelectTrigger className="min-w-36" aria-label="Time filter">
								<SelectValue
									placeholder={
										INVITE_MANAGEMENT_LIST_TIME_FILTER_OPTIONS[0].label
									}
								/>
							</SelectTrigger>
							<SelectContent>
								{INVITE_MANAGEMENT_LIST_TIME_FILTER_OPTIONS.map((opt) => (
									<SelectItem key={opt.label} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="min-w-0">
					{listLoading && listItems.length === 0 ? (
						<TableSkeleton
							columns={columns}
							rowCount={PAGE_SIZE}
							showPagination
							fixedHeight
						/>
					) : (
						<DataTable
							data={listItems}
							columns={columns}
							pageSize={PAGE_SIZE}
							emptyMessage={
								emptyMessage ?? INVITE_MANAGEMENT_LIST_MESSAGES.noResults
							}
							serverPagination={{
								totalCount: listTotal,
								pageIndex,
								onPageChange: (idx: number) => setListPage(idx + 1),
							}}
							serverSort={{
								sortColumnId,
								sortDirection: listSortOrder,
								onSort: handleSort,
							}}
							fixedHeight
						/>
					)}
				</div>
			</WhiteBox>
		</div>
	);
}
