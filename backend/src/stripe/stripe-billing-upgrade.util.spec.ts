import {
  filterAllowedUpgradeTargets,
  isAllowedUpgradeTarget,
  validateBillingUpgrade,
} from './stripe-billing-upgrade.util';
import type { BillingUpgradePlanPick } from './stripe-billing-upgrade.types';

function plan(
  overrides: Partial<BillingUpgradePlanPick> & {
    id: string;
    planTypeId: string;
    employeeRangeMax: number | null;
  },
): BillingUpgradePlanPick {
  return {
    customerType: 'company',
    employeeRangeMin: 1,
    isCustomPricing: false,
    price: { toString: () => '100' },
    stripePriceId: 'price_1',
    planType: { id: overrides.planTypeId, name: 'Plan' },
    ...overrides,
  };
}

describe('stripe-billing-upgrade.util', () => {
  const annual25 = plan({
    id: 'annual-25',
    planTypeId: 'annual',
    employeeRangeMin: 1,
    employeeRangeMax: 25,
  });
  const annual100 = plan({
    id: 'annual-100',
    planTypeId: 'annual',
    employeeRangeMin: 76,
    employeeRangeMax: 100,
  });
  const monthly100 = plan({
    id: 'monthly-100',
    planTypeId: 'monthly',
    employeeRangeMin: 76,
    employeeRangeMax: 100,
  });
  const oneTimeIndividual = plan({
    id: 'one-time-individual',
    planTypeId: 'one_time',
    customerType: 'individual',
    employeeRangeMin: null,
    employeeRangeMax: null,
    price: { toString: () => '195' },
    planType: { id: 'one_time', name: 'BSP Assessment (Individual)' },
  });

  describe('isAllowedUpgradeTarget', () => {
    it('allows annual to monthly with same seats', () => {
      expect(isAllowedUpgradeTarget(annual100, monthly100)).toBe(true);
    });

    it('allows same plan type with higher seats', () => {
      expect(isAllowedUpgradeTarget(annual25, annual100)).toBe(true);
    });

    it('rejects plan type downgrade', () => {
      expect(isAllowedUpgradeTarget(monthly100, annual100)).toBe(false);
    });

    it('rejects seat downgrade on same plan type', () => {
      expect(isAllowedUpgradeTarget(annual100, annual25)).toBe(false);
    });

    it('allows one-time individual source to annual company target', () => {
      expect(isAllowedUpgradeTarget(oneTimeIndividual, annual25)).toBe(true);
    });

    it('allows one-time individual source to monthly company target', () => {
      expect(isAllowedUpgradeTarget(oneTimeIndividual, monthly100)).toBe(true);
    });

    it('rejects one-time to another one-time target', () => {
      const otherOneTime = plan({
        id: 'one-time-other',
        planTypeId: 'one_time',
        customerType: 'individual',
        employeeRangeMin: null,
        employeeRangeMax: null,
      });
      expect(isAllowedUpgradeTarget(oneTimeIndividual, otherOneTime)).toBe(
        false,
      );
    });
  });

  describe('filterAllowedUpgradeTargets', () => {
    it('returns only valid targets', () => {
      const targets = filterAllowedUpgradeTargets(annual25, [
        annual25,
        annual100,
        monthly100,
      ]);
      expect(targets.map((t) => t.id)).toEqual(['annual-100', 'monthly-100']);
    });
  });

  describe('validateBillingUpgrade', () => {
    it('throws on no-op selection', () => {
      expect(() =>
        validateBillingUpgrade({ current: annual25, target: annual25 }),
      ).toThrow();
    });

    it('returns validation result for valid upgrade', () => {
      const result = validateBillingUpgrade({
        current: annual25,
        target: monthly100,
      });
      expect(result.target.id).toBe('monthly-100');
      expect(result.targetPlanLevel).toBe('76-100 employees');
    });

    it('throws when target uses custom pricing', () => {
      const customTarget = plan({
        id: 'custom-100',
        planTypeId: 'annual',
        employeeRangeMax: 100,
        isCustomPricing: true,
      });
      expect(() =>
        validateBillingUpgrade({ current: annual25, target: customTarget }),
      ).toThrow(/Custom pricing tiers cannot be changed/);
    });

    it('throws when target is missing Stripe price', () => {
      const noStripe = plan({
        id: 'no-stripe',
        planTypeId: 'annual',
        employeeRangeMax: 100,
        stripePriceId: null,
      });
      expect(() =>
        validateBillingUpgrade({ current: annual25, target: noStripe }),
      ).toThrow(/not linked to Stripe/);
    });

    it('throws when current plan is missing', () => {
      expect(() =>
        validateBillingUpgrade({ current: null, target: annual100 }),
      ).toThrow(/no current pricing plan/);
    });

    it('throws when target is missing', () => {
      expect(() =>
        validateBillingUpgrade({ current: annual25, target: null }),
      ).toThrow(/Target pricing plan was not found/);
    });

    it('allows one-time individual current plan to upgrade to company monthly', () => {
      const result = validateBillingUpgrade({
        current: oneTimeIndividual,
        target: monthly100,
      });
      expect(result.target.id).toBe('monthly-100');
      expect(result.currentPlanLevel).toBe('Custom');
    });
  });
});
