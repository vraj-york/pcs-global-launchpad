import type { BillingUpgradeOptionsData } from "@/types";

/** Parses max seat band from labels like `1-25 employees` or `100+ employees`. */
export function parseEmployeeRangeMaxFromPlanLevel(
	label: string,
): number | null {
	const trimmed = label.trim().toLowerCase();
	const rangeMatch = trimmed.match(/(\d+)\s*-\s*(\d+)/);
	if (rangeMatch) {
		return Number(rangeMatch[2]);
	}
	const plusMatch = trimmed.match(/(\d+)\+/);
	if (plusMatch) {
		return Number(plusMatch[1]);
	}
	return null;
}

export function resolvePreferredEmployeeRangeMax(
	upgradeOptions: BillingUpgradeOptionsData,
	selectedPricingPlanId?: string,
): number | null {
	const { current } = upgradeOptions;
	if (
		!selectedPricingPlanId ||
		selectedPricingPlanId === current.pricingPlanId
	) {
		return (
			current.employeeRangeMax ??
			parseEmployeeRangeMaxFromPlanLevel(current.planLevel)
		);
	}

	const selected = upgradeOptions.allowedTargets.find(
		(target) => target.pricingPlanId === selectedPricingPlanId,
	);
	if (selected) {
		return (
			selected.employeeRangeMax ??
			parseEmployeeRangeMaxFromPlanLevel(selected.planLevel)
		);
	}

	return (
		current.employeeRangeMax ??
		parseEmployeeRangeMaxFromPlanLevel(current.planLevel)
	);
}

export function targetPricingPlanMatchesPlanType(
	upgradeOptions: BillingUpgradeOptionsData,
	planTypeId: string,
	pricingPlanId?: string,
): boolean {
	if (!pricingPlanId) {
		return false;
	}

	const { current } = upgradeOptions;
	if (
		planTypeId === current.planTypeId &&
		pricingPlanId === current.pricingPlanId
	) {
		return true;
	}

	return upgradeOptions.allowedTargets.some(
		(target) =>
			target.pricingPlanId === pricingPlanId &&
			target.planTypeId === planTypeId,
	);
}

export function resolveTargetPricingPlanForPlanType(
	upgradeOptions: BillingUpgradeOptionsData,
	planTypeId: string,
	selectedPricingPlanId?: string,
): string {
	const preferredMax = resolvePreferredEmployeeRangeMax(
		upgradeOptions,
		selectedPricingPlanId,
	);

	const targetsForType = upgradeOptions.allowedTargets.filter(
		(target) => target.planTypeId === planTypeId,
	);

	if (preferredMax != null) {
		const sameLevelTarget = targetsForType.find(
			(target) =>
				resolvePreferredEmployeeRangeMax(
					upgradeOptions,
					target.pricingPlanId,
				) === preferredMax,
		);
		if (sameLevelTarget) {
			return sameLevelTarget.pricingPlanId;
		}

		const atOrAbove = targetsForType
			.filter((target) => {
				const max = resolvePreferredEmployeeRangeMax(
					upgradeOptions,
					target.pricingPlanId,
				);
				return max != null && max >= preferredMax;
			})
			.sort(
				(a, b) =>
					(resolvePreferredEmployeeRangeMax(upgradeOptions, a.pricingPlanId) ??
						0) -
					(resolvePreferredEmployeeRangeMax(upgradeOptions, b.pricingPlanId) ??
						0),
			);
		if (atOrAbove[0]) {
			return atOrAbove[0].pricingPlanId;
		}
	}

	return targetsForType[0]?.pricingPlanId ?? "";
}

export function buildPlanLevelOptions(
	upgradeOptions: BillingUpgradeOptionsData,
	planTypeId: string,
	selectedPricingPlanId?: string,
): Array<{ value: string; label: string }> {
	if (!planTypeId) {
		return [];
	}

	const options = upgradeOptions.allowedTargets
		.filter((target) => target.planTypeId === planTypeId)
		.map((target) => ({
			value: target.pricingPlanId,
			label: target.planLevel,
		}));

	const { current } = upgradeOptions;
	if (
		current.planTypeId === planTypeId &&
		!options.some((option) => option.value === current.pricingPlanId)
	) {
		options.unshift({
			value: current.pricingPlanId,
			label: current.planLevel,
		});
	}

	const resolvedTargetId = resolveTargetPricingPlanForPlanType(
		upgradeOptions,
		planTypeId,
		selectedPricingPlanId,
	);
	const effectiveTargetId =
		selectedPricingPlanId &&
		targetPricingPlanMatchesPlanType(
			upgradeOptions,
			planTypeId,
			selectedPricingPlanId,
		)
			? selectedPricingPlanId
			: resolvedTargetId;

	if (
		effectiveTargetId &&
		!options.some((option) => option.value === effectiveTargetId)
	) {
		const selectedTarget = upgradeOptions.allowedTargets.find(
			(target) => target.pricingPlanId === effectiveTargetId,
		);
		if (selectedTarget) {
			options.unshift({
				value: selectedTarget.pricingPlanId,
				label: selectedTarget.planLevel,
			});
		}
	}

	return options;
}
