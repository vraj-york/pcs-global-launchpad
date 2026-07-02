import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AssessmentStatus, Prisma } from '@prisma/client';
import { ResponseHelper, type ApiResponse } from '../common';
import { getInviteManagementTimeFilterRange } from '../common/invite-time-filter.util';
import { PrismaService } from '../prisma';
import {
  APP_USER_INVITE_PENDING_EXPIRY_MS,
  APP_USER_INVITE_TYPE,
  APP_USER_STATUS,
  INDIVIDUAL_APP_USER_TYPE,
} from '../user/constants/app-user.constants';
import { ListAssessmentInvitesQueryDto } from './dto/list-assessment-invites-query.dto';
import {
  IN_PROGRESS_ASSESSMENT_STATUSES,
  inviteListUserSelect,
} from './invite-management-list.constants';
import type {
  AssessmentInviteListData,
  AssessmentInviteListItem,
  AssessmentInviteListSummary,
  InviteListUserRow,
} from './invite-management-list.types';
import {
  ASSESSMENT_INVITE_LIST_FETCH_ERROR_LOG_MSG,
  ASSESSMENT_INVITE_LIST_FETCHED_MSG,
  ASSESSMENT_INVITE_LIST_FAILED_MSG,
  ASSESSMENT_INVITE_LIST_INVITEE_TYPE_LABEL,
  ASSESSMENT_INVITE_TOTAL_RESPONSE_COUNT,
  type AssessmentInviteLifecycleStatus,
  type AssessmentInviteListSortBy,
  type AssessmentInviteListSortOrder,
  type AssessmentInviteListStatusFilter,
} from './invite-management.constants';

