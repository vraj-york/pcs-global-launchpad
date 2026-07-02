import { Injectable } from '@nestjs/common';
import { startOfCurrentUtcMonth } from '../common/date.util';
import { countSystemAnalytics } from '../common/system-analytics.util';
import type { SuperAdminSystemAnalytics } from './super-admin-dashboard.types';
import { PrismaService } from '../prisma';
import { CORPORATION_STATUS } from '../corporation/constants/corporation.status';
import { COMPANY_STATUS } from '../company/constants/company.status';
import {
  APP_USER_INVITE_PENDING_EXPIRY_MS,
  APP_USER_STATUS,
} from '../user/constants/app-user.constants';
import type { CorporationActivityRow } from './super-admin-dashboard.types';
import type { SuperAdminSystemAnalyticsQueryDto } from './dto/super-admin-system-analytics-query.dto';

/** Assessment rows that are not still in progress. */
const ASSESSMENT_COMPLETED_STATUSES = [
  'completed',
  'scored',
  'report_generated',
] as const;

export type SuperAdminDashboardMetrics = {
  tenantPortfolio: {
    totalCorporations: number;
    activeCorporations: number;
    suspendedCorporations: number;
    closedCorporations: number;
    newCorporationsThisMonth: number;
    totalCompanies: number;
    activeCompanies: number;
    /** Non-deleted companies with `corporation_companies.status` SUSPENDED. */
    suspendedCompanies: number;
    newCompaniesThisMonth: number;
    tenantsWithNoActivityLast30Days: number;
  };
  userBase: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    /** Users with status Active or Pending (non–runtime-expired invites), same rules as directory filters. */
    usersInvited: number;
    usersPendingInvite: number;
  };
  assessmentMetrics: {
    assessmentsStarted: number;
    assessmentsCompleted: number;
    assessmentsInProgress: number;
    newAssessmentsThisMonth: number;
    /** Extra attempts after each user’s first assessment (sum of max(0, n-1) per user). */
    repeatAssessments: number;
    averageSecondsToComplete: number | null;
    /** Assessments attributed via `user_company_access` (grouped by company + parent corporation). */
    completionByCompany: Array<{
      companyId: string;
      companyLegalName: string;
      corporationId: string;
      corporationLegalName: string;
      totalAssessments: number;
      completedAssessments: number;
      completionRatePercent: number;
    }>;
  };
  generatedAt: string;
};

/** Reads `_count._all` from a Prisma `groupBy` result when present. */
function assessmentUserGroupCount(row: { _count?: unknown }): number {
  const raw = row._count;
  if (raw && typeof raw === 'object' && '_all' in raw) {
    const n = (raw as { _all: unknown })._all;
    return typeof n === 'number' ? n : 0;
  }
  return 0;
}

/**
 * Counts corporations whose latest activity is older than `inactiveBefore`.
 * Last activity is the newest of: the corporation’s own `updatedAt`, the latest
 * `updatedAt` among its non-deleted companies, and the latest “touch” per
 * non-deleted user (`updatedAt` vs `lastSeenAt`, whichever is later). If there
 * are no companies or no users yet, the corporation’s `createdAt` stands in
 * for that side so brand-new tenants are not treated as inactive by default.
 */
function countTenantsWithNoActivitySince(
  corps: CorporationActivityRow[],
  inactiveBefore: Date,
): number {
  const threshold = inactiveBefore.getTime();
  let n = 0;
  for (const c of corps) {
    const companyTimes = c.companies.map((cc) => cc.updatedAt.getTime());
    const companyPart =
      companyTimes.length > 0
        ? Math.max(...companyTimes)
        : c.createdAt.getTime();

    const userTimes = c.appUsers.map((u) =>
      Math.max(u.updatedAt.getTime(), (u.lastSeenAt ?? u.updatedAt).getTime()),
    );
    const userPart =
      userTimes.length > 0 ? Math.max(...userTimes) : c.createdAt.getTime();

    const lastActivity = Math.max(c.updatedAt.getTime(), companyPart, userPart);
    if (lastActivity < threshold) n++;
  }
  return n;
}

@Injectable()
export class SuperAdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(): Promise<SuperAdminDashboardMetrics> {
    const monthStart = startOfCurrentUtcMonth();
    const inactiveBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const expiredInvitesSentBefore = new Date(
      Date.now() - APP_USER_INVITE_PENDING_EXPIRY_MS,
    );

