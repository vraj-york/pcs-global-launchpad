import { escapeHtmlForEmail } from '../../common/email-html.util';
import {
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';

export const DATA_EXPORT_READY_SUBJECT =
  'Your BSPBlueprint data is ready to download';

export interface DataExportReadyEmailParams {
  downloadUrl: string;
  supportEmail?: string;
}

/**
 * Builds the HTML for the data export ready email.
 * @param params - The parameters for the data export ready email.
 * @returns The HTML for the data export ready email.
 */
export function getDataExportReadyHtml(
  params: DataExportReadyEmailParams,
): string {
  const downloadUrl = escapeHtmlForEmail(params.downloadUrl);
  const supportEmail = escapeHtmlForEmail(
    params.supportEmail?.trim() || 'support@bspblueprint.com',
  );
  const supportMailto = `mailto:${supportEmail}`;

  return wrapEmailHtml({
    title: DATA_EXPORT_READY_SUBJECT,
    contentRows: renderEmailBodyRow({
      align: 'center',
      innerHtml: `<h1 style="margin:0 0 8px;font-size:21px;font-weight:600;line-height:25px;color:#2f414a;">Your data is ready to download</h1>
                                        <p style="margin:0 0 24px;font-size:15px;font-weight:400;line-height:22px;color:#385966;">The link will expire within next 24-72 hours.</p>
                                        <p style="margin:0;max-width:100%;font-size:15px;font-weight:600;line-height:24px;">
                                            <a href="${downloadUrl}" style="word-break:break-all;overflow-wrap:anywhere;max-width:100%;color:#3a6fd8;font-weight:600;text-decoration:underline;">${downloadUrl}</a>
                                        </p>
                                        <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0 16px;" />
                                        <p style="margin:0;font-size:12px;line-height:1.5;color:#888888;text-align:center;">
                                            In case you didn&#39;t trigger this, please contact our
                                            <a href="${supportMailto}" style="color:#1a73e8;">Support Team</a>.
                                        </p>`,
    }),
  });
}

/**
 * Builds the text for the data export ready email.
 * @param params - The parameters for the data export ready email.
 * @returns The text for the data export ready email.
 */
export function getDataExportReadyText(
  params: DataExportReadyEmailParams,
): string {
  const supportEmail =
    params.supportEmail?.trim() || 'support@bspblueprint.com';

  return `${DATA_EXPORT_READY_SUBJECT}

Your data is ready to download.

The link will expire within next 24-72 hours.

Download link:
${params.downloadUrl}

In case you didn't trigger this, please connect our Support Team at ${supportEmail}.`;
}
