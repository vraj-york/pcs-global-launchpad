import { AssessmentStatus, type Prisma } from '@prisma/client';
import {
  getTimeRangeFilterStartDate,
  type TimeRangeFilter,
} from './time-range-filter.util';
import type {
  AssessmentCountBreakdown,
  EntityStatusCountBreakdown,
  SystemAnalyticsBreakdown,
  UserStatusCountBreakdown,
} from './system-analytics.types';
import { COMPANY_STATUS } from '../company/constants/company.status';
import { CORPORATION_STATUS } from '../corporation/constants/corporation.status';
import {
  APP_USER_INVITE_PENDING_EXPIRY_MS,
  APP_USER_STATUS,
} from '../user/constants/app-user.constants';
import type { PrismaService } from '../prisma';

/** Milliseconds in one UTC day; used when converting assessment duration to days. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Optional tenant scope shared by all entity analytics builders. */
export type SystemAnalyticsScope = {
  corporationId?: string;
  companyId?: string;
};

/** Scope plus optional UTC time window for dashboard donut-chart aggregates. */
export type SystemAnalyticsQuery = SystemAnalyticsScope & {
  timeFilter?: TimeRangeFilter;
};

/**
 * Builds base corporation scope from optional corporationId / companyId filters.
 * When companyId is set, only the parent corporation of that company is included.
 */
export function buildCorporationAnalyticsScope(
  query: SystemAnalyticsScope,
): Prisma.CorporationWhereInput {
  if (query.companyId) {
    return {
      companies: {
        some: {
          id: query.companyId,
          deletedAt: null,
          ...(query.corporationId
            ? { corporationId: query.corporationId }
            : {}),
        },
      },
    };
  }
  if (query.corporationId) {
    return { id: query.corporationId };
  }
  return {};
}

/**
 * Builds base company scope from optional corporationId / companyId filters.
 * Always excludes soft-deleted companies (`deletedAt` is null).
 */
export function buildCompanyAnalyticsScope(
  query: SystemAnalyticsScope,
): Prisma.CorporationCompanyWhereInput {
  return {
    deletedAt: null,
    ...(query.corporationId ? { corporationId: query.corporationId } : {}),
    ...(query.companyId ? { id: query.companyId } : {}),
  };
}

/**
 * Builds base user scope for analytics. Users match when linked to the corporation
 * directly or via non-deleted company access under scoped companies.
 */
export function buildUserAnalyticsScope(
  query: SystemAnalyticsScope,
): Prisma.AppUserWhereInput {
  if (query.companyId) {
    return {
      companyAccess: {
        some: {
          companyId: query.companyId,
          company: {
            deletedAt: null,
            ...(query.corporationId
              ? { corporationId: query.corporationId }
              : {}),
          },
        },
      },
    };
  }
  if (query.corporationId) {
    return {
      OR: [
        { corporationId: query.corporationId },
        {
          companyAccess: {
            some: {
              company: {
                deletedAt: null,
                corporationId: query.corporationId,
              },
            },
          },
        },
      ],
    };
  }
  return {};
}

/**
 * Builds base assessment scope from optional corporationId / companyId filters.
 * Assessments match when owned by a user in the same scope as user analytics.
 */
export function buildAssessmentAnalyticsScope(
  query: SystemAnalyticsScope,
): Prisma.AssessmentWhereInput {
  if (!query.corporationId && !query.companyId) {
    return {};
  }
  return {
    user: {
      AND: [buildUserAnalyticsScope(query), { deletedAt: null }],
    },
  };
}

/**
 * Applies status-specific date column when a time window is active.
 * Active/incomplete rows use `createdAt`; suspended/closed use `suspendedClosedOn`.
 * No-op when `timeStart` is null (all-time counts).
 */
export function appendEntityStatusTimeFilter(
  where: Prisma.CorporationWhereInput | Prisma.CorporationCompanyWhereInput,
  timeStart: Date | null,
  useCreatedAt: boolean,
): void {
  if (!timeStart) {
    return;
  }
  if (useCreatedAt) {
    where.createdAt = { gte: timeStart };
    return;
  }
  where.suspendedClosedOn = { gte: timeStart };
}

/**
 * Counts runtime-expired pending invites (invite sent more than 7 days ago).
 * When `timeStart` is set, only invites whose expiry (`invitationSentAt` + 7 days)
 * falls on or after `timeStart` are included so the window reflects when they expired.
 */
