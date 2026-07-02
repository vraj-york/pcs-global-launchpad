import { Minus, Plus, Tag } from "lucide-react";
import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	COMPANY_ADMIN_ONBOARDING,
	ONE_TIME_ASSESSMENT_QUANTITY,
	PLAN_ONSITE_TRAINING_OPTIONS,
	PLAN_PRICE_BREAKDOWN_CARD_LABELS,
} from "@/const";
import { cn } from "@/lib/utils";
import type { PlanPriceBreakdownCardProps } from "@/types";
import { computeNetAmountAfterPromo, formatCurrencyAmount } from "@/utils";

const L = PLAN_PRICE_BREAKDOWN_CARD_LABELS;
const MIN_QUANTITY = ONE_TIME_ASSESSMENT_QUANTITY.min;
const MAX_QUANTITY = ONE_TIME_ASSESSMENT_QUANTITY.max;

function clampAssessmentQuantity(value: number): number {
	const floored = Math.floor(value);
	if (!Number.isFinite(floored)) {
		return MIN_QUANTITY;
	}
	return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, floored));
}

function PlanInfoField({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<span className="text-xs font-normal leading-tight text-muted-foreground">
				{label}
			</span>
			<span className="text-sm font-semibold leading-snug break-words text-foreground">
				{value || COMPANY_ADMIN_ONBOARDING.notProvided}
			</span>
		</div>
	);
}

function OneTimePlanPriceBreakdown({
	planPrice,
	promoCode,
	billingCurrency,
	promoDiscount,
	assessmentQuantity,
	quantityError,
	onAssessmentQuantityChange,
	className,
}: Extract<PlanPriceBreakdownCardProps, { variant: "oneTime" }>) {
	const C = COMPANY_ADMIN_ONBOARDING;
	const subtotal = planPrice * assessmentQuantity;
	const invoiceAmount = computeNetAmountAfterPromo(subtotal, promoDiscount);

	const handleDecrease = () => {
		onAssessmentQuantityChange(clampAssessmentQuantity(assessmentQuantity - 1));
	};

	const handleIncrease = () => {
		onAssessmentQuantityChange(clampAssessmentQuantity(assessmentQuantity + 1));
	};

	const handleQuantityInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		const raw = event.target.value.trim();
		if (raw === "") {
			onAssessmentQuantityChange(MIN_QUANTITY);
			return;
		}
		const parsed = Number.parseInt(raw, 10);
		if (!Number.isFinite(parsed)) {
			return;
		}
		onAssessmentQuantityChange(clampAssessmentQuantity(parsed));
	};

	return (
		<div className={cn("space-y-4", className)}>
			<section className="space-y-2">
				<h3 className="text-mini font-medium tracking-wider text-text-secondary">
					{C.planInfoSection}
				</h3>
				<div className="rounded-xl border border-border bg-background p-4">
					<div className="flex flex-wrap items-start gap-4">
						<div className="w-56">
							<PlanInfoField
								label={C.labelsPlan.promoCode}
								value={promoCode ?? C.notProvided}
							/>
						</div>
						<div className="w-56">
							<PlanInfoField
								label={C.labelsPlan.billingCurrency}
								value={billingCurrency}
							/>
						</div>
					</div>
				</div>
			</section>

			<section className="overflow-hidden rounded-xl border border-border bg-background">
				<div className="border-b border-border px-4 py-4">
					<h3 className="text-base font-medium text-text-secondary">
						{C.assessmentPricingSection}
					</h3>
				</div>
				<div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
					<div className="space-y-1">
						<p className="text-small font-medium text-text-foreground">
							<span className="text-destructive">*</span>{" "}
							{C.labelsOneTime.noOfAssessments}
						</p>
						<div
							className={cn(
								"flex min-h-9 items-center rounded-lg border border-input bg-background px-3 py-1.5",
								quantityError && "border-destructive",
							)}
						>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								className="size-5 shrink-0 text-text-foreground"
								onClick={handleDecrease}
								disabled={assessmentQuantity <= MIN_QUANTITY}
								aria-label="Decrease assessment quantity"
								tabIndex={0}
							>
								<Minus className="size-4" aria-hidden />
							</Button>
							<Input
								type="number"
								min={MIN_QUANTITY}
								max={MAX_QUANTITY}
								value={assessmentQuantity}
								onChange={handleQuantityInputChange}
								className="h-7 border-0 bg-transparent text-center text-small shadow-none focus-visible:ring-0"
								aria-label={C.labelsOneTime.noOfAssessments}
								aria-invalid={quantityError != null}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								className="size-5 shrink-0 text-text-foreground"
								onClick={handleIncrease}
								disabled={assessmentQuantity >= MAX_QUANTITY}
								aria-label="Increase assessment quantity"
								tabIndex={0}
							>
								<Plus className="size-4" aria-hidden />
							</Button>
						</div>
						{quantityError ? (
							<p className="text-mini text-destructive">{quantityError}</p>
						) : null}
					</div>
					<div className="space-y-1">
						<p className="text-small font-medium text-text-foreground">
							{C.labelsOneTime.pricePerAssessment}
						</p>
						<div className="flex min-h-9 items-center rounded-lg border border-border bg-muted px-3 py-1.5">
							<p className="text-small text-muted-foreground">
								{formatCurrencyAmount(planPrice)}
							</p>
						</div>
					</div>
					<div className="space-y-1">
						<p className="text-small font-medium text-text-foreground">
							{C.labelsOneTime.invoiceAmount}
						</p>
						<div className="flex min-h-9 items-center rounded-lg border border-border bg-muted px-3 py-1.5">
							<p className="text-small text-muted-foreground">
								{formatCurrencyAmount(invoiceAmount)}
							</p>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}

