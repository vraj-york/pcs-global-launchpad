import { Ban, ChevronLeft, CircleX, RotateCcw, SquarePen } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	BSPBadge,
	CancelSubscriptionModal,
	ConfirmationModal,
	SuspendCompanyModal,
} from "@/components";
import { Button } from "@/components/ui/button";
import {
	BILLING_REINSTATE_MODAL,
	BILLING_ROW_ACTIONS,
	COMPANIES_DIRECTORY_PAGE_CONTENT as CD,
	ROUTES,
	VIEW_COMPANY_TABS,
} from "@/const";
import { cn } from "@/lib/utils";
import {
	useCompaniesStore,
	useCompanyAdminBillingStore,
	useCompanyDirectoryStore,
} from "@/store";
import type {
	CancelBillingSubscriptionPayload,
	CompanyStatus,
	ViewCompanyContentProps,
	ViewCompanyTabId,
	ViewCompanyViewerRole,
} from "@/types";
import { formatCode } from "@/utils";
import { CompanyDetailsContent } from "./CompanyDetailsContent";
import { CompanyEditContent } from "./CompanyEditContent";

function toCompanyStatus(status: string | undefined): CompanyStatus | null {
	const s = status?.toLowerCase() ?? "";
	if (
		s === "active" ||
		s === "suspended" ||
		s === "incomplete" ||
		s === "closed"
	)
		return s;
	return null;
}

