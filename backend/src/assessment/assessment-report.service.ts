import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssessmentStatus } from '@prisma/client';
import path from 'path';
import { EmailService } from '../email';
import { PrismaService } from '../prisma';
import {
  ASSESSMENT_REPORT_FORBIDDEN_MSG,
  ASSESSMENT_REPORT_NOT_FOUND_MSG,
  ASSESSMENT_REPORT_NOT_READY_MSG,
  ASSESSMENT_REPORT_SHARE_EMAIL_SUBJECT,
} from './assessment.constants';
import { AssessmentReportsS3Service } from './assessment-reports-s3.service';
import {
  getAssessmentReportShareEmailHtml,
  getAssessmentReportShareEmailText,
} from './templates/assessment-report-share-email.template';

@Injectable()
export class AssessmentReportService {
  private readonly logger = new Logger(AssessmentReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assessmentReportsS3: AssessmentReportsS3Service,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Validates the assessment exists, belongs to the requester, and has a generated
   * report, then emails the S3 PDF to each recipient. Fails fast on the first
   * SES delivery failure.
   */
  async shareReportWithRecipients(
    assessmentId: string,
    requesterCognitoSub: string,
    recipients: string[],
  ): Promise<void> {
    const normalizedRecipients = this.normalizeEmailList(recipients);
    if (normalizedRecipients.length === 0) {
      throw new NotFoundException('No recipient emails provided.');
    }

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        userId: true,
        status: true,
        assessmentReport: { select: { report: true } },
      },
    });

    if (!assessment) {
      throw new NotFoundException(ASSESSMENT_REPORT_NOT_FOUND_MSG);
    }
    if (assessment.userId !== requesterCognitoSub) {
      throw new ForbiddenException(ASSESSMENT_REPORT_FORBIDDEN_MSG);
    }
    if (assessment.status !== AssessmentStatus.report_generated) {
      throw new NotFoundException(ASSESSMENT_REPORT_NOT_READY_MSG);
    }

    const reportKey = assessment.assessmentReport?.report?.trim();
    if (!reportKey) {
      throw new NotFoundException(ASSESSMENT_REPORT_NOT_READY_MSG);
    }

    const pdfBuffer =
      await this.assessmentReportsS3.getReportPdfBuffer(reportKey);
    const safeFilename = this.buildSafePdfFilename(reportKey);
    const summaryLine = 'Behavioral assessment result — see attached PDF';
    const { htmlBody, textBody } = this.buildShareEmailBodies(summaryLine);

    for (const email of normalizedRecipients) {
      const ok = await this.emailService.sendEmailWithPdfAttachments({
        to: email,
        subject: ASSESSMENT_REPORT_SHARE_EMAIL_SUBJECT,
        textBody,
        htmlBody,
        attachments: [{ filename: safeFilename, content: pdfBuffer }],
      });
      if (!ok) {
        throw new InternalServerErrorException(
          `Failed to send assessment result to ${email}.`,
        );
      }
    }

    this.logger.log(
      `Shared assessment report ${assessmentId} with ${normalizedRecipients.length} recipient(s)`,
    );
  }

  /** Deduplicates recipient emails (trim, lowercase, drop blanks). */
  private normalizeEmailList(emails: string[]): string[] {
    return [
      ...new Set(
        emails.map((e) => e.trim().toLowerCase()).filter((e) => e.length > 0),
      ),
    ];
  }

  /** Derives a safe attachment filename from the S3 key (basename, sanitized, .pdf suffix). */
  private buildSafePdfFilename(reportKey: string): string {
    const base = path.basename(reportKey.replace(/\\/g, '/'));
    const safe = base.replace(/[^\w.-]+/g, '_');
    return safe.toLowerCase().endsWith('.pdf')
      ? safe
      : `${safe || 'report'}.pdf`;
  }

  /** Builds HTML and plain-text share email bodies from templates and EMAIL_LOGO_URL. */
  private buildShareEmailBodies(summaryLine: string): {
    htmlBody: string;
    textBody: string;
  } {
    const params = { summaryLine };
    return {
      htmlBody: getAssessmentReportShareEmailHtml(params),
      textBody: getAssessmentReportShareEmailText(params),
    };
  }
}
