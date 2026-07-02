import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { shareAssessmentReport } from "@/api";
import {
	DataTable,
	ShareAssessmentReportModal,
	TableSkeleton,
	WhiteBox,
} from "@/components";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	ASSESSMENT_DIRECTORY_STATUS_FILTER_OPTIONS,
	ASSESSMENT_DIRECTORY_TIME_FILTER_OPTIONS,
	ASSESSMENT_REPORT_SHARE,
	ASSESSMENTS_DIRECTORY_PAGE_CONTENT,
	DATA_TABLE_CONFIG,
	ROUTES,
	SUBMODULE_KEYS,
} from "@/const";
import { usePermissions } from "@/hooks";
import { useAssessmentDirectoryStore } from "@/store";
import { getAssessmentDirectoryColumns } from "@/tables";
import type {
	AssessmentDirectoryApiSortBy,
	AssessmentDirectoryApiTimeFilter,
	AssessmentDirectoryContentProps,
	AssessmentDirectoryItem,
} from "@/types";
import {
	downloadAssessmentReport,
	navigateToAssessmentReportResults,
} from "@/utils";

const PAGE_SIZE = DATA_TABLE_CONFIG.defaultPageSize;
const AD = ASSESSMENTS_DIRECTORY_PAGE_CONTENT;

