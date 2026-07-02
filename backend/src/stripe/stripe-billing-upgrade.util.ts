import { BadRequestException } from '@nestjs/common';
import { formatPlanEmployeeRange } from '../common/format.util';
import {
  FINANCE_BILLING_UPGRADE_CUSTOM_TIER_MSG,
  FINANCE_BILLING_UPGRADE_LEVEL_DOWNGRADE_MSG,
  FINANCE_BILLING_UPGRADE_MISSING_STRIPE_PRICE_MSG,
  FINANCE_BILLING_UPGRADE_NO_CHANGE_MSG,
  FINANCE_BILLING_UPGRADE_NO_CURRENT_PLAN_MSG,
  FINANCE_BILLING_UPGRADE_NOT_ELIGIBLE_MSG,
  FINANCE_BILLING_UPGRADE_PLAN_DOWNGRADE_MSG,
  FINANCE_BILLING_UPGRADE_TARGET_NOT_FOUND_MSG,
  PLAN_TYPE_UPGRADE_RANK,
} from './stripe-billing-upgrade.constants';
import type {
  BillingUpgradePlanPick,
  BillingUpgradeValidationResult,
} from './stripe-billing-upgrade.types';

/** Plan type upgrade rank: one_time < annual < monthly. */
export function planTypeUpgradeRank(planTypeId: string): number | null {
  return PLAN_TYPE_UPGRADE_RANK[planTypeId] ?? null;
}

/** Employee range max rank: null < 1-25 < 26-50 < 51-75. */
export function planLevelRank(plan: BillingUpgradePlanPick): number | null {
  if (plan.employeeRangeMax == null) {
    return null;
  }
  return plan.employeeRangeMax;
}

/** True when plan is for a company customer. */
export function isCompanyCustomerPlan(plan: BillingUpgradePlanPick): boolean {
  return plan.customerType === 'company';
}

/** Corporation companies on one-time assessment use the individual pricing row. */
export function isOneTimePlanType(planTypeId: string): boolean {
  return planTypeId === 'one_time';
}

/** Current plan may be upgraded (company tiers or one-time assessment). */
export function isEligibleUpgradeSourcePlan(
  plan: BillingUpgradePlanPick,
): boolean {
  return isCompanyCustomerPlan(plan) || isOneTimePlanType(plan.planTypeId);
}

/** Plan level label; aligns with frontend `formatPlanEmployeeRange`. */
export function planLevelLabel(plan: BillingUpgradePlanPick): string {
  return formatPlanEmployeeRange(plan.employeeRangeMin, plan.employeeRangeMax);
}

/**
 * Returns true when target is a strict upgrade (higher plan type and/or higher seat band).
 */
export function isAllowedUpgradeTarget(
  current: BillingUpgradePlanPick,
  target: BillingUpgradePlanPick,
): boolean {
  if (!isCompanyCustomerPlan(target)) {
    return false;
  }
  const currentTypeRank = planTypeUpgradeRank(current.planTypeId);
  const targetTypeRank = planTypeUpgradeRank(target.planTypeId);
  if (currentTypeRank == null || targetTypeRank == null) {
    return false;
  }
  if (targetTypeRank < currentTypeRank) {
    return false;
  }
  if (target.id === current.id) {
    return false;
  }

  const targetLevelRank = planLevelRank(target);
  if (targetLevelRank == null) {
    return false;
  }

  if (isOneTimePlanType(current.planTypeId)) {
    return targetTypeRank > currentTypeRank;
  }

  const currentLevelRank = planLevelRank(current);
  if (currentLevelRank == null) {
    return false;
  }
  if (
    targetTypeRank === currentTypeRank &&
    targetLevelRank <= currentLevelRank
  ) {
    return false;
  }
  return true;
}

/** Filters allowed upgrade targets for the current plan. */
export function filterAllowedUpgradeTargets(
  current: BillingUpgradePlanPick,
  candidates: BillingUpgradePlanPick[],
): BillingUpgradePlanPick[] {
  return candidates.filter((target) => isAllowedUpgradeTarget(current, target));
}

/**
 * Validates upgrade request; throws BadRequestException when invalid.
 */
export function validateBillingUpgrade(params: {
  current: BillingUpgradePlanPick | null;
  target: BillingUpgradePlanPick | null;
}): BillingUpgradeValidationResult {
  const { current, target } = params;
  if (!current) {
    throw new BadRequestException(FINANCE_BILLING_UPGRADE_NO_CURRENT_PLAN_MSG);
  }
  if (!target) {
    throw new BadRequestException(FINANCE_BILLING_UPGRADE_TARGET_NOT_FOUND_MSG);
  }
  if (target.isCustomPricing) {
    throw new BadRequestException(FINANCE_BILLING_UPGRADE_CUSTOM_TIER_MSG);
  }
  if (!isEligibleUpgradeSourcePlan(current) || !isCompanyCustomerPlan(target)) {
    throw new BadRequestException(FINANCE_BILLING_UPGRADE_NOT_ELIGIBLE_MSG);
  }
  if (
    !isOneTimePlanType(current.planTypeId) &&
    planLevelRank(current) == null
  ) {
    throw new BadRequestException(FINANCE_BILLING_UPGRADE_CUSTOM_TIER_MSG);
  }
  if (planLevelRank(target) == null) {
    throw new BadRequestException(FINANCE_BILLING_UPGRADE_CUSTOM_TIER_MSG);
  }
  if (!target.stripePriceId) {
    throw new BadRequestException(
      FINANCE_BILLING_UPGRADE_MISSING_STRIPE_PRICE_MSG,
    );
  }

  const currentTypeRank = planTypeUpgradeRank(current.planTypeId);
  const targetTypeRank = planTypeUpgradeRank(target.planTypeId);
  if (currentTypeRank == null || targetTypeRank == null) {
    throw new BadRequestException(FINANCE_BILLING_UPGRADE_NOT_ELIGIBLE_MSG);
  }
  if (targetTypeRank < currentTypeRank) {
    throw new BadRequestException(FINANCE_BILLING_UPGRADE_PLAN_DOWNGRADE_MSG);
  }
  const targetLevelRank = planLevelRank(target)!;
  const currentLevelRank = planLevelRank(current);
  if (
    targetTypeRank === currentTypeRank &&
    currentLevelRank != null &&
    targetLevelRank <= currentLevelRank
  ) {
    throw new BadRequestException(FINANCE_BILLING_UPGRADE_LEVEL_DOWNGRADE_MSG);
  }
  if (current.id === target.id) {
    throw new BadRequestException(FINANCE_BILLING_UPGRADE_NO_CHANGE_MSG);
  }

  return {
    current,
    target,
    currentPlanLevel: planLevelLabel(current),
    targetPlanLevel: planLevelLabel(target),
  };
}

/** Returns checkout quantity from plan; defaults to 1 when not specified. */
export function checkoutQuantityFromPlan(plan: BillingUpgradePlanPick): number {
  if (plan.employeeRangeMax != null) {
    return plan.employeeRangeMax;
  }
  if (plan.employeeRangeMin != null) {
    return plan.employeeRangeMin;
  }
  return 1;
}
