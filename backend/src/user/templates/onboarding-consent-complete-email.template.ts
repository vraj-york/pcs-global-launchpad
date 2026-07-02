import { escapeHtmlForEmail } from '../../common/email-html.util';
import {
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';

/** Inputs for the onboarding consent completion welcome email (HTML and plain text). */
export interface OnboardingConsentCompleteEmailTemplateParams {
  /** Recipient display name; falls back to "there" when empty. */
  employeeDisplayName: string;
  /** Support contact address from `SUPPORT_CONTACT_EMAIL` (required by caller). */
  supportEmail: string;
}

/**
 * Returns the HTML body for the welcome email sent after the user completes onboarding consent.
 */
export function getOnboardingConsentCompleteEmailHtml(
  p: OnboardingConsentCompleteEmailTemplateParams,
): string {
  const employee = escapeHtmlForEmail(p.employeeDisplayName.trim() || 'there');
  const supportAddr = p.supportEmail.trim();
  const supportMailto = `mailto:${escapeHtmlForEmail(supportAddr)}`;

  return wrapEmailHtml({
    title: 'Welcome to BSPBlueprint',
    contentRows: renderEmailBodyRow({
      innerHtml: `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${employee},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Welcome to <strong>BSPBlueprint</strong>! Your account is now fully set up and ready to go.</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Thank you for completing your profile review and consent. You are now ready to begin using BSPBlueprint to better understand your <strong>behavioral style</strong>, strengthen communication, and support your personal and professional growth.</p>

              <h2 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#111111;">What's next?</h2>
              <p style="margin:0 0 10px;font-size:15px;line-height:1.6;">👉 <strong>Watch your onboarding video</strong> to get a quick introduction to the platform</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">👉 <strong>Complete your BSP Assessment</strong> to unlock personalized insights and coaching tailored to your behavioral style</p>

              <h3 style="margin:0 0 10px;font-size:24px;line-height:1.3;color:#111111;">Your privacy matters</h3>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Your individual responses remain private. Your organization may have access to select profile information, such as your <strong>behavioral style</strong>, while broader platform insights are shared only in aggregated, non-identifiable form.</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">If you have any questions or need help getting started, feel free to contact Support at <a href="${supportMailto}" style="color:#1a73e8;">${escapeHtmlForEmail(supportAddr)}</a>.</p>
              <p style="margin:0 0 2px;font-size:15px;line-height:1.6;">Best regards,</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;"><strong>Team BSPBlueprint</strong></p>
              <p style="margin:0;font-size:15px;line-height:1.6;"><strong>Your growth journey starts now.</strong></p>`,
    }),
  });
}

/**
 * Returns the plain-text body for the onboarding consent completion welcome email.
 */
export function getOnboardingConsentCompleteEmailText(
  p: OnboardingConsentCompleteEmailTemplateParams,
): string {
  const employee = p.employeeDisplayName.trim() || 'there';
  const supportAddr = p.supportEmail.trim();

  return [
    `Hi ${employee},`,
    '',
    'Welcome to BSPBlueprint! Your account is now fully set up and ready to go.',
    '',
    'Thank you for completing your profile review and consent. You are now ready to begin using BSPBlueprint to better understand your behavioral style, strengthen communication, and support your personal and professional growth.',
    '',
    "What's next?",
    '👉 Watch your onboarding video to get a quick introduction to the platform',
    '👉 Complete your BSP Assessment to unlock personalized insights and coaching tailored to your behavioral style',
    '',
    'Your privacy matters',
    'Your individual responses remain private. Your organization may have access to select profile information, such as your behavioral style, while broader platform insights are shared only in aggregated, non-identifiable form.',
    '',
    `If you have any questions or need help getting started, feel free to contact Support at ${supportAddr}.`,
    '',
    'Best regards,',
    'Team BSPBlueprint',
    '',
    'Your growth journey starts now.',
  ].join('\n');
}
