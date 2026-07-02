import { yupResolver } from "@hookform/resolvers/yup";
import { ChevronLeft, ChevronsUp, CircleX, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
	BSPBadge,
	CancelSubscriptionModal,
	CollapsibleCard,
	ConfirmationModal,
	FormFieldSkeleton,
	FormInput,
	WhiteBox,
} from "@/components";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	BILLING_EDIT_PAGE_CONTENT,
	BILLING_MANAGEMENT_PAGE_CONTENT,
	BILLING_MANAGEMENT_UI,
	BILLING_PAYMENT_BADGE_LABELS,
	BILLING_PAYMENT_METHOD_FILTER_OPTIONS,
	BILLING_ROW_ACTIONS,
	BILLING_SUBSCRIPTION_BADGE_LABELS,
	BILLING_TABLE_LABELS,
	SUBMODULE_KEYS,
} from "@/const";
import { usePermissions } from "@/hooks";
import {
	buildPlanLevelOptions,
	resolveTargetPricingPlanForPlanType,
	targetPricingPlanMatchesPlanType,
} from "@/lib";
import { type BillingUpgradeFormValues, billingUpgradeSchema } from "@/schemas";
import { useBillingManagementStore } from "@/store";
import type {
	BillingConfirmKind,
	BillingManagementRow,
	BillingUpgradeOptionsData,
	BillingUpgradePreviewData,
	CancelBillingSubscriptionPayload,
	EditBillingDetailsContentProps,
	EditBillingUpgradeFormProps,
} from "@/types";
import { formatDateShort, formatMoneyFromMinorUnits } from "@/utils";

function paymentTypeDisplayLabel(
	paymentType: BillingManagementRow["paymentType"],
): string | null {
	if (!paymentType) {
		return null;
	}
	return (
		BILLING_PAYMENT_METHOD_FILTER_OPTIONS.find((o) => o.id === paymentType)
			?.label ?? null
	);
}

function ProrationStat({
	label,
	value,
	loading = false,
}: {
	label: string;
	value: string;
	loading?: boolean;
}) {
	return (
		<div className="flex min-w-48 flex-1 flex-col gap-0.5">
			<p className="text-sm text-text-secondary">{label}</p>
			{loading ? (
				<Skeleton className="h-5 w-28 rounded bg-card" aria-hidden />
			) : (
				<p className="text-sm font-semibold text-text-foreground">{value}</p>
			)}
		</div>
	);
}

function previousSubscriptionCreditCents(
	preview: BillingUpgradePreviewData,
): number {
	return preview.creditCents + preview.prorationCreditCents;
}

function resolveNextBillingAmountDisplay(
	hasChange: boolean,
	loading: boolean,
	preview: BillingUpgradePreviewData | null,
	row: BillingManagementRow | null,
	targetPricingPlanId: string,
	upgradeOptions: BillingUpgradeOptionsData,
): { value: string; loading: boolean } {
	const empty = BILLING_MANAGEMENT_UI.emptyCell;

	const formatTargetPlanPrice = (
		priceDollars: number,
		currencyCode: string,
	): string =>
		formatMoneyFromMinorUnits(Math.round(priceDollars * 100), currencyCode);

	if (!hasChange) {
		if (row?.nextBillingAmountCents != null && row.nextBillingCurrency) {
			return {
				value: formatMoneyFromMinorUnits(
					row.nextBillingAmountCents,
					row.nextBillingCurrency,
				),
				loading: false,
			};
		}
		return { value: empty, loading: false };
	}

	if (loading || !preview) {
		return { value: empty, loading: true };
	}

	const currencyCode = preview.currency ?? row?.nextBillingCurrency ?? "usd";

	if (
		preview.nextBillingAmountCents != null &&
		preview.nextBillingAmountCents > 0
	) {
		return {
			value: formatMoneyFromMinorUnits(
				preview.nextBillingAmountCents,
				currencyCode,
			),
			loading: false,
		};
	}

	const targetOption = upgradeOptions.allowedTargets.find(
		(target) => target.pricingPlanId === targetPricingPlanId,
	);
	if (targetOption && targetOption.price > 0) {
		return {
			value: formatTargetPlanPrice(targetOption.price, currencyCode),
			loading: false,
		};
	}

	if (
		preview.nextBillingAmountCents != null &&
		preview.nextBillingAmountCents === 0
	) {
		return {
			value: formatMoneyFromMinorUnits(0, currencyCode),
			loading: false,
		};
	}

	return { value: empty, loading: false };
}

