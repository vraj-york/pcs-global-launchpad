import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getOnboardingFees, postCompanyAdminCheckoutSession } from "@/api";
import { BSPLogo } from "@/components/BSPLogo";
import { PlanPriceBreakdownCard } from "@/components/common";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	COMPANY_ADMIN_ONBOARDING,
	normalizeOnsiteTrainingApiOption,
	PLAN_TYPE_ID,
} from "@/const";
import {
	captureCompanyPlanReviewViewed,
	captureStripeCheckoutStarted,
} from "@/lib";
import type {
	CompanyAdminOnboardingFlowProps,
	OnboardingFees,
	OnsiteTrainingApiOption,
} from "@/types";
import { toFiniteNonNegative } from "@/utils";
import {
	CompanyBasicDetailsReview,
	ReviewField,
} from "./CompanyBasicDetailsReview";

function onsiteTrainingFeeFromOnboarding(
	fees: OnboardingFees | null,
	option: OnsiteTrainingApiOption,
): number {
	if (option === "off" || !fees) return 0;
	return toFiniteNonNegative(fees.onsiteTraining[option]?.amount ?? 0);
}

export function CompanyAdminOnboardingFlow({
	review,
	onBackToList,
}: CompanyAdminOnboardingFlowProps) {
	const [step, setStep] = useState<1 | 2>(1);
	const [checkoutLoading, setCheckoutLoading] = useState(false);
	const [onboardingFees, setOnboardingFees] = useState<OnboardingFees | null>(
		null,
	);

	useEffect(() => {
		let cancelled = false;
		getOnboardingFees().then((result) => {
			if (cancelled || !result.ok) return;
			setOnboardingFees(result.data);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const { corporation, company, planSummary } = review;
	const C = COMPANY_ADMIN_ONBOARDING;

	useEffect(() => {
		captureCompanyPlanReviewViewed({
			company_id: review.companyId,
			corporation_id: review.corporationId,
			plan_type_id: planSummary?.planTypeId,
		});
	}, [review.companyId, review.corporationId, planSummary?.planTypeId]);

	const trial = planSummary?.trial;
	const pricing = planSummary?.pricing;
	const isIndividualPlan = planSummary?.planTypeId === PLAN_TYPE_ID.oneTime;
	const showTrialSection =
		planSummary?.planTypeId === PLAN_TYPE_ID.monthly &&
		Boolean(trial) &&
		!trial?.zeroTrial;
	const paymentNoteBody = isIndividualPlan
		? C.paymentNoteBodyOneTime
		: planSummary?.planTypeId === PLAN_TYPE_ID.monthly
			? trial && !trial.zeroTrial
				? C.paymentNoteBodyMonthlyTrial
				: C.paymentNoteBodyMonthlyChargeNow
			: C.paymentNoteBody;
	const step2Intro =
		planSummary?.planTypeId === PLAN_TYPE_ID.annual
			? C.step2IntroAnnual
			: planSummary?.planTypeId === PLAN_TYPE_ID.oneTime
				? C.step2IntroOneTime
				: C.step2IntroMonthly;

	const onsiteTrainingOption = useMemo<OnsiteTrainingApiOption>(
		() => normalizeOnsiteTrainingApiOption(pricing?.onsiteTrainingOption),
		[pricing?.onsiteTrainingOption],
	);
	const [selectedOnsiteTrainingOption, setSelectedOnsiteTrainingOption] =
		useState<OnsiteTrainingApiOption>("off");
	const [assessmentQuantity, setAssessmentQuantity] = useState<number>(
		COMPANY_ADMIN_ONBOARDING.assessmentQuantityMin,
	);
	const [quantityError, setQuantityError] = useState<string | null>(null);

	useEffect(() => {
		setSelectedOnsiteTrainingOption(onsiteTrainingOption);
	}, [onsiteTrainingOption]);

	const isOnsiteTrainingEditable = onsiteTrainingOption === "off";
	const effectiveOnsiteTrainingOption = isOnsiteTrainingEditable
		? selectedOnsiteTrainingOption
		: onsiteTrainingOption;

	const oneTimePlanPrice = toFiniteNonNegative(pricing?.planPrice);
	const oneTimePromoDiscount = useMemo(() => {
		if (
			!isIndividualPlan ||
			!pricing?.promoDiscountType ||
			pricing.promoDiscountValue == null
		) {
			return null;
		}
		const discountValue = Number(pricing.promoDiscountValue);
		if (!Number.isFinite(discountValue)) {
			return null;
		}
		return {
			discountType: pricing.promoDiscountType,
			discountValue,
		};
	}, [
		isIndividualPlan,
		pricing?.promoDiscountType,
		pricing?.promoDiscountValue,
	]);
	const planPriceAmount = toFiniteNonNegative(pricing?.planPrice);
	const discountAmount = toFiniteNonNegative(pricing?.discount);
	const implementationFeeAmountRaw = toFiniteNonNegative(
		onboardingFees?.implementationFee.amount ?? 0,
	);
	const onsiteTrainingFeeAmountRaw = onsiteTrainingFeeFromOnboarding(
		onboardingFees,
		effectiveOnsiteTrainingOption,
	);
	const implementationFeeAmount = isIndividualPlan
		? 0
		: implementationFeeAmountRaw;
	const onsiteTrainingFeeAmount = isIndividualPlan
		? 0
		: onsiteTrainingFeeAmountRaw;
	const subTotalAmount = Math.max(
		0,
		planPriceAmount - discountAmount + implementationFeeAmount,
	);
	const invoiceAmount = subTotalAmount + onsiteTrainingFeeAmount;

	const handleProceedToPayment = async () => {
		if (!review.canCheckout) {
			toast.error(C.checkoutDisabled);
			return;
		}
		if (isIndividualPlan) {
			if (
				!Number.isInteger(assessmentQuantity) ||
				assessmentQuantity < C.assessmentQuantityMin ||
				assessmentQuantity > C.assessmentQuantityMax
			) {
				setQuantityError(C.assessmentQuantityInvalid);
				return;
			}
			setQuantityError(null);
		}
		setCheckoutLoading(true);
		try {
			captureStripeCheckoutStarted({
				company_id: review.companyId,
				corporation_id: review.corporationId,
				plan_type_id: planSummary?.planTypeId,
			});
			const res = await postCompanyAdminCheckoutSession({
				companyId: review.companyId,
				onsiteTrainingOption: effectiveOnsiteTrainingOption,
				...(isIndividualPlan ? { assessmentQuantity } : {}),
			});
			if (!res.ok) {
				toast.error(res.message);
				return;
			}
			window.location.href = res.data.url;
		} finally {
			setCheckoutLoading(false);
		}
	};

	return (
		<div className="flex min-h-[calc(100vh-8rem)] w-full flex-col items-center px-0 sm:px-2">
			<div className="w-full max-w-3xl">
				{onBackToList ? (
					<div className="mb-4 flex justify-start">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							icon={ArrowLeft}
							className="-ml-2 px-2 text-muted-foreground"
							onClick={onBackToList}
						>
							{C.backToCompanies}
						</Button>
					</div>
				) : null}
				<div className="mb-8 flex justify-center">
					<BSPLogo variant="app" />
				</div>

				{step === 1 ? (
					<Card className="w-full border bg-background rounded-xl border-border shadow-md">
						<CardHeader className="space-y-1 text-center">
							<CardTitle className="text-heading-4 font-semibold text-text-foreground">
								{C.step1Title}
							</CardTitle>
							<CardDescription className="text-small font-normal text-text-secondary">
								{C.step1Subtitle}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-8">
							<CompanyBasicDetailsReview
								corporation={corporation}
								company={company}
							/>
							<div className="flex justify-end gap-2 pt-2">
								<Button type="button" onClick={() => setStep(2)}>
									{C.proceedToPlan}
								</Button>
							</div>
							{!planSummary ? (
								<p className="text-center text-sm text-muted-foreground">
									{C.noPlanBody}
								</p>
							) : null}
						</CardContent>
					</Card>
				) : (
					<Card className="w-full border bg-background rounded-xl border-border shadow-md">
						<CardHeader className="space-y-2 text-center">
							<CardTitle className="text-heading-4 font-semibold text-text-foreground">
								{planSummary?.planTypeName ?? C.noPlanTitle}
							</CardTitle>
							<CardDescription className="text-small font-normal text-text-secondary">
								{step2Intro}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							{planSummary ? (
								<>
									{showTrialSection ? (
										<section className="space-y-2">
											<h3 className="text-mini font-medium tracking-wider text-text-secondary">
												{C.trialSection}
											</h3>
											<div className="rounded-xl border border-border bg-background p-4">
												<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
													<ReviewField
														label={C.labelsPlan.zeroTrial}
														value={
															trial
																? trial.zeroTrial
																	? C.labelsPlan.on
																	: C.labelsPlan.off
																: C.notProvided
														}
													/>
													<ReviewField
														label={C.labelsPlan.trialLength}
														value={
															trial
																? `${trial.trialLengthDays} days`
																: C.notProvided
														}
													/>
													<ReviewField
														label={C.labelsPlan.trialStart}
														value={trial?.trialStartDate ?? C.notProvided}
													/>
													<ReviewField
														label={C.labelsPlan.trialEnd}
														value={trial?.trialEndDate ?? C.notProvided}
													/>
													<ReviewField
														label={C.labelsPlan.autoConvert}
														value={
															trial
																? `${trial.autoConvertTrial ? C.labelsPlan.on : C.labelsPlan.off}${trial.autoConvertTrial ? ` ${C.labelsPlan.default}` : ""}`
																: C.notProvided
														}
													/>
												</div>
											</div>
										</section>
									) : null}

									{isIndividualPlan ? (
										<PlanPriceBreakdownCard
											variant="oneTime"
											planPrice={oneTimePlanPrice}
											promoCode={pricing?.promoCode ?? null}
											billingCurrency={pricing?.billingCurrency ?? "USD ($)"}
											promoDiscount={oneTimePromoDiscount}
											assessmentQuantity={assessmentQuantity}
											quantityError={quantityError}
											onAssessmentQuantityChange={(value) => {
												setAssessmentQuantity(value);
												if (quantityError) {
													setQuantityError(null);
												}
											}}
										/>
									) : (
										<section className="space-y-2">
											<h3 className="text-mini font-medium tracking-wider text-text-secondary">
												{C.planSection}
											</h3>
											<div className="space-y-4 rounded-xl border border-border bg-background p-4">
												<div className="flex flex-wrap items-start gap-4">
													<div className="w-56">
														<ReviewField
															label={C.labelsPlan.planLevel}
															value={
																planSummary.employeeRangeLabel ?? C.notProvided
															}
														/>
													</div>
													<div className="w-56">
														<ReviewField
															label={C.labelsPlan.billingCurrency}
															value={pricing?.billingCurrency ?? "USD ($)"}
														/>
													</div>
												</div>

												<PlanPriceBreakdownCard
													planPrice={planPriceAmount}
													discount={discountAmount}
													promoCodeApplied={pricing?.promoCode}
													implementationFee={implementationFeeAmount}
													subTotal={subTotalAmount}
													invoiceAmount={invoiceAmount}
													onsiteTrainingOption={effectiveOnsiteTrainingOption}
													onsiteTrainingFeeAmount={onsiteTrainingFeeAmount}
													onOnsiteTrainingOptionChange={
														isOnsiteTrainingEditable
															? setSelectedOnsiteTrainingOption
															: undefined
													}
													hideAddonFees={isIndividualPlan}
												/>
											</div>
										</section>
									)}

									<Banner title={C.paymentNoteTitle}>{paymentNoteBody}</Banner>
								</>
							) : (
								<p className="text-center text-muted-foreground">
									{C.noPlanBody}
								</p>
							)}
							<div className="flex justify-end gap-2 pt-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setStep(1)}
								>
									{C.back}
								</Button>
								<Button
									type="button"
									onClick={() => handleProceedToPayment()}
									disabled={
										!review.canCheckout || checkoutLoading || !planSummary
									}
								>
									{checkoutLoading ? C.proceeding : C.proceedToPayment}
								</Button>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
