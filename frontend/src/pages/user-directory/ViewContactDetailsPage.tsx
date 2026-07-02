import {
	ChevronLeft,
	CircleCheckBig,
	Loader2,
	Send,
	SquarePen,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { patchKeyContact } from "@/api/key-contacts.api";
import {
	BSPBadge,
	ConfirmationModal,
	EditContactDetailsContent,
	SendInviteContactDialog,
	ViewContactDetailsContent,
} from "@/components";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	VIEW_CONTACT_DETAILS_PAGE as C,
	CONTACT_DIRECTORY_NAV,
	CONTACT_DIRECTORY_ROOT_PATH,
	CONTACT_REMOVE_CONFIRM_DIALOG,
	CONTACT_SEND_INVITE_REQUIRES_CORP_AND_COMPANY_TOOLTIP,
	contactRemoveConfirmDescription,
	EDIT_CONTACT_PAGE,
	EDIT_CONTACT_SAVE_ACK_DIALOG,
	ROUTES,
	SUBMODULE_KEYS,
	USER_DIRECTORY_PAGE_CONTENT,
} from "@/const";
import { usePermissions } from "@/hooks";
import { AppLayout } from "@/layout";
import { useKeyContactsStore } from "@/store";
import type {
	ContactDetailsPageToolbarProps,
	ContactDirectoryItem,
	KeyContactDetails,
	PatchKeyContactPayload,
} from "@/types";
import { formatCode, formatFullName } from "@/utils";

function contactDetailToDirectoryItemForInvite(
	detail: KeyContactDetails,
): ContactDirectoryItem {
	return {
		id: detail.id,
		contactCode: detail.contactCode,
		firstName: detail.firstName,
		lastName: detail.lastName,
		email: detail.email,
		corporationName: detail.corporation?.legalName ?? null,
		corporationCode: detail.corporation?.corporationCode ?? null,
		companyName: detail.company?.legalName ?? null,
		corporationRegion: null,
		contactType: detail.contactType ?? null,
		jobRole: detail.jobRole,
		workPhone: detail.workPhone,
		timezone: detail.timezone,
		createdAt: detail.createdOn,
	};
}

function ContactDetailsPageToolbar({
	variant,
	contact,
	onBack,
	onEditClick,
	onRemoveClick,
	canSendInvite = true,
	onSendInviteClick,
}: ContactDetailsPageToolbarProps) {
	const name = formatFullName(contact.firstName, contact.lastName);
	const isView = variant === "view";

	return (
		<div className="flex shrink-0 flex-col gap-4">
			<div className="flex min-h-[52px] w-full flex-wrap items-center justify-between gap-4">
				<div className="flex flex-wrap items-center gap-3">
					<Button
						variant="outline"
						type="button"
						icon={ChevronLeft}
						onClick={onBack}
					>
						{C.backButton}
					</Button>
					<div className="flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-2">
						<h1
							className="min-w-0 max-w-full truncate text-heading-4 font-semibold text-text-foreground capitalize"
							title={name}
						>
							{name}
						</h1>
						<BSPBadge type="default" className="font-medium">
							{formatCode(contact.contactCode, "CNT")}
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
							onClick={onRemoveClick}
						>
							{C.removeContactButton}
						</Button>
					) : null}
					{isView && onEditClick ? (
						<Button
							type="button"
							variant="outline"
							icon={SquarePen}
							onClick={onEditClick}
						>
							{C.editContactButton}
						</Button>
					) : null}
					{onSendInviteClick ? (
						!canSendInvite ? (
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="inline-flex">
										<Button type="button" icon={Send} disabled>
											{C.sendInviteButton}
										</Button>
									</span>
								</TooltipTrigger>
								<TooltipContent side="bottom" className="max-w-xs">
									{CONTACT_SEND_INVITE_REQUIRES_CORP_AND_COMPANY_TOOLTIP}
								</TooltipContent>
							</Tooltip>
						) : (
							<Button type="button" icon={Send} onClick={onSendInviteClick}>
								{C.sendInviteButton}
							</Button>
						)
					) : null}
				</div>
			</div>
		</div>
	);
}

