import { yupResolver } from "@hookform/resolvers/yup";
import { Info } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
	getOnboardingFees,
	getPricingPlans,
	getPromoCodesAvailableForCompanySetup,
} from "@/api";
import {
	CollapsibleCard,
	DatePickerInput,
	FormInput,
	PlanPriceBreakdownCard,
} from "@/components/common";
import { Banner } from "@/components/ui/banner";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
	ADD_NEW_COMPANY_CONTENT,
	FORM_PLACEHOLDERS,
	normalizeOnsiteTrainingApiOption,
} from "@/const";
import { cn } from "@/lib/utils";
import {
	type AddCompanyPlanAndSeatsSchemaType,
	addCompanyPlanAndSeatsSchema,
} from "@/schemas";
import { useCompanyDirectoryStore } from "@/store";
import type {
	AddCompanyPlanSeatsStepProps,
	BuildCompanyPlanSeatsPayloadInput,
	CompanyDetailData,
	CompanyPlanSeatsPayload,
	IndividualPlanSectionProps,
	MonthlyTrialSectionProps,
	OnboardingFees,
	OnsiteTrainingApiOption,
	PlanConfigSnapshot,
	PlanConfigurationSectionProps,
	PlanSeatsPrefillResult,
	PlanTypeTabsProps,
	PricingPlanType,
	PromoCodeAvailableForCompanySetupItem,
	PromoCodeSelectProps,
} from "@/types";
import {
	computePromoDiscountAmount,
	findIndividualPricingPlanLevel,
	formatCurrencyAmount,
	formatPlanEmployeeRange,
	roundCurrencyToTwoDecimals,
} from "@/utils";

const c = ADD_NEW_COMPANY_CONTENT.planAndSeats;

/**
 * Resolve the implementation fee amount from the onboarding-fees API payload.
 * Returns 0 while fees are still loading or when Stripe returns no `unit_amount`.
 */
function implementationFeeFromOnboarding(fees: OnboardingFees | null): number {
	const amount = fees?.implementationFee.amount;
	if (amount == null || !Number.isFinite(amount) || amount < 0) return 0;
	return roundCurrencyToTwoDecimals(amount);
}

/**
 * Resolve the onsite training fee for the chosen option from the onboarding-fees
 * payload. Returns 0 when the option is `off`, when fees are still loading, or
 * when Stripe returns no `unit_amount` for the configured Price.
 */
function onsiteTrainingFeeFromOnboarding(
	fees: OnboardingFees | null,
	option: OnsiteTrainingApiOption,
): number {
	if (option === "off" || !fees) return 0;
	const amount = fees.onsiteTraining[option].amount;
	if (amount == null || !Number.isFinite(amount) || amount < 0) return 0;
	return roundCurrencyToTwoDecimals(amount);
}

const PLAN_SEATS_DEFAULTS: AddCompanyPlanAndSeatsSchemaType = {
	activePlanTypeId: "",
	companyPlanCount: 0,
	zeroTrial: false,
	trialLength: "14",
	trialStartDate: "",
	hasPromoCode: false,
	promoCode: "",
	selectedPlanId: "",
	planPriceLimit: 0,
	discount: "",
	billingCurrency: "usd",
	onsiteTrainingOption: "off",
};

const INFO_ICON = (
	<Info className="size-4 shrink-0 text-icon-info" aria-hidden />
);

/** Parse `yyyy-MM-dd` as a calendar date in local time (avoids UTC shifts from `new Date(iso)`). */
function parseIsoDateLocal(iso: string): Date | null {
	const parts = iso.trim().split("-");
	if (parts.length !== 3) return null;
	const y = Number(parts[0]);
	const mo = Number(parts[1]);
	const d = Number(parts[2]);
	if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d))
		return null;
	const dt = new Date(y, mo - 1, d);
	return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Inverse of {@link parseIsoDateLocal}: calendar date in local time as `yyyy-MM-dd`. */
