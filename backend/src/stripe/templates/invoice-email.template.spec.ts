import {
  getInvoiceEmailHtml,
  getInvoiceEmailText,
} from './invoice-email.template';

describe('invoice-email.template', () => {
  describe('getInvoiceEmailHtml', () => {
    it('includes summary line and unified header structure', () => {
      const html = getInvoiceEmailHtml({
        summaryLine: 'Invoice INV-2025-001',
      });
      expect(html).toContain('width="600"');
      expect(html).toContain('<!--[if mso]>');
      expect(html).toContain('Your BSPBlueprint Invoice');
      expect(html).toContain('Invoice INV-2025-001');
      expect(html).toContain('support@bspblueprint.com');
    });

    it('escapes HTML in summary line', () => {
      const html = getInvoiceEmailHtml({
        summaryLine: '<script>alert(1)</script>',
      });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('includes platform header logo', () => {
      const html = getInvoiceEmailHtml({ summaryLine: '1 invoice' });
      expect(html).toContain(
        process.env.EMAIL_LOGO_URL!.trim().split('/').pop()!,
      );
    });
  });

  describe('getInvoiceEmailText', () => {
    it('includes fixed body copy (summary is HTML-only)', () => {
      const text = getInvoiceEmailText({ summaryLine: '3 invoices' });
      expect(text).toContain('BSPBlueprint');
      expect(text).toContain(
        'Please find your invoice details in the attached PDF file(s).',
      );
      expect(text).toContain('support@bspblueprint.com');
    });
  });
});
