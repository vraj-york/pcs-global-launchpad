import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AssessmentStatus, Prisma } from '@prisma/client';
import { ResponseHelper, type ApiResponse } from '../common';
import { getTimeRangeFilterStartDate } from '../common/time-range-filter.util';
import { PrismaService } from '../prisma';
import { COGNITO_GROUP_NAMES } from '../user/cognito-groups.constants';
import { APP_USER_NOT_FOUND_MSG } from '../user/constants/app-user.constants';
import { AppUserService } from '../user/app-user.service';
import type { AssessmentListItem } from './assessment-list.types';
import {
  ASSESSMENT_LIST_FETCHED_MSG,
  ASSESSMENT_LIST_BY_USER_FETCHED_MSG,
  ASSESSMENT_LIST_BY_USER_FORBIDDEN_MSG,
  ASSESSMENT_LIST_INDIVIDUAL_USER_FORBIDDEN_MSG,
  ASSESSMENT_LIST_FETCH_ERROR_LOG_MSG,
  ASSESSMENT_LIST_FAILED_MSG,
  type AssessmentListDisplayStatus,
  formatAssessmentListName,
  type AssessmentListSortBy,
  type AssessmentListSortOrder,
  type AssessmentListStatusFilter,
} from './assessment.constants';
import { ListAssessmentsQueryDto } from './dto/list-assessments-query.dto';

const assessmentListSelect = {
  id: true,
  userId: true,
  startedAt: true,
  completedAt: true,
  status: true,
  assessmentReport: { select: { report: true } },
} satisfies Prisma.AssessmentSelect;

type AssessmentListRow = Prisma.AssessmentGetPayload<{
  select: typeof assessmentListSelect;
}>;

const INCOMPLETE_ASSESSMENT_STATUSES: AssessmentStatus[] = [
  AssessmentStatus.in_progress,
  AssessmentStatus.completed,
  AssessmentStatus.scored,
];

/** Maps DB status to list display status (complete = report_generated; all others incomplete). */
function mapAssessmentDisplayStatus(
  status: AssessmentStatus,
): AssessmentListDisplayStatus {
  return status === AssessmentStatus.report_generated
    ? 'complete'
    : 'incomplete';
}

/** Maps list `status` filter to a Prisma where fragment. */
function mapStatusFilterToPrisma(
  status: AssessmentListStatusFilter,
): Prisma.AssessmentWhereInput {
  if (status === 'complete') {
    return { status: AssessmentStatus.report_generated };
  }
  return { status: { in: INCOMPLETE_ASSESSMENT_STATUSES } };
}

@Injectable()
export class AssessmentListService {
  private readonly logger = new Logger(AssessmentListService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appUserService: AppUserService,
  ) {}

  /**
   * Returns paginated assessments for the authenticated caller only.
   * Admin-wide listing for another user uses {@link listByUserIdForAdmin}.
   */
  async findAllPaginatedForRequester(
    query: ListAssessmentsQueryDto,
    cognitoSub: string,
  ): Promise<ApiResponse> {
    return this.listForCurrentUser(query, cognitoSub?.trim());
  }

