import { escapeHtmlForEmail } from '../../common/email-html.util';
import {
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';

/** Inputs for the password-updated confirmation email (HTML and plain text). */
export interface PasswordUpdatedEmailParams {
  /** Recipient first name; falls back to "there" when empty. */
  firstName: string;
  /** Formatted change timestamp (e.g. `05-18-2026, 10:30 AM`). */
  changedAt: string;
  /** Support contact address from `SUPPORT_CONTACT_EMAIL`. */
  supportEmail: string;
}

export const PASSWORD_UPDATED_SUBJECT = 'Your Password Has Been Updated';

/**
 * Returns the HTML body for the email sent after a successful password reset.
 */
export function getPasswordUpdatedHtml(p: PasswordUpdatedEmailParams): string {
  const firstName = escapeHtmlForEmail(p.firstName.trim() || 'there');
  const changedAt = escapeHtmlForEmail(p.changedAt.trim());
  const supportAddr = p.supportEmail.trim();
  const supportMailto = `mailto:${escapeHtmlForEmail(supportAddr)}`;

  return wrapEmailHtml({
    title: PASSWORD_UPDATED_SUBJECT,
    contentRows: renderEmailBodyRow({
      innerHtml: `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${firstName},</p>
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Your BSPBlueprint password was successfully changed on ${changedAt}.</p>
                            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">If you did not make this change, please contact the BSP Support Team at <a href="${supportMailto}" style="color:#3A6FD8;text-decoration:none;">${escapeHtmlForEmail(supportAddr)}</a>.</p>
                            <p style="margin:0 0 2px;font-size:15px;line-height:1.6;">Best Regards,</p>
                            <p style="margin:0;font-size:15px;line-height:1.6;"><strong>Team BSPBlueprint</strong></p>`,
    }),
  });
}

/**
 * Returns the plain-text body for the email sent after a successful password reset.
 */
export function getPasswordUpdatedText(p: PasswordUpdatedEmailParams): string {
  const firstName = p.firstName.trim() || 'there';
  const supportAddr = p.supportEmail.trim();

  return [
    `Hi ${firstName},`,
    '',
    `Your BSPBlueprint password was successfully changed on ${p.changedAt.trim()}.`,
    '',
    'If you did not make this change, please contact the BSP Support Team at',
    supportAddr,
    '.',
    '',
    'Best Regards,',
    'Team BSPBlueprint',
  ].join('\n');
}