function resolveProrationFieldValues(
	hasChange: boolean,
	loading: boolean,
	preview: BillingUpgradePreviewData | null,
): { renewal: string; credit: string; amountDue: string } {
	const empty = BILLING_EDIT_PAGE_CONTENT.prorationEmptyValue;

	if (!hasChange || loading || !preview) {
		return { renewal: empty, credit: empty, amountDue: empty };
	}

	return {
		renewal: preview.renewalDate
			? formatDateShort(new Date(`${preview.renewalDate}T12:00:00Z`))
			: empty,
		credit: formatMoneyFromMinorUnits(
			previousSubscriptionCreditCents(preview),
			preview.currency,
		),
		amountDue: formatMoneyFromMinorUnits(
			preview.amountDueCents,
			preview.currency,
		),
	};
}

function PaymentInfoCardSkeleton() {
	return (
		<div className="flex flex-col gap-4" aria-busy>
			<div className="flex w-full flex-col gap-2">
				<Skeleton className="h-4 w-36 rounded bg-card" aria-hidden />
				<div className="w-full rounded-xl border border-border bg-background px-4 py-3">
					<div className="flex flex-wrap gap-4">
						{Array.from({ length: 3 }, (_, index) => (
							<div
								key={index}
								className="flex min-w-48 flex-1 flex-col gap-0.5"
							>
								<Skeleton className="h-4 w-24 rounded bg-card" aria-hidden />
								<Skeleton className="h-5 w-28 rounded bg-card" aria-hidden />
							</div>
						))}
					</div>
				</div>
			</div>
			<div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{Array.from({ length: 3 }, (_, index) => (
					<FormFieldSkeleton key={index} />
				))}
			</div>
		</div>
	);
}

function ProRatedAdjustmentsSection({
	preview,
	loading,
	hasChange,
}: {
	preview: BillingUpgradePreviewData | null;
	loading: boolean;
	hasChange: boolean;
}) {
	const values = resolveProrationFieldValues(hasChange, loading, preview);
	const showSkeleton = loading && hasChange;

	return (
		<div className="flex w-full flex-col gap-2">
			<p className="text-xs font-medium text-text-secondary">
				{BILLING_EDIT_PAGE_CONTENT.prorationTitle}
			</p>
			<div
				className="w-full rounded-xl border border-border bg-background px-4 py-3"
				aria-busy={showSkeleton}
			>
				<div className="flex flex-wrap gap-4">
					<ProrationStat
						label={BILLING_EDIT_PAGE_CONTENT.prorationRenewal}
						value={values.renewal}
						loading={showSkeleton}
					/>
					<ProrationStat
						label={BILLING_EDIT_PAGE_CONTENT.prorationPreviousCredit}
						value={values.credit}
						loading={showSkeleton}
					/>
					<ProrationStat
						label={BILLING_EDIT_PAGE_CONTENT.prorationAmountDue}
						value={values.amountDue}
						loading={showSkeleton}
					/>
				</div>
			</div>
		</div>
	);
}

function buildPlanTypeOptions(
	upgradeOptions: BillingUpgradeOptionsData,
): Array<{ value: string; label: string }> {
	if (!upgradeOptions.allowedTargets.length) {
		return [
			{
				value: upgradeOptions.current.planTypeId,
				label: upgradeOptions.current.planLabel,
			},
		];
	}

	const map = new Map<string, string>();
	for (const target of upgradeOptions.allowedTargets) {
		if (!map.has(target.planTypeId)) {
			map.set(target.planTypeId, target.planLabel);
		}
	}
	map.set(upgradeOptions.current.planTypeId, upgradeOptions.current.planLabel);
	return [...map.entries()].map(([value, label]) => ({ value, label }));
}

