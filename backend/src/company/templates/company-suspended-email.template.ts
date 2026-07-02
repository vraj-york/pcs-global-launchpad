import { escapeHtmlForEmail } from '../../common/email-html.util';
import {
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';

/** Inputs for the company suspension notification email (HTML and plain text). */
export interface CompanySuspendedEmailTemplateParams {
  /** Recipient display name; falls back to "there" when empty. */
  recipientDisplayName: string;
  /** Company legal or display name shown in the body. */
  companyName: string;
  /** Effective suspension date (MM-DD-YYYY). */
  effectiveDate: string;
  /** Primary suspension reason from the suspend request. */
  suspensionReason: string;
  /** Support contact address from `SUPPORT_CONTACT_EMAIL` (required by caller). */
  supportEmail: string;
}

/**
 * Returns the HTML body for the email sent to the company admin when a company is suspended.
 */
export function getCompanySuspendedEmailHtml(
  p: CompanySuspendedEmailTemplateParams,
): string {
  const recipient = escapeHtmlForEmail(
    p.recipientDisplayName.trim() || 'there',
  );
  const companyName = escapeHtmlForEmail(
    p.companyName.trim() || 'your company',
  );
  const effectiveDate = escapeHtmlForEmail(p.effectiveDate.trim());
  const suspensionReason = escapeHtmlForEmail(p.suspensionReason.trim());
  const supportAddr = p.supportEmail.trim();
  const supportMailto = `mailto:${escapeHtmlForEmail(supportAddr)}`;

  return wrapEmailHtml({
    title: 'Company Suspended - BSPBlueprint',
    contentRows: renderEmailBodyRow({
      innerHtml: `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hello ${recipient},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">This is to inform you that the company account for <strong>${companyName}</strong> has been suspended on the BSP Platform effective <strong>${effectiveDate}</strong>.</p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;"><strong>During the suspension period:</strong></p>
              <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.6;">
                <li style="margin:0 0 8px;">Users associated with the company may experience restricted platform access.</li>
                <li style="margin:0 0 8px;">Assessments, chatbot interactions, and administrative actions may be unavailable.</li>
                <li style="margin:0;">Existing data will remain retained unless otherwise communicated.</li>
              </ul>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;"><strong>Reason for suspension:</strong></p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${suspensionReason}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">If you believe this action was taken in error or require assistance, please contact the BSP Support Team at <a href="${supportMailto}" style="color:#1a73e8;">${escapeHtmlForEmail(supportAddr)}</a>.</p>
              <p style="margin:0 0 2px;font-size:15px;line-height:1.6;">Best Regards,</p>
              <p style="margin:0;font-size:15px;line-height:1.6;"><strong>Team BSPBlueprint</strong></p>`,
    }),
  });
}

/**
 * Returns the plain-text body for the company suspension notification email.
 */
export function getCompanySuspendedEmailText(
  p: CompanySuspendedEmailTemplateParams,
): string {
  const recipient = p.recipientDisplayName.trim() || 'there';
  const companyName = p.companyName.trim() || 'your company';
  const supportAddr = p.supportEmail.trim();

  return [
    `Hello ${recipient},`,
    '',
    `This is to inform you that the company account for ${companyName} has been suspended on the BSP Platform effective ${p.effectiveDate.trim()}.`,
    '',
    'During the suspension period:',
    '- Users associated with the company may experience restricted platform access.',
    '- Assessments, chatbot interactions, and administrative actions may be unavailable.',
    '- Existing data will remain retained unless otherwise communicated.',
    '',
    'Reason for suspension:',
    p.suspensionReason.trim(),
    '',
    'If you believe this action was taken in error or require assistance, please contact the BSP Support Team at',
    supportAddr,
    '',
    'Best Regards,',
    'Team BSPBlueprint',
  ].join('\n');
}
