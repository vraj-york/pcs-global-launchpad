import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { readFile } from 'node:fs/promises';
import { PrismaService } from '../prisma';
import { S3Service } from '../s3';
import { EmailService } from '../email';
import { ApiResponse, ResponseHelper, formatDateTimeShort } from '../common';
import { CreateSupportRequestDto } from './dto';
import {
  getSubscriptionPlanChangeEmailHtml,
  getSubscriptionPlanChangeEmailText,
  getSupportRequestEmailHtml,
  getSupportRequestEmailText,
} from './templates';
import {
  PLAN_CHANGE_REQUEST_EMAIL_SEND_FAILED_LOG_MSG,
  PLAN_CHANGE_REQUEST_EMAIL_SUBJECT,
  PLAN_CHANGE_REQUEST_SUBMIT_ERROR_LOG_MSG,
  PLAN_CHANGE_REQUEST_SUBMIT_FAILED_MSG,
  PLAN_CHANGE_REQUEST_SUBMITTED_SUCCESS_MSG,
  PLAN_CHANGE_REQUEST_SUPPORT_SUBJECT,
  SUPPORT_REQUEST_ATTACHMENT_ALLOWED_MIMES,
  SUPPORT_REQUEST_ATTACHMENT_DATA_MISSING_MSG,
  SUPPORT_REQUEST_ATTACHMENT_EXTENSION_BY_MIME,
  SUPPORT_REQUEST_ATTACHMENT_SUMMARY_LINKS_SUFFIX,
  SUPPORT_REQUEST_ATTACHMENTS_TOTAL_MAX_BYTES,
  SUPPORT_REQUEST_ATTACHMENTS_TOTAL_MAX_SIZE_MSG,
  SUPPORT_REQUEST_EMAIL_SEND_FAILED_LOG_MSG,
  SUPPORT_REQUEST_EMAIL_SUBJECT,
  SUPPORT_REQUEST_INVALID_ATTACHMENT_TYPE_MSG,
  SUPPORT_REQUEST_MAX_ATTACHMENTS,
  SUPPORT_REQUEST_NOT_AVAILABLE_LABEL,
  SUPPORT_REQUEST_SUPPORT_CONTACT_EMAIL_NOT_CONFIGURED_MSG,
  SUPPORT_REQUEST_SUBMIT_ERROR_LOG_MSG,
  SUPPORT_REQUEST_SUBMIT_FAILED_MSG,
  SUPPORT_REQUEST_SUBMITTED_SUCCESS_MSG,
  SUPPORT_REQUEST_TOO_MANY_ATTACHMENTS_MSG,
} from './constants';

/** Submitter details resolved at send time for the support notification email (not persisted). */
interface ResolvedUserContext {
  userFullName: string;
  userRole: string;
  corporationName: string;
  companyName: string;
}

interface UploadedSupportAttachment {
  fileName: string;
  displayName: string;
  publicUrl: string;
}