function EditBillingUpgradeForm({
	companyId,
	upgradeOptions,
	detailRow,
	onBack,
}: EditBillingUpgradeFormProps) {
	const [confirmOpen, setConfirmOpen] = useState(false);
	const {
		upgradePreview,
		upgradePreviewLoading,
		upgradePreviewError,
		previewUpgrade,
		applyUpgrade,
		upgradeApplyBusy,
		clearUpgradePreview,
	} = useBillingManagementStore();

	const form = useForm<BillingUpgradeFormValues>({
		resolver: yupResolver(billingUpgradeSchema),
		defaultValues: {
			planTypeId: upgradeOptions.current.planTypeId,
			targetPricingPlanId: upgradeOptions.current.pricingPlanId,
		},
		mode: "onChange",
	});

	const planTypeId = form.watch("planTypeId");
	const targetPricingPlanId = form.watch("targetPricingPlanId");

	const planTypeOptions = useMemo(
		() => buildPlanTypeOptions(upgradeOptions),
		[upgradeOptions],
	);

	const planLevelOptions = useMemo(
		() =>
			buildPlanLevelOptions(upgradeOptions, planTypeId, targetPricingPlanId),
		[upgradeOptions, planTypeId, targetPricingPlanId],
	);

	const planLevelSelectValue = useMemo(() => {
		if (
			targetPricingPlanId &&
			targetPricingPlanMatchesPlanType(
				upgradeOptions,
				planTypeId,
				targetPricingPlanId,
			)
		) {
			return targetPricingPlanId;
		}

		return (
			resolveTargetPricingPlanForPlanType(
				upgradeOptions,
				planTypeId,
				targetPricingPlanId,
			) || undefined
		);
	}, [upgradeOptions, planTypeId, targetPricingPlanId]);

	const hasChange =
		targetPricingPlanId !== upgradeOptions.current.pricingPlanId;

	useEffect(() => {
		if (!planTypeId || !planLevelSelectValue) {
			return;
		}
		if (planLevelSelectValue === targetPricingPlanId) {
			return;
		}
		form.setValue("targetPricingPlanId", planLevelSelectValue, {
			shouldValidate: true,
		});
	}, [form, planLevelSelectValue, planTypeId, targetPricingPlanId]);

	useEffect(() => {
		if (!hasChange || !targetPricingPlanId) {
			clearUpgradePreview();
			return;
		}
		const timer = window.setTimeout(() => {
			void previewUpgrade(companyId, targetPricingPlanId);
		}, 400);
		return () => window.clearTimeout(timer);
	}, [
		companyId,
		hasChange,
		targetPricingPlanId,
		previewUpgrade,
		clearUpgradePreview,
	]);

	const handlePlanTypeChange = useCallback(
		(value: string) => {
			const selectedPricingPlanId = form.getValues("targetPricingPlanId");
			const nextTargetId =
				value === upgradeOptions.current.planTypeId
					? upgradeOptions.current.pricingPlanId
					: resolveTargetPricingPlanForPlanType(
							upgradeOptions,
							value,
							selectedPricingPlanId,
						);

			form.reset(
				{
					planTypeId: value,
					targetPricingPlanId: nextTargetId,
				},
				{ keepDirty: true, keepTouched: true },
			);
		},
		[form, upgradeOptions],
	);

	const handleSaveClick = useCallback(() => {
		void form.handleSubmit(() => {
			setConfirmOpen(true);
		})();
	}, [form]);

	const handleConfirmUpgrade = useCallback(async () => {
		if (!targetPricingPlanId) {
			return;
		}
		const res = await applyUpgrade(companyId, targetPricingPlanId);
		if (res.ok) {
			setConfirmOpen(false);
			onBack();
		}
	}, [applyUpgrade, companyId, targetPricingPlanId, onBack]);

	const row = detailRow;
	const paymentTypeLabel = row
		? paymentTypeDisplayLabel(row.paymentType)
		: null;
	const renewalDisplay =
		row?.renewalDate != null
			? formatDateShort(new Date(`${row.renewalDate}T12:00:00Z`))
			: BILLING_MANAGEMENT_UI.emptyCell;
	const nextBillingAmount = resolveNextBillingAmountDisplay(
		hasChange,
		upgradePreviewLoading,
		upgradePreview,
		row,
		targetPricingPlanId,
		upgradeOptions,
	);

	const saveDisabled =
		!hasChange ||
		upgradePreviewLoading ||
		upgradeApplyBusy ||
		Boolean(upgradePreviewError) ||
		!upgradePreview;
	const showPaymentInfoSkeleton = upgradePreviewLoading && hasChange;

	return (
		<>
			<form
				className="flex min-h-0 flex-1 flex-col"
				onSubmit={(e) => e.preventDefault()}
			>
				<WhiteBox
					padding="sm"
					className="flex min-h-0 flex-1 flex-col gap-0 rounded-xl p-0"
				>
					<div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
						<CollapsibleCard
							title={BILLING_MANAGEMENT_PAGE_CONTENT.billingInfoCardTitle}
							className="rounded-xl"
						>
							<div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
								<FormInput
									id="edit-billing-subscription-status"
									label={BILLING_TABLE_LABELS.subscriptionStatus}
									disabled
									tabIndex={-1}
									value={
										row
											? (BILLING_SUBSCRIPTION_BADGE_LABELS[
													row.subscriptionStatus
												] ?? row.subscriptionStatus)
											: BILLING_MANAGEMENT_UI.emptyCell
									}
								/>
								<div className="flex flex-col gap-1">
									<Label
										htmlFor="edit-billing-plan"
										className="text-sm font-medium text-text-foreground"
									>
										<span className="text-destructive">*</span>{" "}
										{BILLING_EDIT_PAGE_CONTENT.planField}
									</Label>
									<Controller
										name="planTypeId"
										control={form.control}
										render={({ field }) => (
											<Select
												value={field.value || undefined}
												onValueChange={handlePlanTypeChange}
											>
												<SelectTrigger
													id="edit-billing-plan"
													className="min-h-9 w-full"
												>
													<SelectValue
														placeholder={BILLING_EDIT_PAGE_CONTENT.selectPlan}
													/>
												</SelectTrigger>
												<SelectContent>
													{planTypeOptions.map((opt) => (
														<SelectItem key={opt.value} value={opt.value}>
															{opt.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
								</div>
								<div className="flex flex-col gap-1">
									<Label
										htmlFor="edit-billing-plan-level"
										className="text-sm font-medium text-text-foreground"
									>
										<span className="text-destructive">*</span>{" "}
										{BILLING_EDIT_PAGE_CONTENT.planLevelField}
									</Label>
									<Controller
										name="targetPricingPlanId"
										control={form.control}
										render={() => (
											<Select
												value={planLevelSelectValue}
												onValueChange={(value) =>
													form.setValue("targetPricingPlanId", value, {
														shouldValidate: true,
													})
												}
												disabled={planLevelOptions.length === 0}
											>
												<SelectTrigger
													id="edit-billing-plan-level"
													className="min-h-9 w-full"
												>
													<SelectValue
														placeholder={
															BILLING_EDIT_PAGE_CONTENT.selectPlanLevel
														}
													/>
												</SelectTrigger>
												<SelectContent>
													{planLevelOptions.map((opt) => (
														<SelectItem key={opt.value} value={opt.value}>
															{opt.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									/>
								</div>
								<FormInput
									id="edit-billing-billing-cycle"
									label={BILLING_TABLE_LABELS.billingCycle}
									disabled
									tabIndex={-1}
									value={row?.billingCycle ?? BILLING_MANAGEMENT_UI.emptyCell}
								/>
								<FormInput
									id="edit-billing-renewal-date"
									label={BILLING_TABLE_LABELS.renewalDate}
									disabled
									tabIndex={-1}
									value={renewalDisplay ?? BILLING_MANAGEMENT_UI.emptyCell}
								/>
							</div>
						</CollapsibleCard>

						<CollapsibleCard
							title={BILLING_MANAGEMENT_PAGE_CONTENT.paymentInfoCardTitle}
							className="rounded-xl"
						>
							{showPaymentInfoSkeleton ? (
								<PaymentInfoCardSkeleton />
							) : (
								<div className="flex flex-col gap-4">
									<ProRatedAdjustmentsSection
										preview={upgradePreview}
										loading={upgradePreviewLoading}
										hasChange={hasChange}
									/>
									<div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
										<FormInput
											id="edit-billing-payment-status"
											label={BILLING_TABLE_LABELS.paymentStatus}
											disabled
											tabIndex={-1}
											value={
												row
													? BILLING_PAYMENT_BADGE_LABELS[row.paymentStatus]
													: BILLING_MANAGEMENT_UI.emptyCell
											}
										/>
										<FormInput
											id="edit-billing-payment-type"
											label={BILLING_TABLE_LABELS.paymentType}
											disabled
											tabIndex={-1}
											value={
												paymentTypeLabel ?? BILLING_MANAGEMENT_UI.emptyCell
											}
										/>
										<FormInput
											id="edit-billing-next-amount"
											label={BILLING_TABLE_LABELS.nextAmount}
											disabled
											tabIndex={-1}
											value={nextBillingAmount.value}
										/>
									</div>
								</div>
							)}
						</CollapsibleCard>
					</div>

					<div className="flex shrink-0 items-start justify-end gap-2 border-t border-border px-6 py-5">
						<Button
							type="button"
							variant="outline"
							onClick={onBack}
							className="min-h-9 min-w-20 rounded-lg px-4"
						>
							{BILLING_EDIT_PAGE_CONTENT.cancel}
						</Button>
						<Button
							type="button"
							onClick={handleSaveClick}
							disabled={saveDisabled}
							className="min-h-9 rounded-lg px-4"
							aria-label={BILLING_EDIT_PAGE_CONTENT.saveUpdate}
						>
							{upgradeApplyBusy ? (
								<Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
							) : null}
							{BILLING_EDIT_PAGE_CONTENT.saveUpdate}
						</Button>
					</div>
				</WhiteBox>
			</form>

			{confirmOpen && upgradePreview ? (
				<ConfirmationModal
					open
					onOpenChange={setConfirmOpen}
					title={BILLING_EDIT_PAGE_CONTENT.confirmTitle}
					description={
						<div className="space-y-2 text-sm">
							<p>{BILLING_EDIT_PAGE_CONTENT.confirmDescription}</p>
							<p>
								{upgradePreview.current.planLabel} (
								{upgradePreview.current.planLevel}) →{" "}
								{upgradePreview.target.planLabel} (
								{upgradePreview.target.planLevel})
							</p>
							<p className="font-semibold">
								{BILLING_EDIT_PAGE_CONTENT.prorationAmountDue}:{" "}
								{formatMoneyFromMinorUnits(
									upgradePreview.amountDueCents,
									upgradePreview.currency,
								)}
							</p>
						</div>
					}
					icon={<ChevronsUp className="size-12 text-icon-info" aria-hidden />}
					confirmLabel={BILLING_EDIT_PAGE_CONTENT.confirmButton}
					confirmIcon={ChevronsUp}
					cancelLabel={BILLING_EDIT_PAGE_CONTENT.cancel}
					onConfirm={handleConfirmUpgrade}
					isConfirming={upgradeApplyBusy}
				/>
			) : null}
		</>
	);
}

function EditBillingDetailsHeader({
	row,
	onBack,
	showCancel,
	onCancelSubscription,
}: {
	row: BillingManagementRow | null;
	onBack: () => void;
	showCancel: boolean;
	onCancelSubscription: () => void;
}) {
	return (
		<div className="flex shrink-0 flex-col gap-4">
			<div className="flex min-h-12 w-full flex-wrap items-end justify-between gap-4 pt-4">
				<div className="flex min-w-0 flex-1 flex-wrap items-end gap-4">
					<Button
						type="button"
						variant="outline"
						icon={ChevronLeft}
						onClick={onBack}
						aria-label={BILLING_MANAGEMENT_PAGE_CONTENT.backButton}
					>
						{BILLING_MANAGEMENT_PAGE_CONTENT.backButton}
					</Button>
					<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
						<h1
							className="min-w-0 truncate text-heading-4 font-semibold text-text-foreground"
							title={row?.companyName}
						>
							{row?.companyName}
						</h1>
						{row?.planLabel?.trim() ? (
							<BSPBadge
								type={
									row.planTypeId?.trim()
										? `${row.planTypeId.trim()}_filled`
										: "gray"
								}
								className="max-w-full truncate"
								title={row.planLabel}
							>
								{row.planLabel}
							</BSPBadge>
						) : null}
					</div>
				</div>
				{showCancel ? (
					<div className="flex shrink-0 flex-wrap items-center gap-2.5">
						<Button
							type="button"
							variant="outline"
							className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
							icon={CircleX}
							onClick={onCancelSubscription}
							aria-label={BILLING_ROW_ACTIONS.menuCancelSubscription}
						>
							{BILLING_ROW_ACTIONS.menuCancelSubscription}
						</Button>
					</div>
				) : null}
			</div>
		</div>
	);
}

export function EditBillingDetailsContent({
	companyId,
	onBack,
}: EditBillingDetailsContentProps) {
	const [confirmKind, setConfirmKind] = useState<BillingConfirmKind>(null);
	const [confirmBusy, setConfirmBusy] = useState(false);
	const { detailRow, fetchBillingDetail, upgradeOptions, cancelSubscription } =
		useBillingManagementStore();

	const { can } = usePermissions();

	const showCancel =
		detailRow?.canCancelSubscription &&
		can(SUBMODULE_KEYS.BILLING_MANAGEMENT_CANCEL_REINSTATE);

	const handleCancelSubscription = useCallback(() => {
		setConfirmKind("cancel");
	}, []);

	const handleCancelConfirm = useCallback(
		async (payload: CancelBillingSubscriptionPayload) => {
			if (!detailRow) {
				return;
			}
			setConfirmBusy(true);
			try {
				const res = await cancelSubscription(companyId, payload);
				if (res.ok) {
					setConfirmKind(null);
					await fetchBillingDetail(companyId);
				}
			} finally {
				setConfirmBusy(false);
			}
		},
		[companyId, cancelSubscription, detailRow, fetchBillingDetail],
	);

	const row = detailRow;

	if (!upgradeOptions?.current) {
		return null;
	}

	return (
		<div className="-m-6 flex min-h-full flex-1 flex-col gap-6 bg-content-bg px-6 pb-6 pt-0">
			<EditBillingDetailsHeader
				row={row}
				onBack={onBack}
				showCancel={Boolean(showCancel)}
				onCancelSubscription={handleCancelSubscription}
			/>

			<div className="flex min-h-0 flex-1 flex-col">
				<EditBillingUpgradeForm
					key={upgradeOptions.current.pricingPlanId}
					companyId={companyId}
					upgradeOptions={upgradeOptions}
					detailRow={detailRow}
					onBack={onBack}
				/>
			</div>

			{confirmKind === "cancel" && row ? (
				<CancelSubscriptionModal
					open
					onOpenChange={(open) => {
						if (!open) {
							setConfirmKind(null);
						}
					}}
					row={row}
					onConfirm={handleCancelConfirm}
					isConfirming={confirmBusy}
				/>
			) : null}
		</div>
	);
}
