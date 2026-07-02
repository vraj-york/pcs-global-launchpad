import type { OnsiteTrainingApiOption } from "@/types";

/**
 * UI options for the onsite training selector. Fee amounts are NOT stored here:
 * they are resolved at runtime from GET /pricing/onboarding-fees so Stripe stays
 * the single source of truth for onboarding fee prices.
 */
export const PLAN_ONSITE_TRAINING_OPTIONS: ReadonlyArray<{
	apiValue: OnsiteTrainingApiOption;
	label: string;
}> = [
	{ apiValue: "off", label: "Off" },
	{ apiValue: "1_day", label: "1 day" },
	{ apiValue: "2_days", label: "2 days" },
];

export const ONSITE_TRAINING_API_VALUES: OnsiteTrainingApiOption[] =
	PLAN_ONSITE_TRAINING_OPTIONS.map((o) => o.apiValue);

export function normalizeOnsiteTrainingApiOption(
	value: string | undefined | null,
): OnsiteTrainingApiOption {
	const v = (value ?? "").trim();
	return ONSITE_TRAINING_API_VALUES.includes(v as OnsiteTrainingApiOption)
		? (v as OnsiteTrainingApiOption)
		: "off";
}
