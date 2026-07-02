import {
  renderBulletproofButton,
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';
import { CORPORATION_ADMIN_INVITE_SENDER_LABEL } from '../constants/corporation.messages';

/** Inputs for corporation admin invitation email bodies (HTML and plain text). */
export interface CorporationAdminInviteTemplateParams {
  loginUrl: string;
  /** Non-null when the invite includes a new temporary password from Cognito. */
  temporaryPassword: string | null;
}

/**
 * Builds the HTML body for a corporation admin invite (login link, optional temp password block).
 * Dynamic strings are escaped for safe insertion into HTML.
 */
export function getCorporationAdminInviteHtml(
  p: CorporationAdminInviteTemplateParams,
): string {
  const tempPassword = p.temporaryPassword;
  const isNewUser = tempPassword != null;
  const loginUrl = escapeHtml(p.loginUrl);

  const intro = isNewUser
    ? `${escapeHtml(CORPORATION_ADMIN_INVITE_SENDER_LABEL)} has sent you an invitation. Sign in with your email and the temporary password below. After you sign in, you can access your corporation on BSP Blueprint.`
    : `${escapeHtml(CORPORATION_ADMIN_INVITE_SENDER_LABEL)} has sent you an invitation. You already have an account for this email—sign in with your existing BSP Blueprint password. After you sign in, you can access your corporation.`;

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

/** Plain-text variant of {@link getCorporationAdminInviteHtml} for multipart/alternative email. */
export function getCorporationAdminInviteText(
  p: CorporationAdminInviteTemplateParams,
): string {
  const isNewUser = p.temporaryPassword != null;
  const lines = [
    'Invitation to BSPBlueprint Platform',
    '',
    `${CORPORATION_ADMIN_INVITE_SENDER_LABEL} has sent you an invitation.`,
    '',
  ];
  if (isNewUser) {
    lines.push(
      'Sign in with your email and the temporary password below. On first sign-in you will set a new password.',
      'After you sign in, you can access your corporation on BSP Blueprint.',
      '',
      `Your temporary password is: ${p.temporaryPassword}`,
      '',
    );
  } else {
    lines.push(
      'You already have an account for this email. Sign in with your existing BSP Blueprint password.',
      'After you sign in, you can access your corporation.',
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

/** Escapes `&`, `<`, `>`, and `"` for use in HTML text and attribute contexts. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
