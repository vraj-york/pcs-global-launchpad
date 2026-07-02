import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { PrismaService } from '../prisma';
import { UserSyncService } from '../user/user-sync.service';
import { EmailService } from '../email';
import { COMPANY_STATUS } from '../company/constants/company.status';
import {
  COMPANY_ADMIN_GROUP_NAME,
  COMPANY_ADMIN_INVITE_EMAIL_FAILED_MESSAGE,
  COMPANY_ADMIN_INVITE_SUBJECT,
  COGNITO_USER_SUB_NOT_RESOLVED_MESSAGE,
} from './company-admin-onboarding.constants';
import {
  getCompanyAdminInviteHtml,
  getCompanyAdminInviteText,
} from './templates/company-admin-invite.template';
import {
  addUserToCognitoGroup,
  buildInviteLoginUrl,
  generateCognitoCompliantTempPassword,
  getCognitoSubByUsername,
  resolveInviteTemporaryPassword,
} from '../common';
import {
  CORPORATION_ADMIN_APP_INVITE_TYPE,
  CORPORATION_ADMIN_APP_USER_TYPE,
} from '../corporation/constants';
import {
  COMPANY_ADMIN_APP_USER_TYPE,
  COMPANY_ADMIN_ROLE_NAME,
  COMPANY_ADMIN_ROLE_NOT_CONFIGURED_MSG,
  NO_CORPORATION_ADMIN_APP_USER_MSG,
} from '../company/constants';
import { COGNITO_USER_GROUP_COMPANY_ADMIN_MISSING_MESSAGE } from '../user/cognito-groups.constants';
import { APP_USER_STATUS } from '../user/constants/app-user.constants';

@Injectable()
export class CompanyAdminOnboardingService {
  private readonly logger = new Logger(CompanyAdminOnboardingService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly userSync: UserSyncService,
    private readonly config: ConfigService,
  ) {
    const region = this.config.get<string>('AWS_REGION') ?? 'us-east-1';
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');
    const baseConfig: {
      region: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
    } = { region };
    if (accessKeyId && secretAccessKey) {
      baseConfig.credentials = { accessKeyId, secretAccessKey };
    }
    this.cognitoClient = new CognitoIdentityProviderClient(baseConfig);

    const poolId = this.config.get<string>('COGNITO_USER_POOL_ID')?.trim();
    if (!poolId) {
      throw new Error('COGNITO_USER_POOL_ID environment variable is not set');
    }
    this.userPoolId = poolId;
  }

  /**
   * When a company transitions to ACTIVE, send the company admin invite email.
   * Cognito user and app user rows are created earlier (e.g. Add Company step 1 via
   * {@link provisionCompanyAdminWhenCompanyCreated}); this step emails login instructions.
   */
  async onCompanyActivated(
    companyId: string,
    previousStatus: string | null | undefined,
    newStatus: string,
  ): Promise<void> {
    if (newStatus !== COMPANY_STATUS.ACTIVE) {
      return;
    }
    if (previousStatus === COMPANY_STATUS.ACTIVE) {
      return;
    }
    await this.provisionCompanyAdminIfNeeded(companyId);
  }

