/**
 * HTML + plain-text bodies for finance invoice emails (SES with PDF attachments).
 * Layout matches `company-admin-onboarding/templates/company-admin-invite.template.ts`.
 */

import {
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';

export interface InvoiceEmailTemplateParams {
  /** Shown in the body, e.g. "Invoice INV-2025-001" or "3 invoices". */
  summaryLine: string;
}

export function getInvoiceEmailHtml(p: InvoiceEmailTemplateParams): string {
  const summary = escapeHtml(p.summaryLine);

  return wrapEmailHtml({
    title: 'Your BSPBlueprint Invoice',
    contentRows: renderEmailBodyRow({
      align: 'center',
      innerHtml: `<h1 style="margin:0 0 12px;font-size:20px;color:#1a1a1a;text-align:center;">Your BSPBlueprint Invoice</h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#333333;text-align:center;">
                Please find your invoice details in the attached PDF file(s).
              </p>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#333333;text-align:center;">
                <strong style="color:#1a1a1a;">Summary:</strong> ${summary}
              </p>
              <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0 16px;" />
              <p style="margin:0;font-size:12px;line-height:1.5;color:#888888;text-align:center;">
                Questions? Contact our <a href="mailto:support@bspblueprint.com" style="color:#1a73e8;">Support Team</a>.
              </p>`,
    }),
  });
}

export function getInvoiceEmailText(
  params: InvoiceEmailTemplateParams,
): string {
  void params;
  const lines = [
    'Your BSPBlueprint Invoice',
    '',
    'Please find your invoice details in the attached PDF file(s).',
    '',
    'Questions? Contact support@bspblueprint.com',
    '',
  ];
  return lines.join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
