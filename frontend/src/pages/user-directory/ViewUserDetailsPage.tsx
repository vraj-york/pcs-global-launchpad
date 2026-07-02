import {
	Ban,
	CheckCircle,
	ChevronLeft,
	Loader2,
	Redo2,
	SquarePen,
	Trash2,
	XOctagon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { getRoleCategoriesWithRoles } from "@/api/roles.api";
import { patchUser as patchUserApi } from "@/api/users.api";
import {
	AssessmentDirectoryContent,
	BSPBadge,
	ConfirmationModal,
	EditUserDetailsContent,
	ViewUserDetailsContent,
} from "@/components";
import { Button } from "@/components/ui/button";
import {
	COMPANY_ADMIN_ROLE_NAME,
	CORPORATION_ADMIN_ROLE_NAME,
	EDIT_USER_PAGE,
	INVITE_USER_TYPE,
	ROUTES,
	SUBMODULE_KEYS,
	USER_BLOCK_CONFIRM_DIALOG,
	USER_CANCEL_INVITE_CONFIRM_DIALOG,
	USER_DIRECTORY_PAGE_CONTENT,
	USER_REMOVE_CONFIRM_DIALOG,
	USER_REMOVE_TOAST,
	USER_RESEND_INVITE_CONFIRM_DIALOG,
	VIEW_USER_DETAILS_PAGE as V,
	VIEW_USER_TABS,
} from "@/const";
import { usePermissions } from "@/hooks";
import { AppLayout } from "@/layout";
import { cn } from "@/lib/utils";
import { useUsersStore } from "@/store";
import type {
	PatchUserPayload,
	RoleCategoryWithRoles,
	UserDetailsPageToolbarProps,
	ViewUserDetailsLocationState,
	ViewUserTabId,
} from "@/types";
import { formatCode, formatFullName } from "@/utils";

function UserDetailsPageToolbar({
	variant,
	user,
	onBack,
	onEditClick,
	onRemoveClick,
	onBlockClick,
	onUnblockClick,
	isBlockActionPending,
	isRemoveActionPending,
	onCancelInvitationClick,
	isCancelInvitationPending,
	onResendInviteClick,
	isResendInvitePending,
}: UserDetailsPageToolbarProps) {
	const name = formatFullName(user.firstName, user.lastName);
	const statusLower = user.status.toLowerCase();
	const isPending = statusLower === "pending";
	const isExpired = statusLower === "expired";
	const isBlocked = statusLower === "blocked";
	const showBlockUnblock = !isPending && !isExpired;
	const showCancelInvitation = isPending;
	const showResendInvite = isPending || isExpired;
	const isView = variant === "view";

	return (
		<div className="flex shrink-0 flex-col gap-4">
			<div className="flex min-h-14 w-full flex-wrap items-center justify-between gap-4">
				<div className="flex flex-wrap items-center gap-3">
					<Button
						variant="outline"
						type="button"
						icon={ChevronLeft}
						onClick={onBack}
					>
						{V.backButton}
					</Button>
					<div className="flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-2">
						<h1
							className="min-w-0 max-w-full font-semibold text-text-foreground capitalize truncate text-heading-4"
							title={name}
						>
							{name}
						</h1>
						<BSPBadge type="default" className="font-medium">
							{formatCode(user.userCode, "USER")}
						</BSPBadge>
						<BSPBadge type={`${user.status}_filled`} className="capitalize">
							{user.status}
						</BSPBadge>
					</div>
				</div>
				<div className="flex shrink-0 flex-wrap items-center gap-2">
					{onRemoveClick ? (
						<Button
							type="button"
							variant="outline"
							className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
							icon={Trash2}
							disabled={isRemoveActionPending}
							onClick={onRemoveClick}
						>
							{V.removeUserButton}
						</Button>
					) : null}
					{showCancelInvitation && onCancelInvitationClick ? (
						<Button
							type="button"
							variant="destructive"
							icon={XOctagon}
							disabled={!onCancelInvitationClick || isCancelInvitationPending}
							onClick={onCancelInvitationClick}
						>
							{V.cancelInvitationButton}
						</Button>
					) : null}
					{showResendInvite && onResendInviteClick ? (
						<Button
							type="button"
							className="bg-interactive-success text-light-same hover:bg-interactive-success-hover active:bg-interactive-success-active"
							icon={Redo2}
							disabled={!onResendInviteClick || Boolean(isResendInvitePending)}
							onClick={onResendInviteClick}
						>
							{V.resendInviteButton}
						</Button>
					) : null}
					{showBlockUnblock &&
						(isBlocked
							? onUnblockClick && (
									<Button
										type="button"
										className="bg-interactive-success text-light-same hover:bg-interactive-success-hover active:bg-interactive-success-active"
										icon={CheckCircle}
										disabled={isBlockActionPending}
										onClick={onUnblockClick}
									>
										{V.unblockUserButton}
									</Button>
								)
							: onBlockClick && (
									<Button
										type="button"
										variant="destructive"
										icon={Ban}
										disabled={isBlockActionPending}
										onClick={onBlockClick}
									>
										{V.blockUserButton}
									</Button>
								))}
					{isView && onEditClick ? (
						<Button type="button" icon={SquarePen} onClick={onEditClick}>
							{V.editUserButton}
						</Button>
					) : null}
				</div>
			</div>
		</div>
	);
}

export function ViewUserDetailsPage() {
	const { userId } = useParams<{ userId: string }>();
	const location = useLocation();
	const { pathname } = location;
	const navigate = useNavigate();

	const isEditMode = pathname.endsWith("/edit");

	const {
		userDetail,
		userDetailLoading,
		userDetailError,
		fetchUserById,
		clearUserDetail,
		blockUser,
		isBlockConfirming,
		removeUser,
		isRemoveConfirming,
		cancelUserInvitation,
		isCancelInviteConfirming,
		resendUserInvitation,
		isResendInviteConfirming,
	} = useUsersStore();
	const { can } = usePermissions();
	const canEditUser = can(SUBMODULE_KEYS.USER_DIRECTORY_EDIT);
	const canRemoveUser = can(SUBMODULE_KEYS.USER_DIRECTORY_REMOVE);
	const canBlockUser = can(SUBMODULE_KEYS.USER_DIRECTORY_BLOCK);
	const canResendInvite = can(SUBMODULE_KEYS.USER_DIRECTORY_RESEND_INVITE);
	const canCancelInvitation = can(
		SUBMODULE_KEYS.USER_DIRECTORY_CANCEL_INVITATION,
	);

	useEffect(() => {
		if (!isEditMode || canEditUser) return;
		const id = userId?.trim();
		if (id)
			navigate(ROUTES.userDirectory.viewWithIdPath(id), { replace: true });
		else navigate(ROUTES.userDirectory.root, { replace: true });
	}, [isEditMode, canEditUser, userId, navigate]);

	const [categoriesWithRoles, setCategoriesWithRoles] = useState<
		RoleCategoryWithRoles[]
	>([]);
	const [rolesTreeLoading, setRolesTreeLoading] = useState(false);
	const [rolesTreeError, setRolesTreeError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const [blockConfirmMode, setBlockConfirmMode] = useState<
		"block" | "unblock" | null
	>(null);
	const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
	const [cancelInviteConfirmOpen, setCancelInviteConfirmOpen] = useState(false);
	const [resendInviteConfirmOpen, setResendInviteConfirmOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<ViewUserTabId>(() => {
		const tab = (location.state as ViewUserDetailsLocationState | null)
			?.activeTab;
		return tab === "assessments" ? "assessments" : "basic";
	});

	const handleBack = useCallback(() => {
		navigate(ROUTES.userDirectory.root);
	}, [navigate]);

	const handleEdit = useCallback(() => {
		const id = userId?.trim();
		if (id) navigate(ROUTES.userDirectory.editWithIdPath(id));
	}, [navigate, userId]);

	const handleCancelEdit = useCallback(() => {
		const id = userId?.trim();
		if (id) navigate(ROUTES.userDirectory.viewWithIdPath(id));
		else navigate(ROUTES.userDirectory.root);
	}, [navigate, userId]);

	const handleSaveUser = useCallback(
		async (payload: PatchUserPayload) => {
			const id = userId?.trim();
			if (!id) return false;
			setIsSaving(true);
			try {
				const result = await patchUserApi(id, payload);
				if (!result.ok) {
					toast.error(result.message);
					return false;
				}
				toast.success(EDIT_USER_PAGE.saveSuccess);
				await fetchUserById(id);
				navigate(ROUTES.userDirectory.viewWithIdPath(id));
				return true;
			} finally {
				setIsSaving(false);
			}
		},
		[userId, navigate, fetchUserById],
	);

	const handleOpenBlockDialog = useCallback(() => {
		setBlockConfirmMode("block");
	}, []);

	const handleOpenUnblockDialog = useCallback(() => {
		setBlockConfirmMode("unblock");
	}, []);

	const handleConfirmBlockUser = useCallback(async () => {
		if (!userDetail || !blockConfirmMode) return;
		const ok = await blockUser(
			userDetail.cognitoSub,
			blockConfirmMode === "block",
		);
		if (ok) setBlockConfirmMode(null);
	}, [userDetail, blockConfirmMode, blockUser]);

	const handleOpenRemoveDialog = useCallback(() => {
		if (!userDetail) return;
		const roleName = userDetail.roleName?.trim();
		const category = userDetail.category?.trim();
		if (
			roleName === CORPORATION_ADMIN_ROLE_NAME ||
			roleName === COMPANY_ADMIN_ROLE_NAME ||
			category === CORPORATION_ADMIN_ROLE_NAME ||
			category === COMPANY_ADMIN_ROLE_NAME
		) {
			toast.error(USER_REMOVE_TOAST.corpCompanyAdminBlocked);
			return;
		}
		setRemoveConfirmOpen(true);
	}, [userDetail]);

	const handleConfirmRemoveUser = useCallback(async () => {
		if (!userDetail) return;
		const ok = await removeUser(userDetail.cognitoSub);
		if (ok) {
			setRemoveConfirmOpen(false);
			clearUserDetail();
			navigate(ROUTES.userDirectory.root);
		}
	}, [userDetail, removeUser, clearUserDetail, navigate]);

	const handleOpenCancelInviteDialog = useCallback(() => {
		setCancelInviteConfirmOpen(true);
	}, []);

	const handleConfirmCancelInvite = useCallback(async () => {
		if (!userDetail) return;
		const ok = await cancelUserInvitation(userDetail.cognitoSub);
		if (ok) {
			setCancelInviteConfirmOpen(false);
			const id = userId?.trim();
			if (id) fetchUserById(id);
		}
	}, [userDetail, cancelUserInvitation, userId, fetchUserById]);

	const handleOpenResendInviteDialog = useCallback(() => {
		setResendInviteConfirmOpen(true);
	}, []);

	const handleConfirmResendInvite = useCallback(async () => {
		if (!userDetail) return;
		const ok = await resendUserInvitation(userDetail.cognitoSub);
		if (ok) {
			setResendInviteConfirmOpen(false);
			const id = userId?.trim();
			if (id) fetchUserById(id);
		}
	}, [userDetail, resendUserInvitation, userId, fetchUserById]);

	useEffect(() => {
		if (userId?.trim()) {
			void fetchUserById(userId.trim());
		} else {
			void fetchUserById("");
		}
		return () => clearUserDetail();
	}, [userId, fetchUserById, clearUserDetail]);

	useEffect(() => {
		if (!isEditMode) {
			setCategoriesWithRoles([]);
			setRolesTreeError(null);
			setRolesTreeLoading(false);
			return;
		}
		if (!userDetail) return;
		if (userDetail.inviteType === INVITE_USER_TYPE.assessmentOnly) {
			setCategoriesWithRoles([]);
			setRolesTreeError(null);
			setRolesTreeLoading(false);
			return;
		}
		let cancelled = false;
		async function loadRoles() {
			setRolesTreeLoading(true);
			setRolesTreeError(null);
			const result = await getRoleCategoriesWithRoles();
			if (cancelled) return;
			setRolesTreeLoading(false);
			if (!result.ok) {
				setRolesTreeError(EDIT_USER_PAGE.rolesLoadError);
				setCategoriesWithRoles([]);
				return;
			}
			setCategoriesWithRoles(result.data);
		}
		void loadRoles();
		return () => {
			cancelled = true;
		};
	}, [isEditMode, userDetail]);

	const breadcrumbs = useMemo(
		() => [
			{
				label: USER_DIRECTORY_PAGE_CONTENT.breadcrumbsTitle,
				path: ROUTES.userDirectory.root,
			},
			isEditMode
				? {
						label: EDIT_USER_PAGE.breadcrumbEdit,
						path: userId
							? ROUTES.userDirectory.editWithIdPath(userId)
							: ROUTES.userDirectory.root,
					}
				: {
						label: V.breadcrumbViewDetails,
						path: userId
							? ROUTES.userDirectory.viewWithIdPath(userId)
							: ROUTES.userDirectory.root,
					},
		],
		[isEditMode, userId],
	);

	const loading = userDetailLoading;
	const isError =
		Boolean(userDetailError) || (!userDetailLoading && !userDetail);
	const displayError = userDetailError ?? V.notFound;

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<ConfirmationModal
				open={blockConfirmMode != null}
				onOpenChange={(open) => {
					if (!open && !isBlockConfirming) setBlockConfirmMode(null);
				}}
				title={
					blockConfirmMode === "unblock"
						? USER_BLOCK_CONFIRM_DIALOG.unblockTitle
						: USER_BLOCK_CONFIRM_DIALOG.blockTitle
				}
				description={
					blockConfirmMode === "unblock"
						? USER_BLOCK_CONFIRM_DIALOG.unblockDescription
						: USER_BLOCK_CONFIRM_DIALOG.blockDescription
				}
				icon={
					blockConfirmMode === "unblock" ? (
						<CheckCircle
							className="size-12 text-interactive-success"
							aria-hidden
						/>
					) : (
						<Ban className="size-12 text-destructive" aria-hidden />
					)
				}
				confirmLabel={
					blockConfirmMode === "unblock"
						? USER_BLOCK_CONFIRM_DIALOG.unblockConfirm
						: USER_BLOCK_CONFIRM_DIALOG.blockConfirm
				}
				cancelLabel={USER_BLOCK_CONFIRM_DIALOG.cancel}
				onConfirm={handleConfirmBlockUser}
				isConfirming={isBlockConfirming}
				variant={blockConfirmMode === "unblock" ? "default" : "destructive"}
			/>
			<ConfirmationModal
				open={removeConfirmOpen}
				onOpenChange={(open) => {
					if (!open && !isRemoveConfirming) setRemoveConfirmOpen(false);
				}}
				title={USER_REMOVE_CONFIRM_DIALOG.title}
				description={USER_REMOVE_CONFIRM_DIALOG.description}
				icon={<Trash2 className="size-12 text-destructive" aria-hidden />}
				confirmLabel={USER_REMOVE_CONFIRM_DIALOG.confirm}
				cancelLabel={USER_REMOVE_CONFIRM_DIALOG.cancel}
				onConfirm={handleConfirmRemoveUser}
				isConfirming={isRemoveConfirming}
				variant="destructive"
			/>
			<ConfirmationModal
				open={cancelInviteConfirmOpen}
				onOpenChange={(open) => {
					if (!open && !isCancelInviteConfirming)
						setCancelInviteConfirmOpen(false);
				}}
				title={USER_CANCEL_INVITE_CONFIRM_DIALOG.title}
				description={USER_CANCEL_INVITE_CONFIRM_DIALOG.description}
				icon={<XOctagon className="size-12 text-destructive" aria-hidden />}
				confirmLabel={USER_CANCEL_INVITE_CONFIRM_DIALOG.confirm}
				cancelLabel={USER_CANCEL_INVITE_CONFIRM_DIALOG.cancel}
				onConfirm={handleConfirmCancelInvite}
				isConfirming={isCancelInviteConfirming}
				variant="destructive"
			/>
			<ConfirmationModal
				open={resendInviteConfirmOpen}
				onOpenChange={(open) => {
					if (!open && !isResendInviteConfirming)
						setResendInviteConfirmOpen(false);
				}}
				title={USER_RESEND_INVITE_CONFIRM_DIALOG.title}
				description={USER_RESEND_INVITE_CONFIRM_DIALOG.description}
				icon={<Redo2 className="size-12" aria-hidden />}
				confirmLabel={USER_RESEND_INVITE_CONFIRM_DIALOG.confirm}
				cancelLabel={USER_RESEND_INVITE_CONFIRM_DIALOG.cancel}
				onConfirm={handleConfirmResendInvite}
				isConfirming={isResendInviteConfirming}
				variant="default"
			/>
			{loading && (
				<div className="flex items-center justify-center py-12">
					<Loader2
						className="size-8 shrink-0 animate-spin text-primary"
						aria-hidden
					/>
				</div>
			)}
			{!loading && isError && (
				<>
					<div className="rounded-lg bg-error-bg p-4 text-error-text">
						{displayError}
					</div>
					<Button
						variant="link"
						className="mt-4"
						type="button"
						onClick={handleBack}
					>
						{USER_DIRECTORY_PAGE_CONTENT.breadcrumbsTitle}
					</Button>
				</>
			)}
			{!loading && !isError && userDetail && (
				<div className="-m-6 flex min-h-full flex-col bg-content-bg p-6 pt-3">
					<UserDetailsPageToolbar
						variant={isEditMode ? "edit" : "view"}
						user={userDetail}
						onBack={handleBack}
						onEditClick={!isEditMode && canEditUser ? handleEdit : undefined}
						onRemoveClick={canRemoveUser ? handleOpenRemoveDialog : undefined}
						onBlockClick={canBlockUser ? handleOpenBlockDialog : undefined}
						onUnblockClick={canBlockUser ? handleOpenUnblockDialog : undefined}
						isBlockActionPending={isBlockConfirming}
						isRemoveActionPending={isRemoveConfirming}
						onCancelInvitationClick={
							canCancelInvitation ? handleOpenCancelInviteDialog : undefined
						}
						isCancelInvitationPending={isCancelInviteConfirming}
						onResendInviteClick={
							canResendInvite ? handleOpenResendInviteDialog : undefined
						}
						isResendInvitePending={isResendInviteConfirming}
					/>
					{isEditMode ? (
						<EditUserDetailsContent
							user={userDetail}
							categoriesWithRoles={categoriesWithRoles}
							rolesTreeLoading={rolesTreeLoading}
							rolesTreeError={rolesTreeError}
							onCancel={handleCancelEdit}
							onSave={handleSaveUser}
							isSaving={isSaving}
						/>
					) : (
						<>
							<div className="flex h-11 min-h-11 w-full items-center rounded-xl bg-card-foreground p-1 mt-4">
								<nav
									className="flex flex-1 flex-wrap items-center gap-4"
									aria-label={V.tabNavAriaLabel}
								>
									{VIEW_USER_TABS.map((tab) => (
										<button
											key={tab.id}
											type="button"
											onClick={() => setActiveTab(tab.id)}
											className={cn(
												"inline-flex h-8 min-h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 px-2.5 py-1.5 text-small font-semibold transition-colors",
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
							<div className="mt-6 flex min-h-0 flex-1 flex-col pb-6">
								{activeTab === "basic" ? (
									<ViewUserDetailsContent user={userDetail} />
								) : (
									<div className="pb-6">
										<AssessmentDirectoryContent
											variant="adminUser"
											cognitoSub={userDetail.cognitoSub}
											returnUserId={userId}
										/>
									</div>
								)}
							</div>
						</>
					)}
				</div>
			)}
		</AppLayout>
	);
}
