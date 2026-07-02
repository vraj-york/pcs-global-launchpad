import { Ban, ChevronLeft, OctagonX, RotateCcw, SquarePen } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
	BSPBadge,
	ConfirmationModal,
	CorporationActionModal,
	CorporationDetailsContent,
	CorporationEditContent,
} from "@/components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	CORPORATE_DIRECTORY_PAGE_CONTENT as C,
	REINSTATE_CORPORATION_MODAL,
	ROUTES,
	VIEW_CORPORATION_TABS,
} from "@/const";
import { cn } from "@/lib/utils";
import { useCorporationsStore } from "@/store";
import type {
	CorporationActionType,
	CorporationStatus,
	ViewCorporationContentProps,
	ViewCorporationTabId,
	ViewCorporationViewerRole,
} from "@/types";
import { formatCode } from "@/utils/sharedUtils";

function toCorporationStatus(status: string): CorporationStatus {
	const s = status?.toLowerCase();
	if (["active", "suspended", "closed", "incomplete"].includes(s))
		return s as CorporationStatus;
	return "incomplete";
}

export function ViewCorporationContent({
	corporation,
	onEditModeChange,
	initialEditMode,
	viewerRole = "superAdmin" as ViewCorporationViewerRole,
	directoryBack,
}: ViewCorporationContentProps) {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const [activeTab, setActiveTab] = useState<ViewCorporationTabId>("basic");
	const [isEditMode, setIsEditMode] = useState(
		viewerRole === "corporationAdmin" ? false : (initialEditMode ?? false),
	);
	const [actionModalOpen, setActionModalOpen] = useState(false);
	const [actionType, setActionType] = useState<CorporationActionType | null>(
		null,
	);
	const [reinstateModalOpen, setReinstateModalOpen] = useState(false);
	const [isReinstating, setIsReinstating] = useState(false);

	useEffect(() => {
		if (viewerRole === "corporationAdmin") return;
		if (initialEditMode) onEditModeChange?.(true);
	}, [initialEditMode, onEditModeChange, viewerRole]);

	const selectedCompanyId = searchParams.get("companyId");

	// When URL has companyId, ensure Companies tab is active (e.g. shared link or redirect from card)
	useEffect(() => {
		if (selectedCompanyId && activeTab !== "companies") {
			setActiveTab("companies");
		}
	}, [selectedCompanyId]);

	const status = toCorporationStatus(corporation.status);
	const isCorporationAdminView = viewerRole === "corporationAdmin";
	const resolvedDirectoryBack =
		directoryBack === undefined
			? { path: ROUTES.corporateDirectory.root, label: C.backButton }
			: directoryBack;

	const handleCompanyClick = (companyId: string) => {
		setActiveTab("companies");
		const next = new URLSearchParams(searchParams);
		next.set("companyId", companyId);
		setSearchParams(next, { replace: true });
	};

	const handleBackToCompanies = () => {
		const next = new URLSearchParams(searchParams);
		next.delete("companyId");
		setSearchParams(next, { replace: true });
	};

	const handleEdit = () => {
		setIsEditMode(true);
		onEditModeChange?.(true);
	};
	const handleCancelEdit = () => {
		setIsEditMode(false);
		onEditModeChange?.(false);
	};

	const { updateCorporationStatus, reinstateCorporation } =
		useCorporationsStore();

	const handleActionConfirm = async (
		action: CorporationActionType,
		reason: string,
		notes: string,
	) => {
		const status = action === "close" ? "CLOSED" : "SUSPENDED";
		await updateCorporationStatus(corporation.id, {
			status,
			suspendCloseReason: reason.trim(),
			suspendCloseAdditionalNotes: notes?.trim() ?? "",
		});
	};

	const handleReinstateConfirm = async () => {
		setIsReinstating(true);
		await reinstateCorporation(corporation.id);
		setReinstateModalOpen(false);
		setIsReinstating(false);
	};

	return (
		<div className="-m-6 flex min-h-full flex-col bg-content-bg p-6 pt-3">
			<div className="flex shrink-0 flex-col gap-4">
				<div className="flex min-h-[52px] w-full flex-wrap items-center justify-between gap-4">
					<div className="flex flex-wrap items-center gap-3">
						{resolvedDirectoryBack != null && (
							<Button
								variant="outline"
								type="button"
								icon={ChevronLeft}
								onClick={() => navigate(resolvedDirectoryBack.path)}
							>
								{resolvedDirectoryBack.label}
							</Button>
						)}
						<div className="flex min-h-9 flex-1 items-center gap-2 min-w-0">
							<h1 className="min-w-0 truncate text-heading-4 font-semibold text-text-foreground capitalize">
								{isEditMode
									? `${C.viewEditButton} ${corporation.legalName}`
									: corporation.legalName}
							</h1>
							{isCorporationAdminView ? (
								<>
									{corporation.dataResidencyRegion?.trim() ? (
										<BSPBadge
											type="default"
											className="max-w-48 truncate capitalize"
										>
											{corporation.dataResidencyRegion.trim()}
										</BSPBadge>
									) : null}
									{corporation.industry?.trim() ? (
										<Badge
											variant="secondary"
											className="max-w-56 shrink-0 truncate text-xs font-semibold capitalize"
										>
											{corporation.industry.trim()}
										</Badge>
									) : null}
								</>
							) : (
								<>
									<BSPBadge type="default">
										{formatCode(corporation.corporationCode, "CORP")}
									</BSPBadge>
									<BSPBadge type={`${status}_filled`} className="capitalize">
										{status}
									</BSPBadge>
								</>
							)}
						</div>
					</div>
					<div className="flex shrink-0 flex-wrap items-center gap-2.5">
						{!isCorporationAdminView && status === "suspended" && (
							<Button
								icon={RotateCcw}
								onClick={() => setReinstateModalOpen(true)}
							>
								{C.reinstateButton}
							</Button>
						)}
						{!isCorporationAdminView &&
							status !== "closed" &&
							status !== "suspended" && (
								<Button
									variant="outline"
									className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
									icon={Ban}
									onClick={() => {
										setActionType("suspend");
										setActionModalOpen(true);
									}}
								>
									{C.viewSuspendButton}
								</Button>
							)}
						{!isCorporationAdminView && status !== "closed" && (
							<Button
								variant="destructive"
								icon={OctagonX}
								onClick={() => {
									setActionType("close");
									setActionModalOpen(true);
								}}
							>
								{C.viewCloseCorporationButton}
							</Button>
						)}
						{!isCorporationAdminView && !isEditMode && status !== "closed" && (
							<Button icon={SquarePen} onClick={handleEdit}>
								{C.viewEditCorporationButton}
							</Button>
						)}
					</div>
				</div>

				<div className="flex h-11 min-h-11 w-full items-center rounded-xl bg-card-foreground p-1">
					<nav
						className="flex flex-1 flex-wrap items-center gap-4"
						aria-label="Corporation sections"
					>
						{VIEW_CORPORATION_TABS.map((tab) => (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								className={cn(
									"inline-flex h-8 min-h-8 items-center justify-center gap-2 rounded-lg border-0 px-2.5 py-1.5 text-small font-semibold transition-colors cursor-pointer",
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
			</div>

			<div className="mt-6 flex min-h-0 flex-1 flex-col pb-6">
				{isEditMode ? (
					<CorporationEditContent
						corporation={corporation}
						activeTab={activeTab}
						onCancelEdit={handleCancelEdit}
					/>
				) : (
					<CorporationDetailsContent
						corporation={corporation}
						activeTab={activeTab}
						formatCorpId={(code) => formatCode(code, "CORP")}
						selectedCompanyId={selectedCompanyId}
						onCompanyClick={handleCompanyClick}
						onBackToCompanies={handleBackToCompanies}
					/>
				)}
			</div>

			{actionType && (
				<CorporationActionModal
					open={actionModalOpen}
					onOpenChange={(open) => {
						setActionModalOpen(open);
						if (!open) setActionType(null);
					}}
					action={actionType}
					corporationName={corporation.legalName}
					onConfirm={handleActionConfirm}
					contentClassName="w-full max-w-2xl p-0"
				/>
			)}
			<ConfirmationModal
				open={reinstateModalOpen}
				onOpenChange={setReinstateModalOpen}
				title={REINSTATE_CORPORATION_MODAL.title}
				description={REINSTATE_CORPORATION_MODAL.description}
				icon={<RotateCcw className="size-12 text-icon-info" aria-hidden />}
				confirmLabel={REINSTATE_CORPORATION_MODAL.confirm}
				confirmIcon={RotateCcw}
				cancelLabel={REINSTATE_CORPORATION_MODAL.cancel}
				onConfirm={handleReinstateConfirm}
				isConfirming={isReinstating}
				variant="default"
			/>
		</div>
	);
}
