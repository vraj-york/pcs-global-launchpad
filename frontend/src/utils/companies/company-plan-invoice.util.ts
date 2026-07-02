import { normalizeOnsiteTrainingApiOption } from "@/const";
import type {
	CompanyDetailData,
	CompanyPlanSeatDetail,
	OnboardingFees,
	OnsiteTrainingApiOption,
} from "@/types";
import { roundCurrencyToTwoDecimals } from "@/utils";

const WHOLE_PERCENT_TOLERANCE = 0.001;

function onsiteTrainingFeeAmountFromOnboarding(
	fees: OnboardingFees | null,
	option: OnsiteTrainingApiOption,
): number {
	if (option === "off" || !fees) return 0;
	const amount = fees.onsiteTraining[option].amount;
	return amount != null && Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function discountOnSubtotal(
	subtotal: number,
	planPrice: number,
	unitDiscount: number,
): number {
	if (unitDiscount <= 0) return 0;

	if (planPrice > 0) {
		const impliedPercent = (unitDiscount / planPrice) * 100;
		const roundedPercent = Math.round(impliedPercent);
		const isWholePercentPromo =
			roundedPercent > 0 &&
			roundedPercent < 100 &&
			Math.abs(impliedPercent - roundedPercent) < WHOLE_PERCENT_TOLERANCE;

		if (isWholePercentPromo) {
			return roundCurrencyToTwoDecimals((subtotal * roundedPercent) / 100);
		}
	}

	return roundCurrencyToTwoDecimals(Math.min(subtotal, unitDiscount));
}

function parseStoredPlanSeatAmount(
	value: string | number | null | undefined,
): number {
	if (value == null || value === "") return 0;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * Subscription display total: stored plan line (`invoiceAmount`) plus onboarding fees.
 * `invoiceAmount` is persisted as plan price − discount only.
 */
export function computeSubscriptionPlanDisplayInvoiceAmount(
	planSeat: CompanyPlanSeatDetail,
	onboardingFees: OnboardingFees | null,
): number {
	const planLineAmount = parseStoredPlanSeatAmount(planSeat.invoiceAmount);
	const implementationFeeAmount = onboardingFees?.implementationFee.amount ?? 0;
	const onsiteTrainingFeeAmount = onsiteTrainingFeeAmountFromOnboarding(
		onboardingFees,
		normalizeOnsiteTrainingApiOption(planSeat.onsiteTrainingOption),
	);

	return roundCurrencyToTwoDecimals(
		Math.max(
			0,
			planLineAmount + implementationFeeAmount + onsiteTrainingFeeAmount,
		),
	);
}

/** One-time total: scales per-unit line when assessment quantity is set. */
export function computeOneTimePlanDisplayInvoiceAmount(
	planSeat: CompanyPlanSeatDetail,
	assessmentQuantity: number | null | undefined,
): number {
	const unitPlanPrice = Number(planSeat.planPrice) || 0;
	const unitDiscount = Number(planSeat.discount) || 0;

	if (
		assessmentQuantity != null &&
		Number.isFinite(assessmentQuantity) &&
		assessmentQuantity > 0
	) {
		const subtotal = roundCurrencyToTwoDecimals(
			unitPlanPrice * assessmentQuantity,
		);
		const discountAmount = discountOnSubtotal(
			subtotal,
			unitPlanPrice,
			unitDiscount,
		);
		return roundCurrencyToTwoDecimals(Math.max(0, subtotal - discountAmount));
	}

	const storedPerUnit = parseStoredPlanSeatAmount(planSeat.invoiceAmount);
	if (storedPerUnit > 0) {
		return roundCurrencyToTwoDecimals(storedPerUnit);
	}

	return roundCurrencyToTwoDecimals(Math.max(0, unitPlanPrice - unitDiscount));
}

export function computeCompanyPlanDisplayInvoiceAmount(
	company: CompanyDetailData,
	onboardingFees: OnboardingFees | null,
): number | null {
	const planSeat = company.planSeat;
	if (!planSeat) return null;

	if (company.plan?.planTypeId === "one_time") {
		return computeOneTimePlanDisplayInvoiceAmount(
			planSeat,
			company.assessmentQuantity,
		);
	}

	return computeSubscriptionPlanDisplayInvoiceAmount(planSeat, onboardingFees);
}
