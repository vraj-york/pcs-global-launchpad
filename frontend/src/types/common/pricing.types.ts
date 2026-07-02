/** Single plan level from GET /pricing/plans (e.g. employee range tier) */
export type PricingPlanLevel = {
	id: string;
	planTypeId: string;
	customerType: string;
	employeeRangeMin: number | null;
	employeeRangeMax: number | null;
	price: number;
	isCustomPricing: boolean;
	stripePriceId?: string | null;
};

/** Plan type group from GET /pricing/plans (e.g. BSP Blueprint with nested plans) */
export type PricingPlanType = {
	id: string;
	name: string;
	plans: PricingPlanLevel[];
};

/**
 * One onboarding fee resolved from a configured Stripe Price ID
 * (`amount` is in major units, e.g. 2499.00 for $2,499).
 */
export type OnboardingFeeItem = {
	stripePriceId: string;
	amount: number | null;
	currency: string;
};

/** GET /pricing/onboarding-fees response payload. */
export type OnboardingFees = {
	implementationFee: OnboardingFeeItem;
	onsiteTraining: {
		"1_day": OnboardingFeeItem;
		"2_days": OnboardingFeeItem;
	};
};