function DefaultPlanPriceBreakdown({
	planPrice,
	discount,
	promoCodeApplied,
	implementationFee,
	subTotal,
	invoiceAmount,
	onsiteTrainingOption,
	onsiteTrainingFeeAmount,
	onOnsiteTrainingOptionChange,
	discountError,
	hideAddonFees = false,
	className,
}: Extract<PlanPriceBreakdownCardProps, { variant?: "default" }>) {
	const isEditable = typeof onOnsiteTrainingOptionChange === "function";
	const selectedOnsiteLabel =
		PLAN_ONSITE_TRAINING_OPTIONS.find(
			(o) => o.apiValue === onsiteTrainingOption,
		)?.label ?? "Off";
	const normalizedPromoCode = promoCodeApplied?.trim() ?? "";

	return (
		<div
			className={cn(
				"w-full min-w-0 overflow-hidden rounded-xl border border-border bg-background",
				className,
			)}
		>
			<div className="border-b border-border bg-info-bg px-4 py-3">
				<p className="text-sm font-semibold text-link">{L.priceBreakdown}</p>
			</div>
			<div className="flex flex-col gap-4 p-4">
				<div className="flex items-start justify-between gap-3 text-sm">
					<span className="text-text-secondary">{L.planPrice}</span>
					<span className="shrink-0 text-right font-medium text-text-foreground">
						{formatCurrencyAmount(planPrice)}
					</span>
				</div>

				<Separator />

				<div className="flex items-start justify-between gap-3 text-sm">
					<span className="text-text-secondary">{L.promoCodeApplied}</span>
					{normalizedPromoCode ? (
						<span className="inline-flex min-h-6 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-info-bg px-2 py-0.5 text-mini font-semibold tracking-wide text-link">
							<Tag className="size-3.5" aria-hidden="true" />
							{normalizedPromoCode}
						</span>
					) : (
						<span className="shrink-0 text-right font-medium text-text-foreground">
							{COMPANY_ADMIN_ONBOARDING.notProvided}
						</span>
					)}
				</div>

				<div className="flex items-start justify-between gap-3 text-sm">
					<span className="text-text-secondary">{L.discount}</span>
					<span
						className={cn(
							"shrink-0 text-right font-medium",
							discount > 0 ? "text-destructive" : "text-text-foreground",
						)}
					>
						{discount > 0
							? `- ${formatCurrencyAmount(discount)}`
							: formatCurrencyAmount(0)}
					</span>
				</div>

				{discountError ? (
					<p className="text-mini text-destructive" role="alert">
						{discountError}
					</p>
				) : null}

				{!hideAddonFees ? (
					<div className="flex items-start justify-between gap-3 text-sm">
						<span className="text-text-secondary">{L.implementationFee}</span>
						<span className="shrink-0 text-right font-medium text-text-foreground">
							{formatCurrencyAmount(implementationFee)}
						</span>
					</div>
				) : null}

				<Separator />

				<div className="flex items-start justify-between gap-3 text-sm">
					<span className="text-text-secondary">{L.subTotal}</span>
					<span className="shrink-0 text-right font-semibold text-text-foreground">
						{formatCurrencyAmount(subTotal)}
					</span>
				</div>

				{!hideAddonFees ? (
					<>
						<div className="flex flex-col gap-2">
							<span className="text-sm text-text-secondary">
								{L.onsiteTraining}
							</span>
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								{isEditable ? (
									<div
										className="inline-flex w-fit max-w-full flex-wrap gap-0.5 rounded-md bg-card-foreground p-0.5"
										role="group"
										aria-label={L.onsiteTraining}
									>
										{PLAN_ONSITE_TRAINING_OPTIONS.map((opt) => {
											const selected = onsiteTrainingOption === opt.apiValue;
											return (
												<button
													key={opt.apiValue}
													type="button"
													tabIndex={0}
													className={cn(
														"min-h-6 min-w-11 rounded-md px-1.5 py-0.5 text-mini font-semibold transition-colors",
														selected
															? "bg-background text-brand-primary shadow-xs"
															: "text-text-foreground",
													)}
													aria-pressed={selected}
													onClick={() =>
														onOnsiteTrainingOptionChange?.(opt.apiValue)
													}
												>
													{opt.label}
												</button>
											);
										})}
									</div>
								) : (
									<span className="inline-flex h-6 min-w-11 items-center justify-center rounded-md bg-brand-primary-bg px-1.5 py-0.5 text-mini font-semibold text-brand-primary-text">
										{selectedOnsiteLabel}
									</span>
								)}
								<span
									className={cn(
										"text-sm font-medium sm:text-right",
										onsiteTrainingFeeAmount > 0
											? "text-brand-green"
											: "text-text-foreground",
									)}
								>
									{onsiteTrainingFeeAmount > 0
										? `${L.onsiteTrainingAddonPrefix}${formatCurrencyAmount(onsiteTrainingFeeAmount)}`
										: formatCurrencyAmount(0)}
								</span>
							</div>
						</div>

						<Separator />
					</>
				) : null}

				<div className="flex items-start justify-between gap-3 text-base font-semibold text-text-foreground">
					<span>{L.invoiceAmount}</span>
					<span className="shrink-0 text-right">
						{formatCurrencyAmount(invoiceAmount)}
					</span>
				</div>
			</div>
		</div>
	);
}

/**
 * Shared plan checkout pricing UI.
 *
 * - `variant="default"`: vertical price breakdown (Plan & Seats, monthly/annual checkout).
 * - `variant="oneTime"`: company-admin one-time assessment purchase (quantity + invoice).
 */
export function PlanPriceBreakdownCard(props: PlanPriceBreakdownCardProps) {
	if (props.variant === "oneTime") {
		return <OneTimePlanPriceBreakdown {...props} />;
	}
	return <DefaultPlanPriceBreakdown {...props} />;
}
