import { escapeHtmlForEmail } from '../../common/email-html.util';
import {
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';

/** Inputs for the company reinstatement notification email (HTML and plain text). */
export interface CompanyReinstatedEmailTemplateParams {
  /** Recipient display name; falls back to "there" when empty. */
  recipientDisplayName: string;
  /** Company legal or display name shown in the body. */
  companyName: string;
  /** Effective reinstatement date (MM-DD-YYYY). */
  effectiveDate: string;
  /** Support contact address from `SUPPORT_CONTACT_EMAIL` (required by caller). */
  supportEmail: string;
}

/**
 * Returns the HTML body for the email sent to the company admin when a company is reinstated.
 */
export function getCompanyReinstatedEmailHtml(
  p: CompanyReinstatedEmailTemplateParams,
): string {
  const recipient = escapeHtmlForEmail(
    p.recipientDisplayName.trim() || 'there',
  );
  const companyName = escapeHtmlForEmail(
    p.companyName.trim() || 'your company',
  );
  const effectiveDate = escapeHtmlForEmail(p.effectiveDate.trim());
  const supportAddr = p.supportEmail.trim();
  const supportMailto = `mailto:${escapeHtmlForEmail(supportAddr)}`;

  return wrapEmailHtml({
    title: 'Company Reinstated - BSPBlueprint',
    contentRows: renderEmailBodyRow({
      innerHtml: `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hello ${recipient},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">We are pleased to inform you that the company account for <strong>${companyName}</strong> has been reinstated on the BSP Platform effective <strong>${effectiveDate}</strong>.</p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;">All authorized users can now resume normal access to:</p>
              <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.6;">
                <li style="margin:0 0 8px;">Assessments</li>
                <li style="margin:0 0 8px;">Chatbot and coaching features</li>
                <li style="margin:0 0 8px;">Reports and dashboards</li>
                <li style="margin:0;">Administrative capabilities</li>
              </ul>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">If you experience any issues accessing the platform, please contact the BSP Support Team at <a href="${supportMailto}" style="color:#1a73e8;">${escapeHtmlForEmail(supportAddr)}</a>.</p>
              <p style="margin:0 0 2px;font-size:15px;line-height:1.6;">Best Regards,</p>
              <p style="margin:0;font-size:15px;line-height:1.6;"><strong>Team BSPBlueprint</strong></p>`,
    }),
  });
}

/**
 * Returns the plain-text body for the company reinstatement notification email.
 */
export function getCompanyReinstatedEmailText(
  p: CompanyReinstatedEmailTemplateParams,
): string {
  const recipient = p.recipientDisplayName.trim() || 'there';
  const companyName = p.companyName.trim() || 'your company';
  const supportAddr = p.supportEmail.trim();

  return [
    `Hello ${recipient},`,
    '',
    `We are pleased to inform you that the company account for ${companyName} has been reinstated on the BSP Platform effective ${p.effectiveDate.trim()}.`,
    '',
    'All authorized users can now resume normal access to:',
    '- Assessments',
    '- Chatbot and coaching features',
    '- Reports and dashboards',
    '- Administrative capabilities',
    '',
    'If you experience any issues accessing the platform, please contact the BSP Support Team at',
    supportAddr,
    '',
    'Best Regards,',
    'Team BSPBlueprint',
  ].join('\n');
}
