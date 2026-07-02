import type { OnsiteTrainingApiOption } from "@/types";

export type PlanPriceBreakdownOneTimePromoDiscount = {
	discountType: "percent" | "fixed_amount";
	discountValue: number;
};

type PlanPriceBreakdownCardBaseProps = {
	className?: string;
};

export type PlanPriceBreakdownCardDefaultProps =
	PlanPriceBreakdownCardBaseProps & {
		variant?: "default";
		planPrice: number;
		discount: number;
		promoCodeApplied?: string | null;
		implementationFee: number;
		subTotal: number;
		invoiceAmount: number;
		onsiteTrainingOption: OnsiteTrainingApiOption;
		onsiteTrainingFeeAmount: number;
		/** Pass to make the onsite-training selector interactive (3-up segmented buttons). Omit to render a static pill in read-only contexts. */
		onOnsiteTrainingOptionChange?: (value: OnsiteTrainingApiOption) => void;
		/** Inline error rendered below the discount row (only meaningful in editable contexts). */
		discountError?: string;
		/** When true, implementation fee and onsite training rows are omitted (e.g. individual / one-time plan). */
		hideAddonFees?: boolean;
	};

export type PlanPriceBreakdownCardOneTimeProps =
	PlanPriceBreakdownCardBaseProps & {
		variant: "oneTime";
		planPrice: number;
		promoCode: string | null;
		billingCurrency: string;
		promoDiscount: PlanPriceBreakdownOneTimePromoDiscount | null;
		assessmentQuantity: number;
		quantityError: string | null;
		onAssessmentQuantityChange: (value: number) => void;
	};

export type PlanPriceBreakdownCardProps =
	| PlanPriceBreakdownCardDefaultProps
	| PlanPriceBreakdownCardOneTimeProps;