function formatIsoDateLocal(d: Date): string {
	const y = d.getFullYear();
	const mo = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${mo}-${day}`;
}

/**
 * Trial length is **inclusive** of the start day (e.g. 14 days from the 1st ends on the 14th).
 * Uses local calendar arithmetic so it matches the date picker.
 */
function trialEndDateLocalInclusive(
	startIso: string,
	trialLengthDays: number,
): Date | null {
	const start = parseIsoDateLocal(startIso);
	if (!start) return null;
	const offset = Math.max(0, trialLengthDays - 1);
	const end = new Date(start.getTime());
	end.setDate(end.getDate() + offset);
	return end;
}

export function computeTrialEndDate(
	startDate: string,
	trialLengthDays: number,
): string {
	if (!startDate) return "";
	const end = trialEndDateLocalInclusive(startDate, trialLengthDays);
	if (!end) return "";
	const mm = String(end.getMonth() + 1).padStart(2, "0");
	const dd = String(end.getDate()).padStart(2, "0");
	const yyyy = end.getFullYear();
	return `${mm}-${dd}-${yyyy}`;
}

/** Trial end as ISO YYYY-MM-DD; length is inclusive calendar days (start is day 1). */
export function trialEndIsoFromStart(
	trialStartIso: string,
	trialLengthDays: number,
): string {
	const end = trialEndDateLocalInclusive(trialStartIso, trialLengthDays);
	if (!end) return "";
	return formatIsoDateLocal(end);
}

/** Dollar discount from plan price and promo terms (Plan & Seats). */
function checkoutPromoForPayload(
	hasPromoCode: boolean,
	promoCode: string | undefined,
): string | null {
	if (!hasPromoCode) return null;
	const t = (promoCode ?? "").trim();
	return t === "" ? null : t;
}

export function buildCompanyPlanSeatsPayload(
	input: BuildCompanyPlanSeatsPayloadInput,
): CompanyPlanSeatsPayload {
	const discountNum = Number.parseFloat(input.discount) || 0;
	const onsiteOpt = normalizeOnsiteTrainingApiOption(
		input.onsiteTrainingOption,
	);

	if (input.activePlanTypeId === "one_time") {
		if (!input.oneTimePlanLevelId) {
			throw new Error("Individual plan level is missing from pricing data.");
		}
		const price = roundCurrencyToTwoDecimals(input.oneTimePlanPrice);
		const discountRounded = input.hasPromoCode
			? roundCurrencyToTwoDecimals(Number.parseFloat(input.discount) || 0)
			: 0;
		const invoiceAmount = roundCurrencyToTwoDecimals(
			Math.max(0, price - discountRounded),
		);
		return {
			zeroTrial: true,
			trialStartDate: "",
			trialEndDate: "",
			planLevel: input.oneTimePlanLevelId,
			planPrice: price,
			discount: discountRounded,
			onsiteTrainingOption: onsiteOpt,
			invoiceAmount,
			checkoutPromoCode: checkoutPromoForPayload(
				input.hasPromoCode,
				input.promoCode,
			),
		};
	}

	if (!input.selectedPlanId) {
		throw new Error("Plan level is required.");
	}

	const isMonthly = input.activePlanTypeId === "monthly";
	const zeroTrial = isMonthly ? input.zeroTrial : true;

	let trialStartDate = "";
	let trialEndDate = "";
	if (isMonthly && !zeroTrial && input.trialStartDate.trim()) {
		trialStartDate = input.trialStartDate.trim();
		trialEndDate = trialEndIsoFromStart(trialStartDate, input.trialLengthDays);
	}

	const planPriceRounded = roundCurrencyToTwoDecimals(input.planPrice);
	const discountRounded = roundCurrencyToTwoDecimals(discountNum);
	const invoiceAmount = roundCurrencyToTwoDecimals(
		Math.max(0, planPriceRounded - discountRounded),
	);

	return {
		zeroTrial,
		trialStartDate,
		trialEndDate,
		planLevel: input.selectedPlanId,
		planPrice: planPriceRounded,
		discount: discountRounded,
		onsiteTrainingOption: onsiteOpt,
		invoiceAmount,
		checkoutPromoCode: checkoutPromoForPayload(
			input.hasPromoCode,
			input.promoCode,
		),
	};
}

/** ISO date string YYYY-MM-DD for DatePicker, or "" */
export function normalizeTrialStartDate(
	value: string | null | undefined,
): string {
	if (value == null || typeof value !== "string") return "";
	const s = value.trim();
	if (!s) return "";
	return s.length >= 10 ? s.slice(0, 10) : s;
}

/**
 * Build Plan & Seats form defaults from GET company `plan` + `planSeat`
 * (active tab = plan.planTypeId, tier = planId).
 */
export function buildPlanSeatsPrefillFromCompanyDetail(
	companyDetail: CompanyDetailData,
	planTypes: PricingPlanType[],
): PlanSeatsPrefillResult | null {
	const planSeat = companyDetail.planSeat;
	if (!planSeat) return null;

	const planTypeId = companyDetail.plan?.planTypeId;
	const tabId =
		planTypeId && planTypes.some((pt) => pt.id === planTypeId)
			? planTypeId
			: (planTypes[0]?.id ?? "");

	if (!tabId) return null;

	const planLevelId = (
		companyDetail.planId ??
		companyDetail.plan?.id ??
		""
	).trim();
	if (!planLevelId) return null;

	const trialLength = String(planSeat.trialLengthDuration ?? 14);
	const trialStartDate = normalizeTrialStartDate(planSeat.trialStartDate);
	const storedPromo = (planSeat.checkoutPromoCode ?? "").trim();
	const hasPromoFromSeat = Boolean(storedPromo);

	const onsiteTrainingOptionPrefill = normalizeOnsiteTrainingApiOption(
		planSeat.onsiteTrainingOption,
	);

	const formValues: AddCompanyPlanAndSeatsSchemaType = {
		activePlanTypeId: tabId,
		companyPlanCount: 0,
		zeroTrial: planSeat.zeroTrial,
		trialLength,
		trialStartDate,
		hasPromoCode: hasPromoFromSeat,
		promoCode: storedPromo,
		selectedPlanId: planLevelId,
		planPriceLimit: 0,
		discount: planSeat.discount ?? "",
		billingCurrency: "usd",
		onsiteTrainingOption: onsiteTrainingOptionPrefill,
	};

	const refSnapshots: Record<string, PlanConfigSnapshot> = {
		[tabId]: {
			selectedPlanId: planLevelId,
			discount: planSeat.discount ?? "",
			hasPromoCode: hasPromoFromSeat,
			promoCode: storedPromo,
			onsiteTrainingOption: onsiteTrainingOptionPrefill,
		},
	};

	return { formValues, refSnapshots };
}

function PlanTypeTabs({
	planTypes,
	activePlanTypeId,
	onSelect,
}: PlanTypeTabsProps) {
	return (
		<div
			className="flex w-fit max-w-full flex-wrap items-center gap-4 self-start rounded-xl bg-card-foreground p-1"
			role="tablist"
			aria-label="Plan type tabs"
		>
			{planTypes.map((tab) => (
				<button
					key={tab.id}
					type="button"
					role="tab"
					aria-selected={activePlanTypeId === tab.id}
					tabIndex={activePlanTypeId === tab.id ? 0 : -1}
					className={cn(
						"min-h-9 cursor-pointer rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-all duration-300",
						activePlanTypeId === tab.id
							? "bg-background text-brand-primary shadow-xs"
							: "text-text-secondary hover:text-text-foreground",
					)}
					onClick={() => onSelect(tab.id)}
				>
					{tab.name}
				</button>
			))}
		</div>
	);
}

function formatPromoSelectLabel(row: PromoCodeAvailableForCompanySetupItem) {
	if (row.discountType === "percent") {
		return `${row.code} (${row.discountValue}%)`;
	}
	return `${row.code} (${formatCurrencyAmount(row.discountValue)})`;
}

function PromoCodeSelect({
	id,
	value,
	onChange,
	error,
	options,
	loading,
	loadError,
}: PromoCodeSelectProps) {
	const pc = c.planConfiguration;
	const items = useMemo(() => options.map((row) => row.code), [options]);

	const itemToStringLabel = useCallback(
		(code: string) => {
			const row = options.find(
				(o) => o.code.toLowerCase() === code.toLowerCase(),
			);
			return row ? formatPromoSelectLabel(row) : code;
		},
		[options],
	);

	const comboboxValue = useMemo(() => {
		const t = value.trim();
		if (!t) return null;
		const row = options.find((o) => o.code.toLowerCase() === t.toLowerCase());
		return row ? row.code : null;
	}, [value, options]);

	const handlePromoValueChange = useCallback(
		(v: string | null) => {
			onChange(v ?? "");
		},
		[onChange],
	);

	const disabled = loading || options.length === 0;

	return (
		<div className="flex min-w-0 w-full flex-col gap-1">
			<Label htmlFor={id} className="text-sm font-medium text-text-foreground">
				<span className="text-brand-red">*</span> {pc.promoCode}
			</Label>
			{loadError ? (
				<p className="text-mini text-destructive" role="alert">
					{pc.promoCodesLoadError} {loadError}
				</p>
			) : null}
			<Combobox
				items={items}
				value={comboboxValue}
				onValueChange={handlePromoValueChange}
				itemToStringLabel={itemToStringLabel}
				isItemEqualToValue={(a, b) =>
					String(a).toLowerCase() === String(b).toLowerCase()
				}
				disabled={disabled}
			>
				<ComboboxInput
					id={id}
					className={cn("h-10 w-full min-w-0", error && "border-destructive")}
					placeholder={FORM_PLACEHOLDERS.searchOrSelectPromoCode}
					aria-label={pc.promoCode}
					aria-invalid={!!error}
				/>
				<ComboboxContent>
					<ComboboxList>
						{(item: string) => (
							<ComboboxItem key={item} value={item}>
								{itemToStringLabel(item)}
							</ComboboxItem>
						)}
					</ComboboxList>
					<ComboboxEmpty>{pc.promoCodeComboboxNoMatches}</ComboboxEmpty>
				</ComboboxContent>
			</Combobox>
			{error ? (
				<p className="text-mini text-destructive" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}

function IndividualPlanSection({
	oneTimeCompanyPlanPrice,
	hasPromoToggleDisabled,
	hasPromoCode,
	onHasPromoCodeChange,
	promoCode,
	onPromoCodeChange,
	promoCodeError,
	promoOptions,
	promosLoading,
	promosLoadError,
}: IndividualPlanSectionProps) {
	return (
		<>
			<Banner title={c.individualPlan.bannerTitle} icon={INFO_ICON}>
				{c.individualPlan.bannerDescription(
					formatCurrencyAmount(oneTimeCompanyPlanPrice),
					c.individualPlan.billingCurrency,
				)}
			</Banner>

			<div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
				<span className="text-sm font-medium text-text-foreground">
					{c.individualPlan.promoCodeLabel}
				</span>
				<Switch
					checked={hasPromoCode}
					onCheckedChange={onHasPromoCodeChange}
					disabled={hasPromoToggleDisabled}
					aria-label={c.individualPlan.promoCodeLabel}
				/>
			</div>

			{hasPromoCode && (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="min-w-0 w-full">
						<PromoCodeSelect
							id="promo-code-individual"
							value={promoCode}
							onChange={onPromoCodeChange}
							error={promoCodeError}
							options={promoOptions}
							loading={promosLoading}
							loadError={promosLoadError}
						/>
					</div>
				</div>
			)}
		</>
	);
}

function MonthlyTrialSection({
	zeroTrial,
	onZeroTrialChange,
	trialLength,
	onTrialLengthChange,
	trialStartDate,
	onTrialStartDateChange,
	trialEndDate,
	trialStartDateError,
}: MonthlyTrialSectionProps) {
	const tc = c.trialConfiguration;
	return (
		<>
			<div className="flex items-center justify-between rounded-lg border border-border-muted bg-card p-4">
				<div className="flex flex-col gap-1">
					<span className="text-sm font-medium text-text-foreground">
						{c.zeroTrial.label}
					</span>
					<span className="text-xs tracking-wide text-muted-foreground">
						{c.zeroTrial.description}
					</span>
				</div>
				<Switch
					checked={zeroTrial}
					onCheckedChange={onZeroTrialChange}
					aria-label={c.zeroTrial.label}
				/>
			</div>

			{!zeroTrial && (
				<CollapsibleCard
					title={<span className="text-text-foreground">{tc.title}</span>}
					defaultOpen
				>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-1">
							<Label
								htmlFor="trial-length"
								className="text-sm font-medium text-text-foreground"
							>
								{tc.trialLength}
							</Label>
							<Select value={trialLength} onValueChange={onTrialLengthChange}>
								<SelectTrigger
									id="trial-length"
									className="w-full rounded-lg border-border bg-card"
									aria-label={tc.trialLength}
									disabled
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{c.trialLengthOptions.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex flex-col gap-1">
							<Label
								htmlFor="trial-start-date"
								className="text-sm font-medium text-text-foreground"
							>
								<span className="text-brand-red">*</span> {tc.trialStartDate}
							</Label>
							<DatePickerInput
								id="trial-start-date"
								value={trialStartDate}
								onChange={onTrialStartDateChange}
								placeholder={FORM_PLACEHOLDERS.selectTrialStartDate}
								error={trialStartDateError}
								min={formatIsoDateLocal(new Date())}
							/>
						</div>

						<FormInput
							id="trial-end-date"
							label={tc.trialEndDate}
							value={trialEndDate}
							disabled
							placeholder={FORM_PLACEHOLDERS.dateFormat}
						/>
					</div>

					<Banner title={tc.autoConvertTitle} icon={INFO_ICON}>
						{tc.autoConvertDescription}
					</Banner>
				</CollapsibleCard>
			)}
		</>
	);
}

function PlanConfigurationSection({
	activePlanTypeId,
	companyPlans,
	selectedPlanId,
	onSelectedPlanIdChange,
	hasPromoToggleDisabled,
	hasPromoCode,
	onHasPromoCodeChange,
	promoCode,
	onPromoCodeChange,
	promoOptions,
	promosLoading,
	promosLoadError,
	billingCurrency,
	onBillingCurrencyChange,
	planPrice,
	discountAmount,
	implementationFeeAmount,
	onsiteTrainingOption,
	onOnsiteTrainingOptionChange,
	subTotalAmount,
	onsiteTrainingFeeAmount,
	invoiceAmount,
	planLevelError,
	promoCodeError,
	discountError,
}: PlanConfigurationSectionProps) {
	const pc = c.planConfiguration;
	const noPlans = companyPlans.length === 0;
	const discountDisplay = hasPromoCode ? discountAmount : 0;

	return (
		<CollapsibleCard title={pc.title} defaultOpen>
			<div className="flex w-full min-w-0 flex-col gap-4">
				<div className="flex w-full min-w-0 items-center justify-between rounded-lg border border-border bg-background p-3">
					<div className="flex flex-col gap-0.5">
						<span className="text-sm font-medium text-text-foreground">
							{pc.hasPromoCode}
						</span>
						<span className="text-xs tracking-wide text-muted-foreground">
							{pc.hasPromoCodeDescription}
						</span>
					</div>
					<Switch
						checked={hasPromoCode}
						onCheckedChange={onHasPromoCodeChange}
						disabled={hasPromoToggleDisabled}
						aria-label={pc.hasPromoCode}
					/>
				</div>

				{hasPromoCode && (
					<div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="min-w-0 w-full">
							<PromoCodeSelect
								id="promo-code"
								value={promoCode}
								onChange={onPromoCodeChange}
								error={promoCodeError}
								options={promoOptions}
								loading={promosLoading}
								loadError={promosLoadError}
							/>
						</div>
					</div>
				)}

				<Separator />

				{noPlans && (
					<p className="text-sm text-muted-foreground">
						{c.noCompanyPlansForTab}
					</p>
				)}

				<div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="flex flex-col gap-1">
						<Label
							htmlFor="plan-level"
							className="text-sm font-medium text-text-foreground"
						>
							<span className="text-brand-red">*</span> {pc.planLevel}
						</Label>
						<Select
							key={activePlanTypeId}
							value={selectedPlanId || undefined}
							onValueChange={onSelectedPlanIdChange}
							disabled={noPlans}
						>
							<SelectTrigger
								id="plan-level"
								className={cn(
									"w-full rounded-lg border-border bg-background",
									planLevelError && "border-destructive",
								)}
								aria-label={pc.planLevel}
								aria-invalid={!!planLevelError}
							>
								<SelectValue placeholder={FORM_PLACEHOLDERS.selectPlanLevel} />
							</SelectTrigger>
							<SelectContent>
								{companyPlans.map((plan) => (
									<SelectItem key={plan.id} value={plan.id}>
										{formatPlanEmployeeRange(
											plan.employeeRangeMin,
											plan.employeeRangeMax,
										)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{planLevelError ? (
							<p className="text-mini text-destructive" role="alert">
								{planLevelError}
							</p>
						) : null}
					</div>

					<div className="flex flex-col gap-1">
						<Label
							htmlFor="billing-currency"
							className="text-sm font-medium text-text-foreground"
						>
							{pc.billingCurrency}
						</Label>
						<Select
							value={billingCurrency}
							onValueChange={onBillingCurrencyChange}
						>
							<SelectTrigger
								id="billing-currency"
								className="w-full rounded-lg border-border bg-card"
								aria-label={pc.billingCurrency}
								disabled
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{c.billingCurrencyOptions.map((opt) => (
									<SelectItem key={opt.value} value={opt.value}>
										{opt.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{!noPlans && (
					<PlanPriceBreakdownCard
						planPrice={planPrice}
						discount={discountDisplay}
						promoCodeApplied={hasPromoCode ? promoCode : undefined}
						implementationFee={implementationFeeAmount}
						subTotal={subTotalAmount}
						invoiceAmount={invoiceAmount}
						onsiteTrainingOption={normalizeOnsiteTrainingApiOption(
							onsiteTrainingOption,
						)}
						onsiteTrainingFeeAmount={onsiteTrainingFeeAmount}
						onOnsiteTrainingOptionChange={onOnsiteTrainingOptionChange}
						discountError={discountError}
					/>
				)}
			</div>
		</CollapsibleCard>
	);
}

function PlansLoadingSkeleton() {
	return (
		<div className="flex flex-col gap-4" aria-busy aria-live="polite">
			<Skeleton className="h-11 w-full max-w-xl rounded-xl" />
			<Skeleton className="h-36 w-full rounded-lg" />
			<Skeleton className="h-48 w-full rounded-lg" />
		</div>
	);
}

interface PlanAndSeatsFormInnerProps {
	companyId: string | null | undefined;
	companyDetail: CompanyDetailData | null;
	onSuccess?: () => void;
	submitPlanSeats: (
		companyId: string,
		body: CompanyPlanSeatsPayload,
	) => Promise<{ ok: true } | { ok: false; error: string }>;
}

function PlanAndSeatsFormInner({
	companyId,
	companyDetail,
	onSuccess,
	submitPlanSeats,
}: PlanAndSeatsFormInnerProps) {
	const [planTypes, setPlanTypes] = useState<PricingPlanType[]>([]);
	const [plansLoading, setPlansLoading] = useState(true);
	const [plansError, setPlansError] = useState<string | null>(null);
	const [onboardingFees, setOnboardingFees] = useState<OnboardingFees | null>(
		null,
	);
	const [setupPromos, setSetupPromos] = useState<
		PromoCodeAvailableForCompanySetupItem[]
	>([]);
	const [setupPromosLoading, setSetupPromosLoading] = useState(false);
	const [setupPromosError, setSetupPromosError] = useState<string | null>(null);
	/** True until the in-flight setup-promos request finishes; updated synchronously so clear logic cannot run against an empty list in the same effect flush as `setSetupPromosLoading(true)`. */
	const setupPromosListStaleRef = useRef(true);
	const planConfigByPlanTypeIdRef = useRef<Record<string, PlanConfigSnapshot>>(
		{},
	);

	const {
		watch,
		setValue,
		getValues,
		handleSubmit,
		reset,
		formState: { errors, isSubmitted },
	} = useForm<AddCompanyPlanAndSeatsSchemaType>({
		mode: "onSubmit",
		reValidateMode: "onChange",
		defaultValues: PLAN_SEATS_DEFAULTS,
		resolver: yupResolver(
			addCompanyPlanAndSeatsSchema,
		) as Resolver<AddCompanyPlanAndSeatsSchemaType>,
	});

	const activePlanTypeId = watch("activePlanTypeId");
	const selectedPlanId = watch("selectedPlanId");
	const zeroTrial = watch("zeroTrial");
	const trialLength = watch("trialLength");
	const trialStartDate = watch("trialStartDate");
	const hasPromoCode = watch("hasPromoCode");
	const promoCode = watch("promoCode");
	const discount = watch("discount");
	const billingCurrency = watch("billingCurrency");
	const onsiteTrainingOption = watch("onsiteTrainingOption");

	const companyPlans = useMemo(() => {
		const pt = planTypes.find((p) => p.id === activePlanTypeId);
		if (!pt) return [];
		return pt.plans.filter((p) => p.customerType === "company");
	}, [planTypes, activePlanTypeId]);

	useEffect(() => {
		let cancelled = false;
		setPlansLoading(true);
		setPlansError(null);
		getPricingPlans().then((result) => {
			if (cancelled) return;
			if (!result.ok) {
				setPlansError(result.message);
				setPlansLoading(false);
				return;
			}
			setPlanTypes(result.data);
			setPlansLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		getOnboardingFees().then((result) => {
			if (cancelled) return;
			if (!result.ok) {
				toast.error(result.message);
				return;
			}
			setOnboardingFees(result.data);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (planTypes.length === 0) return;
		if (companyDetail) {
			const prefill = buildPlanSeatsPrefillFromCompanyDetail(
				companyDetail,
				planTypes,
			);
			if (prefill) {
				planConfigByPlanTypeIdRef.current = prefill.refSnapshots;
				reset(prefill.formValues);
				return;
			}
		}
		planConfigByPlanTypeIdRef.current = {};
		reset({
			...PLAN_SEATS_DEFAULTS,
			activePlanTypeId: planTypes[0].id,
		});
	}, [planTypes, companyDetail, reset]);

	useEffect(() => {
		setValue("companyPlanCount", companyPlans.length, {
			shouldValidate: false,
		});
	}, [companyPlans.length, setValue]);

	/** Keep Select in sync with GET company `planId` once pricing tiers for the active tab are loaded. */
	useEffect(() => {
		if (companyPlans.length === 0) return;
		const planLevelId = (
			companyDetail?.planId ??
			companyDetail?.plan?.id ??
			""
		).trim();
		if (!planLevelId) return;
		if (!companyPlans.some((p) => p.id === planLevelId)) return;
		if (getValues("selectedPlanId") === planLevelId) return;
		setValue("selectedPlanId", planLevelId, { shouldValidate: false });
		const tabId = getValues("activePlanTypeId");
		if (tabId) {
			const prev = planConfigByPlanTypeIdRef.current[tabId];
			planConfigByPlanTypeIdRef.current[tabId] = {
				selectedPlanId: planLevelId,
				discount: prev?.discount ?? getValues("discount") ?? "",
				hasPromoCode: prev?.hasPromoCode ?? getValues("hasPromoCode") ?? false,
				promoCode: prev?.promoCode ?? getValues("promoCode") ?? "",
				onsiteTrainingOption:
					prev?.onsiteTrainingOption ??
					getValues("onsiteTrainingOption") ??
					"off",
			};
		}
	}, [companyDetail, companyPlans, setValue, getValues]);

	/** Clear tier only when the active tab has tiers but the current id is not in the list (e.g. tab switch). */
	useEffect(() => {
		if (companyPlans.length === 0) return;
		const current = getValues("selectedPlanId");
		if (!current) return;
		if (companyPlans.some((p) => p.id === current)) return;
		setValue("selectedPlanId", "", { shouldValidate: false });
	}, [companyPlans, setValue, getValues]);

	const selectedPlan = useMemo(
		() => companyPlans.find((p) => p.id === selectedPlanId) ?? null,
		[companyPlans, selectedPlanId],
	);

	const implementationFeeAmount = useMemo(
		() => implementationFeeFromOnboarding(onboardingFees),
		[onboardingFees],
	);

	const trialLengthDays = Number.parseInt(trialLength ?? "14", 10) || 0;
	const trialEndDate = computeTrialEndDate(
		trialStartDate ?? "",
		trialLengthDays,
	);
	const planPrice = selectedPlan?.price ?? 0;

	const oneTimeCompanyPlan = useMemo(
		() => findIndividualPricingPlanLevel(planTypes),
		[planTypes],
	);

	const oneTimeCompanyPlanPrice = oneTimeCompanyPlan?.price ?? 0;
	const oneTimeCompanyPlanLevelId = oneTimeCompanyPlan?.id ?? "";

	const effectivePlanPriceForPromo = useMemo(
		() =>
			activePlanTypeId === "one_time" ? oneTimeCompanyPlanPrice : planPrice,
		[activePlanTypeId, oneTimeCompanyPlanPrice, planPrice],
	);

	useEffect(() => {
		setValue("planPriceLimit", effectivePlanPriceForPromo, {
			shouldValidate: isSubmitted,
		});
	}, [effectivePlanPriceForPromo, setValue, isSubmitted]);

	const discountAmount = useMemo(() => {
		if (!hasPromoCode) return 0;
		return roundCurrencyToTwoDecimals(Number.parseFloat(discount ?? "") || 0);
	}, [hasPromoCode, discount]);

	const onsiteTrainingFeeAmount = useMemo(
		() =>
			onsiteTrainingFeeFromOnboarding(
				onboardingFees,
				normalizeOnsiteTrainingApiOption(onsiteTrainingOption),
			),
		[onboardingFees, onsiteTrainingOption],
	);

	const subTotalAmount = useMemo(
		() =>
			roundCurrencyToTwoDecimals(
				Math.max(0, planPrice - discountAmount + implementationFeeAmount),
			),
		[planPrice, discountAmount, implementationFeeAmount],
	);

	const invoiceAmount = useMemo(
		() =>
			roundCurrencyToTwoDecimals(
				Math.max(0, subTotalAmount + onsiteTrainingFeeAmount),
			),
		[subTotalAmount, onsiteTrainingFeeAmount],
	);

	const oneTimeSubTotalAmount = useMemo(
		() =>
			roundCurrencyToTwoDecimals(
				Math.max(0, oneTimeCompanyPlanPrice - discountAmount),
			),
		[oneTimeCompanyPlanPrice, discountAmount],
	);

	useEffect(() => {
		const ready = !plansLoading && !plansError && planTypes.length > 0;
		if (!ready || !activePlanTypeId) {
			setupPromosListStaleRef.current = true;
			return;
		}
		let cancelled = false;
		setupPromosListStaleRef.current = true;
		setSetupPromosLoading(true);
		setSetupPromos([]);
		setSetupPromosError(null);
		getPromoCodesAvailableForCompanySetup({
			planTypeId: activePlanTypeId,
			corporationId: companyDetail?.corporationId ?? undefined,
		})
			.then((result) => {
				if (cancelled) return;
				setSetupPromosLoading(false);
				if (!result.ok) {
					setSetupPromos([]);
					setSetupPromosError(result.message);
					setupPromosListStaleRef.current = false;
					return;
				}
				setSetupPromos(result.data.items);
				setSetupPromosError(null);
				setupPromosListStaleRef.current = false;
			})
			.catch(() => {
				if (cancelled) return;
				setSetupPromosLoading(false);
				setSetupPromos([]);
				setSetupPromosError(c.planConfiguration.promoCodesLoadError);
				setupPromosListStaleRef.current = false;
			});
		return () => {
			cancelled = true;
			setupPromosListStaleRef.current = true;
		};
	}, [
		plansLoading,
		plansError,
		planTypes.length,
		activePlanTypeId,
		companyDetail?.corporationId,
	]);

	useEffect(() => {
		if (!hasPromoCode || !promoCode || setupPromosLoading) return;
		if (setupPromosListStaleRef.current) return;
		const trimmed = promoCode.trim();
		const found = setupPromos.some(
			(p) => p.code.toLowerCase() === trimmed.toLowerCase(),
		);
		if (!found) {
			setValue("promoCode", "", { shouldValidate: isSubmitted });
			setValue("discount", "", { shouldValidate: isSubmitted });
		}
	}, [
		hasPromoCode,
		promoCode,
		setupPromos,
		setupPromosLoading,
		setValue,
		isSubmitted,
	]);

	useEffect(() => {
		if (!hasPromoCode) return;
		if (setupPromosListStaleRef.current) return;
		const trimmed = (promoCode ?? "").trim();
		const promoRow = setupPromos.find(
			(p) => p.code.toLowerCase() === trimmed.toLowerCase(),
		);
		if (!promoRow || effectivePlanPriceForPromo <= 0) {
			setValue("discount", "", { shouldValidate: isSubmitted });
			return;
		}
		const amt = computePromoDiscountAmount(
			effectivePlanPriceForPromo,
			promoRow,
		);
		setValue("discount", String(amt), { shouldValidate: isSubmitted });
	}, [
		hasPromoCode,
		promoCode,
		setupPromos,
		effectivePlanPriceForPromo,
		setValue,
		isSubmitted,
	]);

	const handleHasPromoCodeChange = useCallback(
		(v: boolean) => {
			setValue("hasPromoCode", v, { shouldValidate: true });
			if (!v) {
				setValue("promoCode", "", { shouldValidate: false });
				setValue("discount", "", { shouldValidate: false });
			}
		},
		[setValue],
	);

	const hasPromoToggleDisabled = useMemo(
		() =>
			setupPromosLoading ||
			setupPromosListStaleRef.current ||
			setupPromos.length === 0,
		[setupPromosLoading, setupPromos],
	);

	/** No promos for this plan tab: turn promo off so the switch is not stuck on while disabled. */
	useEffect(() => {
		if (setupPromosLoading) return;
		if (setupPromosListStaleRef.current) return;
		if (setupPromos.length > 0) return;
		if (!hasPromoCode) return;
		setValue("hasPromoCode", false, { shouldValidate: isSubmitted });
		setValue("promoCode", "", { shouldValidate: isSubmitted });
		setValue("discount", "", { shouldValidate: isSubmitted });
	}, [setupPromosLoading, setupPromos, hasPromoCode, setValue, isSubmitted]);

	const showTrialSections = activePlanTypeId === "monthly";
	const showIndividualBanner = activePlanTypeId === "one_time";

	const onSubmit = useCallback(
		async (values: AddCompanyPlanAndSeatsSchemaType) => {
			if (!companyId) return;
			try {
				const trialLengthDays =
					Number.parseInt(values.trialLength ?? "14", 10) || 0;
				const payload = buildCompanyPlanSeatsPayload({
					activePlanTypeId: values.activePlanTypeId,
					zeroTrial: values.zeroTrial,
					trialLengthDays,
					trialStartDate: values.trialStartDate ?? "",
					selectedPlanId: values.selectedPlanId ?? "",
					discount: values.hasPromoCode ? (values.discount ?? "") : "",
					planPrice,
					oneTimePlanLevelId: oneTimeCompanyPlanLevelId,
					oneTimePlanPrice: oneTimeCompanyPlanPrice,
					hasPromoCode: values.hasPromoCode ?? false,
					promoCode: values.promoCode ?? "",
					onsiteTrainingOption: values.onsiteTrainingOption ?? "off",
				});
				const result = await submitPlanSeats(companyId, payload);
				if (result.ok) onSuccess?.();
			} catch (e) {
				toast.error(
					e instanceof Error ? e.message : "Unable to save plan details",
				);
			}
		},
		[
			companyId,
			onSuccess,
			submitPlanSeats,
			planPrice,
			oneTimeCompanyPlanLevelId,
			oneTimeCompanyPlanPrice,
		],
	);

	const handlePlanTypeSelect = useCallback(
		(id: string) => {
			const previousTabId = getValues("activePlanTypeId");
			if (previousTabId) {
				const v = getValues();
				planConfigByPlanTypeIdRef.current[previousTabId] = {
					selectedPlanId: v.selectedPlanId ?? "",
					discount: v.discount ?? "",
					hasPromoCode: v.hasPromoCode ?? false,
					promoCode: v.promoCode ?? "",
					onsiteTrainingOption: v.onsiteTrainingOption ?? "off",
				};
			}

			setValue("activePlanTypeId", id, { shouldValidate: false });

			const saved = planConfigByPlanTypeIdRef.current[id];
			setValue("selectedPlanId", saved?.selectedPlanId ?? "", {
				shouldValidate: false,
			});
			setValue("discount", saved?.discount ?? "", { shouldValidate: false });
			setValue("hasPromoCode", saved?.hasPromoCode ?? false, {
				shouldValidate: false,
			});
			setValue("promoCode", saved?.promoCode ?? "", { shouldValidate: false });
			setValue(
				"onsiteTrainingOption",
				normalizeOnsiteTrainingApiOption(saved?.onsiteTrainingOption),
				{ shouldValidate: false },
			);

			reset(getValues(), {
				keepDirty: true,
				keepErrors: false,
				keepIsSubmitted: false,
			});
		},
		[getValues, setValue, reset],
	);

	const plansReady = !plansLoading && !plansError && planTypes.length > 0;
	const showEmptyPlansMessage =
		!plansLoading && !plansError && planTypes.length === 0;

	return (
		<form
			id="add-company-plan-seats-form"
			onSubmit={handleSubmit(onSubmit)}
			className="flex flex-col gap-4"
		>
			{plansLoading && <PlansLoadingSkeleton />}

			{plansError && (
				<p className="text-sm text-destructive" role="alert">
					{c.plansLoadError} {plansError}
				</p>
			)}

			{showEmptyPlansMessage && (
				<p className="text-sm text-muted-foreground" role="status">
					{c.noCompanyPlansForTab}
				</p>
			)}

			{plansReady && (
				<>
					<PlanTypeTabs
						planTypes={planTypes}
						activePlanTypeId={activePlanTypeId ?? ""}
						onSelect={handlePlanTypeSelect}
					/>

					{showIndividualBanner && (
						<>
							<IndividualPlanSection
								oneTimeCompanyPlanPrice={oneTimeCompanyPlanPrice}
								hasPromoToggleDisabled={hasPromoToggleDisabled}
								hasPromoCode={hasPromoCode}
								onHasPromoCodeChange={handleHasPromoCodeChange}
								promoCode={promoCode ?? ""}
								onPromoCodeChange={(v: string) =>
									setValue("promoCode", v, { shouldValidate: true })
								}
								promoCodeError={errors.promoCode?.message}
								promoOptions={setupPromos}
								promosLoading={setupPromosLoading}
								promosLoadError={setupPromosError}
							/>
							<PlanPriceBreakdownCard
								planPrice={oneTimeCompanyPlanPrice}
								discount={hasPromoCode ? discountAmount : 0}
								implementationFee={0}
								subTotal={oneTimeSubTotalAmount}
								invoiceAmount={oneTimeSubTotalAmount}
								onsiteTrainingOption="off"
								onsiteTrainingFeeAmount={0}
								hideAddonFees
								discountError={errors.discount?.message}
							/>
						</>
					)}

					{showTrialSections && (
						<MonthlyTrialSection
							zeroTrial={zeroTrial}
							onZeroTrialChange={(v: boolean) =>
								setValue("zeroTrial", v, { shouldValidate: true })
							}
							trialLength={trialLength ?? "14"}
							onTrialLengthChange={(v: string) =>
								setValue("trialLength", v, { shouldValidate: true })
							}
							trialStartDate={trialStartDate ?? ""}
							onTrialStartDateChange={(v: string) =>
								setValue("trialStartDate", v, { shouldValidate: true })
							}
							trialEndDate={trialEndDate}
							trialStartDateError={errors.trialStartDate?.message}
						/>
					)}

					{!showIndividualBanner && (
						<PlanConfigurationSection
							activePlanTypeId={activePlanTypeId}
							companyPlans={companyPlans}
							selectedPlanId={selectedPlanId ?? ""}
							onSelectedPlanIdChange={(id: string) =>
								setValue("selectedPlanId", id, { shouldValidate: isSubmitted })
							}
							hasPromoToggleDisabled={hasPromoToggleDisabled}
							hasPromoCode={hasPromoCode}
							onHasPromoCodeChange={handleHasPromoCodeChange}
							promoCode={promoCode ?? ""}
							onPromoCodeChange={(v: string) =>
								setValue("promoCode", v, { shouldValidate: true })
							}
							promoOptions={setupPromos}
							promosLoading={setupPromosLoading}
							promosLoadError={setupPromosError}
							billingCurrency={billingCurrency ?? "usd"}
							onBillingCurrencyChange={(v: string) =>
								setValue("billingCurrency", v, { shouldValidate: true })
							}
							planPrice={planPrice}
							discountAmount={discountAmount}
							implementationFeeAmount={implementationFeeAmount}
							onsiteTrainingOption={onsiteTrainingOption ?? "off"}
							onOnsiteTrainingOptionChange={(v) =>
								setValue(
									"onsiteTrainingOption",
									normalizeOnsiteTrainingApiOption(v),
									{
										shouldValidate: isSubmitted,
									},
								)
							}
							subTotalAmount={subTotalAmount}
							onsiteTrainingFeeAmount={onsiteTrainingFeeAmount}
							invoiceAmount={invoiceAmount}
							planLevelError={errors.selectedPlanId?.message}
							promoCodeError={errors.promoCode?.message}
							discountError={errors.discount?.message}
						/>
					)}
				</>
			)}
		</form>
	);
}

export function PlanAndSeatsStep({
	companyId,
	onSuccess,
}: AddCompanyPlanSeatsStepProps) {
	const { companyDetail, companyDetailLoading, submitPlanSeats } =
		useCompanyDirectoryStore();

	const isEditLoading = Boolean(companyId && companyDetailLoading);
	if (isEditLoading) {
		return <PlansLoadingSkeleton />;
	}

	return (
		<PlanAndSeatsFormInner
			key={`plan-seats-${companyId ?? "new"}-${companyDetail?.id ?? ""}-${companyDetail?.planSeat?.id ?? "none"}`}
			companyId={companyId}
			companyDetail={companyDetail}
			onSuccess={onSuccess}
			submitPlanSeats={submitPlanSeats}
		/>
	);
}