@Injectable()
export class SupportRequestService {
  private readonly logger = new Logger(SupportRequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Creates a support request from public form submission: validates attachments, stores the
   * request row, uploads images to S3, records attachment file names, and emails the support
   * inbox with S3 download links. User profile fields in the email are loaded from
   * `app_users` by email when present.
   *
   * Email delivery failure is logged only; the API still returns success after persistence.
   */
  async submit(
    dto: CreateSupportRequestDto,
    files: Express.Multer.File[] = [],
  ): Promise<ApiResponse<{ id: string }>> {
    this.validateAttachments(files);

    const normalizedEmail = dto.email.trim().toLowerCase();
    const userContext = await this.resolveUserContext(normalizedEmail);
    try {
      const supportRequest = await this.prisma.supportRequest.create({
        data: {
          email: normalizedEmail,
          subject: dto.subject.trim(),
          message: dto.message?.trim() || null,
        },
      });

      const uploadedAttachments = await this.uploadAttachments(files);

      if (uploadedAttachments.length > 0) {
        await this.prisma.supportRequestAttachment.createMany({
          data: uploadedAttachments.map((att) => ({
            supportRequestId: supportRequest.id,
            fileName: att.fileName,
          })),
        });
      }

      await this.sendSupportNotificationEmail({
        userContext,
        userEmail: normalizedEmail,
        supportSubject: dto.subject.trim(),
        supportMessage:
          dto.message?.trim() || SUPPORT_REQUEST_NOT_AVAILABLE_LABEL,
        submittedAt: supportRequest.createdAt,
        uploadedAttachments,
      });

      return ResponseHelper.success(SUPPORT_REQUEST_SUBMITTED_SUCCESS_MSG, {
        id: supportRequest.id,
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      this.logger.error(SUPPORT_REQUEST_SUBMIT_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(SUPPORT_REQUEST_SUBMIT_FAILED_MSG);
    }
  }

  /**
   * Creates a support request when a company admin asks to change their subscription plan,
   * then emails the support inbox with the plan-change notification template.
   */
  async submitPlanChangeRequest(params: {
    adminEmail: string;
    adminName: string;
    companyName: string;
    currentPlan: string;
  }): Promise<ApiResponse<{ id: string }>> {
    const normalizedEmail = params.adminEmail.trim().toLowerCase();
    const adminName =
      params.adminName.trim() || SUPPORT_REQUEST_NOT_AVAILABLE_LABEL;
    const companyName =
      params.companyName.trim() || SUPPORT_REQUEST_NOT_AVAILABLE_LABEL;
    const currentPlan =
      params.currentPlan.trim() || SUPPORT_REQUEST_NOT_AVAILABLE_LABEL;

    const message = [
      `Company: ${companyName}`,
      `Company Admin: ${adminName}`,
      `Current Plan: ${currentPlan}`,
    ].join('\n');

    try {
      const supportRequest = await this.prisma.supportRequest.create({
        data: {
          email: normalizedEmail,
          subject: PLAN_CHANGE_REQUEST_SUPPORT_SUBJECT,
          message,
        },
      });

      await this.sendPlanChangeNotificationEmail({
        adminName,
        companyName,
        currentPlan,
        submittedAt: supportRequest.createdAt,
      });

      return ResponseHelper.success(PLAN_CHANGE_REQUEST_SUBMITTED_SUCCESS_MSG, {
        id: supportRequest.id,
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      this.logger.error(PLAN_CHANGE_REQUEST_SUBMIT_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(
        PLAN_CHANGE_REQUEST_SUBMIT_FAILED_MSG,
      );
    }
  }

  /**
   * Enforces count (max 3), MIME (PNG/JPG), and combined size (max 10 MB total) before DB/S3 work.
   */
  private validateAttachments(files: Express.Multer.File[]): void {
    if (files.length > SUPPORT_REQUEST_MAX_ATTACHMENTS) {
      throw new BadRequestException(SUPPORT_REQUEST_TOO_MANY_ATTACHMENTS_MSG);
    }

    let totalBytes = 0;
    for (const file of files) {
      const mimetype = file.mimetype?.toLowerCase() ?? '';
      if (
        !SUPPORT_REQUEST_ATTACHMENT_ALLOWED_MIMES.includes(
          mimetype as (typeof SUPPORT_REQUEST_ATTACHMENT_ALLOWED_MIMES)[number],
        )
      ) {
        throw new BadRequestException(
          SUPPORT_REQUEST_INVALID_ATTACHMENT_TYPE_MSG,
        );
      }
      totalBytes += file.size;
    }

    if (totalBytes > SUPPORT_REQUEST_ATTACHMENTS_TOTAL_MAX_BYTES) {
      throw new BadRequestException(
        SUPPORT_REQUEST_ATTACHMENTS_TOTAL_MAX_SIZE_MSG(
          SUPPORT_REQUEST_ATTACHMENTS_TOTAL_MAX_BYTES / (1024 * 1024),
        ),
      );
    }
  }

  /**
   * Reads upload bytes from multer memory storage, or from disk when a temp path is present.
   */
  private async readUploadBuffer(file: Express.Multer.File): Promise<Buffer> {
    if (file.buffer?.length) {
      return file.buffer;
    }
    if (file.path) {
      return readFile(file.path);
    }
    throw new BadRequestException(SUPPORT_REQUEST_ATTACHMENT_DATA_MISSING_MSG);
  }

  /**
   * Uploads each file to S3 under `support-request-attachments/` with a unique `{uuid}.{ext}`
   * filename (same pattern as corporation brand logo).
   */
  private async uploadAttachments(
    files: Express.Multer.File[],
  ): Promise<UploadedSupportAttachment[]> {
    const results: UploadedSupportAttachment[] = [];

    for (const file of files) {
      const mimetype = file.mimetype.toLowerCase();
      const ext =
        SUPPORT_REQUEST_ATTACHMENT_EXTENSION_BY_MIME[mimetype] ?? 'png';
      const uniqueFilename = `${randomUUID()}.${ext}`;
      const s3Key =
        this.s3Service.buildSupportRequestAttachmentKey(uniqueFilename);
      const displayName =
        file.originalname?.trim() || `attachment-${results.length + 1}.${ext}`;
      const content = await this.readUploadBuffer(file);

      await this.s3Service.upload(s3Key, content, mimetype);
      results.push({
        fileName: uniqueFilename,
        displayName,
        publicUrl: this.s3Service.getPublicUrl(s3Key),
      });
    }

    return results;
  }

  /**
   * Loads submitter context from `app_users` for the support notification email only.
   * Uses the earliest company access row when multiple exist. Missing fields fall back to
   * {@link SUPPORT_REQUEST_NOT_AVAILABLE_LABEL}; role comes from `roles.name` when set.
   */
  private async resolveUserContext(
    email: string,
  ): Promise<ResolvedUserContext> {
    const appUser = await this.prisma.appUser.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        deletedAt: null,
      },
      select: {
        firstName: true,
        lastName: true,
        role: { select: { name: true } },
        corporation: {
          select: { legalName: true },
        },
        companyAccess: {
          take: 1,
          orderBy: { createdAt: 'asc' },
          select: {
            company: { select: { legalName: true } },
          },
        },
      },
    });

    if (!appUser) {
      return {
        userFullName: SUPPORT_REQUEST_NOT_AVAILABLE_LABEL,
        userRole: SUPPORT_REQUEST_NOT_AVAILABLE_LABEL,
        corporationName: SUPPORT_REQUEST_NOT_AVAILABLE_LABEL,
        companyName: SUPPORT_REQUEST_NOT_AVAILABLE_LABEL,
      };
    }

    const fullName = [appUser.firstName, appUser.lastName]
      .filter((part) => part?.trim())
      .join(' ')
      .trim();

    const company = appUser.companyAccess[0]?.company;
    const corporation = appUser.corporation;

    return {
      userFullName: fullName || SUPPORT_REQUEST_NOT_AVAILABLE_LABEL,
      userRole:
        appUser.role?.name?.trim() || SUPPORT_REQUEST_NOT_AVAILABLE_LABEL,
      corporationName:
        corporation?.legalName?.trim() || SUPPORT_REQUEST_NOT_AVAILABLE_LABEL,
      companyName:
        company?.legalName?.trim() || SUPPORT_REQUEST_NOT_AVAILABLE_LABEL,
    };
  }

  /**
   * Resolves the support inbox from `SUPPORT_CONTACT_EMAIL` (same env key as invite emails).
   */
  private getSupportContactEmail(): string {
    const email = this.configService
      .get<string>('SUPPORT_CONTACT_EMAIL')
      ?.trim();
    if (!email) {
      throw new InternalServerErrorException(
        SUPPORT_REQUEST_SUPPORT_CONTACT_EMAIL_NOT_CONFIGURED_MSG,
      );
    }
    return email;
  }

  /** Builds the attachment summary line for the email template. */
  private formatAttachmentSummary(items: { displayName: string }[]): string {
    if (items.length === 0) {
      return SUPPORT_REQUEST_NOT_AVAILABLE_LABEL;
    }
    const names = items.map((item) => item.displayName).join(', ');
    return `${items.length} file(s): ${names}${SUPPORT_REQUEST_ATTACHMENT_SUMMARY_LINKS_SUFFIX}`;
  }

  /**
   * Sends the branded HTML/text notification to support with S3 download links for uploads.
   */
  private async sendSupportNotificationEmail(params: {
    userContext: ResolvedUserContext;
    userEmail: string;
    supportSubject: string;
    supportMessage: string;
    submittedAt: Date;
    uploadedAttachments: UploadedSupportAttachment[];
  }): Promise<void> {
    const templateParams = {
      userFullName: params.userContext.userFullName,
      userEmail: params.userEmail,
      userRole: params.userContext.userRole,
      corporationName: params.userContext.corporationName,
      companyName: params.userContext.companyName,
      supportSubject: params.supportSubject,
      supportMessage: params.supportMessage,
      attachmentSummary: this.formatAttachmentSummary(
        params.uploadedAttachments,
      ),
      attachmentLinks:
        params.uploadedAttachments.length > 0
          ? params.uploadedAttachments.map((att) => ({
              displayName: att.displayName,
              url: att.publicUrl,
            }))
          : undefined,
      submittedAt: formatDateTimeShort(params.submittedAt),
    };

    const notifyEmail = this.getSupportContactEmail();
    const htmlBody = getSupportRequestEmailHtml(templateParams);
    const textBody = getSupportRequestEmailText(templateParams);

    const sent = await this.emailService.sendEmail({
      to: notifyEmail,
      subject: SUPPORT_REQUEST_EMAIL_SUBJECT,
      htmlBody,
      textBody,
    });

    if (!sent) {
      this.logger.warn(SUPPORT_REQUEST_EMAIL_SEND_FAILED_LOG_MSG);
    }
  }

  /** Sends the branded plan-change notification to the support inbox. */
  private async sendPlanChangeNotificationEmail(params: {
    adminName: string;
    companyName: string;
    currentPlan: string;
    submittedAt: Date;
  }): Promise<void> {
    const templateParams = {
      adminName: params.adminName,
      companyName: params.companyName,
      currentPlan: params.currentPlan,
      requestDate: formatDateTimeShort(params.submittedAt),
    };

    const notifyEmail = this.getSupportContactEmail();
    const htmlBody = getSubscriptionPlanChangeEmailHtml(templateParams);
    const textBody = getSubscriptionPlanChangeEmailText(templateParams);

    const sent = await this.emailService.sendEmail({
      to: notifyEmail,
      subject: PLAN_CHANGE_REQUEST_EMAIL_SUBJECT,
      htmlBody,
      textBody,
    });

    if (!sent) {
      this.logger.warn(PLAN_CHANGE_REQUEST_EMAIL_SEND_FAILED_LOG_MSG);
    }
  }
}
