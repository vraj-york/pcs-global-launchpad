import { escapeHtmlForEmail } from '../../common';
import {
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';

export interface SupportRequestEmailAttachmentLink {
  displayName: string;
  url: string;
}

export interface SupportRequestEmailTemplateParams {
  userFullName: string;
  userEmail: string;
  userRole: string;
  corporationName: string;
  companyName: string;
  supportSubject: string;
  supportMessage: string;
  attachmentSummary: string;
  /** Set when files are too large to embed; each file is already in S3. */
  attachmentLinks?: SupportRequestEmailAttachmentLink[];
  submittedAt: string;
}

function detailRow(label: string, value: string): string {
  return `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#333333;">
    <strong style="color:#1a1a1a;">${escapeHtmlForEmail(label)}:</strong>
    ${escapeHtmlForEmail(value)}
  </p>`;
}

/**
 * Returns HTML for the support team notification email (BSP header with logo).
 */
export function getSupportRequestEmailHtml(
  p: SupportRequestEmailTemplateParams,
): string {
  const messageHtml = escapeHtmlForEmail(p.supportMessage).replace(
    /\n/g,
    '<br/>',
  );

  const attachmentLinksBlock =
    p.attachmentLinks && p.attachmentLinks.length > 0
      ? `<ul style="margin:8px 0 16px;padding:0 0 0 20px;font-size:14px;line-height:1.7;color:#333333;">
${p.attachmentLinks
  .map(
    (link) =>
      `<li style="margin:6px 0;"><a href="${escapeHtmlForEmail(link.url)}" style="color:#1a73e8;word-break:break-all;overflow-wrap:anywhere;max-width:100%">${escapeHtmlForEmail(link.displayName)}</a></li>`,
  )
  .join('\n')}
</ul>`
      : '';

  return wrapEmailHtml({
    title: 'New Support Request - BSPBlueprint',
    contentRows: renderEmailBodyRow({
      innerHtml: `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;">Hello Support Team,</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#333333;">
                A new support request has been submitted through the BSP Platform.
              </p>
              <h2 style="margin:0 0 12px;font-size:16px;color:#1a1a1a;">User Details</h2>
              ${detailRow('Name', p.userFullName)}
              ${detailRow('Email', p.userEmail)}
              ${detailRow('Role', p.userRole)}
              ${detailRow('Corporation', p.corporationName)}
              ${detailRow('Company', p.companyName)}
              <h2 style="margin:24px 0 12px;font-size:16px;color:#1a1a1a;">Support Request Details</h2>
              ${detailRow('Subject', p.supportSubject)}
              <p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:#1a1a1a;font-weight:600;">Message:</p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#333333;">${messageHtml || escapeHtmlForEmail('N/A')}</p>
              <h2 style="margin:24px 0 12px;font-size:16px;color:#1a1a1a;">Attachment Details</h2>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#333333;">${escapeHtmlForEmail(p.attachmentSummary)}</p>
              ${attachmentLinksBlock}
              <h2 style="margin:24px 0 12px;font-size:16px;color:#1a1a1a;">Submitted On</h2>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#333333;">${escapeHtmlForEmail(p.submittedAt)}</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#333333;">
                Please review and follow up with the user accordingly.
              </p>
              <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#333333;">
                Regards,<br/>BSP Team
              </p>`,
    }),
  });
}

/**
 * Plain-text variant of the support team notification email.
 */
export function getSupportRequestEmailText(
  p: SupportRequestEmailTemplateParams,
): string {
  return `Hello Support Team,

A new support request has been submitted through the BSP Platform.

User Details:

Name: ${p.userFullName}
Email: ${p.userEmail}
Role: ${p.userRole}
Corporation: ${p.corporationName}
Company: ${p.companyName}

Support Request Details:

Subject: ${p.supportSubject}

Message:
${p.supportMessage || 'N/A'}

Attachment Details:
${p.attachmentSummary}${
    p.attachmentLinks && p.attachmentLinks.length > 0
      ? `\n\nDownload links:\n${p.attachmentLinks.map((link) => `- ${link.displayName}: ${link.url}`).join('\n')}`
      : ''
  }

Submitted On:
${p.submittedAt}

Please review and follow up with the user accordingly.

Regards,
BSP Team`;
}
