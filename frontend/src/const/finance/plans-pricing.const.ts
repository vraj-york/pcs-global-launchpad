/** Stable plan type ids from GET /pricing/plans and company checkout. */
export const PLAN_TYPE_ID = {
	monthly: "monthly",
	annual: "annual",
	oneTime: "one_time",
} as const;

/** Stable ordering so the table matches the product’s primary plan sequence. */
export const PLANS_PRICING_TYPE_ORDER = [
	PLAN_TYPE_ID.monthly,
	PLAN_TYPE_ID.annual,
	PLAN_TYPE_ID.oneTime,
] as const;

export const PLANS_PRICING_PAGE_CONTENT = {
	breadcrumbLabel: "Plans & Pricing",
	title: "Plans & Pricing",
	subtitle: "Configure pricing and rules for subscription-based plans.",
	loadError: "Unable to load plans. Please try again.",
	noData: "No plans available.",
	viewPlanAriaLabel: "View plan details",
	dialogTitle: "Plan details",
	dialogClose: "Close",
	dialogPlanLabel: "Plan",
} as const;

export const PLANS_PRICING_TABLE_HEADERS = {
	plans: "Plans",
	price: "Price",
	description: "Description",
	actions: "Actions",
} as const;

export const PLANS_PRICING_VIEW_PAGE = {
	backButton: "Back",
	breadcrumbViewDetails: "View Details",
	notFound: "This plan could not be found.",
	loadError: "Unable to load plan details. Please try again.",
	planLevelColumn: "Plan Level",
	priceColumn: "Price",
	customPriceLabel: "Custom",
} as const;

/**
 * Display names aligned with the Plans & Pricing design (API `name` may differ slightly).
 */
export const PLANS_PRICING_PLAN_LABELS: Record<string, string> = {
	monthly: "BSPBlueprint (Monthly)",
	annual: "BSP Assessment (Annual)",
	one_time: "BSP Assessment (Individual)",
};

/**
 * Marketing descriptions (not returned by GET /pricing/plans).
 */
export const PLANS_PRICING_DESCRIPTIONS: Record<string, string> = {
	monthly:
		"A monthly subscription plan providing ongoing access to the BSPBlueprint platform and its core tools.",
	annual:
		"An annual subscription plan allowing companies to run BSP assessments with yearly billing.",
	one_time:
		"A pay-per-assessment option where companies purchase individual assessments as needed without a recurring subscription.",
};
