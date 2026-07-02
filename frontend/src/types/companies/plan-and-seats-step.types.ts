import type {
	PricingPlanLevel,
	PricingPlanType,
	PromoCodeAvailableForCompanySetupItem,
} from "@/types";

/** Plan configuration */
export type PlanConfigSnapshot = {
	selectedPlanId: string;
	discount: string;
	hasPromoCode: boolean;
	promoCode: string;
	onsiteTrainingOption: string;
};

/** Plan type tab strip (pricing API groups). */
export type PlanTypeTabsProps = {
	planTypes: PricingPlanType[];
	activePlanTypeId: string;
	onSelect: (id: string) => void;
};

/** Searchable promo combobox (Plan & Seats); same `Combobox` pattern as parent corporation on add-company basic info. */
export type PromoCodeSelectProps = {
	id: string;
	value: string;
	onChange: (value: string) => void;
	error?: string;
	options: PromoCodeAvailableForCompanySetupItem[];
	loading: boolean;
	loadError: string | null;
};

/** Individual / one_time plan banner + promo block. */
export type IndividualPlanSectionProps = {
	oneTimeCompanyPlanPrice: number;
	hasPromoToggleDisabled: boolean;
	hasPromoCode: boolean;
	onHasPromoCodeChange: (v: boolean) => void;
	promoCode: string;
	onPromoCodeChange: (v: string) => void;
	promoCodeError?: string;
	promoOptions: PromoCodeAvailableForCompanySetupItem[];
	promosLoading: boolean;
	promosLoadError: string | null;
};

/** Monthly plan: zero trial + trial configuration. */
export type MonthlyTrialSectionProps = {
	zeroTrial: boolean;
	onZeroTrialChange: (v: boolean) => void;
	trialLength: string;
	onTrialLengthChange: (v: string) => void;
	trialStartDate: string;
	onTrialStartDateChange: (v: string) => void;
	trialEndDate: string;
	trialStartDateError?: string;
};

/** Plan configuration card */
export type PlanConfigurationSectionProps = {
	activePlanTypeId: string;
	companyPlans: PricingPlanLevel[];
	selectedPlanId: string;
	onSelectedPlanIdChange: (id: string) => void;
	hasPromoToggleDisabled: boolean;
	hasPromoCode: boolean;
	onHasPromoCodeChange: (v: boolean) => void;
	promoCode: string;
	onPromoCodeChange: (v: string) => void;
	promoOptions: PromoCodeAvailableForCompanySetupItem[];
	promosLoading: boolean;
	promosLoadError: string | null;
	billingCurrency: string;
	onBillingCurrencyChange: (v: string) => void;
	planPrice: number;
	discountAmount: number;
	implementationFeeAmount: number;
	onsiteTrainingOption: string;
	onOnsiteTrainingOptionChange: (v: string) => void;
	subTotalAmount: number;
	onsiteTrainingFeeAmount: number;
	invoiceAmount: number;
	planLevelError?: string;
	promoCodeError?: string;
	discountError?: string;
};

export type TrialEndDateStringFormat = "MM-DD-YYYY" | "YYYY-MM-DD";
