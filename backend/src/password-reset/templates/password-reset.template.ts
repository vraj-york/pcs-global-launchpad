import {
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';

export interface PasswordResetEmailParams {
  token: string;
  expiryMinutes: number;
}

export const PASSWORD_RESET_SUBJECT = 'Your Password Reset Code';

/**
 * Format code with hyphen after 3 digits (e.g., "123456" -> "123-456")
 */
function formatCode(code: string): string {
  if (code && code.length === 6) {
    return `${code.slice(0, 3)}-${code.slice(3)}`;
  }
  return code;
}

export function getPasswordResetHtml(params: PasswordResetEmailParams): string {
  const { token } = params;
  const formattedToken = formatCode(token);

  return wrapEmailHtml({
    title: 'Verification Code - BSPBlueprint',
    contentRows: renderEmailBodyRow({
      align: 'center',
      innerHtml: `<h1 style="margin:0 0 10px;padding:0;font-weight:600;font-size:20px;line-height:25px;color:#2F414A;">Verification Code</h1>
                            <p style="margin:0 0 30px;padding:0;font-weight:400;font-size:14px;line-height:21px;color:#385966;">This code is valid for the next 3 minutes.</p>
                            <div style="font-weight:700;font-size:50px;line-height:60px;color:#2F414A;margin-top:20px;margin-bottom:0;">${formattedToken}</div>
                            <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0 16px;" />
                            <p style="margin:0;font-size:12px;line-height:1.5;color:#888888;text-align:center;">
                                In case you didn&#39;t triggered this, please contact our
                                <a href="mailto:support@bspblueprint.com" style="color:#1a73e8;">Support Team</a>.
                            </p>`,
    }),
  });
}

export function getPasswordResetText(params: PasswordResetEmailParams): string {
  const { token, expiryMinutes } = params;
  const formattedToken = `${token.slice(0, 3)}-${token.slice(3)}`;

  return `Password Reset Request

You requested to reset your password. Use the code below to complete the process:

${formattedToken}

This code will expire in ${expiryMinutes} minutes.

If you didn't request this password reset, please ignore this email or contact support if you have concerns.`;
}
