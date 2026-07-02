import { escapeHtmlForEmail } from '../../common';
import {
  renderEmailBodyRow,
  wrapEmailHtml,
} from '../../common/email-shell.util';

export interface AssessmentReportShareEmailParams {
  summaryLine: string;
}

export function getAssessmentReportShareEmailHtml(
  p: AssessmentReportShareEmailParams,
): string {
  const summary = escapeHtmlForEmail(p.summaryLine);

  return wrapEmailHtml({
    title: 'Your BSPBlueprint Assessment Result',
    contentRows: renderEmailBodyRow({
      align: 'center',
      innerHtml: `<h1 style="margin:0 0 12px;font-size:20px;color:#1a1a1a;text-align:center;">Your BSPBlueprint Assessment Result</h1>
              <p style="margin:0;font-size:15px;line-height:1.6;color:#333333;text-align:center;">
                Please find the behavioral assessment result in the attached PDF.
              </p>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#333333;text-align:center;">
                <strong style="color:#1a1a1a;">Summary:</strong> ${summary}
              </p>
              <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0 16px;" />
              <p style="margin:0;font-size:12px;line-height:1.5;color:#888888;text-align:center;">
                Questions? Contact our <a href="mailto:support@bspblueprint.com" style="color:#1a73e8;">Support Team</a>.
              </p>`,
    }),
  });
}

export function getAssessmentReportShareEmailText(
  p: AssessmentReportShareEmailParams,
): string {
  return [
    'Your BSPBlueprint Assessment Result',
    '',
    'Please find the behavioral assessment result in the attached PDF.',
    '',
    `Summary: ${p.summaryLine}`,
    '',
    'Questions? Contact support@bspblueprint.com',
    '',
  ].join('\n');
}