    const [
      corpTotal,
      corpActive,
      corpSuspended,
      corpClosed,
      corpNewMonth,
      coTotal,
      coActive,
      coSuspended,
      coNewMonth,
      corporationActivityRows,
      uTotal,
      uActive,
      uNewMonth,
      uInvited,
      uPending,
      aTotal,
      aCompleted,
      aInProgress,
      aNewMonth,
      assessmentsPerUser,
      completedAssessmentsPerUser,
      completedAssessmentTimestamps,
      companiesForCompletion,
    ] = await this.prisma.$transaction([
      this.prisma.corporation.count(),
      this.prisma.corporation.count({
        where: { status: CORPORATION_STATUS.ACTIVE },
      }),
      this.prisma.corporation.count({
        where: { status: CORPORATION_STATUS.SUSPENDED },
      }),
      this.prisma.corporation.count({
        where: { status: CORPORATION_STATUS.CLOSED },
      }),
      this.prisma.corporation.count({
        where: { createdAt: { gte: monthStart } },
      }),
      this.prisma.corporationCompany.count({ where: { deletedAt: null } }),
      this.prisma.corporationCompany.count({
        where: { deletedAt: null, status: COMPANY_STATUS.ACTIVE },
      }),
      this.prisma.corporationCompany.count({
        where: {
          deletedAt: null,
          status: { equals: COMPANY_STATUS.SUSPENDED, mode: 'insensitive' },
        },
      }),
      this.prisma.corporationCompany.count({
        where: { deletedAt: null, createdAt: { gte: monthStart } },
      }),
      this.prisma.corporation.findMany({
        select: {
          createdAt: true,
          updatedAt: true,
          companies: {
            where: { deletedAt: null },
            select: { updatedAt: true },
          },
          appUsers: {
            where: { deletedAt: null },
            select: { updatedAt: true, lastSeenAt: true },
          },
        },
      }),
      this.prisma.appUser.count({ where: { deletedAt: null } }),
      this.prisma.appUser.count({
        where: {
          deletedAt: null,
          status: { equals: APP_USER_STATUS.ACTIVE, mode: 'insensitive' },
        },
      }),
      this.prisma.appUser.count({
        where: { deletedAt: null, createdAt: { gte: monthStart } },
      }),
      this.prisma.appUser.count({
        where: {
          deletedAt: null,
          OR: [
            {
              status: { equals: APP_USER_STATUS.ACTIVE, mode: 'insensitive' },
            },
            {
              AND: [
                {
                  status: {
                    equals: APP_USER_STATUS.PENDING,
                    mode: 'insensitive',
                  },
                },
                {
                  OR: [
                    { invitationSentAt: null },
                    { invitationSentAt: { gte: expiredInvitesSentBefore } },
                  ],
                },
              ],
            },
          ],
        },
      }),
      this.prisma.appUser.count({
        where: {
          deletedAt: null,
          status: { equals: APP_USER_STATUS.PENDING, mode: 'insensitive' },
          OR: [
            { invitationSentAt: null },
            { invitationSentAt: { gte: expiredInvitesSentBefore } },
          ],
        },
      }),
      this.prisma.assessment.count(),
      this.prisma.assessment.count({
        where: { status: { in: [...ASSESSMENT_COMPLETED_STATUSES] } },
      }),
      this.prisma.assessment.count({ where: { status: 'in_progress' } }),
      this.prisma.assessment.count({
        where: { startedAt: { gte: monthStart } },
      }),
      this.prisma.assessment.groupBy({
        by: ['userId'],
        orderBy: { userId: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.assessment.groupBy({
        by: ['userId'],
        where: { status: { in: [...ASSESSMENT_COMPLETED_STATUSES] } },
        orderBy: { userId: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.assessment.findMany({
        where: { completedAt: { not: null } },
        select: { startedAt: true, completedAt: true },
      }),
      this.prisma.corporationCompany.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          legalName: true,
          corporation: { select: { id: true, legalName: true } },
          userCompanyAccesses: {
            where: { user: { deletedAt: null } },
            select: { userId: true },
          },
        },
        orderBy: [{ corporation: { legalName: 'asc' } }, { legalName: 'asc' }],
      }),
    ]);

    const inactiveCount = countTenantsWithNoActivitySince(
      corporationActivityRows,
      inactiveBefore,
    );

    const repeatAssessments = assessmentsPerUser.reduce((sum, row) => {
      const c = assessmentUserGroupCount(row);
      return sum + Math.max(c - 1, 0);
    }, 0);

    const totalByUser = new Map(
      assessmentsPerUser.map((r) => [r.userId, assessmentUserGroupCount(r)]),
    );
    const completedByUser = new Map(
      completedAssessmentsPerUser.map((r) => [
        r.userId,
        assessmentUserGroupCount(r),
      ]),
    );

    let averageSecondsToComplete: number | null = null;
    if (completedAssessmentTimestamps.length > 0) {
      const sumSec = completedAssessmentTimestamps.reduce((acc, row) => {
        const end = row.completedAt!.getTime();
        const start = row.startedAt.getTime();
        return acc + (end - start) / 1000;
      }, 0);
      averageSecondsToComplete = sumSec / completedAssessmentTimestamps.length;
    }

    const completionByCompany = companiesForCompletion.map((cc) => {
      let total = 0;
      let completed = 0;
      for (const { userId } of cc.userCompanyAccesses) {
        total += totalByUser.get(userId) ?? 0;
        completed += completedByUser.get(userId) ?? 0;
      }
      const completionRatePercent =
        total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;
      return {
        companyId: cc.id,
        companyLegalName: cc.legalName,
        corporationId: cc.corporation.id,
        corporationLegalName: cc.corporation.legalName,
        totalAssessments: total,
        completedAssessments: completed,
        completionRatePercent,
      };
    });

    return {
      tenantPortfolio: {
        totalCorporations: corpTotal,
        activeCorporations: corpActive,
        suspendedCorporations: corpSuspended,
        closedCorporations: corpClosed,
        newCorporationsThisMonth: corpNewMonth,
        totalCompanies: coTotal,
        activeCompanies: coActive,
        suspendedCompanies: coSuspended,
        newCompaniesThisMonth: coNewMonth,
        tenantsWithNoActivityLast30Days: inactiveCount,
      },
      userBase: {
        totalUsers: uTotal,
        activeUsers: uActive,
        newUsersThisMonth: uNewMonth,
        usersInvited: uInvited,
        usersPendingInvite: uPending,
      },
      assessmentMetrics: {
        assessmentsStarted: aTotal,
        assessmentsCompleted: aCompleted,
        assessmentsInProgress: aInProgress,
        newAssessmentsThisMonth: aNewMonth,
        repeatAssessments,
        averageSecondsToComplete,
        completionByCompany,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Returns corporation, company, user, and assessment breakdowns for the System Analytics
   * dashboard. Optional scope filters and time windows follow per-status date columns.
   */
  async getSystemAnalytics(
    query: SuperAdminSystemAnalyticsQueryDto,
  ): Promise<SuperAdminSystemAnalytics> {
    return countSystemAnalytics(this.prisma, query);
  }
}
