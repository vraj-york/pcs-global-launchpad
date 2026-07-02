/**
 * HTML layout for Super Admin bulk CSV invite job completion notices (success, partial, or all
 * failed). Uses the shared Outlook-safe email shell with unified header image.
 */

import { escapeHtmlForEmail } from '../../common';
import {
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';

export interface BulkInviteJobCompletionEmailHtmlParams {
  /**
   * Main body HTML placed above the standard divider and support line. Caller must escape any
   * untrusted text; only layout is applied here.
   */
  mainHtml: string;
  /** Support contact for footer mailto link; defaults to support@bspblueprint.com */
  supportEmail?: string;
}

/**
 * Returns a full HTML document for bulk invite job completion email bodies sent via SES.
 */
export function getBulkInviteJobCompletionEmailHtml(
  p: BulkInviteJobCompletionEmailHtmlParams,
): string {
  const supportAddr = escapeHtmlForEmail(
    p.supportEmail?.trim() || 'support@bspblueprint.com',
  );
  const supportMailto = `mailto:${supportAddr}`;

  return wrapEmailHtml({
    title: 'Bulk Invite Job Complete - BSPBlueprint',
    contentRows: renderEmailBodyRow({
      innerHtml: `${p.mainHtml}
              <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0 16px;" />
              <p style="margin:0;font-size:12px;line-height:1.5;color:#888888;text-align:center;">
                If you need assistance, please contact our
                <a href="${supportMailto}" style="color:#1a73e8;">Support Team</a>.
              </p>`,
    }),
  });
}