export function buildExpiredUserWhere(
  baseWhere: Prisma.AppUserWhereInput,
  timeStart: Date | null,
): Prisma.AppUserWhereInput {
  const expiredInvitesSentBefore = new Date(
    Date.now() - APP_USER_INVITE_PENDING_EXPIRY_MS,
  );
  const invitationSentAt: Prisma.DateTimeNullableFilter = {
    not: null,
    lt: expiredInvitesSentBefore,
  };
  if (timeStart) {
    invitationSentAt.gte = new Date(
      timeStart.getTime() - APP_USER_INVITE_PENDING_EXPIRY_MS,
    );
  }
  return {
    AND: [
      baseWhere,
      {
        deletedAt: null,
        status: { equals: APP_USER_STATUS.PENDING, mode: 'insensitive' },
        invitationSentAt,
      },
    ],
  };
}

/**
 * Counts non-expired pending invites; excludes rows that have passed the 7-day invite expiry.
 * When `timeStart` is set, matches `createdAt` (when the user row was created).
 */
export function buildPendingUserWhere(
  baseWhere: Prisma.AppUserWhereInput,
  timeStart: Date | null,
): Prisma.AppUserWhereInput {
  const expiredInvitesSentBefore = new Date(
    Date.now() - APP_USER_INVITE_PENDING_EXPIRY_MS,
  );
  const where: Prisma.AppUserWhereInput = {
    AND: [
      baseWhere,
      {
        deletedAt: null,
        status: { equals: APP_USER_STATUS.PENDING, mode: 'insensitive' },
        OR: [
          { invitationSentAt: null },
          { invitationSentAt: { gte: expiredInvitesSentBefore } },
        ],
      },
    ],
  };
  if (timeStart) {
    (where.AND as Prisma.AppUserWhereInput[]).push({
      createdAt: { gte: timeStart },
    });
  }
  return where;
}

/** Resolves optional UTC window start from a time-range filter; null means all-time. */
export function resolveAnalyticsTimeStart(
  timeFilter?: TimeRangeFilter,
): Date | null {
  return timeFilter ? getTimeRangeFilterStartDate(timeFilter) : null;
}

/** Corporation status buckets and which date column the time filter applies to. */
export const CORPORATION_ANALYTICS_STATUSES = [
  {
    key: 'active' as const,
    status: CORPORATION_STATUS.ACTIVE,
    useCreatedAt: true,
  },
  {
    key: 'incomplete' as const,
    status: CORPORATION_STATUS.INCOMPLETE,
    useCreatedAt: true,
  },
  {
    key: 'suspended' as const,
    status: CORPORATION_STATUS.SUSPENDED,
    useCreatedAt: false,
  },
  {
    key: 'closed' as const,
    status: CORPORATION_STATUS.CLOSED,
    useCreatedAt: false,
  },
] as const;

/** Company status buckets and which date column the time filter applies to. */
export const COMPANY_ANALYTICS_STATUSES = [
  { key: 'active' as const, status: COMPANY_STATUS.ACTIVE, useCreatedAt: true },
  {
    key: 'incomplete' as const,
    status: COMPANY_STATUS.INCOMPLETE,
    useCreatedAt: true,
  },
  {
    key: 'suspended' as const,
    status: COMPANY_STATUS.SUSPENDED,
    useCreatedAt: false,
  },
  {
    key: 'closed' as const,
    status: COMPANY_STATUS.CLOSED,
    useCreatedAt: false,
  },
] as const;

/** Active users in scope; time window matches `createdAt` when set. */
function buildActiveUserAnalyticsWhere(
  baseWhere: Prisma.AppUserWhereInput,
  timeStart: Date | null,
): Prisma.AppUserWhereInput {
  const where: Prisma.AppUserWhereInput = {
    AND: [
      baseWhere,
      {
        deletedAt: null,
        status: { equals: APP_USER_STATUS.ACTIVE, mode: 'insensitive' },
      },
    ],
  };
  if (timeStart) {
    (where.AND as Prisma.AppUserWhereInput[]).push({
      createdAt: { gte: timeStart },
    });
  }
  return where;
}

/**
 * Blocked or cancelled users in scope.
 * Time window matches `blockedCancelledOn` (when the status change occurred).
 */
