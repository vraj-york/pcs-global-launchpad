/**
 * Matches {@link backend/cloudformation/lambda/custom-email-sender/index.js}
 * `getLoginVerificationHtml` / `getLoginVerificationText` (login MFA OTP).
 * Subject and plain-text header omit "Login" per product requirement.
 */

import {
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';
import { VERIFICATION_CODE_VALID_MINUTES } from '../constants';

export const VERIFICATION_CODE_SUBJECT = 'Verification Code - BSPBlueprint';

export { VERIFICATION_CODE_VALID_MINUTES };

export interface VerificationCodeEmailParams {
  /** Six-digit code; hyphen formatting applied when rendering. */
  code: string;
}

export function formatVerificationCode(code: string): string {
  if (code && code.length === 6) {
    return `${code.slice(0, 3)}-${code.slice(3)}`;
  }
  return code;
}

export function getVerificationCodeHtml(
  params: VerificationCodeEmailParams,
): string {
  const formattedCode = formatVerificationCode(params.code);

  return wrapEmailHtml({
    title: 'Verification Code - BSPBlueprint',
    contentRows: renderEmailBodyRow({
      align: 'center',
      padding: '40px 24px',
      innerHtml: `<h1 style="margin:0 0 8px;padding:0;font-weight:600;font-size:21px;line-height:25px;color:#2F414A;">Verification Code</h1>
                            <p style="margin:0;padding:0;font-weight:400;font-size:15px;line-height:22px;color:#385966;">This code is valid for the next ${VERIFICATION_CODE_VALID_MINUTES} minutes.</p>
                            <div style="margin:40px 0 0;padding:0;font-weight:700;font-size:50px;line-height:60px;letter-spacing:-0.42px;color:#2F414A;">${formattedCode}</div>
                            <hr style="border:none;border-top:1px solid #DDD9EB;margin:40px 0 0;" />
                            <p style="margin:40px 0 0;padding:0;font-weight:400;font-size:15px;line-height:22px;color:#385966;text-align:center;">
                                In case you didn&#39;t trigger this, please contact our
                                <a href="mailto:support@bspblueprint.com" style="color:#3A6FD8;text-decoration:none;">Support Team</a>
                            </p>`,
    }),
  });
}

export function getVerificationCodeText(
  params: VerificationCodeEmailParams,
): string {
  const formattedCode = formatVerificationCode(params.code);
  return `Verification Code - BSPBlueprint

Use this code to complete your login:

${formattedCode}

This code is valid for the next 3 minutes.

In case you didn't trigger this, please contact our Support Team at support@bspblueprint.com`;
}
