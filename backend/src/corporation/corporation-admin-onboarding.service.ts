import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma';
import { EmailService } from '../email';
import {
  CORPORATION_ADMIN_APP_USER_TYPE,
  CORPORATION_ADMIN_INVITE_EMAIL_FAILED_MESSAGE,
  CORPORATION_ADMIN_INVITE_SUBJECT,
} from './constants';
import {
  getCorporationAdminInviteHtml,
  getCorporationAdminInviteText,
} from './templates/corporation-admin-invite.template';
import { CorporationCognitoProvisioningService } from './corporation-cognito-provisioning.service';
import { buildInviteLoginUrl } from '../common';

@Injectable()
export class CorporationAdminOnboardingService {
  private readonly logger = new Logger(CorporationAdminOnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly corporationCognito: CorporationCognitoProvisioningService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Confirmation step: email the corporation admin when eligible (`invitation_sent_at` null).
   * Call before persisting ACTIVE so a failed invite leaves the corporation unchanged.
   */
  async sendPendingCorporationAdminInvite(
    corporationId: string,
  ): Promise<void> {
    await this.sendCorporationAdminInviteIfNeeded(corporationId);
  }

  /**
   * Loads the pending corporation admin from `app_users`, provisions invite credentials in Cognito,
   * sends the invite email, and sets `invitation_sent_at`. No-ops when no eligible row or no email.
   */
  private async sendCorporationAdminInviteIfNeeded(
    corporationId: string,
  ): Promise<void> {
    const admin = await this.prisma.appUser.findFirst({
      where: {
        corporationId,
        deletedAt: null,
        userType: { contains: CORPORATION_ADMIN_APP_USER_TYPE },
        invitationSentAt: null,
      },
      select: {
        cognitoSub: true,
        email: true,
      },
    });

    if (!admin) {
      this.logger.log(
        `Corporation admin invite skipped: no pending app user for corporation ${corporationId}`,
      );
      return;
    }

    const email = admin.email?.trim().toLowerCase();
    if (!email) {
      this.logger.warn(
        `Corporation admin invite skipped: no email on app user ${admin.cognitoSub}`,
      );
      return;
    }

    let temporaryPassword: string | null;
    try {
      temporaryPassword =
        await this.corporationCognito.resolveInviteTemporaryPassword(email);
    } catch (err) {
      this.logger.error(
        `Failed to resolve Cognito invite password for ${email}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }

    const loginUrl = buildInviteLoginUrl(this.config);
    const templateParams = {
      loginUrl,
      temporaryPassword,
    };

    const sent = await this.emailService.sendEmail({
      to: email,
      subject: CORPORATION_ADMIN_INVITE_SUBJECT,
      htmlBody: getCorporationAdminInviteHtml(templateParams),
      textBody: getCorporationAdminInviteText(templateParams),
    });

    if (!sent) {
      this.logger.error(
        `Failed to send corporation admin invite email to ${email} (corporation ${corporationId})`,
      );
      throw new InternalServerErrorException(
        CORPORATION_ADMIN_INVITE_EMAIL_FAILED_MESSAGE,
      );
    }

    await this.prisma.appUser.update({
      where: { cognitoSub: admin.cognitoSub },
      data: { invitationSentAt: new Date() },
    });

    this.logger.log(
      `Corporation admin invite sent for corporation ${corporationId} (${temporaryPassword != null ? 'with temporary password' : 'existing Cognito user'})`,
    );
  }
}
