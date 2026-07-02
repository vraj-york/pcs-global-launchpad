import { create } from "zustand";
import { getPricingPlans } from "@/api";
import {
	PLANS_PRICING_DESCRIPTIONS,
	PLANS_PRICING_PAGE_CONTENT,
	PLANS_PRICING_PLAN_LABELS,
	PLANS_PRICING_TYPE_ORDER,
} from "@/const";
import type {
	PlansPricingActions,
	PlansPricingState,
	PlansPricingSummaryRow,
	PricingPlanType,
} from "@/types";

function orderIndex(planTypeId: string): number {
	const idx = PLANS_PRICING_TYPE_ORDER.indexOf(
		planTypeId as (typeof PLANS_PRICING_TYPE_ORDER)[number],
	);
	return idx === -1 ? PLANS_PRICING_TYPE_ORDER.length : idx;
}

function sortPlanLevels(
	plans: PricingPlanType["plans"],
): PricingPlanType["plans"] {
	return [...plans].sort((a, b) => {
		if (a.customerType !== b.customerType) {
			return a.customerType.localeCompare(b.customerType);
		}
		const amin = a.employeeRangeMin ?? -1;
		const bmin = b.employeeRangeMin ?? -1;
		if (amin !== bmin) return amin - bmin;
		const amax = a.employeeRangeMax ?? Number.MAX_SAFE_INTEGER;
		const bmax = b.employeeRangeMax ?? Number.MAX_SAFE_INTEGER;
		return amax - bmax;
	});
}

function representativePrice(planType: PricingPlanType): number {
	const ordered = sortPlanLevels(planType.plans);
	const priced = ordered.find((p) => !p.isCustomPricing && p.price > 0);
	if (priced) return priced.price;
	return ordered[0]?.price ?? 0;
}

function mapPricingPlanTypesToSummaryRows(
	planTypes: PricingPlanType[],
): PlansPricingSummaryRow[] {
	return [...planTypes]
		.sort((a, b) => orderIndex(a.id) - orderIndex(b.id))
		.map((pt) => ({
			id: pt.id,
			planName: PLANS_PRICING_PLAN_LABELS[pt.id] ?? pt.name,
			price: representativePrice(pt),
			description:
				PLANS_PRICING_DESCRIPTIONS[pt.id] ??
				`${pt.name} pricing tier; see plan configuration for details.`,
		}));
}

const initialState: PlansPricingState = {
	planTypes: null,
	summaryRows: [],
	loading: false,
	error: null,
};

export const usePlansPricingStore = create<
	PlansPricingState & PlansPricingActions
>()((set, get) => ({
	...initialState,

	fetchPricingPlans: async () => {
		if (get().planTypes !== null) return;
		set({ loading: true, error: null });
		const result = await getPricingPlans();
		if (!result.ok) {
			set({
				loading: false,
				error: result.message ?? PLANS_PRICING_PAGE_CONTENT.loadError,
			});
			return;
		}
		set({
			loading: false,
			planTypes: result.data,
			summaryRows: mapPricingPlanTypesToSummaryRows(result.data),
		});
	},
}));
