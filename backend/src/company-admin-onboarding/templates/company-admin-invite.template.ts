import {
  renderBulletproofButton,
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';
import { INVITE_EMAIL_SENDER_LABEL } from '../company-admin-onboarding.constants';

export interface CompanyAdminInviteTemplateParams {
  loginUrl: string;
  /** Set only when a new Cognito user was created; omit temporary password for existing users. */
  temporaryPassword: string | null;
}

export function getCompanyAdminInviteHtml(
  p: CompanyAdminInviteTemplateParams,
): string {
  const tempPassword = p.temporaryPassword;
  const isNewUser = tempPassword != null;
  const loginUrl = escapeHtml(p.loginUrl);

  const intro = isNewUser
    ? `${escapeHtml(INVITE_EMAIL_SENDER_LABEL)} has sent you an invitation. Sign in with your email and the temporary password below. After you sign in, you can review your company and plan details and complete the payment.`
    : `${escapeHtml(INVITE_EMAIL_SENDER_LABEL)} has sent you an invitation. You already have an account for this email—sign in with your existing BSP Blueprint password. After you sign in, you can review your company and plan details and complete payment.`;

  const passwordBlock =
    isNewUser && tempPassword
      ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#333333;">
  Your temporary password is: <strong style="font-family:monospace;">${escapeHtml(tempPassword)}</strong><br/>
  On first sign-in, you will be asked to choose a new password.
</p>`
      : '';

  const signInButton = renderBulletproofButton({
    href: loginUrl,
    label: 'Sign in to BSPBlueprint',
    bgColor: '#1a73e8',
    textColor: '#ffffff',
    borderRadius: 6,
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 600,
  });

  return wrapEmailHtml({
    title: 'Invitation to BSPBlueprint Platform',
    contentRows: renderEmailBodyRow({
      align: 'center',
      innerHtml: `<h1 style="margin:0 0 12px;font-size:20px;color:#1a1a1a;text-align:center;">Invitation to BSPBlueprint Platform</h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#333333;text-align:center;">
                ${intro}
              </p>
              <p style="margin:20px 0 0;text-align:center;">
                <a href="${loginUrl}" style="color:#1a73e8;word-break:break-all;overflow-wrap:anywhere;max-width:100%;font-size:14px;">${loginUrl}</a>
              </p>
              <p style="margin:24px 0 0;text-align:center;">
                ${signInButton}
              </p>
              ${passwordBlock}
              <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0 16px;" />
              <p style="margin:0;font-size:12px;color:#888888;text-align:center;">
                In case you did not request this, please contact our <a href="mailto:support@bspblueprint.com" style="color:#1a73e8;">Support Team</a>.
              </p>`,
    }),
  });
}

export function getCompanyAdminInviteText(
  p: CompanyAdminInviteTemplateParams,
): string {
  const isNewUser = p.temporaryPassword != null;
  const lines = [
    'Invitation to BSPBlueprint Platform',
    '',
    `${INVITE_EMAIL_SENDER_LABEL} has sent you an invitation.`,
    '',
  ];
  if (isNewUser) {
    lines.push(
      'Sign in with your email and the temporary password below. On first sign-in you will set a new password.',
      'After you sign in, you can review your company and plan details and complete payment.',
      '',
      `Your temporary password is: ${p.temporaryPassword}`,
      '',
    );
  } else {
    lines.push(
      'You already have an account for this email. Sign in with your existing BSP Blueprint password.',
      'After you sign in, you can review your company and plan details and complete payment.',
      '',
    );
  }
  lines.push(
    'Sign in at:',
    p.loginUrl,
    '',
    'If you did not expect this email, contact support.',
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
