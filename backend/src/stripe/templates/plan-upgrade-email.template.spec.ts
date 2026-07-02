import {
  getPlanUpgradeCompanyAdminEmailHtml,
  getPlanUpgradeCompanyAdminEmailText,
  getPlanUpgradeCorporationAdminEmailHtml,
  getPlanUpgradeCorporationAdminEmailText,
} from './plan-upgrade-email.template';

describe('plan-upgrade-email.template', () => {
  const companyAdminParams = {
    companyAdminName: 'Jane Doe',
    companyName: 'New York HQ',
    previousPlanLabel: 'BSP Assessment',
    previousPlanLevel: '1-50 Employees',
    newPlanLabel: 'BSP Assessment',
    newPlanLevel: '51-100 Employees',
    amountChargedFormatted: '$250.00',
    effectiveDate: '06-22-2026',
    supportEmail: 'support@bspblueprint.com',
  };

  const corporationAdminParams = {
    corporationAdminName: 'John Smith',
    companyName: 'New York HQ',
    corporationName: 'Acme Corp',
    previousPlanLabel: 'BSP Assessment',
    previousPlanLevel: '1-50 Employees',
    newPlanLabel: 'BSP Assessment',
    newPlanLevel: '51-100 Employees',
    effectiveDate: '06-22-2026',
    supportEmail: 'support@bspblueprint.com',
  };

  describe('getPlanUpgradeCompanyAdminEmailHtml', () => {
    it('includes company admin copy and subscription details', () => {
      const html = getPlanUpgradeCompanyAdminEmailHtml(companyAdminParams);
      expect(html).toContain('width="600"');
      expect(html).toContain('<!--[if mso]>');
      expect(html).toContain('Hi Jane Doe');
      expect(html).toContain('New York HQ');
      expect(html).toContain('Amount charged for upgrade');
      expect(html).toContain('$250.00');
      expect(html).toContain('Team BSPBlueprint');
    });

    it('escapes HTML in field values', () => {
      const html = getPlanUpgradeCompanyAdminEmailHtml({
        ...companyAdminParams,
        companyName: '<script>alert(1)</script>',
      });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('getPlanUpgradeCompanyAdminEmailText', () => {
    it('includes subscription details', () => {
      const text = getPlanUpgradeCompanyAdminEmailText(companyAdminParams);
      expect(text).toContain('Hi Jane Doe');
      expect(text).toContain('Amount charged for upgrade: $250.00');
      expect(text).toContain('Team BSPBlueprint');
    });
  });

  describe('getPlanUpgradeCorporationAdminEmailHtml', () => {
    it('includes corporation admin copy without amount charged', () => {
      const html = getPlanUpgradeCorporationAdminEmailHtml(
        corporationAdminParams,
      );
      expect(html).toContain('Hi John Smith');
      expect(html).toContain('within');
      expect(html).toContain('Acme Corp');
      expect(html).not.toContain('Amount charged for upgrade');
      expect(html).toContain('Team BSPBlueprint');
    });
  });

  describe('getPlanUpgradeCorporationAdminEmailText', () => {
    it('includes corporation context and effective date', () => {
      const text = getPlanUpgradeCorporationAdminEmailText(
        corporationAdminParams,
      );
      expect(text).toContain('within Acme Corp');
      expect(text).toContain('Effective Date: 06-22-2026');
      expect(text).not.toContain('Amount charged for upgrade');
    });
  });
});