  /**
   * Paginated assessments for one target user. **SuperAdmin, CorporationAdmin, and
   * CompanyAdmin only.** Users with no `user_company_access` row (individual assessment
   * users) are visible to **SuperAdmin only**. All other targets use the same scope rules
   * as GET `/users/:cognitoSub` ({@link AppUserService.findByCognitoSubForRequester}).
   */
  async listByUserIdForAdmin(
    targetUserCognitoSub: string,
    query: ListAssessmentsQueryDto,
    requesterCognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const groupSet = new Set(groups ?? []);
    const isSuperAdmin = groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN);
    const isCorpAdmin = groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN);
    const isCompanyAdmin = groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN);

    if (!isSuperAdmin && !isCorpAdmin && !isCompanyAdmin) {
      throw new ForbiddenException(ASSESSMENT_LIST_BY_USER_FORBIDDEN_MSG);
    }

    const trimmedTargetSub = targetUserCognitoSub?.trim();
    if (!trimmedTargetSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    const targetUser = await this.prisma.appUser.findFirst({
      where: { cognitoSub: trimmedTargetSub, deletedAt: null },
      select: { cognitoSub: true },
    });
    if (!targetUser) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    const hasCompanyAccess = await this.prisma.userCompanyAccess.findFirst({
      where: { userId: trimmedTargetSub },
      select: { userId: true },
    });

    if (!hasCompanyAccess) {
      if (!isSuperAdmin) {
        throw new ForbiddenException(
          ASSESSMENT_LIST_INDIVIDUAL_USER_FORBIDDEN_MSG,
        );
      }
    } else if (!isSuperAdmin) {
      await this.appUserService.findByCognitoSubForRequester(
        trimmedTargetSub,
        requesterCognitoSub.trim(),
        groups,
      );
    }

    const where = this.buildListWhere({ userId: trimmedTargetSub }, query);
    return this.fetchPaginatedList(
      query,
      where,
      ASSESSMENT_LIST_BY_USER_FETCHED_MSG,
    );
  }

  /**
   * Lists assessments owned by the authenticated user only. Resolves the app user
   * by Cognito sub and throws NotFound when missing or deleted.
   */
  private async listForCurrentUser(
    query: ListAssessmentsQueryDto,
    cognitoSub: string,
  ): Promise<ApiResponse> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    const user = await this.prisma.appUser.findFirst({
      where: { cognitoSub: trimmedSub, deletedAt: null },
      select: { cognitoSub: true },
    });
    if (!user) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    const where = this.buildListWhere({ userId: trimmedSub }, query);
    return this.fetchPaginatedList(query, where);
  }

  /**
   * Merges base scope with optional status and time filters. Status and timeFilter
   * combine with AND; timeFilter matches when started_at or completed_at falls in the window.
   */
  private buildListWhere(
    base: Prisma.AssessmentWhereInput,
    query: Pick<ListAssessmentsQueryDto, 'timeFilter' | 'status'>,
  ): Prisma.AssessmentWhereInput {
    const clauses: Prisma.AssessmentWhereInput[] = [base];

    if (query.status) {
      clauses.push(mapStatusFilterToPrisma(query.status));
    }

    if (query.timeFilter) {
      const start = getTimeRangeFilterStartDate(query.timeFilter);
      const now = new Date();
      const withinWindow = { gte: start, lte: now };
      clauses.push({
        OR: [{ startedAt: withinWindow }, { completedAt: withinWindow }],
      });
    }

    if (clauses.length === 1) {
      return base;
    }

    return { AND: clauses };
  }

  /** Runs paginated findMany/count, maps rows to list items, and wraps the API response. */
  private async fetchPaginatedList(
    query: ListAssessmentsQueryDto,
    where: Prisma.AssessmentWhereInput,
    successMessage: string = ASSESSMENT_LIST_FETCHED_MSG,
  ): Promise<ApiResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'startedAt';
    const sortOrder = query.sortOrder ?? 'desc';

    try {
      const total = await this.prisma.assessment.count({ where });

      let rows: AssessmentListRow[];

      if (sortBy === 'status') {
        rows = await this.fetchRowsOrderedByDisplayStatus(
          where,
          skip,
          limit,
          sortOrder,
        );
      } else {
        rows = await this.prisma.assessment.findMany({
          where,
          skip,
          take: limit,
          orderBy: this.buildOrderBy(sortBy, sortOrder),
          select: assessmentListSelect,
        });
      }

      const assessmentIndexes = await this.resolveAssessmentIndexes(rows);
      const totalPages = Math.ceil(total / limit);
      const items = rows.map((row) =>
        this.mapListItem(row, assessmentIndexes.get(row.id) ?? 1),
      );

      return ResponseHelper.success(successMessage, {
        items,
        pagination: {
          total,
          page,
          pageSize: limit,
          totalPages,
        },
      });
    } catch (error) {
      this.logger.error(ASSESSMENT_LIST_FETCH_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(ASSESSMENT_LIST_FAILED_MSG);
    }
  }

  /**
   * Maps list `sortBy` / `sortOrder` to Prisma `orderBy`.
   * `assessmentName` sorts per-user index via userId then startedAt.
   * `status` is handled separately via {@link fetchRowsOrderedByDisplayStatus}.
   */
  private buildOrderBy(
    sortBy: AssessmentListSortBy,
    sortOrder: AssessmentListSortOrder,
  ):
    | Prisma.AssessmentOrderByWithRelationInput
    | Prisma.AssessmentOrderByWithRelationInput[] {
    const dir = sortOrder;
    switch (sortBy) {
      case 'assessmentName':
        return [{ userId: dir }, { startedAt: dir }];
      case 'completedAt':
        return { completedAt: dir };
      case 'startedAt':
      default:
        return { startedAt: dir };
    }
  }

  /**
   * Returns one page of assessments ordered by display status (complete vs incomplete).
   * Uses a lightweight ID pass then refetches full rows (same pattern as companyName sort in GET /users).
   */
  private async fetchRowsOrderedByDisplayStatus(
    where: Prisma.AssessmentWhereInput,
    skip: number,
    limit: number,
    sortOrder: AssessmentListSortOrder,
  ): Promise<AssessmentListRow[]> {
    const statusRows = await this.prisma.assessment.findMany({
      where,
      select: { id: true, status: true },
    });

    if (statusRows.length === 0) {
      return [];
    }

    const sortedIds = [...statusRows]
      .sort((a, b) => this.compareDisplayStatus(a.status, b.status, sortOrder))
      .slice(skip, skip + limit)
      .map((row) => row.id);

    if (sortedIds.length === 0) {
      return [];
    }

    const fetched = await this.prisma.assessment.findMany({
      where: { id: { in: sortedIds } },
      select: assessmentListSelect,
    });
    const orderMap = new Map(sortedIds.map((id, index) => [id, index]));
    return [...fetched].sort(
      (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
    );
  }

  /** Sorts complete (report_generated) vs incomplete buckets for list `sortBy=status`. */
  private compareDisplayStatus(
    a: AssessmentStatus,
    b: AssessmentStatus,
    sortOrder: AssessmentListSortOrder,
  ): number {
    const rank = (status: AssessmentStatus) =>
      status === AssessmentStatus.report_generated ? 1 : 0;
    const diff = rank(a) - rank(b);
    return sortOrder === 'asc' ? diff : -diff;
  }

  /**
   * Resolves per-user 1-based assessment index (earliest started_at = 1), keyed by assessment id.
   */
  private async resolveAssessmentIndexes(
    rows: AssessmentListRow[],
  ): Promise<Map<string, number>> {
    if (rows.length === 0) {
      return new Map();
    }

    const ids = rows.map((row) => row.id);
    const codeRows = await this.prisma.$queryRaw<
      { id: string; assessment_code: number }[]
    >`
      SELECT a.id, (
        SELECT COUNT(*)::int
        FROM assessments a2
        WHERE a2.user_id = a.user_id AND a2.started_at <= a.started_at
      ) AS assessment_code
      FROM assessments a
      WHERE a.id IN (${Prisma.join(ids)})
    `;

    return new Map(codeRows.map((row) => [row.id, row.assessment_code]));
  }

  /** Maps a Prisma assessment row to the public list item shape (ISO dates, nullable reportKey). */
  private mapListItem(
    row: AssessmentListRow,
    assessmentIndex: number,
  ): AssessmentListItem {
    const reportKey = row.assessmentReport?.report?.trim();
    return {
      uuid: row.id,
      assessmentName: formatAssessmentListName(assessmentIndex),
      startedAt: row.startedAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      status: mapAssessmentDisplayStatus(row.status),
      reportKey: reportKey && reportKey.length > 0 ? reportKey : null,
    };
  }
}