export function ViewCompanyContent({
	company,
	onEditModeChange,
	initialEditMode,
	viewerRole = "superAdmin" as ViewCompanyViewerRole,
	directoryBack,
}: ViewCompanyContentProps) {
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState<ViewCompanyTabId>("basic");
	const [isEditMode, setIsEditMode] = useState(
		viewerRole === "companyAdmin" || viewerRole === "corporationAdmin"
			? false
			: (initialEditMode ?? false),
	);
	const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
	const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false);
	const [cancelSubscriptionOpen, setCancelSubscriptionOpen] = useState(false);
	const [reinstateSubscriptionOpen, setReinstateSubscriptionOpen] =
		useState(false);
	const [isSuspending, setIsSuspending] = useState(false);
	const [isReinstating, setIsReinstating] = useState(false);

	const { suspendCompany, reinstateCompany } = useCompaniesStore();
	const fetchCompanyById = useCompanyDirectoryStore((s) => s.fetchCompanyById);
	const {
		billingRow,
		setCompanyId: setBillingCompanyId,
		fetchBilling,
		cancelSubscription,
		reinstateSubscription,
		cancelBusy,
		reinstateBusy,
		reset: resetBillingStore,
	} = useCompanyAdminBillingStore();

	const status = toCompanyStatus(company.status);
	const planName = company.plan?.planType?.name ?? "";
	const isCompanyAdminView = viewerRole === "companyAdmin";
	const isCorporationAdminView = viewerRole === "corporationAdmin";
	const canManageCompany = viewerRole === "superAdmin" && !isEditMode;
	const parentCorporationName = company.corporation?.legalName?.trim() ?? "";
	const resolvedDirectoryBack =
		directoryBack === undefined
			? { path: ROUTES.companyDirectory.root, label: CD.backButton }
			: directoryBack;

	useEffect(() => {
		if (viewerRole === "companyAdmin" || viewerRole === "corporationAdmin") {
			return;
		}
		if (initialEditMode) onEditModeChange?.(true);
	}, [initialEditMode, onEditModeChange, viewerRole]);

	useEffect(() => {
		if (!isCompanyAdminView) {
			return;
		}
		setBillingCompanyId(company.id);
		void fetchBilling();
		return () => resetBillingStore();
	}, [
		isCompanyAdminView,
		company.id,
		setBillingCompanyId,
		fetchBilling,
		resetBillingStore,
	]);

	const showCancelSubscription = Boolean(
		isCompanyAdminView && billingRow?.canCancelSubscription,
	);
	const showReinstateSubscription = Boolean(
		isCompanyAdminView &&
			billingRow?.canReinstateSubscription &&
			billingRow.stripeSubscriptionId &&
			billingRow.cancelAtPeriodEnd &&
			!showCancelSubscription,
	);

	const handleEdit = () => {
		setIsEditMode(true);
		onEditModeChange?.(true);
	};

	const handleCancelEdit = () => {
		setIsEditMode(false);
		onEditModeChange?.(false);
	};

	const handleSuspendConfirm = useCallback(
		async (reason: string, notes: string) => {
			setIsSuspending(true);
			const result = await suspendCompany(company.id, {
				suspendReason: reason.trim(),
				suspendAdditionalNotes: notes?.trim() || undefined,
			});
			setIsSuspending(false);
			if (result.ok) {
				setSuspendDialogOpen(false);
				await fetchCompanyById(company.id);
			}
		},
		[suspendCompany, company.id, fetchCompanyById],
	);

	const handleReinstateConfirm = async () => {
		setIsReinstating(true);
		const result = await reinstateCompany(company.id);
		setIsReinstating(false);
		setReinstateDialogOpen(false);
		if (result.ok) await fetchCompanyById(company.id);
	};

	const handleCancelSubscriptionOpenChange = useCallback((open: boolean) => {
		setCancelSubscriptionOpen(open);
	}, []);

	const handleCancelSubscriptionConfirm = useCallback(
		async (payload: CancelBillingSubscriptionPayload) => {
			const res = await cancelSubscription(payload);
			if (res.ok) {
				setCancelSubscriptionOpen(false);
			}
		},
		[cancelSubscription],
	);

	const handleReinstateSubscriptionConfirm = useCallback(async () => {
		const res = await reinstateSubscription();
		if (res.ok) {
			setReinstateSubscriptionOpen(false);
		}
	}, [reinstateSubscription]);

	const title =
		company.legalName?.trim() || company.dbaName?.trim() || "Company";

	return (
		<div className="-m-6 flex min-h-full flex-col bg-content-bg p-6 pt-3">
			<div className="flex shrink-0 flex-col gap-4">
				<div className="flex min-h-[52px] w-full flex-wrap items-center justify-between gap-4">
					<div className="flex min-w-0 flex-1 flex-col gap-1">
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
							<div className="flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-2">
								<h1 className="min-w-0 max-w-full truncate text-heading-4 font-semibold text-text-foreground capitalize">
									{isEditMode ? `${CD.viewEditCompanyButton} ${title}` : title}
								</h1>
								{!isCompanyAdminView && company.companyCode != null && (
									<BSPBadge type="default">
										{formatCode(company.companyCode, "COMP")}
									</BSPBadge>
								)}
								{status ? (
									<BSPBadge type={`${status}_filled`} className="capitalize">
										{status}
									</BSPBadge>
								) : (
									<span className="text-small font-medium text-text-foreground">
										{CD.statusUnavailableLabel}
									</span>
								)}
								{planName ? (
									<BSPBadge type={`${company.plan?.planTypeId}_filled`}>
										{planName}
									</BSPBadge>
								) : null}
							</div>
						</div>
						{isCompanyAdminView && parentCorporationName ? (
							<p className="text-small font-medium text-text-secondary capitalize">
								{parentCorporationName}
							</p>
						) : null}
					</div>
					<div className="flex shrink-0 flex-wrap items-center gap-2">
						{isCompanyAdminView ? (
							<>
								{showCancelSubscription ? (
									<Button
										variant="outline"
										type="button"
										className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
										icon={CircleX}
										tabIndex={0}
										aria-label={BILLING_ROW_ACTIONS.menuCancelSubscription}
										onClick={() => setCancelSubscriptionOpen(true)}
									>
										{BILLING_ROW_ACTIONS.menuCancelSubscription}
									</Button>
								) : null}
								{showReinstateSubscription ? (
									<Button
										type="button"
										icon={RotateCcw}
										tabIndex={0}
										aria-label={BILLING_ROW_ACTIONS.menuReinstateSubscription}
										onClick={() => setReinstateSubscriptionOpen(true)}
									>
										{BILLING_ROW_ACTIONS.menuReinstateSubscription}
									</Button>
								) : null}
								<Button
									variant="outline"
									type="button"
									disabled
									icon={SquarePen}
									tabIndex={-1}
									aria-label={CD.viewUpgradePlanButton}
								>
									{CD.viewUpgradePlanButton}
								</Button>
							</>
						) : isCorporationAdminView ? null : (
							<>
								{status != null &&
									status !== "incomplete" &&
									status !== "closed" &&
									(status === "suspended" ? (
										<Button
											type="button"
											icon={RotateCcw}
											tabIndex={0}
											aria-label={CD.viewReinstateButton}
											onClick={() => setReinstateDialogOpen(true)}
										>
											{CD.viewReinstateButton}
										</Button>
									) : (
										<Button
											variant="outline"
											type="button"
											className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
											icon={Ban}
											tabIndex={0}
											aria-label={CD.viewSuspendButton}
											onClick={() => setSuspendDialogOpen(true)}
										>
											{CD.viewSuspendButton}
										</Button>
									))}
								{canManageCompany && status != null && status !== "closed" && (
									<Button type="button" icon={SquarePen} onClick={handleEdit}>
										{CD.viewEditCompanyButton}
									</Button>
								)}
							</>
						)}
					</div>
				</div>

				<div className="flex h-11 min-h-11 w-full items-center rounded-xl bg-card-foreground p-1">
					<nav
						className="flex flex-1 flex-wrap items-center gap-4"
						aria-label="Company sections"
					>
						{VIEW_COMPANY_TABS.map((tab) => (
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
			</div>

			<div className="mt-6 flex min-h-0 flex-1 flex-col pb-6">
				{isEditMode ? (
					<CompanyEditContent
						company={company}
						activeTab={activeTab}
						onCancelEdit={handleCancelEdit}
					/>
				) : (
					<CompanyDetailsContent company={company} activeTab={activeTab} />
				)}
			</div>

			<SuspendCompanyModal
				open={suspendDialogOpen}
				onOpenChange={setSuspendDialogOpen}
				companyName={title}
				onConfirm={handleSuspendConfirm}
				isConfirming={isSuspending}
			/>
			<ConfirmationModal
				open={reinstateDialogOpen}
				onOpenChange={setReinstateDialogOpen}
				title={CD.reinstateCompanyConfirmTitle}
				description={CD.reinstateCompanyConfirmDescription}
				icon={<RotateCcw className="size-12 text-icon-info" aria-hidden />}
				confirmLabel={CD.reinstateCompanyConfirmButton}
				confirmIcon={RotateCcw}
				cancelLabel={CD.confirmModalCancel}
				onConfirm={handleReinstateConfirm}
				isConfirming={isReinstating}
				variant="default"
			/>

			{isCompanyAdminView && billingRow && cancelSubscriptionOpen ? (
				<CancelSubscriptionModal
					open
					onOpenChange={handleCancelSubscriptionOpenChange}
					row={billingRow}
					onConfirm={handleCancelSubscriptionConfirm}
					isConfirming={cancelBusy}
				/>
			) : null}

			{isCompanyAdminView && reinstateSubscriptionOpen ? (
				<ConfirmationModal
					open
					onOpenChange={setReinstateSubscriptionOpen}
					title={BILLING_REINSTATE_MODAL.title}
					description={BILLING_REINSTATE_MODAL.description}
					icon={<RotateCcw className="size-12 text-icon-info" aria-hidden />}
					confirmLabel={BILLING_REINSTATE_MODAL.confirm}
					confirmIcon={RotateCcw}
					cancelLabel={BILLING_REINSTATE_MODAL.cancel}
					onConfirm={handleReinstateSubscriptionConfirm}
					isConfirming={reinstateBusy}
					variant="default"
				/>
			) : null}
		</div>
	);
}
