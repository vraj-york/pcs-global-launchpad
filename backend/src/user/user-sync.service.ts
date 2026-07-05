import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import {
  COGNITO_GROUP_NAMES,
  COGNITO_USER_GROUP_COMPANY_ADMIN_MISSING_MESSAGE,
} from './cognito-groups.constants';
import { APP_USER_STATUS } from './constants/app-user.constants';

@Injectable()
export class UserSyncService {
  private readonly logger = new Logger(UserSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upserts the app user and mirrors Cognito pool group memberships for rows in {@link CognitoUserGroup}.
   * Call after successful JWT validation to keep DB aligned with Cognito (JWT remains authoritative per request).
   * The Cognito auth guard skips this for {@link COGNITO_GROUP_NAMES.SUPER_ADMIN} (pool-only admins).
   *
   * If there is no existing row and the token carries no email (typical for access tokens), the
   * method no-ops so we do not persist empty `app_users` rows that are easy to confuse with
   * provisioned users.
   */
  async syncFromCognito(
    cognitoSub: string,
    email: string | undefined,
    cognitoGroupNames: string[],
  ): Promise<void> {
    const emailNorm = email?.trim().toLowerCase() || null;

    try {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.appUser.findUnique({
          where: { cognitoSub },
          select: { cognitoSub: true },
        });

        // Access tokens often omit `email`. Do not insert a placeholder row (null email, no
        // profile); the same HTTP request may then provision a real `app_users` row for another
        // Cognito user, which looks like "two users from one API". Idempotent sync still runs
        // once a row exists (e.g. after corporation/company admin provisioning).
        if (!existing && emailNorm == null) {
          return;
        }

        await tx.appUser.upsert({
          where: { cognitoSub },
          create: {
            cognitoSub,
            email: emailNorm,
            lastSeenAt: new Date(),
          },
          update: {
            ...(emailNorm != null ? { email: emailNorm } : {}),
            lastSeenAt: new Date(),
          },
        });

        const matchedGroups = await tx.cognitoUserGroup.findMany({
          where: { name: { in: cognitoGroupNames } },
          select: { id: true },
        });
        const matchedIds = matchedGroups.map((g) => g.id);

        const allCatalog = await tx.cognitoUserGroup.findMany({
          select: { id: true },
        });
        const catalogIds = allCatalog.map((g) => g.id);

        await tx.appUserGroupMembership.deleteMany({
          where: {
            userId: cognitoSub,
            groupId: { in: catalogIds },
          },
        });

        if (matchedIds.length > 0) {
          await tx.appUserGroupMembership.createMany({
            data: matchedIds.map((groupId) => ({
              userId: cognitoSub,
              groupId,
            })),
            skipDuplicates: true,
          });
        }

        // Invited company admins, corporation admins, and end users are provisioned as Pending
        // while Cognito is FORCE_CHANGE_PASSWORD. After the new-password challenge, Cognito is
        // CONFIRMED and JWT-backed requests reach here — activate the app user on first such sync.
        const isInvitedPendingActivation =
          cognitoGroupNames.includes(COGNITO_GROUP_NAMES.COMPANY_ADMIN) ||
          cognitoGroupNames.includes(COGNITO_GROUP_NAMES.CORPORATION_ADMIN) ||
          cognitoGroupNames.includes(COGNITO_GROUP_NAMES.USER) ||
          cognitoGroupNames.includes(COGNITO_GROUP_NAMES.COACH);
        if (isInvitedPendingActivation) {
          await tx.appUser.updateMany({
            where: {
              cognitoSub,
              status: APP_USER_STATUS.PENDING,
            },
            data: { status: APP_USER_STATUS.ACTIVE },
          });
        }
      });
    } catch (err) {
      this.logger.warn(
        `User sync from Cognito failed for ${cognitoSub}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Persists company admin after Cognito provisioning: user, CompanyAdmin group membership, and company scope.
   * Use inside a Prisma transaction together with invite rows.
   */
  async recordCompanyAdminProvisioned(
    tx: Prisma.TransactionClient,
    params: {
      cognitoSub: string;
      email: string;
      firstName: string;
      lastName: string;
      companyId: string;
      /** When omitted, creates access with `isAdmin: false` and leaves `isAdmin` unchanged on update. */
      isAdmin?: boolean;
    },
  ): Promise<void> {
    const emailNorm = params.email.trim().toLowerCase();
    const isAdmin = params.isAdmin ?? false;
    const group = await tx.cognitoUserGroup.findUnique({
      where: { name: COGNITO_GROUP_NAMES.COMPANY_ADMIN },
    });
    if (!group) {
      throw new Error(COGNITO_USER_GROUP_COMPANY_ADMIN_MISSING_MESSAGE);
    }

    await tx.appUser.upsert({
      where: { cognitoSub: params.cognitoSub },
      create: {
        cognitoSub: params.cognitoSub,
        email: emailNorm,
        firstName: params.firstName,
        lastName: params.lastName,
      },
      update: {
        email: emailNorm,
        firstName: params.firstName,
        lastName: params.lastName,
      },
    });

    await tx.appUserGroupMembership.upsert({
      where: {
        userId_groupId: {
          userId: params.cognitoSub,
          groupId: group.id,
        },
      },
      create: {
        userId: params.cognitoSub,
        groupId: group.id,
      },
      update: {},
    });

    await tx.userCompanyAccess.upsert({
      where: {
        userId_companyId: {
          userId: params.cognitoSub,
          companyId: params.companyId,
        },
      },
      create: {
        userId: params.cognitoSub,
        companyId: params.companyId,
        isAdmin,
      },
      update: params.isAdmin !== undefined ? { isAdmin: params.isAdmin } : {},
    });
  }

  /**
   * Persists corporation admin after Cognito provisioning: {@link AppUser} and CorporationAdmin group membership.
   * Call inside a Prisma transaction after {@link Corporation} is created.
   */
  async recordCorporationAdminProvisioned(
    tx: Prisma.TransactionClient,
    params: {
      cognitoSub: string;
      corporationId: string;
      roleId: string;
      userType: string;
      inviteType: string;
      jobRole: string;
      email: string;
      firstName: string;
      lastName: string;
      nickname?: string | null;
      workPhone: string;
      cellPhone?: string | null;
    },
  ): Promise<void> {
    const emailNorm = params.email.trim().toLowerCase();
    const group = await tx.cognitoUserGroup.findUnique({
      where: { name: COGNITO_GROUP_NAMES.CORPORATION_ADMIN },
    });
    if (!group) {
      throw new Error(
        `CognitoUserGroup "${COGNITO_GROUP_NAMES.CORPORATION_ADMIN}" is missing; ensure the group was created before this step.`,
      );
    }

    await tx.appUser.upsert({
      where: { cognitoSub: params.cognitoSub },
      create: {
        cognitoSub: params.cognitoSub,
        corporationId: params.corporationId,
        roleId: params.roleId,
        email: emailNorm,
        firstName: params.firstName,
        lastName: params.lastName,
        nickname: params.nickname ?? undefined,
        workPhone: params.workPhone,
        cellPhone: params.cellPhone ?? undefined,
        userType: params.userType,
        inviteType: params.inviteType,
        jobRole: params.jobRole,
        status: APP_USER_STATUS.PENDING,
      },
      update: {
        corporationId: params.corporationId,
        roleId: params.roleId,
        email: emailNorm,
        firstName: params.firstName,
        lastName: params.lastName,
        nickname: params.nickname ?? undefined,
        workPhone: params.workPhone,
        cellPhone: params.cellPhone ?? undefined,
        userType: params.userType,
        inviteType: params.inviteType,
        jobRole: params.jobRole,
      },
    });

    await tx.appUserGroupMembership.upsert({
      where: {
        userId_groupId: {
          userId: params.cognitoSub,
          groupId: group.id,
        },
      },
      create: {
        userId: params.cognitoSub,
        groupId: group.id,
      },
      update: {},
    });
  }

  /** Returns true if the user has an explicit company access row (use with Cognito CompanyAdmin group for auth). */
  async hasCompanyAccess(
    cognitoSub: string,
    companyId: string,
  ): Promise<boolean> {
    const row = await this.prisma.userCompanyAccess.findUnique({
      where: {
        userId_companyId: {
          userId: cognitoSub,
          companyId,
        },
      },
      select: { id: true },
    });
    return row != null;
  }
}
