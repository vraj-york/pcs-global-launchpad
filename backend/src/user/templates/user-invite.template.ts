import {
  renderBulletproofButton,
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';

const DEFAULT_SUPPORT_EMAIL = 'support@bspblueprint.com';

export interface UserInviteTemplateParams {
  loginUrl: string;
  /** Set when a new Cognito user was created or a fresh temp password was issued. */
  temporaryPassword: string | null;
  /** Invited user first name for greeting. */
  firstName: string;
  /** Shown as Support contact; defaults to support@bspblueprint.com */
  supportEmail?: string;
}

export function getUserInviteHtml(p: UserInviteTemplateParams): string {
  const firstName = escapeHtml(p.firstName.trim() || 'there');
  const tempPassword = p.temporaryPassword;
  const hasTempPassword = tempPassword != null && tempPassword.length > 0;
  const supportAddr = p.supportEmail?.trim() || DEFAULT_SUPPORT_EMAIL;
  const supportMailto = escapeHtml(`mailto:${supportAddr}`);
  const loginUrl = escapeHtml(p.loginUrl);

  const passwordBlock = hasTempPassword
    ? `<p style="margin:20px 0 0;font-size:15px;line-height:1.6;color:#333333;">
  Log in with your email address and the temporary password below. You&rsquo;ll be prompted to create a new password when you sign in for the first time.
</p>
  <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#333333;font-family:monospace;font-weight:600;">
  ${escapeHtml(tempPassword)}
</p>`
    : `<p style="margin:20px 0 0;font-size:15px;line-height:1.6;color:#333333;">
  You already have an account for this email. Use the button below to sign in with your existing password.
</p>`;

  const getStartedLine = hasTempPassword
    ? 'Get started in under a minute:'
    : 'Get started:';

  const acceptButton = renderBulletproofButton({
    href: loginUrl,
    label: 'Accept Invitation',
    bgColor: '#1a73e8',
    textColor: '#ffffff',
    borderRadius: 6,
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 600,
  });

  return wrapEmailHtml({
    title: 'Invitation to BSPBlueprint',
    contentRows: renderEmailBodyRow({
      innerHtml: `<p style="margin:0 0 8px;font-size:16px;line-height:1.5;color:#1a1a1a;">Hi ${firstName},</p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333333;">
                You&rsquo;ve been invited to join <strong>BSPBlueprint</strong>, a behavioral coaching and development platform designed to support your personal growth, strengthen communication, and help you perform at your best through guided check-ins and personalized insights.
              </p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#333333;font-weight:600;">${escapeHtml(getStartedLine)}</p>
              ${passwordBlock}
              <p style="margin:24px 0 0;text-align:center;">
                ${acceptButton}
              </p>
              <p style="margin:16px 0 0;text-align:center;font-size:13px;color:#666666;">
                <a href="${loginUrl}" style="color:#1a73e8;word-break:break-all;overflow-wrap:anywhere;max-width:100%">${loginUrl}</a>
              </p>
              <h2 style="margin:28px 0 10px;font-size:16px;color:#1a1a1a;">What to expect:</h2>
              <ul style="margin:0;padding:0 0 0 20px;font-size:15px;line-height:1.7;color:#333333;">
                <li style="margin:6px 0;">Quick check-ins to reflect on mindset, behavior, and growth</li>
                <li style="margin:6px 0;">Personalized insights based on your unique <strong>behavioral style</strong></li>
                <li style="margin:6px 0;">Practical coaching tools to strengthen communication and collaboration</li>
                <li style="margin:6px 0;">A secure and private experience designed for personal and professional development</li>
              </ul>
              <h2 style="margin:24px 0 10px;font-size:16px;color:#1a1a1a;">Your privacy matters</h2>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#333333;">
                Your individual responses remain private. Your organization may have access to select profile information, such as your <strong>behavioral style</strong>, while broader platform insights are shared only in aggregated, non-identifiable form.
              </p>
              <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#333333;">
                If you have any questions, please contact <a href="${supportMailto}" style="color:#1a73e8;">Support</a>.
              </p>
              <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#333333;">
                Best regards,<br/>
                <strong>Team BSPBlueprint</strong>
              </p>`,
    }),
  });
}

export function getUserInviteText(p: UserInviteTemplateParams): string {
  const firstName = p.firstName.trim() || 'there';
  const supportAddr = p.supportEmail?.trim() || DEFAULT_SUPPORT_EMAIL;
  const hasTempPassword =
    p.temporaryPassword != null && p.temporaryPassword.length > 0;

  const lines: string[] = [
    `Hi ${firstName},`,
    '',
    "You've been invited to join BSPBlueprint, a behavioral coaching and development platform designed to support your personal growth, strengthen communication, and help you perform at your best through guided check-ins and personalized insights.",
    '',
    hasTempPassword ? 'Get started in under a minute:' : 'Get started:',
    '',
  ];

  if (hasTempPassword) {
    lines.push(
      'Log in with your email address and the temporary password below. You’ll be prompted to create a new password when you sign in for the first time.',
      '',
      p.temporaryPassword!,
      '',
    );
  } else {
    lines.push(
      'You already have an account for this email. Sign in with your existing password.',
      '',
    );
  }

  lines.push(
    `Accept Invitation: ${p.loginUrl}`,
    '',
    'What to expect:',
    '',
    '- Quick check-ins to reflect on mindset, behavior, and growth',
    '- Personalized insights based on your unique behavioral style',
    '- Practical coaching tools to strengthen communication and collaboration',
    '- A secure and private experience designed for personal and professional development',
    '',
    'Your privacy matters',
    '',
    'Your individual responses remain private. Your organization may have access to select profile information, such as your behavioral style, while broader platform insights are shared only in aggregated, non-identifiable form.',
    '',
    `If you have any questions, please contact Support: ${supportAddr}`,
    '',
    'Best regards,',
    'Team BSPBlueprint',
    '',
  );

  return lines.join('\n');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
