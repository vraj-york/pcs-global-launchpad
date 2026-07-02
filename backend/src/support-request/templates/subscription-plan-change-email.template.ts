import { escapeHtmlForEmail } from '../../common';
import {
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';

export interface SubscriptionPlanChangeEmailTemplateParams {
  companyName: string;
  adminName: string;
  currentPlan: string;
  requestDate: string;
}

function detailRow(label: string, value: string): string {
  return `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#333333;">
    <strong style="color:#1a1a1a;">${escapeHtmlForEmail(label)}:</strong>
    ${escapeHtmlForEmail(value)}
  </p>`;
}

/**
 * Returns HTML for the subscription plan change support notification email.
 */
export function getSubscriptionPlanChangeEmailHtml(
  p: SubscriptionPlanChangeEmailTemplateParams,
): string {
  return wrapEmailHtml({
    title: 'Subscription Plan Change Request - BSPBlueprint',
    contentRows: renderEmailBodyRow({
      innerHtml: `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;">Hi Support Team,</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#333333;">
                A company administrator has requested to discuss changes to their current subscription plan.
              </p>
              <h2 style="margin:0 0 12px;font-size:16px;color:#1a1a1a;">Request Details</h2>
              ${detailRow('Company', p.companyName)}
              ${detailRow('Company Admin', p.adminName)}
              ${detailRow('Current Plan', p.currentPlan)}
              ${detailRow('Request Date', p.requestDate)}
              <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#333333;">
                Best Regards,<br/>Team BSPBlueprint
              </p>`,
    }),
  });
}

/**
 * Plain-text variant of the subscription plan change support notification email.
 */
export function getSubscriptionPlanChangeEmailText(
  p: SubscriptionPlanChangeEmailTemplateParams,
): string {
  return `Hi Support Team,

A company administrator has requested to discuss changes to their current subscription plan.

Request Details

Company: ${p.companyName}
Company Admin: ${p.adminName}
Current Plan: ${p.currentPlan}
Request Date: ${p.requestDate}

Best Regards,
Team BSPBlueprint`;
}
