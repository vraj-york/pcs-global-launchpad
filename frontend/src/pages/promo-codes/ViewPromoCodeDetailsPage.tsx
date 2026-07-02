import {
	ChevronLeft,
	CircleCheckBig,
	Loader2,
	MinusCircle,
	SquarePen,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
	deletePromoCode,
	getPromoCodeById,
	patchPromoCodePromotionActive,
} from "@/api";
import {
	BSPBadge,
	ConfirmationModal,
	DetailRow,
	PromoCodePromotionEnableWarning,
	PromoCodeUsageHistoryPanel,
} from "@/components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { PROMO_CODES_PAGE_CONTENT, ROUTES } from "@/const";
import { AppLayout } from "@/layout";
import { cn } from "@/lib/utils";
import type { PromoCodeDetailData } from "@/types";
import { formatDateShortUtc } from "@/utils";

const C = PROMO_CODES_PAGE_CONTENT;

function promoCodesListStatusLabel(
	status: "active" | "inactive" | "expired",
): string {
	if (status === "inactive") return C.list.filters.status.disabled;
	if (status === "expired") return C.list.filters.status.expired;
	return C.list.filters.status.active;
}

function formatExpiry(iso: string | null): string {
	if (!iso) return C.detail.infoSection.noExpiry;
	return formatDateShortUtc(iso) || iso;
}

