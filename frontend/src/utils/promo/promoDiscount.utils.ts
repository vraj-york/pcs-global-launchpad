import type { PromoCodeAvailableForCompanySetupItem } from "@/types";
import { roundCurrencyToTwoDecimals } from "@/utils";

/** Dollar discount from plan price and promo terms. */
export function computePromoDiscountAmount(
	planPrice: number,
	promo: Pick<
		PromoCodeAvailableForCompanySetupItem,
		"discountType" | "discountValue"
	>,
): number {
	if (!Number.isFinite(planPrice) || planPrice <= 0) return 0;
	if (promo.discountType === "percent") {
		return roundCurrencyToTwoDecimals((planPrice * promo.discountValue) / 100);
	}
	return roundCurrencyToTwoDecimals(Math.min(planPrice, promo.discountValue));
}

export function computeNetAmountAfterPromo(
	baseAmount: number,
	promo: Pick<
		PromoCodeAvailableForCompanySetupItem,
		"discountType" | "discountValue"
	> | null,
): number {
	if (!Number.isFinite(baseAmount) || baseAmount <= 0) return 0;
	if (!promo) return roundCurrencyToTwoDecimals(baseAmount);
	const discount = computePromoDiscountAmount(baseAmount, promo);
	return roundCurrencyToTwoDecimals(Math.max(0, baseAmount - discount));
}
