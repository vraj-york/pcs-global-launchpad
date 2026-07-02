import { escapeHtmlForEmail } from '../../common/email-html.util';
import {
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';

export interface PlanUpgradeCompanyAdminEmailTemplateParams {
  companyAdminName: string;
  companyName: string;
  previousPlanLabel: string;
  previousPlanLevel: string;
  newPlanLabel: string;
  newPlanLevel: string;
  amountChargedFormatted: string;
  effectiveDate: string;
  supportEmail: string;
}

export interface PlanUpgradeCorporationAdminEmailTemplateParams {
  corporationAdminName: string;
  companyName: string;
  corporationName: string;
  previousPlanLabel: string;
  previousPlanLevel: string;
  newPlanLabel: string;
  newPlanLevel: string;
  effectiveDate: string;
  supportEmail: string;
}

/** Renders a detail row for the email template. */
function detailRow(label: string, value: string): string {
  return `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#333333;">
    <strong style="color:#1a1a1a;">${escapeHtmlForEmail(label)}:</strong>
    ${escapeHtmlForEmail(value)}
  </p>`;
}

/** Renders the closing block for the email template. */
function closingBlock(supportEmail: string): string {
  const supportAddr = supportEmail.trim();
  const supportMailto = `mailto:${escapeHtmlForEmail(supportAddr)}`;

  return `<p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#333333;">
                If you have any questions regarding this change, please contact the BSP Support Team at <a href="${supportMailto}" style="color:#1a73e8;">${escapeHtmlForEmail(supportAddr)}</a>.
              </p>
              <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#333333;">
                Best Regards,<br/>Team BSPBlueprint
              </p>`;
}

/** Renders the HTML version of the company admin email template. */
export function getPlanUpgradeCompanyAdminEmailHtml(
  p: PlanUpgradeCompanyAdminEmailTemplateParams,
): string {
  const recipient = escapeHtmlForEmail(p.companyAdminName.trim() || 'there');
  const companyName = escapeHtmlForEmail(
    p.companyName.trim() || 'your company',
  );

  const content = `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;">Hi ${recipient},</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#333333;">
                This is to inform you that the subscription plan for <strong>${companyName}</strong> has been updated by a BSPBlueprint administrator.
              </p>
              <h2 style="margin:0 0 12px;font-size:16px;color:#1a1a1a;">Updated Subscription Details</h2>
              ${detailRow('Previous Plan', p.previousPlanLabel)}
              ${detailRow('New Plan', p.newPlanLabel)}
              ${detailRow('Previous Plan Level', p.previousPlanLevel)}
              ${detailRow('New Plan Level', p.newPlanLevel)}
              ${detailRow('Amount charged for upgrade', p.amountChargedFormatted)}
              ${detailRow('Effective Date', p.effectiveDate)}
              <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#333333;">
                Your billing profile and subscription details have been updated accordingly.
              </p>
              ${closingBlock(p.supportEmail)}`;

  return wrapEmailHtml({
    title: 'Plan Upgrade - BSPBlueprint',
    contentRows: renderEmailBodyRow({ innerHtml: content }),
  });
}

/** Renders the text version of the company admin email template. */
export function getPlanUpgradeCompanyAdminEmailText(
  p: PlanUpgradeCompanyAdminEmailTemplateParams,
): string {
  const recipient = p.companyAdminName.trim() || 'there';
  const companyName = p.companyName.trim() || 'your company';
  const supportAddr = p.supportEmail.trim();

  return [
    `Hi ${recipient},`,
    '',
    `This is to inform you that the subscription plan for ${companyName} has been updated by a BSPBlueprint administrator.`,
    '',
    'Updated Subscription Details',
    '',
    `Previous Plan: ${p.previousPlanLabel}`,
    `New Plan: ${p.newPlanLabel}`,
    `Previous Plan Level: ${p.previousPlanLevel}`,
    `New Plan Level: ${p.newPlanLevel}`,
    `Amount charged for upgrade: ${p.amountChargedFormatted}`,
    `Effective Date: ${p.effectiveDate}`,
    '',
    'Your billing profile and subscription details have been updated accordingly.',
    '',
    'If you have any questions regarding this change, please contact the BSP Support Team at',
    supportAddr,
    '',
    'Best Regards,',
    'Team BSPBlueprint',
  ].join('\n');
}

/** Renders the HTML version of the corporation admin email template. */
export function getPlanUpgradeCorporationAdminEmailHtml(
  p: PlanUpgradeCorporationAdminEmailTemplateParams,
): string {
  const recipient = escapeHtmlForEmail(
    p.corporationAdminName.trim() || 'there',
  );
  const companyName = escapeHtmlForEmail(
    p.companyName.trim() || 'your company',
  );
  const corporationName = escapeHtmlForEmail(
    p.corporationName.trim() || 'your corporation',
  );

  const content = `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;">Hi ${recipient},</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#333333;">
                This is to inform you that the subscription plan for <strong>${companyName}</strong> within <strong>${corporationName}</strong> has been updated by a BSPBlueprint administrator.
              </p>
              <h2 style="margin:0 0 12px;font-size:16px;color:#1a1a1a;">Updated Subscription Details</h2>
              ${detailRow('Previous Plan', p.previousPlanLabel)}
              ${detailRow('New Plan', p.newPlanLabel)}
              ${detailRow('Previous Plan Level', p.previousPlanLevel)}
              ${detailRow('New Plan Level', p.newPlanLevel)}
              ${detailRow('Effective Date', p.effectiveDate)}
              <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#333333;">
                The company's billing profile and subscription details have been updated accordingly.
              </p>
              ${closingBlock(p.supportEmail)}`;

  return wrapEmailHtml({
    title: 'Plan Upgrade - BSPBlueprint',
    contentRows: renderEmailBodyRow({ innerHtml: content }),
  });
}

/** Renders the text version of the corporation admin email template. */
export function getPlanUpgradeCorporationAdminEmailText(
  p: PlanUpgradeCorporationAdminEmailTemplateParams,
): string {
  const recipient = p.corporationAdminName.trim() || 'there';
  const companyName = p.companyName.trim() || 'your company';
  const corporationName = p.corporationName.trim() || 'your corporation';
  const supportAddr = p.supportEmail.trim();

  return [
    `Hi ${recipient},`,
    '',
    `This is to inform you that the subscription plan for ${companyName} within ${corporationName} has been updated by a BSPBlueprint administrator.`,
    '',
    'Updated Subscription Details',
    '',
    `Previous Plan: ${p.previousPlanLabel}`,
    `New Plan: ${p.newPlanLabel}`,
    `Previous Plan Level: ${p.previousPlanLevel}`,
    `New Plan Level: ${p.newPlanLevel}`,
    `Effective Date: ${p.effectiveDate}`,
    '',
    "The company's billing profile and subscription details have been updated accordingly.",
    '',
    'If you have any questions regarding this change, please contact the BSP Support Team at',
    supportAddr,
    '',
    'Best Regards,',
    'Team BSPBlueprint',
  ].join('\n');
}