export function ViewContactDetailsPage() {
	const { contactId } = useParams<{ contactId: string }>();
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const isEditMode = pathname.endsWith("/edit");
	const { can } = usePermissions();
	const canInviteContact = can(SUBMODULE_KEYS.USER_DIRECTORY_INVITE);
	const canEditContact = can(SUBMODULE_KEYS.USER_DIRECTORY_EDIT_CONTACT);
	const canRemoveContact = can(SUBMODULE_KEYS.USER_DIRECTORY_REMOVE_CONTACT);

	const {
		contactDetail,
		contactDetailLoading,
		contactDetailError,
		fetchKeyContactById,
		clearContactDetail,
		sendKeyContactInvite,
		isSendKeyContactInviteSubmitting,
		deleteKeyContact,
		isDeleteKeyContactSubmitting,
	} = useKeyContactsStore();

	const [isSaving, setIsSaving] = useState(false);
	const [saveAckOpen, setSaveAckOpen] = useState(false);
	const [removeContactOpen, setRemoveContactOpen] = useState(false);
	const [sendInviteOpen, setSendInviteOpen] = useState(false);
	const [sendInviteContact, setSendInviteContact] =
		useState<ContactDirectoryItem | null>(null);

	const handleBack = useCallback(() => {
		navigate(CONTACT_DIRECTORY_NAV);
	}, [navigate]);

	const handleEditContact = useCallback(() => {
		const id = contactId?.trim();
		if (id) navigate(ROUTES.userDirectory.contactEditWithIdPath(id));
	}, [navigate, contactId]);

	const handleOpenRemoveContact = useCallback(() => {
		setRemoveContactOpen(true);
	}, []);

	const handleConfirmRemoveContact = useCallback(async () => {
		const id = contactId?.trim();
		if (!id) return;
		const ok = await deleteKeyContact(id);
		if (!ok) return;
		setRemoveContactOpen(false);
		navigate(CONTACT_DIRECTORY_NAV);
	}, [contactId, deleteKeyContact, navigate]);

	const handleSendInviteFromDetail = useCallback(() => {
		if (!contactDetail?.corporation || !contactDetail?.company) {
			return;
		}
		setSendInviteContact(contactDetailToDirectoryItemForInvite(contactDetail));
		setSendInviteOpen(true);
	}, [contactDetail]);

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
			navigate(CONTACT_DIRECTORY_NAV);
		},
		[sendInviteContact, sendKeyContactInvite, navigate],
	);

	const handleCancelEdit = useCallback(() => {
		const id = contactId?.trim();
		if (id) navigate(ROUTES.userDirectory.contactViewWithIdPath(id));
		else navigate(CONTACT_DIRECTORY_NAV);
	}, [navigate, contactId]);

	const handleSaveContact = useCallback(
		async (payload: PatchKeyContactPayload) => {
			const id = contactId?.trim();
			if (!id) return false;
			setIsSaving(true);
			try {
				const result = await patchKeyContact(id, payload);
				if (!result.ok) {
					toast.error(result.message);
					return false;
				}
				await fetchKeyContactById(id);
				setSaveAckOpen(true);
				return true;
			} finally {
				setIsSaving(false);
			}
		},
		[contactId, fetchKeyContactById],
	);

	const handleSaveAckConfirm = useCallback(() => {
		const id = contactId?.trim();
		setSaveAckOpen(false);
		if (id) navigate(ROUTES.userDirectory.contactViewWithIdPath(id));
	}, [contactId, navigate]);

	useEffect(() => {
		if (!isEditMode || canEditContact) return;
		const id = contactId?.trim();
		if (id)
			navigate(ROUTES.userDirectory.contactViewWithIdPath(id), {
				replace: true,
			});
		else navigate(ROUTES.userDirectory.root, { replace: true });
	}, [isEditMode, canEditContact, contactId, navigate]);

	useEffect(() => {
		if (contactId?.trim()) {
			fetchKeyContactById(contactId.trim());
		} else {
			fetchKeyContactById("");
		}
		return () => clearContactDetail();
	}, [contactId, fetchKeyContactById, clearContactDetail]);

	const breadcrumbs = useMemo(
		() => [
			{
				label: USER_DIRECTORY_PAGE_CONTENT.breadcrumbsTitle,
				path: CONTACT_DIRECTORY_ROOT_PATH,
			},
			isEditMode
				? {
						label: EDIT_CONTACT_PAGE.breadcrumbEdit,
						path: contactId
							? ROUTES.userDirectory.contactEditWithIdPath(contactId)
							: CONTACT_DIRECTORY_ROOT_PATH,
					}
				: {
						label: C.breadcrumbViewDetails,
						path: contactId
							? ROUTES.userDirectory.contactViewWithIdPath(contactId)
							: CONTACT_DIRECTORY_ROOT_PATH,
					},
		],
		[isEditMode, contactId],
	);

	const loading = contactDetailLoading;
	const isError =
		Boolean(contactDetailError) || (!contactDetailLoading && !contactDetail);
	const displayError = contactDetailError ?? C.notFound;

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
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
			{!loading && !isError && contactDetail && (
				<div className="-m-6 flex min-h-full flex-col bg-content-bg p-6 pt-3">
					<ContactDetailsPageToolbar
						variant={isEditMode ? "edit" : "view"}
						contact={contactDetail}
						onBack={handleBack}
						onEditClick={
							!isEditMode && canEditContact ? handleEditContact : undefined
						}
						onRemoveClick={
							canRemoveContact ? handleOpenRemoveContact : undefined
						}
						canSendInvite={Boolean(
							contactDetail.corporation && contactDetail.company,
						)}
						onSendInviteClick={
							canInviteContact ? handleSendInviteFromDetail : undefined
						}
					/>
					{isEditMode ? (
						<EditContactDetailsContent
							contact={contactDetail}
							onCancel={handleCancelEdit}
							onSave={handleSaveContact}
							isSaving={isSaving}
						/>
					) : (
						<ViewContactDetailsContent contact={contactDetail} />
					)}
				</div>
			)}
			<SendInviteContactDialog
				open={sendInviteOpen}
				onOpenChange={(open) => {
					setSendInviteOpen(open);
					if (!open) setSendInviteContact(null);
				}}
				isSubmitting={isSendKeyContactInviteSubmitting}
				onSubmit={handleConfirmSendInvite}
			/>

			<ConfirmationModal
				open={saveAckOpen}
				onOpenChange={(open) => {
					if (!open) setSaveAckOpen(false);
				}}
				ack
				title={EDIT_CONTACT_SAVE_ACK_DIALOG.title}
				description={EDIT_CONTACT_SAVE_ACK_DIALOG.description}
				icon={
					<CircleCheckBig
						className="size-12 text-interactive-success"
						aria-hidden
					/>
				}
				confirmLabel={EDIT_CONTACT_SAVE_ACK_DIALOG.confirm}
				onConfirm={handleSaveAckConfirm}
			/>

			<ConfirmationModal
				open={removeContactOpen}
				onOpenChange={(open) => {
					if (!open && !isDeleteKeyContactSubmitting)
						setRemoveContactOpen(false);
				}}
				title={CONTACT_REMOVE_CONFIRM_DIALOG.title}
				description={contactRemoveConfirmDescription(
					contactDetail?.contactType ?? "",
				)}
				icon={<Trash2 className="size-12 text-destructive" aria-hidden />}
				confirmLabel={CONTACT_REMOVE_CONFIRM_DIALOG.confirm}
				cancelLabel={CONTACT_REMOVE_CONFIRM_DIALOG.cancel}
				onConfirm={handleConfirmRemoveContact}
				isConfirming={isDeleteKeyContactSubmitting}
				variant="destructive"
				confirmIcon={Trash2}
			/>
		</AppLayout>
	);
}