export function ViewPromoCodeDetailsPage() {
	const { promoCodeId } = useParams<{ promoCodeId: string }>();
	const navigate = useNavigate();
	const [detail, setDetail] = useState<PromoCodeDetailData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [tab, setTab] = useState<"basic" | "usage">("basic");
	const [promotionSaving, setPromotionSaving] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteInProgress, setDeleteInProgress] = useState(false);

	const load = useCallback(async () => {
		if (!promoCodeId?.trim()) {
			setError(C.detail.notFound);
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		const res = await getPromoCodeById(promoCodeId);
		if (!res.ok) {
			setDetail(null);
			setError(res.status === 404 ? C.detail.notFound : C.detail.loadError);
			setLoading(false);
			return;
		}
		setDetail(res.data);
		setLoading(false);
	}, [promoCodeId]);

	useEffect(() => {
		void load();
	}, [load]);

	const breadcrumbs = [
		{ label: C.breadcrumbManagement, path: ROUTES.promoCodes.root },
		...(promoCodeId
			? [
					{
						label: C.detail.breadcrumb,
						path: ROUTES.promoCodes.viewWithIdPath(promoCodeId),
					},
				]
			: []),
	];

	const applyPromotionActive = useCallback(
		async (next: boolean) => {
			if (!promoCodeId?.trim()) return;
			setPromotionSaving(true);
			try {
				const res = await patchPromoCodePromotionActive(promoCodeId, next);
				if (!res.ok) {
					toast.error(res.message || C.list.activationFailed);
					return;
				}
				toast.success(C.list.activationUpdated);
				await load();
			} finally {
				setPromotionSaving(false);
			}
		},
		[promoCodeId, load],
	);

	const canTogglePromotion = detail != null && detail.status !== "expired";

	const handleTabBasic = () => {
		setTab("basic");
	};

	const handleTabUsage = () => {
		setTab("usage");
	};

	const handlePromotionSwitchChange = (v: boolean) => {
		void applyPromotionActive(v);
	};

	const confirmDeletePromo = useCallback(async () => {
		if (!promoCodeId?.trim()) return;
		setDeleteInProgress(true);
		try {
			const res = await deletePromoCode(promoCodeId);
			if (!res.ok) {
				toast.error(
					typeof res.message === "string" ? res.message : C.list.deleteFailed,
				);
				return;
			}
			toast.success(C.list.deleteSuccess);
			setDeleteOpen(false);
			navigate(ROUTES.promoCodes.root);
		} finally {
			setDeleteInProgress(false);
		}
	}, [promoCodeId, navigate]);

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

			{!loading && error && (
				<div className="mx-auto w-full max-w-7xl space-y-4">
					<div className="rounded-lg bg-error-bg p-4 text-error-text">
						{error}
					</div>
					<Button variant="outline" asChild>
						<Link to={ROUTES.promoCodes.root}>{C.detail.back}</Link>
					</Button>
				</div>
			)}

			{!loading && detail && (
				<div className="-m-6 flex min-h-full flex-col bg-content-bg p-6 pt-3">
					<div className="flex shrink-0 flex-col gap-4">
						<div className="flex min-h-[52px] w-full flex-wrap items-center justify-between gap-4">
							<div className="flex flex-wrap items-center gap-3">
								<Button
									variant="outline"
									type="button"
									icon={ChevronLeft}
									onClick={() => navigate(ROUTES.promoCodes.root)}
								>
									{C.detail.back}
								</Button>
								<div className="flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-2">
									<h1
										className="min-w-0 max-w-full truncate text-heading-4 font-semibold text-text-foreground"
										title={detail.code}
									>
										{detail.code}
									</h1>
									<BSPBadge
										type={`${detail.status}_filled`}
										data-slot="promo-status-pill"
									>
										{promoCodesListStatusLabel(detail.status)}
									</BSPBadge>
									{detail.planTypeName?.trim() ? (
										<BSPBadge
											type={
												detail.planTypeId
													? `${detail.planTypeId}_filled`
													: "default"
											}
										>
											{detail.planTypeName}
										</BSPBadge>
									) : null}
								</div>
							</div>
							<div className="flex shrink-0 flex-wrap items-center gap-2">
								<Button
									type="button"
									variant="outline"
									className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
									icon={Trash2}
									onClick={() => setDeleteOpen(true)}
								>
									{C.detail.deleteCode}
								</Button>
								{tab === "usage" ? (
									detail.stripePromotionCodeActive ? (
										<Button
											type="button"
											variant="outline"
											icon={MinusCircle}
											disabled={!canTogglePromotion || promotionSaving}
											onClick={() => void applyPromotionActive(false)}
										>
											{C.detail.disableCode}
										</Button>
									) : (
										<Button
											type="button"
											variant="outline"
											className="border-primary/70 text-primary hover:bg-primary/5"
											icon={CircleCheckBig}
											disabled={!canTogglePromotion || promotionSaving}
											onClick={() => void applyPromotionActive(true)}
										>
											{C.detail.activateCode}
										</Button>
									)
								) : null}
								<Button type="button" asChild>
									<Link
										to={
											promoCodeId
												? ROUTES.promoCodes.editWithIdPath(promoCodeId)
												: ROUTES.promoCodes.root
										}
									>
										<SquarePen className="size-4" aria-hidden />
										{C.detail.editDetails}
									</Link>
								</Button>
							</div>
						</div>

						<div className="flex h-11 min-h-11 w-full items-center rounded-xl bg-card-foreground p-1">
							<div
								className="flex flex-1 flex-wrap items-center gap-4"
								aria-label={C.detail.tabsListAriaLabel}
								role="tablist"
							>
								<button
									type="button"
									role="tab"
									tabIndex={0}
									aria-selected={tab === "basic"}
									className={cn(
										"inline-flex h-8 min-h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 px-2.5 py-1.5 text-small font-semibold transition-colors",
										tab === "basic"
											? "bg-background text-brand-primary"
											: "bg-transparent text-text-secondary hover:text-text-foreground",
									)}
									onClick={handleTabBasic}
								>
									{C.detail.tabs.basic}
								</button>
								<button
									type="button"
									role="tab"
									tabIndex={0}
									aria-selected={tab === "usage"}
									className={cn(
										"inline-flex h-8 min-h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 px-2.5 py-1.5 text-small font-semibold transition-colors",
										tab === "usage"
											? "bg-background text-brand-primary"
											: "bg-transparent text-text-secondary hover:text-text-foreground",
									)}
									onClick={handleTabUsage}
								>
									{C.detail.tabs.usage}
								</button>
							</div>
						</div>
					</div>

					<div className="mt-6 flex min-h-0 flex-1 flex-col">
						{tab === "usage" && promoCodeId ? (
							<PromoCodeUsageHistoryPanel promoCodeId={promoCodeId} />
						) : null}

						{tab === "basic" ? (
							<div className="grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-2">
								<div className="flex min-w-0 w-full flex-col gap-4">
									<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
										<CardHeader className="flex w-full flex-col gap-3 border-b border-border p-4 !pb-4 sm:flex-row sm:items-center sm:justify-between">
											<div className="min-w-0 flex-1 space-y-1">
												<CardTitle className="text-base font-medium text-text-secondary">
													{C.detail.enableSection.title}
												</CardTitle>
												<p className="text-small text-muted-foreground">
													{C.detail.enableSection.subtitle}
												</p>
											</div>
											<Switch
												className="shrink-0"
												checked={detail.stripePromotionCodeActive}
												disabled={!canTogglePromotion || promotionSaving}
												title={
													!canTogglePromotion
														? C.detail.switchDisabledHint
														: undefined
												}
												onCheckedChange={handlePromotionSwitchChange}
												aria-label={`${C.detail.enableSection.title}. ${C.detail.enableSection.subtitle}`}
											/>
										</CardHeader>
										<CardContent className="flex flex-col gap-4 px-4 pt-4 pb-4">
											<PromoCodePromotionEnableWarning
												title={C.detail.enableSection.warningTitle}
												body={C.detail.enableSection.warningBody}
											/>
										</CardContent>
									</Card>
								</div>
								<div className="flex min-w-0 w-full flex-col gap-4">
									<Card className="w-full gap-0 rounded-xl border border-border bg-background p-0 shadow-none">
										<CardHeader className="flex h-14 w-full items-center justify-between gap-6 border-b border-border p-4 !pb-4">
											<CardTitle className="flex flex-1 items-center text-base font-medium text-text-secondary">
												{C.detail.infoSection.title}
											</CardTitle>
										</CardHeader>
										<CardContent className="flex w-full flex-col gap-4 pt-4 pb-0">
											<div className="flex w-full flex-col gap-3">
												<DetailRow
													label={C.detail.infoSection.promoCode}
													value={detail.code}
													emptyPlaceholder={C.typography.emDash}
												/>
												<DetailRow label={C.detail.infoSection.status}>
													<BSPBadge
														type={detail.status}
														data-slot="promo-status-pill"
													>
														{promoCodesListStatusLabel(detail.status)}
													</BSPBadge>
												</DetailRow>
												<DetailRow label={C.detail.infoSection.plan}>
													<BSPBadge type={detail.planTypeId}>
														{detail.planTypeName}
													</BSPBadge>
												</DetailRow>
												<DetailRow
													label={C.detail.infoSection.description}
													value={
														detail.description?.trim()
															? detail.description.trim()
															: undefined
													}
													emptyPlaceholder={
														C.detail.infoSection.descriptionNotAvailable
													}
												/>
												<DetailRow
													label={C.detail.infoSection.discountType}
													value={detail.discountTypeDisplay}
													emptyPlaceholder={C.typography.emDash}
												/>
												<DetailRow
													label={C.detail.infoSection.discount}
													value={detail.discountSummary}
													emptyPlaceholder={C.typography.emDash}
												/>
												<DetailRow
													label={C.detail.infoSection.maxUsage}
													value={
														detail.maxRedemptions != null
															? String(detail.maxRedemptions)
															: C.detail.infoSection.noMax
													}
													emptyPlaceholder={C.typography.emDash}
												/>
												<DetailRow
													label={C.detail.infoSection.instalmentType}
													value={
														detail.duration === "once"
															? C.form.instalmentOnce
															: C.form.instalmentForever
													}
													emptyPlaceholder={C.typography.emDash}
												/>
												<DetailRow
													label={C.detail.infoSection.expiryDate}
													value={formatExpiry(detail.expiresAt)}
													emptyPlaceholder={C.typography.emDash}
												/>
											</div>
										</CardContent>
									</Card>
								</div>
							</div>
						) : null}
					</div>

					<ConfirmationModal
						open={deleteOpen}
						onOpenChange={setDeleteOpen}
						title={C.edit.deleteDialogTitle}
						description={C.edit.deleteDialogDescription}
						icon={<Trash2 className="text-destructive size-12" aria-hidden />}
						confirmLabel={C.edit.deleteDialogConfirm}
						cancelLabel={C.edit.deleteDialogCancel}
						onConfirm={confirmDeletePromo}
						isConfirming={deleteInProgress}
						variant="destructive"
						confirmIcon={Trash2}
					/>
				</div>
			)}
		</AppLayout>
	);
}
