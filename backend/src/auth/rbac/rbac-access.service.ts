import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { COGNITO_GROUP_NAMES } from '../../user/cognito-groups.constants';
import { AUTHORIZATION_DENIED_MSG } from './rbac.constants';
import type { AuthorizationContext, SubmoduleAccessEntry } from './rbac.types';
import { resolveRbacContributorGroups } from './submodule.registry';

@Injectable()
export class RbacAccessService {
  private readonly logger = new Logger(RbacAccessService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the authorization context for the given user.
   * @param cognitoSub - The Cognito sub of the user.
   * @param groups - The groups of the user.
   * @returns The authorization context.
   */
  async resolveForUser(
    cognitoSub: string,
    groups: string[],
  ): Promise<AuthorizationContext> {
    const jwtGroupNames = [
      ...new Set((groups ?? []).map((g) => g.trim()).filter(Boolean)),
    ];
    const isSuperAdmin = jwtGroupNames.includes(
      COGNITO_GROUP_NAMES.SUPER_ADMIN,
    );

    const [allSubmodules, appUser, cognitoGroups] = await Promise.all([
      this.prisma.submodule.findMany({
        orderBy: [{ module: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        select: { key: true },
      }),
      this.prisma.appUser.findFirst({
        where: { cognitoSub, deletedAt: null },
        select: {
          roleId: true,
          groupMemberships: {
            select: {
              group: { select: { name: true, roleCategoryId: true } },
            },
          },
        },
      }),
      this.prisma.cognitoUserGroup.findMany({
        where: { roleCategoryId: { not: null } },
        select: { name: true, roleCategoryId: true },
      }),
    ]);

    const membershipGroupNames =
      appUser?.groupMemberships.map((m) => m.group.name) ?? [];
    const effectiveGroupNames = [
      ...new Set([...jwtGroupNames, ...membershipGroupNames]),
    ];

    const groupToCategoryId = new Map(
      cognitoGroups
        .filter((g) => g.roleCategoryId)
        .map((g) => [g.name, g.roleCategoryId as string]),
    );

    const effectiveGroups = resolveRbacContributorGroups(effectiveGroupNames);
    const roleCategoryIds = [
      ...new Set(
        effectiveGroups
          .map((groupName) => groupToCategoryId.get(groupName))
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    let enabledKeys: Set<string>;

    if (isSuperAdmin) {
      enabledKeys = new Set(allSubmodules.map((s) => s.key));
    } else if (roleCategoryIds.length > 0) {
      const categoryRows = await this.prisma.roleCategorySubmodule.findMany({
        where: { roleCategoryId: { in: roleCategoryIds }, enabled: true },
        select: { submodule: { select: { key: true } } },
      });
      enabledKeys = new Set(categoryRows.map((r) => r.submodule.key));
    } else {
      enabledKeys = new Set();
    }

    const submodules = this.buildSubmoduleAccess(allSubmodules, enabledKeys);

    return {
      isSuperAdmin,
      effectiveGroups,
      roleCategoryIds,
      roleId: appUser?.roleId ?? null,
      enabledSubmoduleKeys: enabledKeys,
      submodules,
    };
  }

  /**
   * Asserts that the submodule is enabled for the given context.
   * @param context - The authorization context.
   * @param submoduleKey - The submodule key to check.
   * @throws UnauthorizedException if the submodule is not enabled.
   * @throws ForbiddenException if the submodule is not enabled.
   */
  assertSubmoduleEnabled(
    context: AuthorizationContext | undefined,
    submoduleKey: string,
  ): void {
    if (!context) {
      throw new UnauthorizedException(AUTHORIZATION_DENIED_MSG);
    }
    if (context.isSuperAdmin) {
      return;
    }
    if (!context.enabledSubmoduleKeys.has(submoduleKey)) {
      this.logger.warn(
        `RBAC denied submodule "${submoduleKey}" for categories [${context.roleCategoryIds.join(', ') || 'none'}]`,
      );
      throw new ForbiddenException(AUTHORIZATION_DENIED_MSG);
    }
  }

  /**
   * Asserts that at least one submodule is enabled for the given context.
   */
  assertAnySubmoduleEnabled(
    context: AuthorizationContext | undefined,
    submoduleKeys: readonly string[],
  ): void {
    if (!context) {
      throw new UnauthorizedException(AUTHORIZATION_DENIED_MSG);
    }
    if (context.isSuperAdmin) {
      return;
    }
    const allowed = submoduleKeys.some((key) =>
      context.enabledSubmoduleKeys.has(key),
    );
    if (!allowed) {
      this.logger.warn(
        `RBAC denied submodules [${submoduleKeys.join(', ')}] for categories [${context.roleCategoryIds.join(', ') || 'none'}]`,
      );
      throw new ForbiddenException(AUTHORIZATION_DENIED_MSG);
    }
  }

  /**
   * Checks if the submodule is enabled for the given context.
   * @param context - The authorization context.
   * @param submoduleKey - The submodule key to check.
   * @returns True if the submodule is enabled, false otherwise.
   */
  hasSubmodule(
    context: AuthorizationContext | undefined,
    submoduleKey: string,
  ): boolean {
    if (!context) return false;
    if (context.isSuperAdmin) return true;
    return context.enabledSubmoduleKeys.has(submoduleKey);
  }

  /**
   * Builds a flat submodule access list (key + enabled only).
   */
  private buildSubmoduleAccess(
    rows: { key: string }[],
    enabledKeys: ReadonlySet<string>,
  ): SubmoduleAccessEntry[] {
    return rows.map((row) => ({
      key: row.key,
      enabled: enabledKeys.has(row.key),
    }));
  }
}
