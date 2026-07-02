import { escapeHtmlForEmail } from '../../common/email-html.util';
import {
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';

/** Inputs for the company closure notification email (HTML and plain text). */
export interface CompanyClosedEmailTemplateParams {
  /** Recipient display name; falls back to "there" when empty. */
  recipientDisplayName: string;
  /** Company legal or display name shown in the body. */
  companyName: string;
  /** Parent corporation legal or display name shown in the body. */
  corporationName: string;
  /** Primary closure reason from the corporation close request. */
  closureReason: string;
  /** Support contact address from `SUPPORT_CONTACT_EMAIL` (required by caller). */
  supportEmail: string;
}

/**
 * Returns the HTML body for the email sent to the company admin when a company is closed
 * because its parent corporation was closed.
 */
export function getCompanyClosedEmailHtml(
  p: CompanyClosedEmailTemplateParams,
): string {
  const recipient = escapeHtmlForEmail(
    p.recipientDisplayName.trim() || 'there',
  );
  const companyName = escapeHtmlForEmail(
    p.companyName.trim() || 'your company',
  );
  const corporationName = escapeHtmlForEmail(
    p.corporationName.trim() || 'its parent corporation',
  );
  const closureReason = escapeHtmlForEmail(p.closureReason.trim());
  const supportAddr = p.supportEmail.trim();
  const supportMailto = `mailto:${escapeHtmlForEmail(supportAddr)}`;

  return wrapEmailHtml({
    title: 'Company Closed - BSPBlueprint',
    contentRows: renderEmailBodyRow({
      innerHtml: `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hello ${recipient},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">This is to inform you that <strong>${companyName}</strong> has been closed because its parent corporation, <strong>${corporationName}</strong>, has been permanently closed.</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">As a result, all access to the company account and associated services has been disabled.</p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;"><strong>Reason for closure:</strong></p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${closureReason}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">If you believe this action was taken in error or require assistance, please contact the BSP Support Team at <a href="${supportMailto}" style="color:#1a73e8;">${escapeHtmlForEmail(supportAddr)}</a> immediately.</p>
              <p style="margin:0 0 2px;font-size:15px;line-height:1.6;">Best Regards,</p>
              <p style="margin:0;font-size:15px;line-height:1.6;"><strong>Team BSPBlueprint</strong></p>`,
    }),
  });
}

/**
 * Returns the plain-text body for the company closure notification email.
 */
export function getCompanyClosedEmailText(
  p: CompanyClosedEmailTemplateParams,
): string {
  const recipient = p.recipientDisplayName.trim() || 'there';
  const companyName = p.companyName.trim() || 'your company';
  const corporationName = p.corporationName.trim() || 'its parent corporation';
  const supportAddr = p.supportEmail.trim();

  return [
    `Hello ${recipient},`,
    '',
    `This is to inform you that ${companyName} has been closed because its parent corporation, ${corporationName}, has been permanently closed.`,
    '',
    'As a result, all access to the company account and associated services has been disabled.',
    '',
    'Reason for closure:',
    p.closureReason.trim(),
    '',
    'If you believe this action was taken in error or require assistance, please contact the BSP Support Team at',
    supportAddr,
    'immediately.',
    '',
    'Best Regards,',
    'Team BSPBlueprint',
  ].join('\n');
}
