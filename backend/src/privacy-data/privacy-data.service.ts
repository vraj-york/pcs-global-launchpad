import { randomBytes, randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import * as Sentry from '@sentry/nestjs';
import ExcelJS from 'exceljs';
import { ApiResponse, ResponseHelper } from '../common';
import { EmailService } from '../email';
import { PrismaService } from '../prisma';
import { S3Service } from '../s3';
import { AccountSecurityService } from '../account-security/account-security.service';
import { SECURITY_OTP_PURPOSE_DATA_DOWNLOAD } from '../account-security/constants';
import { VerifyDataDownloadOtpDto } from './dto';
import {
  DATA_EXPORT_ALREADY_IN_PROGRESS_MSG,
  DATA_EXPORT_DOWNLOAD_ALREADY_USED_MSG,
  DATA_EXPORT_DOWNLOAD_EXPIRED_MSG,
  DATA_EXPORT_DOWNLOAD_NOT_FOUND_MSG,
  DATA_EXPORT_DOWNLOAD_UNAUTHORIZED_MSG,
  DATA_EXPORT_EMAIL_FAILED_MSG,
  DATA_EXPORT_GENERATION_FAILED_MSG,
  DATA_EXPORT_MAX_ACTIVE_REQUESTS_PER_USER,
  DATA_EXPORT_PRESIGNED_URL_TTL_SECONDS,
  DATA_EXPORT_REQUEST_FAILED_MSG,
  DATA_EXPORT_REQUEST_SUBMITTED_MSG,
  DATA_EXPORT_STATUS,
  DATA_EXPORT_DOWNLOAD_EXPIRY_HOURS,
} from './constants';
import {
  DATA_EXPORT_READY_SUBJECT,
  getDataExportReadyHtml,
  getDataExportReadyText,
} from './templates/data-export-ready.template';

@Injectable()
export class PrivacyDataService {
  private readonly logger = new Logger(PrivacyDataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly s3Service: S3Service,
    private readonly accountSecurityService: AccountSecurityService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Sends a data download OTP to the user.
   * @param cognitoSub - The Cognito sub for the authenticated user.
   * @param email - The email for the authenticated user.
   * @returns The response.
   */
  async sendDataDownloadOtp(
    cognitoSub: string,
    email?: string,
  ): Promise<ApiResponse<{ email: string }>> {
    return this.accountSecurityService.sendDataDownloadOtp(cognitoSub, email);
  }

  /**
   * Resends a data download OTP to the user.
   * @param cognitoSub - The Cognito sub for the authenticated user.
   * @param email - The email for the authenticated user.
   * @returns The response.
   */
  async resendDataDownloadOtp(
    cognitoSub: string,
    email?: string,
  ): Promise<ApiResponse<{ email: string }>> {
    return this.accountSecurityService.resendDataDownloadOtp(cognitoSub, email);
  }

  /**
   * Verifies a data download OTP and submits a data export request.
   * @param cognitoSub - The Cognito sub for the authenticated user.
   * @param dto - The verify data download OTP data.
   * @param email - The email for the authenticated user.
   * @returns The response.
   */
  async verifyAndSubmitDataExportRequest(
    cognitoSub: string,
    dto: VerifyDataDownloadOtpDto,
    email?: string,
  ): Promise<ApiResponse> {
    await this.accountSecurityService.consumeSecurityOtp(
      cognitoSub,
      dto.otp,
      SECURITY_OTP_PURPOSE_DATA_DOWNLOAD,
    );

    const user = await this.prisma.appUser.findFirst({
      where: { cognitoSub, deletedAt: null },
      select: { email: true },
    });
    if (!user) {
      throw new UnauthorizedException(DATA_EXPORT_DOWNLOAD_UNAUTHORIZED_MSG);
    }

    const resolvedEmail =
      email?.trim().toLowerCase() || user.email?.trim().toLowerCase();
    if (!resolvedEmail) {
      throw new BadRequestException(DATA_EXPORT_REQUEST_FAILED_MSG);
    }

    const activeCount = await this.prisma.dataExportRequest.count({
      where: {
        cognitoSub,
        status: {
          in: [DATA_EXPORT_STATUS.PENDING, DATA_EXPORT_STATUS.PROCESSING],
        },
      },
    });
    if (activeCount >= DATA_EXPORT_MAX_ACTIVE_REQUESTS_PER_USER) {
      throw new BadRequestException(DATA_EXPORT_ALREADY_IN_PROGRESS_MSG);
    }

    let requestId: string;
    try {
      const request = await this.prisma.dataExportRequest.create({
        data: {
          cognitoSub,
          email: resolvedEmail,
          status: DATA_EXPORT_STATUS.PENDING,
        },
      });
      requestId = request.id;
    } catch (error) {
      this.logger.error(
        `Failed to create data export request: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(DATA_EXPORT_REQUEST_FAILED_MSG);
    }

    void this.processDataExportRequest(requestId).catch((error: Error) => {
      this.logger.error(
        `Unhandled data export processing error for ${requestId}: ${error.message}`,
        error.stack,
      );
    });

    return ResponseHelper.success(DATA_EXPORT_REQUEST_SUBMITTED_MSG);
  }

  /**
   * Resolves a download redirect.
   * @param token - The token for the download redirect.
   * @returns The response.
   */
  async resolveDownloadRedirect(token: string): Promise<string> {
    const row = await this.getValidDownloadTokenRow(token, {
      allowDownloaded: false,
    });

    const updated = await this.prisma.dataExportDownloadToken.updateMany({
      where: {
        token,
        downloadedAt: null,
      },
      data: { downloadedAt: new Date() },
    });

    if (updated.count === 0) {
      throw new BadRequestException(DATA_EXPORT_DOWNLOAD_ALREADY_USED_MSG);
    }

    return this.s3Service.getPresignedDownloadUrl(
      row.request.s3Key!,
      DATA_EXPORT_PRESIGNED_URL_TTL_SECONDS,
    );
  }

  /**
   * Gets a valid download token row.
   * @param token - The token for the download token.
   * @param options - The options for the download token.
   * @returns The response.
   */
  private async getValidDownloadTokenRow(
    token: string,
    options: { allowDownloaded: boolean },
  ) {
    const row = await this.prisma.dataExportDownloadToken.findUnique({
      where: { token },
      include: {
        request: {
          select: {
            cognitoSub: true,
            s3Key: true,
            status: true,
          },
        },
      },
    });

    if (!row?.request?.s3Key) {
      throw new NotFoundException(DATA_EXPORT_DOWNLOAD_NOT_FOUND_MSG);
    }

    if (row.request.status !== DATA_EXPORT_STATUS.COMPLETED) {
      throw new NotFoundException(DATA_EXPORT_DOWNLOAD_NOT_FOUND_MSG);
    }

    if (!options.allowDownloaded && row.downloadedAt != null) {
      throw new BadRequestException(DATA_EXPORT_DOWNLOAD_ALREADY_USED_MSG);
    }

    const now = Math.floor(Date.now() / 1000);
    if (row.expiresAt < now) {
      throw new BadRequestException(DATA_EXPORT_DOWNLOAD_EXPIRED_MSG);
    }

    return row;
  }

  /**
   * Cleans up expired download tokens.
   */
  @Cron('0 3 * * *')
  async cleanupExpiredDownloadTokens(): Promise<void> {
    await Sentry.withIsolationScope(async () => {
      const now = Math.floor(Date.now() / 1000);
      try {
        const result = await this.prisma.dataExportDownloadToken.deleteMany({
          where: { expiresAt: { lt: now } },
        });
        if (result.count > 0) {
          this.logger.log(
            `Data export token cleanup: removed ${result.count} expired token(s)`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Data export token cleanup failed: ${(error as Error).message}`,
        );
      }
    });
  }

  /**
   * Processes a data export request.
   * @param requestId - The ID of the data export request.
   * @returns The response.
   */
  private async processDataExportRequest(requestId: string): Promise<void> {
    const request = await this.prisma.dataExportRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      return;
    }

    await this.prisma.dataExportRequest.update({
      where: { id: requestId },
      data: { status: DATA_EXPORT_STATUS.PROCESSING },
    });

    try {
      const zipBuffer = await this.buildUserDataZip(request.cognitoSub);
      const filename = `${request.cognitoSub}-${randomUUID()}.zip`;
      const s3Key = this.s3Service.buildUserDataExportKey(filename);

      await this.s3Service.upload(s3Key, zipBuffer, 'application/zip');

      const downloadToken = randomBytes(32).toString('hex');
      const expiresAt =
        Math.floor(Date.now() / 1000) +
        DATA_EXPORT_DOWNLOAD_EXPIRY_HOURS * 60 * 60;

      await this.prisma.$transaction([
        this.prisma.dataExportRequest.update({
          where: { id: requestId },
          data: {
            status: DATA_EXPORT_STATUS.COMPLETED,
            s3Key,
            completedAt: new Date(),
            errorMessage: null,
          },
        }),
        this.prisma.dataExportDownloadToken.create({
          data: {
            token: downloadToken,
            requestId,
            expiresAt,
          },
        }),
      ]);

      const downloadUrl = this.buildPublicDownloadUrl(downloadToken);
      const emailSent = await this.sendDownloadReadyEmail(
        request.email,
        downloadUrl,
      );

      if (!emailSent) {
        await this.prisma.dataExportRequest.update({
          where: { id: requestId },
          data: {
            errorMessage: DATA_EXPORT_EMAIL_FAILED_MSG,
          },
        });
      }

      this.logger.log(
        `Data export completed for request ${requestId} (user=${request.cognitoSub})`,
      );
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(
        `Data export failed for request ${requestId}: ${message}`,
        (error as Error).stack,
      );
      await this.prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: DATA_EXPORT_STATUS.FAILED,
          errorMessage: DATA_EXPORT_GENERATION_FAILED_MSG,
        },
      });
    }
  }

  /**
   * Builds a public download URL.
   * @param token - The token for the download URL.
   * @returns The response.
   */
  private buildPublicDownloadUrl(token: string): string {
    const configured = this.configService
      .get<string>('API_PUBLIC_BASE_URL')
      ?.trim();
    const base = configured?.replace(/\/$/, '') ?? 'http://localhost:3000';
    return `${base}/privacy/data-export/download/${token}`;
  }

  /**
   * Sends a download ready email.
   * @param email - The email for the download ready email.
   * @param downloadUrl - The download URL for the download ready email.
   * @returns The response.
   */
  private async sendDownloadReadyEmail(
    email: string,
    downloadUrl: string,
  ): Promise<boolean> {
    const supportEmail = this.configService
      .get<string>('SUPPORT_CONTACT_EMAIL')
      ?.trim();

    return this.emailService.sendEmail({
      to: email,
      subject: DATA_EXPORT_READY_SUBJECT,
      htmlBody: getDataExportReadyHtml({
        downloadUrl,

        supportEmail,
      }),
      textBody: getDataExportReadyText({
        downloadUrl,
        supportEmail,
      }),
    });
  }

  /**
   * Builds a user data zip.
   * @param cognitoSub - The Cognito sub for the user data zip.
   * @returns The response.
   */
  private async buildUserDataZip(cognitoSub: string): Promise<Buffer> {
    const user = await this.fetchUserExportData(cognitoSub);
    const workbook = this.buildUserDataWorkbook(user);
    const xlsxBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const reportPdfFiles = await this.collectAssessmentReportPdfFiles(
      user.assessments,
    );

    return this.zipFiles([
      { name: 'my-data.xlsx', buffer: xlsxBuffer },
      ...reportPdfFiles,
    ]);
  }

  /**
   * Fetches user export data.
   * @param cognitoSub - The Cognito sub for the user export data.
   * @returns The response.
   */
  private async fetchUserExportData(cognitoSub: string) {
    const user = await this.prisma.appUser.findFirst({
      where: { cognitoSub, deletedAt: null },
      select: {
        userCode: true,
        email: true,
        firstName: true,
        lastName: true,
        nickname: true,
        jobRole: true,
        workPhone: true,
        cellPhone: true,
        timezone: true,
        status: true,
        userType: true,
        inviteType: true,
        completedOnboardingSteps: true,
        invitationSentAt: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
        corporation: { select: { legalName: true } },
        role: {
          select: {
            name: true,
            category: { select: { name: true } },
          },
        },
        companyAccess: {
          select: {
            isAdmin: true,
            company: { select: { legalName: true, companyCode: true } },
          },
        },
        assessments: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            questionResponses: {
              select: {
                value: true,
                createdAt: true,
                option: {
                  select: {
                    color: true,
                    optionText: true,
                    question: {
                      select: {
                        questionOrder: true,
                        questionText: true,
                      },
                    },
                  },
                },
              },
            },
            assessmentScore: {
              select: {
                scoreBreakdown: true,
                styles: {
                  select: {
                    context: true,
                    type: true,
                    bspStyle: { select: { title: true } },
                  },
                },
              },
            },
            assessmentReport: { select: { report: true } },
          },
          orderBy: { startedAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException(DATA_EXPORT_DOWNLOAD_UNAUTHORIZED_MSG);
    }

    return user;
  }

  /**
   * Builds a user data workbook.
   * @param user - The user for the user data workbook.
   * @returns The response.
   */
  private buildUserDataWorkbook(
    user: Awaited<ReturnType<PrivacyDataService['fetchUserExportData']>>,
  ): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BSPBlueprint';
    workbook.created = new Date();

    const profileSheet = workbook.addWorksheet('Profile');
    const consentCompleted = (user.completedOnboardingSteps ?? 0) >= 1;
    const profileFields: [string, string | number | null][] = [
      ['User Code', user.userCode],
      ['Email', user.email],
      ['First Name', user.firstName],
      ['Last Name', user.lastName],
      ['Nickname', user.nickname],
      ['Job Role', user.jobRole],
      ['Work Phone', user.workPhone],
      ['Cell Phone', user.cellPhone],
      ['Timezone', user.timezone],
      ['Status', user.status],
      ['User Type', user.userType],
      ['Invite Type', user.inviteType],
      ['Corporation', user.corporation?.legalName ?? null],
      ['Role', user.role?.name ?? null],
      ['Role Category', user.role?.category?.name ?? null],
      ['Completed Onboarding Steps', user.completedOnboardingSteps],
      ['Consent Step Completed', consentCompleted ? 'Yes' : 'No'],
      ['Invitation Sent At', user.invitationSentAt?.toISOString() ?? null],
      ['Last Seen At', user.lastSeenAt?.toISOString() ?? null],
      ['Created At', user.createdAt.toISOString()],
      ['Updated At', user.updatedAt.toISOString()],
    ];
    profileSheet.addRow(profileFields.map(([label]) => label));
    profileSheet.addRow(profileFields.map(([, value]) => value));

    const companySheet = workbook.addWorksheet('Company Access');
    companySheet.addRow(['Company Code', 'Company Name', 'Is Admin']);
    for (const access of user.companyAccess) {
      companySheet.addRow([
        access.company.companyCode,
        access.company.legalName,
        access.isAdmin ? 'Yes' : 'No',
      ]);
    }

    const assessmentsSheet = workbook.addWorksheet('Assessments');
    assessmentsSheet.addRow([
      'Assessment ID',
      'Status',
      'Started At',
      'Completed At',
    ]);
    for (const assessment of user.assessments) {
      assessmentsSheet.addRow([
        assessment.id,
        assessment.status,
        assessment.startedAt.toISOString(),
        assessment.completedAt?.toISOString() ?? null,
      ]);
    }

    const responsesSheet = workbook.addWorksheet('Assessment Responses');
    responsesSheet.addRow([
      'Assessment ID',
      'Question Order',
      'Question Text',
      'Option Color',
      'Option Text',
      'Response Value',
      'Responded At',
    ]);
    for (const assessment of user.assessments) {
      for (const response of assessment.questionResponses) {
        responsesSheet.addRow([
          assessment.id,
          response.option.question.questionOrder,
          response.option.question.questionText,
          response.option.color,
          response.option.optionText,
          response.value,
          response.createdAt.toISOString(),
        ]);
      }
    }

    const scoresSheet = workbook.addWorksheet('Assessment Scores');
    scoresSheet.addRow(['Assessment ID', 'Score Breakdown (JSON)']);
    for (const assessment of user.assessments) {
      if (assessment.assessmentScore) {
        scoresSheet.addRow([
          assessment.id,
          JSON.stringify(assessment.assessmentScore.scoreBreakdown),
        ]);
      }
    }

    const stylesSheet = workbook.addWorksheet('Assessment Score Styles');
    stylesSheet.addRow(['Assessment ID', 'Context', 'Type', 'BSP Style']);
    for (const assessment of user.assessments) {
      const styles = assessment.assessmentScore?.styles ?? [];
      for (const style of styles) {
        stylesSheet.addRow([
          assessment.id,
          style.context,
          style.type,
          style.bspStyle.title,
        ]);
      }
    }

    return workbook;
  }

  /**
   * Collects assessment report PDF files.
   * @param assessments - The assessments for the assessment report PDF files.
   * @returns The response.
   */
  private async collectAssessmentReportPdfFiles(
    assessments: Awaited<
      ReturnType<PrivacyDataService['fetchUserExportData']>
    >['assessments'],
  ): Promise<{ name: string; buffer: Buffer }[]> {
    const files: { name: string; buffer: Buffer }[] = [];
    const usedNames = new Set<string>();

    for (const assessment of assessments) {
      const reportKey = assessment.assessmentReport?.report?.trim();
      if (!reportKey) {
        continue;
      }

      const buffer = await this.s3Service.download(reportKey);
      if (!buffer) {
        this.logger.warn(
          `Skipping missing assessment report PDF for assessment ${assessment.id}: ${reportKey}`,
        );
        continue;
      }

      let zipName = `reports/${this.resolveReportZipFilename(reportKey, assessment.id)}`;
      let duplicateIndex = 2;
      while (usedNames.has(zipName)) {
        const extension = zipName.endsWith('.pdf') ? '.pdf' : '';
        const baseName = extension
          ? zipName.slice(0, -extension.length)
          : zipName;
        zipName = `${baseName}-${duplicateIndex}${extension}`;
        duplicateIndex += 1;
      }
      usedNames.add(zipName);
      files.push({ name: zipName, buffer });
    }

    return files;
  }

  /**
   * Resolves a report zip filename.
   * @param reportS3Key - The S3 key for the report zip.
   * @param assessmentId - The ID of the assessment.
   * @returns The response.
   */
  private resolveReportZipFilename(
    reportS3Key: string,
    assessmentId: string,
  ): string {
    const basename = reportS3Key.split('/').filter(Boolean).pop();
    if (basename?.toLowerCase().endsWith('.pdf')) {
      return basename;
    }
    return `assessment-${assessmentId}.pdf`;
  }

  /**
   * Zips files.
   * @param files - The files for the zip.
   * @returns The response.
   */
  private async zipFiles(
    files: { name: string; buffer: Buffer }[],
  ): Promise<Buffer> {
    const archiver = (await import('archiver')).default;
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];
      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
      for (const file of files) {
        archive.append(file.buffer, { name: file.name });
      }
      void archive.finalize();
    });
  }
}