  /**
   * SuperAdmin POST /corporations/:corporationId/companies: persist admin on `app_users`,
   * Cognito `CompanyAdmin` group, and `user_company_access` (not on `corporation_companies`).
   */
  async provisionCompanyAdminWhenCompanyCreated(params: {
    corporationId: string;
    companyId: string;
    sameAsCorpAdmin: boolean;
    firstName?: string;
    lastName?: string;
    nickname?: string | null;
    jobRole?: string;
    email?: string;
    workPhone?: string;
    cellPhone?: string | null;
    /** `user_company_access.is_admin`; defaults to false when omitted. */
    isAdmin?: boolean;
  }): Promise<void> {
    const isAdmin = params.isAdmin ?? false;
    const groupLogs = (email: string) => ({
      groupNotFound: `Cognito group "${COMPANY_ADMIN_GROUP_NAME}" not found; add it to the user pool or deploy the updated CloudFormation template.`,
      userNotFound: `Cannot add ${email} to ${COMPANY_ADMIN_GROUP_NAME}: user not found`,
    });

    if (params.sameAsCorpAdmin) {
      const corpAdminUser = await this.prisma.appUser.findFirst({
        where: {
          corporationId: params.corporationId,
          deletedAt: null,
          userType: CORPORATION_ADMIN_APP_USER_TYPE,
        },
        orderBy: { createdAt: 'asc' },
        select: {
          cognitoSub: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!corpAdminUser?.email?.trim()) {
        throw new BadRequestException(NO_CORPORATION_ADMIN_APP_USER_MSG);
      }

      const email = corpAdminUser.email.trim().toLowerCase();
      await addUserToCognitoGroup(
        this.cognitoClient,
        this.userPoolId,
        email,
        COMPANY_ADMIN_GROUP_NAME,
        this.logger,
        groupLogs(email),
      );

      await this.prisma.$transaction((tx) =>
        this.userSync.recordCompanyAdminProvisioned(tx, {
          cognitoSub: corpAdminUser.cognitoSub,
          email,
          firstName: corpAdminUser.firstName ?? '',
          lastName: corpAdminUser.lastName ?? '',
          companyId: params.companyId,
          isAdmin,
        }),
      );
      return;
    }

    const email = params.email!.trim().toLowerCase();
    await this.ensureCognitoCompanyAdmin(email);

    const cognitoSub = await getCognitoSubByUsername(
      this.cognitoClient,
      this.userPoolId,
      email,
      COGNITO_USER_SUB_NOT_RESOLVED_MESSAGE,
    );

    const [role, group] = await Promise.all([
      this.prisma.role.findFirst({
        where: { name: COMPANY_ADMIN_ROLE_NAME },
        select: { id: true },
      }),
      this.prisma.cognitoUserGroup.findUnique({
        where: { name: COMPANY_ADMIN_GROUP_NAME },
        select: { id: true },
      }),
    ]);

    if (!role) {
      throw new InternalServerErrorException(
        COMPANY_ADMIN_ROLE_NOT_CONFIGURED_MSG,
      );
    }
    if (!group) {
      throw new InternalServerErrorException(
        COGNITO_USER_GROUP_COMPANY_ADMIN_MISSING_MESSAGE,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.appUser.upsert({
        where: { cognitoSub },
        create: {
          cognitoSub,
          corporationId: params.corporationId,
          roleId: role.id,
          email,
          firstName: params.firstName,
          lastName: params.lastName,
          nickname: params.nickname ?? undefined,
          workPhone: params.workPhone,
          cellPhone: params.cellPhone ?? undefined,
          userType: COMPANY_ADMIN_APP_USER_TYPE,
          inviteType: CORPORATION_ADMIN_APP_INVITE_TYPE,
          jobRole: params.jobRole,
          status: APP_USER_STATUS.PENDING,
        },
        update: {
          corporationId: params.corporationId,
          roleId: role.id,
          email,
          firstName: params.firstName,
          lastName: params.lastName,
          nickname: params.nickname ?? undefined,
          workPhone: params.workPhone,
          cellPhone: params.cellPhone ?? undefined,
          userType: COMPANY_ADMIN_APP_USER_TYPE,
          inviteType: CORPORATION_ADMIN_APP_INVITE_TYPE,
          jobRole: params.jobRole,
        },
      });

      await tx.appUserGroupMembership.upsert({
        where: {
          userId_groupId: {
            userId: cognitoSub,
            groupId: group.id,
          },
        },
        create: {
          userId: cognitoSub,
          groupId: group.id,
        },
        update: {},
      });

      await tx.userCompanyAccess.upsert({
        where: {
          userId_companyId: {
            userId: cognitoSub,
            companyId: params.companyId,
          },
        },
        create: {
          userId: cognitoSub,
          companyId: params.companyId,
          isAdmin,
        },
        update: { isAdmin },
      });
    });
  }

  private async provisionCompanyAdminIfNeeded(
    companyId: string,
  ): Promise<void> {
    const accessSelect = {
      user: {
        select: {
          cognitoSub: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    } as const;

    const [company, access] = await Promise.all([
      this.prisma.corporationCompany.findFirst({
        where: { id: companyId, deletedAt: null },
        select: {
          id: true,
          companyAdminInviteSentAt: true,
        },
      }),
      this.prisma.userCompanyAccess.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'asc' },
        select: accessSelect,
      }),
    ]);

    if (!company) {
      this.logger.warn(
        `Company admin onboarding skipped: company ${companyId} not found`,
      );
      return;
    }

    if (company.companyAdminInviteSentAt != null) {
      this.logger.log(
        `Company admin invite already sent for company ${companyId}; skipping`,
      );
      return;
    }

    const email = access?.user?.email?.trim().toLowerCase() ?? '';
    if (!email) {
      this.logger.warn(
        `Company admin onboarding skipped: no email for company ${companyId}`,
      );
      return;
    }

    const identityForCognito = {
      firstName: access?.user?.firstName?.trim() || 'User',
      lastName: access?.user?.lastName?.trim() || '',
    };

    let cognitoSub = access?.user?.cognitoSub?.trim();
    let templateTemporaryPassword: string | null = null;

    if (cognitoSub) {
      templateTemporaryPassword = await resolveInviteTemporaryPassword(
        this.cognitoClient,
        this.userPoolId,
        email,
      );
    } else {
      const { temporaryPassword, userCreated } =
        await this.ensureCognitoCompanyAdmin(email);
      templateTemporaryPassword = userCreated ? temporaryPassword : null;
      cognitoSub = await getCognitoSubByUsername(
        this.cognitoClient,
        this.userPoolId,
        email,
        COGNITO_USER_SUB_NOT_RESOLVED_MESSAGE,
      );
    }

    const loginUrl = buildInviteLoginUrl(this.config);

    const templateParams = {
      loginUrl,
      temporaryPassword: templateTemporaryPassword,
    };

    const sent = await this.emailService.sendEmail({
      to: email,
      subject: COMPANY_ADMIN_INVITE_SUBJECT,
      htmlBody: getCompanyAdminInviteHtml(templateParams),
      textBody: getCompanyAdminInviteText(templateParams),
    });

    if (!sent) {
      this.logger.error(
        `Failed to send company admin invite email to ${email} (company ${companyId})`,
      );
      throw new InternalServerErrorException(
        COMPANY_ADMIN_INVITE_EMAIL_FAILED_MESSAGE,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.corporationCompany.update({
        where: { id: company.id },
        data: { companyAdminInviteSentAt: new Date() },
      });
      await this.userSync.recordCompanyAdminProvisioned(tx, {
        cognitoSub,
        email,
        firstName: identityForCognito.firstName,
        lastName: identityForCognito.lastName,
        companyId: company.id,
        isAdmin: true,
      });
    });

    this.logger.log(
      `Company admin invite sent for company ${companyId} (email ${email})`,
    );
  }

  /**
   * Creates Cognito user with a temporary password when missing; adds {@link COMPANY_ADMIN_GROUP_NAME} when possible.
   */
  private async ensureCognitoCompanyAdmin(
    email: string,
  ): Promise<{ temporaryPassword: string; userCreated: boolean }> {
    const temporaryPassword = generateCognitoCompliantTempPassword();

    const companyAdminGroupLogs = {
      groupNotFound: `Cognito group "${COMPANY_ADMIN_GROUP_NAME}" not found; add it to the user pool or deploy the updated CloudFormation template.`,
      userNotFound: `Cannot add ${email} to ${COMPANY_ADMIN_GROUP_NAME}: user not found`,
    };
    try {
      await this.cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: this.userPoolId,
          Username: email,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'email_verified', Value: 'true' },
          ],
          TemporaryPassword: temporaryPassword,
          MessageAction: 'SUPPRESS',
        }),
      );
      await addUserToCognitoGroup(
        this.cognitoClient,
        this.userPoolId,
        email,
        COMPANY_ADMIN_GROUP_NAME,
        this.logger,
        companyAdminGroupLogs,
      );
      return { temporaryPassword, userCreated: true };
    } catch (err) {
      const name = (err as Error).name;
      if (name === 'UsernameExistsException') {
        await addUserToCognitoGroup(
          this.cognitoClient,
          this.userPoolId,
          email,
          COMPANY_ADMIN_GROUP_NAME,
          this.logger,
          companyAdminGroupLogs,
        );
        return { temporaryPassword: '', userCreated: false };
      }
      this.logger.error(
        `Cognito AdminCreateUser failed for ${email}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
  }
}