@Injectable()
export class InviteManagementListService {
  private readonly logger = new Logger(InviteManagementListService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List assessment invites with pagination and summary metrics.
   * @param query - The query parameters for filtering and sorting.
   * @returns The assessment invite list data.
   */
  async listAssessmentInvites(
    query: ListAssessmentInvitesQueryDto,
  ): Promise<ApiResponse<AssessmentInviteListData>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? 'invitedOn';
    const sortOrder = query.sortOrder ?? 'desc';

    try {
      const where = this.buildListWhere(query);
      const total = await this.prisma.appUser.count({ where });
      const summary = await this.buildSummary(where, total);

      const rows = await this.fetchPageRows(
        where,
        page,
        limit,
        sortBy,
        sortOrder,
      );
      const items = rows.map((row) => this.mapListItem(row));
      const totalPages = Math.ceil(total / limit);

      return ResponseHelper.success(ASSESSMENT_INVITE_LIST_FETCHED_MSG, {
        items,
        summary,
        pagination: {
          total,
          page,
          pageSize: limit,
          totalPages,
        },
      });
    } catch (error) {
      this.logger.error(ASSESSMENT_INVITE_LIST_FETCH_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(ASSESSMENT_INVITE_LIST_FAILED_MSG);
    }
  }

  /**
   * Build the WHERE clause for filtering assessment invites.
   * @param query - The query parameters for filtering and sorting.
   * @returns The WHERE clause for filtering assessment invites.
   */
  private buildListWhere(
    query: ListAssessmentInvitesQueryDto,
  ): Prisma.AppUserWhereInput {
    const clauses: Prisma.AppUserWhereInput[] = [
      {
        deletedAt: null,
        userType: INDIVIDUAL_APP_USER_TYPE,
        inviteType: APP_USER_INVITE_TYPE.ASSESSMENT_ONLY,
      },
    ];

    const search = query.search?.trim();
    if (search) {
      const orConditions: Prisma.AppUserWhereInput[] = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
      const words = search.split(/\s+/).filter((w) => w.length > 0);
      if (words.length >= 2) {
        orConditions.push({
          AND: [
            { firstName: { contains: words[0], mode: 'insensitive' } },
            {
              lastName: {
                contains: words[words.length - 1],
                mode: 'insensitive',
              },
            },
          ],
        });
      }
      clauses.push({ OR: orConditions });
    }

    if (query.timeFilter) {
      const { gte, lte } = getInviteManagementTimeFilterRange(query.timeFilter);
      clauses.push({
        OR: [
          { invitationSentAt: { gte, lte } },
          {
            AND: [{ invitationSentAt: null }, { createdAt: { gte, lte } }],
          },
        ],
      });
    }

    if (query.status) {
      clauses.push(this.buildLifecycleStatusWhere(query.status));
    }

    return clauses.length === 1 ? clauses[0] : { AND: clauses };
  }

  /**
   * Build the WHERE clause for filtering assessment invites by lifecycle status.
   * @param status - The lifecycle status to filter by.
   * @returns The WHERE clause for filtering assessment invites by lifecycle status.
   */
  private buildLifecycleStatusWhere(
    status: AssessmentInviteListStatusFilter,
  ): Prisma.AppUserWhereInput {
    const expiredCutoff = new Date(
      Date.now() - APP_USER_INVITE_PENDING_EXPIRY_MS,
    );
    const inProgressAssessment = {
      assessments: {
        some: { status: { in: IN_PROGRESS_ASSESSMENT_STATUSES } },
      },
    };
    const completedAssessment = {
      assessments: {
        some: { status: AssessmentStatus.report_generated },
      },
    };

    switch (status) {
      case 'completed':
        return completedAssessment;
      case 'in_progress':
        return {
          AND: [inProgressAssessment, { NOT: completedAssessment }],
        };
      case 'expired':
        return {
          AND: [
            { status: APP_USER_STATUS.PENDING },
            { invitationSentAt: { lt: expiredCutoff } },
            { NOT: inProgressAssessment },
            { NOT: completedAssessment },
          ],
        };
      case 'invited':
      default:
        return {
          AND: [
            { NOT: completedAssessment },
            { NOT: inProgressAssessment },
            {
              OR: [
                { status: { not: APP_USER_STATUS.PENDING } },
                { invitationSentAt: null },
                { invitationSentAt: { gte: expiredCutoff } },
              ],
            },
          ],
        };
    }
  }

  /**
   * Build the summary metrics for the assessment invite list.
   * @param where - The WHERE clause for filtering assessment invites.
   * @param total - The total number of assessment invites.
   * @returns The summary metrics for the assessment invite list.
   */
  private async buildSummary(
    where: Prisma.AppUserWhereInput,
    total: number,
  ): Promise<AssessmentInviteListSummary> {
    const completedAssessments = await this.prisma.appUser.count({
      where: {
        AND: [
          where,
          {
            assessments: {
              some: { status: AssessmentStatus.report_generated },
            },
          },
        ],
      },
    });

    const completionRatePercent =
      total > 0 ? Math.round((completedAssessments / total) * 100) : 0;

    return {
      totalAssessments: total,
      completedAssessments,
      completionRatePercent,
    };
  }

  /**
   * Fetch the page rows for the assessment invite list.
   * @param where - The WHERE clause for filtering assessment invites.
   * @param page - The page number.
   * @param limit - The number of rows per page.
   * @param sortBy - The field to sort by.
   * @param sortOrder - The order to sort by.
   * @returns The page rows for the assessment invite list.
   */
  private async fetchPageRows(
    where: Prisma.AppUserWhereInput,
    page: number,
    limit: number,
    sortBy: AssessmentInviteListSortBy,
    sortOrder: AssessmentInviteListSortOrder,
  ): Promise<InviteListUserRow[]> {
    const skip = (page - 1) * limit;

    if (
      sortBy === 'status' ||
      sortBy === 'progress' ||
      sortBy === 'lastActivity'
    ) {
      return this.fetchRowsOrderedByComputedField(
        where,
        skip,
        limit,
        sortBy,
        sortOrder,
      );
    }

    return this.prisma.appUser.findMany({
      where,
      skip,
      take: limit,
      orderBy: this.buildPrismaOrderBy(sortBy, sortOrder),
      select: inviteListUserSelect,
    });
  }

  /**
   * Build the Prisma ORDER BY clause for sorting the assessment invite list.
   * @param sortBy - The field to sort by.
   * @param sortOrder - The order to sort by.
   * @returns The Prisma ORDER BY clause for sorting the assessment invite list.
   */
  private buildPrismaOrderBy(
    sortBy: AssessmentInviteListSortBy,
    sortOrder: AssessmentInviteListSortOrder,
  ):
    | Prisma.AppUserOrderByWithRelationInput
    | Prisma.AppUserOrderByWithRelationInput[] {
    const dir = sortOrder;
    switch (sortBy) {
      case 'name':
        return [{ firstName: dir }, { lastName: dir }];
      case 'inviteeType':
        return { firstName: dir };
      case 'invitedOn':
      default:
        return [{ invitationSentAt: dir }, { createdAt: dir }];
    }
  }

  /**
   * Fetch the rows for the assessment invite list ordered by a computed field.
   * @param where - The WHERE clause for filtering assessment invites.
   * @param skip - The number of rows to skip.
   * @param limit - The number of rows to fetch.
   * @param sortBy - The field to sort by.
   * @param sortOrder - The order to sort by.
   * @returns The rows for the assessment invite list ordered by a computed field.
   */
  private async fetchRowsOrderedByComputedField(
    where: Prisma.AppUserWhereInput,
    skip: number,
    limit: number,
    sortBy: 'status' | 'progress' | 'lastActivity',
    sortOrder: AssessmentInviteListSortOrder,
  ): Promise<InviteListUserRow[]> {
    const allRows = await this.prisma.appUser.findMany({
      where,
      select: inviteListUserSelect,
    });

    const sorted = [...allRows].sort((a, b) => {
      const itemA = this.mapListItem(a);
      const itemB = this.mapListItem(b);
      let diff = 0;

      if (sortBy === 'status') {
        diff =
          this.statusSortRank(itemA.status) - this.statusSortRank(itemB.status);
      } else if (sortBy === 'progress') {
        diff = itemA.progressPercent - itemB.progressPercent;
      } else {
        diff = this.compareNullableDates(
          itemA.lastActivity,
          itemB.lastActivity,
        );
      }

      return sortOrder === 'asc' ? diff : -diff;
    });

    return sorted.slice(skip, skip + limit);
  }

  /**
   * Get the sort rank for a lifecycle status.
   * @param status - The lifecycle status.
   * @returns The sort rank for a lifecycle status.
   */
  private statusSortRank(status: AssessmentInviteLifecycleStatus): number {
    switch (status) {
      case 'invited':
        return 1;
      case 'expired':
        return 2;
      case 'in_progress':
        return 3;
      case 'completed':
        return 4;
      default:
        return 0;
    }
  }

  /**
   * Compare two nullable dates.
   * @param a - The first date.
   * @param b - The second date.
   * @returns The comparison result.
   */
  private compareNullableDates(a: string | null, b: string | null): number {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    return new Date(a).getTime() - new Date(b).getTime();
  }

  /**
   * Map a row to an assessment invite list item.
   * @param row - The row to map.
   * @returns The assessment invite list item.
   */
  private mapListItem(row: InviteListUserRow): AssessmentInviteListItem {
    const assessment = row.assessments[0] ?? null;
    const status = this.resolveLifecycleStatus(
      row.status,
      row.invitationSentAt,
      assessment?.status ?? null,
    );
    const progressPercent = this.resolveProgressPercent(
      status,
      assessment?._count.questionResponses ?? 0,
    );
    const invitedOn =
      (row.invitationSentAt ?? row.createdAt)?.toISOString() ?? null;
    const lastActivity = this.resolveLastActivity(assessment, row.lastSeenAt);

    return {
      cognitoSub: row.cognitoSub,
      name: [row.firstName, row.lastName].filter(Boolean).join(' ') || '—',
      email: row.email,
      inviteeType: ASSESSMENT_INVITE_LIST_INVITEE_TYPE_LABEL,
      status,
      progressPercent,
      invitedOn,
      lastActivity,
      assessmentId: assessment?.id ?? null,
      completedAt: assessment?.completedAt?.toISOString() ?? null,
      reportKey: assessment?.assessmentReport?.report?.trim() || null,
    };
  }

  /**
   * Resolve the lifecycle status for an assessment invite.
   * @param userStatus - The status of the user.
   * @param invitationSentAt - The time the invitation was sent.
   * @param assessmentStatus - The status of the assessment.
   * @returns The lifecycle status for an assessment invite.
   */
  private resolveLifecycleStatus(
    userStatus: string,
    invitationSentAt: Date | null,
    assessmentStatus: AssessmentStatus | null,
  ): AssessmentInviteLifecycleStatus {
    if (assessmentStatus === AssessmentStatus.report_generated) {
      return 'completed';
    }
    if (
      assessmentStatus &&
      IN_PROGRESS_ASSESSMENT_STATUSES.includes(assessmentStatus)
    ) {
      return 'in_progress';
    }
    if (
      userStatus === APP_USER_STATUS.PENDING &&
      invitationSentAt != null &&
      Date.now() - invitationSentAt.getTime() >
        APP_USER_INVITE_PENDING_EXPIRY_MS
    ) {
      return 'expired';
    }
    return 'invited';
  }

  /**
   * Resolve the progress percent for an assessment invite.
   * @param status - The lifecycle status.
   * @param responseCount - The number of responses.
   * @returns The progress percent for an assessment invite.
   */
  private resolveProgressPercent(
    status: AssessmentInviteLifecycleStatus,
    responseCount: number,
  ): number {
    if (status === 'completed') {
      return 100;
    }
    if (status !== 'in_progress') {
      return 0;
    }
    return Math.min(
      100,
      Math.round(
        (responseCount / ASSESSMENT_INVITE_TOTAL_RESPONSE_COUNT) * 100,
      ),
    );
  }

  /**
   * Resolve the last activity for an assessment invite.
   * Uses the latest of assessment activity and user lastSeenAt.
   */
  private resolveLastActivity(
    assessment: InviteListUserRow['assessments'][number] | null,
    lastSeenAt: Date | null,
  ): string | null {
    const candidates: Date[] = [];
    if (lastSeenAt) {
      candidates.push(lastSeenAt);
    }
    if (assessment) {
      if (assessment.startedAt) {
        candidates.push(assessment.startedAt);
      }
      if (assessment.completedAt) {
        candidates.push(assessment.completedAt);
      }
      const latestResponse = assessment.questionResponses[0]?.updatedAt;
      if (latestResponse) {
        candidates.push(latestResponse);
      }
    }
    if (candidates.length === 0) {
      return null;
    }
    const max = candidates.reduce((acc, d) =>
      d.getTime() > acc.getTime() ? d : acc,
    );
    return max.toISOString();
  }
}
