import { escapeHtmlForEmail } from '../../common/email-html.util';
import {
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';

/** Inputs for the corporation closure notification email (HTML and plain text). */
export interface CorporationClosedEmailTemplateParams {
  /** Recipient display name; falls back to "there" when empty. */
  recipientDisplayName: string;
  /** Corporation legal or display name shown in the body. */
  corporationName: string;
  /** Primary closure reason from the close request. */
  closureReason: string;
  /** Support contact address from `SUPPORT_CONTACT_EMAIL` (required by caller). */
  supportEmail: string;
}

/**
 * Returns the HTML body for the email sent to the corporation admin when a corporation is closed.
 */
export function getCorporationClosedEmailHtml(
  p: CorporationClosedEmailTemplateParams,
): string {
  const recipient = escapeHtmlForEmail(
    p.recipientDisplayName.trim() || 'there',
  );
  const corporationName = escapeHtmlForEmail(
    p.corporationName.trim() || 'your corporation',
  );
  const closureReason = escapeHtmlForEmail(p.closureReason.trim());
  const supportAddr = p.supportEmail.trim();
  const supportMailto = `mailto:${escapeHtmlForEmail(supportAddr)}`;

  return wrapEmailHtml({
    title: 'Corporation Closed - BSPBlueprint',
    contentRows: renderEmailBodyRow({
      innerHtml: `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${recipient},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">This is to confirm that <strong>${corporationName}</strong> has been permanently closed.</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">All access has been disabled.</p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;"><strong>Reason for closure:</strong></p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${closureReason}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">If you believe this action was taken in error or require assistance, please contact the BSP Support Team at <a href="${supportMailto}" style="color:#1a73e8;">${escapeHtmlForEmail(supportAddr)}</a> immediately.</p>
              <p style="margin:0 0 2px;font-size:15px;line-height:1.6;">Best Regards,</p>
              <p style="margin:0;font-size:15px;line-height:1.6;"><strong>Team BSPBlueprint</strong></p>`,
    }),
  });
}

/**
 * Returns the plain-text body for the corporation closure notification email.
 */
export function getCorporationClosedEmailText(
  p: CorporationClosedEmailTemplateParams,
): string {
  const recipient = p.recipientDisplayName.trim() || 'there';
  const corporationName = p.corporationName.trim() || 'your corporation';
  const supportAddr = p.supportEmail.trim();

  return [
    `Hi ${recipient},`,
    '',
    `This is to confirm that ${corporationName} has been permanently closed.`,
    '',
    'All access has been disabled.',
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
