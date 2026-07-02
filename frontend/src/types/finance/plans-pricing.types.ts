import type { PricingPlanType } from "@/types/common/pricing.types";

/** One row per plan type on Plans & Pricing (admin summary). */
export type PlansPricingSummaryRow = {
	id: string;
	planName: string;
	price: number;
	description: string;
};

/** One row per pricing tier on the plan view details table. */
export type PlansPricingTierRow = {
	id: string;
	tierLabel: string;
	/** Stable numeric key for sorting (employee range + customer type). */
	tierSortKey: number;
	price: number;
	isCustomPricing: boolean;
};

export type PlansPricingColumnOptions = {
	onViewClick: (row: PlansPricingSummaryRow) => void;
};

export type PlansPricingState = {
	planTypes: PricingPlanType[] | null;
	summaryRows: PlansPricingSummaryRow[];
	loading: boolean;
	error: string | null;
};

export type PlansPricingActions = {
	fetchPricingPlans: () => Promise<void>;
};