function buildBlockedOrCancelledUserAnalyticsWhere(
  baseWhere: Prisma.AppUserWhereInput,
  status: typeof APP_USER_STATUS.BLOCKED | typeof APP_USER_STATUS.CANCELLED,
  timeStart: Date | null,
): Prisma.AppUserWhereInput {
  const where: Prisma.AppUserWhereInput = {
    AND: [
      baseWhere,
      {
        deletedAt: null,
        status: { equals: status, mode: 'insensitive' },
      },
    ],
  };
  if (timeStart) {
    (where.AND as Prisma.AppUserWhereInput[]).push({
      blockedCancelledOn: { gte: timeStart },
    });
  }
  return where;
}

/**
 * Soft-deleted users in scope.
 * All-time counts any row with `deletedAt` set; with a window, only deletions on or after `timeStart`.
 */
function buildDeletedUserAnalyticsWhere(
  baseWhere: Prisma.AppUserWhereInput,
  timeStart: Date | null,
): Prisma.AppUserWhereInput {
  return {
    AND: [
      baseWhere,
      {
        deletedAt: timeStart ? { not: null, gte: timeStart } : { not: null },
      },
    ],
  };
}

/**
 * Completed assessments: `report_generated` only (same rule as assessment list "complete").
 * Time window matches `completedAt` when set.
 */
function buildCompletedAssessmentAnalyticsWhere(
  assessmentScope: Prisma.AssessmentWhereInput,
  timeStart: Date | null,
): Prisma.AssessmentWhereInput {
  const where: Prisma.AssessmentWhereInput = {
    ...assessmentScope,
    status: AssessmentStatus.report_generated,
  };
  if (timeStart) {
    where.completedAt = { gte: timeStart, not: null };
  }
  return where;
}

/**
 * In-progress assessments: any status other than `report_generated`
 * (`in_progress`, `completed`, `scored`). Time window matches `startedAt` when set.
 */
function buildInprogressAssessmentAnalyticsWhere(
  assessmentScope: Prisma.AssessmentWhereInput,
  timeStart: Date | null,
): Prisma.AssessmentWhereInput {
  const where: Prisma.AssessmentWhereInput = {
    ...assessmentScope,
    status: { not: AssessmentStatus.report_generated },
  };
  if (timeStart) {
    where.startedAt = { gte: timeStart };
  }
  return where;
}

/**
 * Rows used to compute average completion time: must have `completedAt`.
 * Time window matches `completedAt` when set (not `startedAt`).
 */
function buildAvgCompletionAssessmentAnalyticsWhere(
  assessmentScope: Prisma.AssessmentWhereInput,
  timeStart: Date | null,
): Prisma.AssessmentWhereInput {
  return {
    ...assessmentScope,
    completedAt: timeStart ? { gte: timeStart, not: null } : { not: null },
  };
}

/**
 * Mean completion duration in days from `startedAt` to `completedAt`.
 * Returns null when no rows qualify; result rounded to two decimal places.
 */
function averageAssessmentCompletionDays(
  rows: Array<{ startedAt: Date; completedAt: Date }>,
): number | null {
  if (rows.length === 0) {
    return null;
  }
  const sumDays = rows.reduce((acc, row) => {
    return (
      acc + (row.completedAt.getTime() - row.startedAt.getTime()) / MS_PER_DAY
    );
  }, 0);
  return Math.round((sumDays / rows.length) * 100) / 100;
}

/**
 * Aggregates corporation, company, user, and assessment counts for dashboard donut charts.
 *
 * Runs one transaction with parallel counts (and one assessment `findMany` for avg duration).
 * Scope filters (`corporationId`, `companyId`) narrow corporations, companies, users, and
 * assessments consistently. Per-entity time columns:
 *
 * - Corporations / companies: `createdAt` for active/incomplete; `suspendedClosedOn` for suspended/closed
 * - Users: `createdAt` (active, pending), `blockedCancelledOn` (blocked, cancelled),
 *   invite-expiry rule (expired), `deletedAt` (deleted)
 * - Assessments: `completedAt` (completed, avg time), `startedAt` (in progress)
 *
 * Assessment completed = `report_generated`; all other statuses count as in progress.
 */
