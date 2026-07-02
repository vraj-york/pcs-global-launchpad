import {
  getSubscriptionPlanChangeEmailHtml,
  getSubscriptionPlanChangeEmailText,
} from './subscription-plan-change-email.template';

describe('subscription-plan-change-email.template', () => {
  const baseParams = {
    companyName: 'Acme West',
    adminName: 'Jane Doe',
    currentPlan: 'Growth Monthly',
    requestDate: '06-08-2026, 10:30 AM',
  };

  describe('getSubscriptionPlanChangeEmailHtml', () => {
    it('includes unified header and plan change request copy', () => {
      const html = getSubscriptionPlanChangeEmailHtml(baseParams);
      expect(html).toContain('width="600"');
      expect(html).toContain('<!--[if mso]>');
      expect(html).toContain('Hi Support Team,');
      expect(html).toContain('Acme West');
      expect(html).toContain('Jane Doe');
      expect(html).toContain('Growth Monthly');
      expect(html).toContain('Team BSPBlueprint');
    });

    it('escapes HTML in field values', () => {
      const html = getSubscriptionPlanChangeEmailHtml({
        ...baseParams,
        companyName: '<script>alert(1)</script>',
      });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('includes platform header logo', () => {
      const html = getSubscriptionPlanChangeEmailHtml(baseParams);
      expect(html).toContain(
        process.env.EMAIL_LOGO_URL!.trim().split('/').pop()!,
      );
    });
  });

  describe('getSubscriptionPlanChangeEmailText', () => {
    it('includes request details', () => {
      const text = getSubscriptionPlanChangeEmailText(baseParams);
      expect(text).toContain('Jane Doe');
      expect(text).toContain('Growth Monthly');
      expect(text).toContain('Team BSPBlueprint');
    });
  });
});