export function AssessmentDirectoryContent({
	variant = "self",
	cognitoSub,
	returnUserId,
}: AssessmentDirectoryContentProps = {}) {
	const navigate = useNavigate();
	const isAdminUserView = variant === "adminUser";
	const { can } = usePermissions();
	const assessmentPermissions = useMemo(
		() => ({
			canTake: can(SUBMODULE_KEYS.ASSESSMENT_TAKE),
			canViewResult: can(SUBMODULE_KEYS.ASSESSMENT_VIEW_RESULT),
		}),
		[can],
	);
	const {
		listItems,
		listTotal,
		listPage,
		listLoading,
		listSortBy,
		listSortOrder,
		listStatusFilter,
		listTimeFilter,
		listCognitoSub,
		fetchAssessments,
		setListPage,
		setListSort,
		setListStatusFilter,
		setListTimeFilter,
		setListCognitoSub,
		reset,
	} = useAssessmentDirectoryStore();

	const [shareTargetId, setShareTargetId] = useState<string | null>(null);
	const [isSharing, setIsSharing] = useState(false);
	const [downloadingReportKey, setDownloadingReportKey] = useState<
		string | null
	>(null);

	useEffect(() => {
		if (isAdminUserView) {
			setListCognitoSub(cognitoSub?.trim() || undefined);
			return () => reset();
		}
		setListCognitoSub(undefined);
	}, [isAdminUserView, cognitoSub, setListCognitoSub, reset]);

	const handleViewClick = useCallback(
		(row: AssessmentDirectoryItem) => {
			const returnTo = isAdminUserView
				? (() => {
						const id = returnUserId?.trim();
						if (!id) {
							return undefined;
						}
						return {
							path: ROUTES.userDirectory.viewWithIdPath(id),
							state: { activeTab: "assessments" as const },
						};
					})()
				: { path: ROUTES.assessments.root };

			navigateToAssessmentReportResults(
				navigate,
				{
					id: row.id,
					reportKey: row.reportKey,
					completedAt: row.completedAt,
				},
				returnTo,
			);
		},
		[navigate, isAdminUserView, returnUserId],
	);

	const handleResumeClick = useCallback(
		(row: AssessmentDirectoryItem) => {
			if (row.status === "complete") {
				handleViewClick(row);
				return;
			}
			if (row.completedAt) {
				navigate(ROUTES.assessment.root, {
					state: { openCompleteFor: row.id },
				});
				return;
			}
			navigate(ROUTES.assessment.root, {
				state: { reviewAssessmentId: row.id },
			});
		},
		[handleViewClick, navigate],
	);

	const handleDownloadClick = useCallback(
		async (row: AssessmentDirectoryItem) => {
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

	const handleShareClick = useCallback((row: AssessmentDirectoryItem) => {
		setShareTargetId(row.id);
	}, []);

	const handleShareConfirm = useCallback(
		async (recipients: string[]) => {
			if (recipients.length === 0) {
				toast.error(ASSESSMENT_REPORT_SHARE.noRecipients);
				return;
			}
			if (!shareTargetId) {
				return;
			}
			setIsSharing(true);
			try {
				const res = await shareAssessmentReport(shareTargetId, recipients);
				if (!res.ok) {
					toast.error(res.message || ASSESSMENT_REPORT_SHARE.shareFailed);
					return;
				}
				toast.success(ASSESSMENT_REPORT_SHARE.success);
				setShareTargetId(null);
			} catch {
				toast.error(ASSESSMENT_REPORT_SHARE.shareFailed);
			} finally {
				setIsSharing(false);
			}
		},
		[shareTargetId],
	);

	const showActionsColumn = useMemo(() => {
		if (isAdminUserView) {
			return true;
		}
		const hasIncomplete = listItems.some(
			(item) => item.status === "incomplete",
		);
		const hasComplete = listItems.some((item) => item.status === "complete");
		if (assessmentPermissions.canViewResult && hasComplete) {
			return true;
		}
		if (assessmentPermissions.canTake && hasIncomplete) {
			return true;
		}
		return false;
	}, [isAdminUserView, listItems, assessmentPermissions]);

	const columns = useMemo(
		() =>
			getAssessmentDirectoryColumns({
				actionMode: variant,
				onResumeClick: isAdminUserView ? undefined : handleResumeClick,
				onViewClick: handleViewClick,
				onDownloadClick: handleDownloadClick,
				onShareClick: isAdminUserView ? undefined : handleShareClick,
				downloadingReportKey,
				permissions: isAdminUserView ? undefined : assessmentPermissions,
				showActionsColumn,
			}),
		[
			variant,
			isAdminUserView,
			handleResumeClick,
			handleViewClick,
			handleDownloadClick,
			handleShareClick,
			downloadingReportKey,
			assessmentPermissions,
			showActionsColumn,
		],
	);

	const lastFetched = useRef<{
		page: number;
		limit: number;
		sortBy: string;
		sortOrder: string;
		status: string | undefined;
		timeFilter: string | undefined;
		cognitoSub: string | undefined;
	} | null>(null);

	useEffect(() => {
		if (isAdminUserView && !listCognitoSub) {
			return;
		}
		const key = {
			page: listPage,
			limit: PAGE_SIZE,
			sortBy: listSortBy,
			sortOrder: listSortOrder,
			status: listStatusFilter,
			timeFilter: listTimeFilter,
			cognitoSub: listCognitoSub,
		};
		if (
			lastFetched.current?.page === key.page &&
			lastFetched.current?.limit === key.limit &&
			lastFetched.current?.sortBy === key.sortBy &&
			lastFetched.current?.sortOrder === key.sortOrder &&
			lastFetched.current?.status === key.status &&
			lastFetched.current?.timeFilter === key.timeFilter &&
			lastFetched.current?.cognitoSub === key.cognitoSub
		) {
			return;
		}
		lastFetched.current = key;
		fetchAssessments(listPage, PAGE_SIZE, {
			sortBy: listSortBy,
			sortOrder: listSortOrder,
			status: listStatusFilter,
			timeFilter: listTimeFilter,
		});
	}, [
		isAdminUserView,
		listCognitoSub,
		listPage,
		listSortBy,
		listSortOrder,
		listStatusFilter,
		listTimeFilter,
		fetchAssessments,
	]);

	const handleSort = useCallback(
		(columnId: string) => {
			if (columnId === "actions") return;
			const sortByMap: Record<string, AssessmentDirectoryApiSortBy> = {
				assessmentName: "assessmentName",
				startDate: "startedAt",
				endDate: "completedAt",
				status: "status",
			};
			const sortBy = sortByMap[columnId] ?? "startedAt";
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
				value === "all"
					? undefined
					: (value as AssessmentDirectoryItem["status"]),
			);
			setListPage(1);
		},
		[setListStatusFilter, setListPage],
	);

	const handleTimeFilterChange = useCallback(
		(value: string) => {
			setListTimeFilter(
				value === "all"
					? undefined
					: (value as AssessmentDirectoryApiTimeFilter),
			);
			setListPage(1);
		},
		[setListTimeFilter, setListPage],
	);

	const pageIndex = listPage - 1;
	const sortColumnId = useMemo(() => {
		const reverseMap: Record<AssessmentDirectoryApiSortBy, string> = {
			assessmentName: "assessmentName",
			startedAt: "startDate",
			completedAt: "endDate",
			status: "status",
		};
		return reverseMap[listSortBy] ?? "startDate";
	}, [listSortBy]);

	const statusFilterValue = listStatusFilter ?? "all";
	const timeFilterValue = listTimeFilter ?? "all";

	return (
		<WhiteBox padding="sm" className="shadow-sm">
			<div className="flex flex-col gap-6">
				<div className="flex w-full min-w-0 flex-wrap items-center gap-2.5">
					<Select
						value={statusFilterValue}
						onValueChange={handleStatusFilterChange}
					>
						<SelectTrigger
							className="h-9 w-full min-w-0 shrink-0 rounded-lg bg-background sm:w-50"
							aria-label={AD.statusFilterAriaLabel}
						>
							<SelectValue placeholder={AD.statusFilterAllLabel} />
						</SelectTrigger>
						<SelectContent>
							{ASSESSMENT_DIRECTORY_STATUS_FILTER_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={timeFilterValue}
						onValueChange={handleTimeFilterChange}
					>
						<SelectTrigger
							className="h-9 w-full min-w-0 shrink-0 rounded-lg bg-background sm:w-50"
							aria-label={AD.timeFilterAriaLabel}
						>
							<SelectValue
								placeholder={
									ASSESSMENT_DIRECTORY_TIME_FILTER_OPTIONS.find(
										(opt) => opt.value === "all",
									)?.label
								}
							/>
						</SelectTrigger>
						<SelectContent>
							{ASSESSMENT_DIRECTORY_TIME_FILTER_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="min-w-0">
					{listLoading ? (
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
							emptyMessage={AD.noData}
							serverPagination={{
								totalCount: listTotal,
								pageIndex,
								onPageChange: (idx) => setListPage(idx + 1),
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
			</div>
			{!isAdminUserView && shareTargetId ? (
				<ShareAssessmentReportModal
					open
					onOpenChange={(open) => {
						if (!open) setShareTargetId(null);
					}}
					onShare={handleShareConfirm}
					isSharing={isSharing}
				/>
			) : null}
		</WhiteBox>
	);
}