export async function countSystemAnalytics(
  prisma: PrismaService,
  query: SystemAnalyticsQuery,
): Promise<SystemAnalyticsBreakdown> {
  const timeStart = resolveAnalyticsTimeStart(query.timeFilter);
  const corporationScope = buildCorporationAnalyticsScope(query);
  const companyScope = buildCompanyAnalyticsScope(query);
  const userScope = buildUserAnalyticsScope(query);
  const assessmentScope = buildAssessmentAnalyticsScope(query);

  const results = await prisma.$transaction([
    ...CORPORATION_ANALYTICS_STATUSES.map(({ status, useCreatedAt }) => {
      const where: Prisma.CorporationWhereInput = {
        ...corporationScope,
        status,
      };
      appendEntityStatusTimeFilter(where, timeStart, useCreatedAt);
      return prisma.corporation.count({ where });
    }),
    ...COMPANY_ANALYTICS_STATUSES.map(({ status, useCreatedAt }) => {
      const where: Prisma.CorporationCompanyWhereInput = {
        ...companyScope,
        status,
      };
      appendEntityStatusTimeFilter(where, timeStart, useCreatedAt);
      return prisma.corporationCompany.count({ where });
    }),
    prisma.appUser.count({
      where: buildActiveUserAnalyticsWhere(userScope, timeStart),
    }),
    prisma.appUser.count({
      where: buildPendingUserWhere(userScope, timeStart),
    }),
    prisma.appUser.count({
      where: buildBlockedOrCancelledUserAnalyticsWhere(
        userScope,
        APP_USER_STATUS.BLOCKED,
        timeStart,
      ),
    }),
    prisma.appUser.count({
      where: buildBlockedOrCancelledUserAnalyticsWhere(
        userScope,
        APP_USER_STATUS.CANCELLED,
        timeStart,
      ),
    }),
    prisma.appUser.count({
      where: buildExpiredUserWhere(userScope, timeStart),
    }),
    prisma.appUser.count({
      where: buildDeletedUserAnalyticsWhere(userScope, timeStart),
    }),
    prisma.assessment.count({
      where: buildCompletedAssessmentAnalyticsWhere(assessmentScope, timeStart),
    }),
    prisma.assessment.count({
      where: buildInprogressAssessmentAnalyticsWhere(
        assessmentScope,
        timeStart,
      ),
    }),
    prisma.assessment.findMany({
      where: buildAvgCompletionAssessmentAnalyticsWhere(
        assessmentScope,
        timeStart,
      ),
      select: { startedAt: true, completedAt: true },
    }),
  ]);

  // First 16 ops are counts; last op is findMany for avg completion duration.
  const countResults = results.slice(0, 16) as number[];
  const assessmentCompletionRows = results[16] as Array<{
    startedAt: Date;
    completedAt: Date | null;
  }>;
  const [
    corpActive,
    corpIncomplete,
    corpSuspended,
    corpClosed,
    coActive,
    coIncomplete,
    coSuspended,
    coClosed,
    userActive,
    userPending,
    userBlocked,
    userCancelled,
    userExpired,
    userDeleted,
    assessmentCompleted,
    assessmentInprogress,
  ] = countResults;

  const corporations: EntityStatusCountBreakdown = {
    active: corpActive,
    incomplete: corpIncomplete,
    suspended: corpSuspended,
    closed: corpClosed,
    total: corpActive + corpIncomplete + corpSuspended + corpClosed,
  };
  const companies: EntityStatusCountBreakdown = {
    active: coActive,
    incomplete: coIncomplete,
    suspended: coSuspended,
    closed: coClosed,
    total: coActive + coIncomplete + coSuspended + coClosed,
  };
  const users: UserStatusCountBreakdown = {
    active: userActive,
    pending: userPending,
    blocked: userBlocked,
    cancelled: userCancelled,
    expired: userExpired,
    deleted: userDeleted,
    total:
      userActive +
      userPending +
      userBlocked +
      userCancelled +
      userExpired +
      userDeleted,
  };
  const assessments: AssessmentCountBreakdown = {
    completed: assessmentCompleted,
    inprogress: assessmentInprogress,
    avgTimeToComplete: averageAssessmentCompletionDays(
      assessmentCompletionRows.filter(
        (row): row is { startedAt: Date; completedAt: Date } =>
          row.completedAt != null,
      ),
    ),
  };

  return { corporations, companies, users, assessments };
}
