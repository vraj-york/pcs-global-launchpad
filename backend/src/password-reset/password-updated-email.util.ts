import { Logger } from '@nestjs/common';
import { formatDateTimeShort } from '../common';
import { EmailService } from '../email';
import { PrismaService } from '../prisma';
import { PASSWORD_UPDATED_EMAIL_SEND_FAILED_LOG_MSG } from './constants';
import {
  getPasswordUpdatedHtml,
  getPasswordUpdatedText,
  PASSWORD_UPDATED_SUBJECT,
} from './templates';

/** Dependencies for {@link sendPasswordUpdatedConfirmationEmail}. */
export interface SendPasswordUpdatedConfirmationEmailParams {
  emailService: EmailService;
  prisma: PrismaService;
  logger: Logger;
  email: string;
}

/**
 * Sends the password-updated confirmation email. Failure is logged only; the caller's
 * primary action (reset or change password) is already complete.
 */
export async function sendPasswordUpdatedConfirmationEmail(
  params: SendPasswordUpdatedConfirmationEmailParams,
): Promise<void> {
  const { emailService, prisma, logger, email } = params;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const appUser = await prisma.appUser.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
      select: { firstName: true },
    });
    const firstName = appUser?.firstName?.trim() || 'there';
    const supportEmail = process.env.SUPPORT_CONTACT_EMAIL!.trim();

    const templateParams = {
      firstName,
      changedAt: formatDateTimeShort(new Date()),
      supportEmail,
    };

    const sent = await emailService.sendEmail({
      to: normalizedEmail,
      subject: PASSWORD_UPDATED_SUBJECT,
      htmlBody: getPasswordUpdatedHtml(templateParams),
      textBody: getPasswordUpdatedText(templateParams),
    });

    if (!sent) {
      logger.error(
        `${PASSWORD_UPDATED_EMAIL_SEND_FAILED_LOG_MSG} (to=${normalizedEmail})`,
      );
    }
  } catch (error) {
    logger.error(
      `${PASSWORD_UPDATED_EMAIL_SEND_FAILED_LOG_MSG} (to=${normalizedEmail})`,
      error,
    );
  }
}
