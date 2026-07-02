export type BillingUpgradePlanPick = {
  id: string;
  planTypeId: string;
  customerType: string;
  employeeRangeMin: number | null;
  employeeRangeMax: number | null;
  price: { toString(): string };
  stripePriceId: string | null;
  isCustomPricing: boolean;
  planType: { id: string; name: string };
};

export type BillingUpgradeValidationResult = {
  current: BillingUpgradePlanPick;
  target: BillingUpgradePlanPick;
  currentPlanLevel: string;
  targetPlanLevel: string;
};

export type BillingUpgradePlanSnapshot = {
  pricingPlanId: string;
  planTypeId: string;
  planLabel: string;
  planLevel: string;
  employeeRangeMin: number | null;
  employeeRangeMax: number | null;
  periodStart: string | null;
  periodEnd: string | null;
};

export type BillingUpgradeTargetOption = {
  pricingPlanId: string;
  planTypeId: string;
  planLabel: string;
  planLevel: string;
  employeeRangeMin: number | null;
  employeeRangeMax: number | null;
  price: number;
};

export type BillingUpgradeOptionsResult = {
  current: BillingUpgradePlanSnapshot;
  allowedTargets: BillingUpgradeTargetOption[];
  oneTimeCreditEligible: boolean;
  oneTimePaymentCents: number | null;
};

export type BillingUpgradePreviewResult = {
  current: BillingUpgradePlanSnapshot;
  target: BillingUpgradePlanSnapshot;
  creditCents: number;
  prorationCreditCents: number;
  amountDueCents: number;
  currency: string;
  renewalDate: string | null;
  /** Recurring charge on the next billing cycle after the upgrade (target plan price × quantity). */
  nextBillingAmountCents: number | null;
};

export type BillingUpgradeApplyResult = {
  ok: true;
  pricingPlanId: string;
  amountDueCents: number;
  currency: string;
  renewalDate: string | null;
};
