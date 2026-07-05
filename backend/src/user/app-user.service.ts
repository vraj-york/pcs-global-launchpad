import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import {
  AssessmentStatus,
  Prisma,
  type AppUserBulkInviteJob,
} from '@prisma/client';
import { isEmail } from 'class-validator';
import { PrismaService } from '../prisma';
import { EmailService } from '../email';
import { S3Service } from '../s3';
import { SubscriptionAccessService } from './subscription-access.service';
import { RbacAccessService } from '../auth/rbac/rbac-access.service';
import {
  deleteCognitoUser,
  escapeHtmlForEmail,
  getInvitePublicAppOrigin,
  removeUserFromCognitoGroup,
  setCognitoUserEnabled,
  getCognitoSubByUsername,
  resolveInviteTemporaryPassword,
  ResponseHelper,
  type ApiResponse,
} from '../common';
import { captureUserInviteEmailSent } from '../common/posthog-invite-capture';
import { formatDateShort } from '../common/date.util';
import {
  COMPANY_ADMIN_ROLE_NAME,
  COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG,
} from '../company/constants/company.messages';
import { COMPANY_STATUS } from '../company/constants/company.status';
import { CORPORATION_STATUS } from '../corporation/constants/corporation.status';
import {
  CORPORATION_ADMIN_APP_USER_TYPE,
  CORPORATION_ADMIN_ROLE_NAME,
} from '../corporation/constants/corporation.messages';
import { COGNITO_USER_SUB_NOT_RESOLVED_MESSAGE } from '../company-admin-onboarding/company-admin-onboarding.constants';
import { USER_ANALYTICS_CONTEXT_SUCCESS_MSG } from './constants/user-dashboard.constants';
import {
  PEER_SNAPSHOT_FETCHED_SUCCESS_MSG,
  PEER_SNAPSHOT_FETCH_ERROR_LOG_MSG,
  PEER_SNAPSHOT_FETCH_FAILED_MSG,
} from './constants/peer-snapshot.constants';
import { truncateToFirstStatement } from './peer-snapshot.util';
import {
  APP_USERS_LIST_FAILED_MSG,
  APP_USERS_LIST_FETCH_ERROR_LOG_MSG,
  APP_USERS_LIST_FETCHED_SUCCESS_MSG,
  APP_USERS_LIST_FORBIDDEN_MSG,
  APP_USERS_LIST_CORP_ADMIN_WRONG_CORP_MSG,
  APP_USERS_LIST_COMPANY_ADMIN_UNASSIGNED_MSG,
  APP_USERS_LIST_COMPANY_ADMIN_WRONG_COMPANY_MSG,
  APP_USERS_LIST_COMPANY_ADMIN_WRONG_CORP_MSG,
  APP_USER_BLOCK_FORBIDDEN_MSG,
  APP_USER_BLOCK_ORG_SUSPENDED_MSG,
  APP_USER_BLOCK_SUPER_ADMIN_NOT_ALLOWED_MSG,
  APP_USER_BLOCK_STATUS_FAILED_MSG,
  APP_USER_BLOCK_STATUS_UPDATE_ERROR_LOG_MSG,
  APP_USER_BLOCK_STATUS_UPDATED_MSG,
  APP_USER_INVITATION_CANCELED_MSG,
  APP_USER_INVITATION_CANCEL_ERROR_LOG_MSG,
  APP_USER_INVITATION_CANCEL_FAILED_MSG,
  APP_USER_INVITATION_CANCEL_FORBIDDEN_MSG,
  APP_USER_INVITATION_CANCEL_NOT_PENDING_MSG,
  APP_USER_INVITATION_RESENT_MSG,
  APP_USER_INVITATION_RESEND_EMAIL_FAILED_MSG,
  APP_USER_INVITATION_RESEND_EMAIL_MISSING_MSG,
  APP_USER_INVITATION_RESEND_ERROR_LOG_MSG,
  APP_USER_INVITATION_RESEND_FAILED_MSG,
  APP_USER_INVITATION_RESEND_FORBIDDEN_MSG,
  APP_USER_INVITATION_RESEND_NOT_PENDING_MSG,
  APP_USER_NOT_FOUND_MSG,
  APP_USER_SOFT_DELETE_CORP_COMPANY_ADMIN_NOT_ALLOWED_MSG,
  APP_USER_SOFT_DELETE_SUPER_ADMIN_NOT_ALLOWED_MSG,
  APP_USER_SOFT_DELETE_ERROR_LOG_MSG,
  APP_USER_SOFT_DELETE_FAILED_MSG,
  APP_USER_SOFT_DELETE_FORBIDDEN_MSG,
  APP_USER_SOFT_DELETED_MSG,
  APP_USER_STATUS,
  APP_USER_UPDATE_ACTIVE_ORG_SUSPENDED_MSG,
  APP_USER_UPDATE_CANNOT_ASSIGN_CORP_COMPANY_ADMIN_MSG,
  APP_USER_UPDATE_FORBIDDEN_MSG,
  APP_USER_UPDATE_EMPTY_BODY_MSG,
  APP_USER_UPDATE_ERROR_LOG_MSG,
  APP_USER_UPDATE_FAILED_MSG,
  APP_USER_UPDATE_INVALID_ROLE_MSG,
  APP_USER_UPDATE_ROLE_CHANGE_NOT_ALLOWED_CORP_COMPANY_ADMIN_MSG,
  APP_USER_UPDATE_SUPER_ADMIN_NOT_ALLOWED_MSG,
  APP_USER_UPDATED_MSG,
  APP_USER_ANALYTICS_CONTEXT_FAILED_MSG,
  APP_USER_VIEW_FAILED_MSG,
  APP_USER_VIEW_FETCH_ERROR_LOG_MSG,
  APP_USER_VIEW_FETCHED_SUCCESS_MSG,
  APP_USER_VIEW_FORBIDDEN_MSG,
  APP_USER_SELF_PROFILE_FETCHED_SUCCESS_MSG,
  APP_USER_SELF_PROFILE_FETCH_FAILED_MSG,
  APP_USER_SELF_PROFILE_FETCH_ERROR_LOG_MSG,
  APP_USER_SELF_PROFILE_UPDATED_MSG,
  APP_USER_SELF_PROFILE_UPDATE_FAILED_MSG,
  APP_USER_SELF_PROFILE_UPDATE_ERROR_LOG_MSG,
  APP_USER_AVATAR_UPLOADED_SUCCESS_MSG,
  APP_USER_AVATAR_UPLOAD_FAILED_MSG,
  APP_USER_AVATAR_UPLOAD_ERROR_LOG_MSG,
  APP_USER_AVATAR_DELETED_SUCCESS_MSG,
  APP_USER_AVATAR_DELETE_FAILED_MSG,
  APP_USER_AVATAR_DELETE_ERROR_LOG_MSG,
  APP_USER_AVATAR_FILE_REQUIRED_MSG,
  APP_USER_AVATAR_INVALID_TYPE_MSG,
  APP_USER_AVATAR_MAX_SIZE_MSG,
  APP_USER_INVITE_TYPE,
  APP_USER_INVITE_FORBIDDEN_MSG,
  APP_USER_INVITE_CORP_ADMIN_WRONG_CORP_MSG,
  APP_USER_INVITE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
  APP_USER_INVITE_COMPANY_ADMIN_WRONG_CORP_MSG,
  APP_USER_INVITE_DUPLICATE_EMAIL_MSG,
  APP_USER_INVITE_COMPANY_NOT_FOUND_MSG,
  APP_USER_INVITE_COMPANY_NO_PLAN_MSG,
  APP_USER_INVITE_PLAN_SEAT_EXCEEDED_MSG,
  APP_USER_INVITE_INVALID_END_USER_ROLE_MSG,
  APP_USER_INVITE_SUCCESS_MSG,
  APP_USER_INVITE_EMAIL_FAILED_MSG,
  APP_USER_ONBOARDING_STEP_BY_TYPE,
  APP_USER_ONBOARDING_STEP_TYPE,
  APP_USER_ONBOARDING_CONSENT_EMAIL_SEND_FAILED_LOG_MSG,
  APP_USER_ONBOARDING_CONSENT_EMAIL_SUBJECT,
  APP_USER_ONBOARDING_STEP_UPDATE_ERROR_LOG_MSG,
  APP_USER_ONBOARDING_STEP_UPDATE_FAILED_MSG,
  APP_USER_ONBOARDING_STEP_UPDATED_MSG,
  APP_USER_PEER_MENTIONS_FETCH_FAILED_MSG,
  APP_USER_PEER_MENTIONS_FETCHED_SUCCESS_MSG,
  PEER_MENTION_CONTEXTS,
  APP_USER_PEER_MENTIONS_RESOLVE_FAILED_MSG,
  APP_USER_PEER_MENTIONS_RESOLVED_SUCCESS_MSG,
  APP_USER_CHATBOT_PERSONALIZATION_FETCHED_SUCCESS_MSG,
  APP_USER_CHATBOT_PERSONALIZATION_FETCH_FAILED_MSG,
  APP_USER_CHATBOT_PERSONALIZATION_FETCH_ERROR_LOG_MSG,
  APP_USER_INVITE_PENDING_EXPIRY_MS,
  SUPER_ADMIN_APP_USER_TYPE,
  INDIVIDUAL_APP_USER_TYPE,
  APP_USER_BULK_INVITE_COMPLETED_MSG,
  APP_USER_BULK_INVITE_ROW_CATEGORY_NOT_RESOLVED_MSG,
  APP_USER_BULK_INVITE_ROW_COMPANY_AMBIGUOUS_MSG,
  APP_USER_BULK_INVITE_ROW_COMPANY_NOT_RESOLVED_MSG,
  APP_USER_BULK_INVITE_ROW_CORPORATION_AMBIGUOUS_MSG,
  APP_USER_BULK_INVITE_ROW_CORPORATION_NOT_RESOLVED_MSG,
  APP_USER_BULK_INVITE_ROW_DUPLICATE_EMAIL_IN_FILE_MSG,
  APP_USER_BULK_INVITE_ROW_ROLE_NOT_RESOLVED_MSG,
  APP_USER_BULK_INVITE_MAX_USERS,
  APP_USER_BULK_INVITE_ASSESSMENT_ONLY_CONCURRENCY,
  APP_USER_BULK_INVITE_MAX_ROWS_EXCEEDED_MSG,
} from './constants/app-user.constants';
import { INDIVIDUAL_PAYMENT_STATUS } from './constants/individual-payment.constants';
import {
  APP_USER_AVATAR_ALLOWED_MIMES,
  APP_USER_AVATAR_EXTENSION_BY_MIME,
  APP_USER_AVATAR_MAX_SIZE_BYTES,
} from './constants/app-user-avatar.constants';
import {
  APP_USER_BULK_CSV_EMPTY_MSG,
  APP_USER_BULK_CSV_ERROR_LOG_MSG,
  APP_USER_BULK_CSV_IMPORT_FAILED_MSG,
  APP_USER_BULK_CSV_INVALID_HEADER_MSG,
  APP_USER_BULK_CSV_INVALID_INVITE_TYPE_MSG,
  APP_USER_BULK_CSV_MISSING_FILE_MSG,
  APP_USER_BULK_CSV_ROW_INVALID_EMAIL_MSG,
  APP_USER_BULK_CSV_ROW_BSP_SCOPING_FIELDS_REQUIRED_MSG,
  APP_USER_BULK_CSV_ROW_REQUIRED_FIELD_MSG,
  APP_USER_BULK_CSV_MAX_BYTES,
  APP_USER_BULK_CSV_SIZE_REJECT_MSG,
} from './constants/app-user-bulk-csv.constants';
import {
  APP_USER_BULK_INVITE_JOB_FETCHED_MSG,
  APP_USER_BULK_INVITE_JOB_FORBIDDEN_MSG,
  APP_USER_BULK_INVITE_JOB_NOT_FOUND_MSG,
  APP_USER_BULK_INVITE_JOB_ENQUEUED_MSG,
  APP_USER_BULK_INVITE_JOB_PROCESS_ERROR_LOG_MSG,
  APP_USER_BULK_INVITE_JOB_STATUS,
  APP_USER_BULK_INVITE_COMPLETION_EMAIL_ALL_FAILED_INTRO,
  APP_USER_BULK_INVITE_COMPLETION_EMAIL_LOG_BAD_RESULT_MSG,
  APP_USER_BULK_INVITE_COMPLETION_EMAIL_LOG_NO_RECIPIENT_MSG,
  APP_USER_BULK_INVITE_COMPLETION_EMAIL_LOG_SEND_FAILED_MSG,
  APP_USER_BULK_INVITE_COMPLETION_EMAIL_PARTIAL_INTRO,
  APP_USER_BULK_INVITE_COMPLETION_EMAIL_PARTIAL_SUCCESS_COUNT_LINE,
  APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUBJECT_ALL_FAILED,
  APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUBJECT_SUCCESS,
  APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUBJECT_WITH_ERRORS,
  APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUCCESS_RECORDS_LINE,
  APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUPPORT_FOOTER,
  APP_USER_BULK_INVITE_COMPLETION_EMAIL_VIEW_EMPLOYEES_LABEL,
  APP_USER_BULK_INVITE_ERRORS_CSV_FILENAME,
} from './constants/app-user-bulk-job.constants';
import { buildBulkInviteFailedRowsCsvBuffer } from './app-user-bulk-invite-errors-csv.util';
import { getBulkInviteJobCompletionEmailHtml } from './templates/bulk-invite-job-completion-email.template';
import {
  getOnboardingConsentCompleteEmailHtml,
  getOnboardingConsentCompleteEmailText,
} from './templates/onboarding-consent-complete-email.template';
import {
  APP_USER_BULK_CSV_OPTIONAL_HEADER_KEYS,
  APP_USER_BULK_CSV_REQUIRED_HEADER_KEYS,
  buildAppUserBulkInviteHeaderIndex,
  parseAppUserBulkInviteCsvToRows,
  parseAppUserInviteTypeFromCsvCell,
} from './app-user-bulk-csv.util';
import {
  COGNITO_GROUP_NAMES,
  COGNITO_USER_POOL_ID_ENV_NOT_SET_MESSAGE,
} from './cognito-groups.constants';
import {
  type AppUserListSortBy,
  type AppUserListSortOrder,
  BulkInviteAppUserRowDto,
  BulkInviteAppUsersDto,
  type BulkInviteAppUserFailedItem,
  type BulkInviteAppUserSucceededItem,
  InviteAppUserDto,
  ListAppUsersQueryDto,
  ListPeerMentionsQueryDto,
  PEER_MENTION_MAX_SELECTED,
  ResolvePeerMentionsDto,
  SetAppUserBlockDto,
  UpdateMyOnboardingStepDto,
  UpdateMyProfileDto,
  UpdateAppUserDto,
} from './dto';
import {
  provisionCognitoForAppUserInvite,
  sendAppUserInviteEmail,
} from './app-user-invite-cognito.util';

const appUserListSelect = Prisma.validator<Prisma.AppUserSelect>()({
  cognitoSub: true,
  userCode: true,
  roleId: true,
  inviteType: true,
  firstName: true,
  lastName: true,
  email: true,
  status: true,
  workPhone: true,
  timezone: true,
  createdAt: true,
  invitationSentAt: true,
  corporation: {
    select: {
      legalName: true,
      corporationCode: true,
    },
  },
  role: {
    select: {
      name: true,
      category: {
        select: { id: true, name: true },
      },
    },
  },
  companyAccess: {
    where: {
      company: { deletedAt: null },
    },
    orderBy: { createdAt: 'asc' },
    take: 1,
    select: {
      company: {
        select: {
          legalName: true,
          corporation: {
            select: { dataResidencyRegion: true },
          },
        },
      },
    },
  },
});

type AppUserListRow = Prisma.AppUserGetPayload<{
  select: typeof appUserListSelect;
}>;

type PeerMentionContext = (typeof PEER_MENTION_CONTEXTS)[number];

type PeerMentionProfile = {
  cognitoSub: string;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  email: string | null;
  jobRole: string | null;
  avatar?: string | null;
  role: { name: string | null } | null;
  companyAccess?: { companyId: string; isAdmin: boolean }[];
};

type PeerMentionAssessmentStyle = {
  context: PeerMentionContext;
  type: string;
  bspStyle: {
    styleNumber?: number;
    title: string;
    description: string;
    environmentalPreferences: string[];
    interactionPreferences: string[];
    characterStrengths: string[];
    psychologicalNeeds: string[];
    workPreferences: string[];
    warningSigns: string[];
    whenFeelingStressed: string;
  };
};

type PeerMentionAssessmentRow = {
  userId: string;
  completedAt: Date | null;
  assessmentScore: {
    styles: PeerMentionAssessmentStyle[];
  } | null;
};

type PeerSnapshotAssessmentRow = {
  userId: string;
  completedAt: Date | null;
  assessmentScore: {
    styles: Array<{
      context: string;
      bspStyle: {
        styleNumber: number;
        title: string;
        description: string;
      };
    }>;
  } | null;
};

const appUserDetailSelect = Prisma.validator<Prisma.AppUserSelect>()({
  cognitoSub: true,
  userCode: true,
  roleId: true,
  inviteType: true,
  status: true,
  firstName: true,
  lastName: true,
  nickname: true,
  email: true,
  workPhone: true,
  cellPhone: true,
  timezone: true,
  createdAt: true,
  invitationSentAt: true,
  corporation: {
    select: {
      legalName: true,
      corporationCode: true,
    },
  },
  role: {
    select: {
      name: true,
      categoryId: true,
      category: {
        select: { name: true },
      },
    },
  },
  companyAccess: {
    where: {
      company: { deletedAt: null },
    },
    orderBy: { createdAt: 'asc' },
    take: 1,
    select: {
      company: {
        select: {
          legalName: true,
        },
      },
    },
  },
});

/** Poll response for GET `/users/invite/bulk/jobs/:jobId` (excludes `csvBody` and requester fields). */
const appUserBulkInviteJobStatusSelect =
  Prisma.validator<Prisma.AppUserBulkInviteJobSelect>()({
    id: true,
    status: true,
    originalFileName: true,
    createdAt: true,
    updatedAt: true,
    startedAt: true,
    completedAt: true,
    resultJson: true,
    errorMessage: true,
  });

/**
 * List/detail: when stored status is Pending, return runtime `Expired` if
 * `invitation_sent_at` is older than {@link APP_USER_INVITE_PENDING_EXPIRY_MS}.
 */
function resolveAppUserDetailDisplayStatus(
  dbStatus: string,
  invitationSentAt: Date | null,
): string {
  return dbStatus === APP_USER_STATUS.PENDING &&
    invitationSentAt != null &&
    Date.now() - invitationSentAt.getTime() > APP_USER_INVITE_PENDING_EXPIRY_MS
    ? APP_USER_STATUS.EXPIRED
    : dbStatus;
}

/**
 * Builds a human-readable display name for a peer in priority order:
 * nickname → full name (first + last) → fallback to first 8 chars of cognitoSub.
 */
function buildPeerDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  cognitoSub: string;
}): string {
  const fullName = [user.firstName, user.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  return (
    user.nickname?.trim() || fullName || `User ${user.cognitoSub.slice(0, 8)}`
  );
}

/**
 * Returns up to `limit` non-empty, trimmed strings from `values`.
 * Used to cap BSP style lists (interaction preferences, strengths, etc.)
 * before they are embedded in the LLM prompt block.
 */
function takeCompactList(
  values: string[] | null | undefined,
  limit = 3,
): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, limit);
}

/**
 * Trims and hard-truncates a BSP style description to `maxLength` characters,
 * appending "…" when truncated. Returns `null` for blank/missing values so
 * callers can omit the field rather than send an empty string to the LLM.
 */
function truncatePeerText(
  value: string | null | undefined,
  maxLength = 320,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length > maxLength
    ? `${trimmed.slice(0, maxLength).trimEnd()}...`
    : trimmed;
}

/**
 * Deduplicates and sanitises a raw peer-ID list from the request body:
 * trims whitespace, drops empty strings, removes duplicate IDs, and caps the
 * result at {@link PEER_MENTION_MAX_SELECTED} entries to match the frontend
 * selection limit and prevent over-fetching.
 */
function uniqueNonEmptyPeerIds(peerIds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const peerId of peerIds) {
    const trimmed = peerId.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= PEER_MENTION_MAX_SELECTED) {
      break;
    }
  }
  return out;
}

/** `status=Expired` list filter: same runtime rule as {@link resolveAppUserDetailDisplayStatus} (not stored in DB). */
function isRuntimeExpiredListStatusFilter(statusTrimmed: string): boolean {
  return statusTrimmed.toLowerCase() === APP_USER_STATUS.EXPIRED.toLowerCase();
}

/** `status=Pending` list filter: stored Pending only, excluding runtime-expired invites (see {@link resolveAppUserDetailDisplayStatus}). */
function isRuntimePendingListStatusFilter(statusTrimmed: string): boolean {
  return statusTrimmed.toLowerCase() === APP_USER_STATUS.PENDING.toLowerCase();
}

/** Corp/Company admin list scope: scoped BSP users plus global Assessment Only users. */
type AppUserAdminListScope = {
  corporationId?: string;
  companyIds?: string[];
  includeAssessmentOnlyUsers: boolean;
};

/** Requester identity for per-row {@link inviteAppUserForRequester} during bulk CSV processing. */
type BulkInviteRequesterContext = {
  cognitoSub: string;
  groups: string[];
};

@Injectable()
export class AppUserService {
  private readonly logger = new Logger(AppUserService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly s3Service: S3Service,
    private readonly subscriptionAccess: SubscriptionAccessService,
    private readonly rbacAccess: RbacAccessService,
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
      throw new Error(COGNITO_USER_POOL_ID_ENV_NOT_SET_MESSAGE);
    }
    this.userPoolId = poolId;
  }

  /**
   * Single-query replacement for the former getRequesterCompanyIds +
   * buildEligiblePeerWhere + fetchEligiblePeerProfiles trio.
   *
   * Uses a correlated EXISTS sub-query so Postgres finds shared companies
   * inline — no extra round-trip to pre-fetch company IDs, and no risk of
   * generating a large IN (...) list for users who belong to many companies.
   *
   * A lightweight existence check is done first so callers still receive
   * NotFoundException when the authenticated user has been deleted.
   */
  private async fetchPeersForRequester(
    requesterSub: string,
    options?: {
      peerIds?: string[];
      query?: string;
      limit?: number;
      includeAvatar?: boolean;
    },
  ): Promise<PeerMentionProfile[]> {
    const userExists = await this.prisma.appUser.findFirst({
      where: { cognitoSub: requesterSub, deletedAt: null },
      select: { cognitoSub: true },
    });
    if (!userExists) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    // Shared-company filter: the peer's company must also contain the requester.
    const sharedCompanyWhere: Prisma.UserCompanyAccessWhereInput = {
      company: {
        deletedAt: null,
        userCompanyAccesses: {
          some: {
            user: { cognitoSub: requesterSub, deletedAt: null },
          },
        },
      },
    };

    const where: Prisma.AppUserWhereInput = {
      deletedAt: null,
      status: { equals: APP_USER_STATUS.ACTIVE, mode: 'insensitive' },
      cognitoSub: options?.peerIds?.length
        ? { in: options.peerIds, not: requesterSub }
        : { not: requesterSub },
      companyAccess: { some: sharedCompanyWhere },
      NOT: [
        {
          // Exclude peers who are admins of any company they share with the requester.
          companyAccess: {
            some: { ...sharedCompanyWhere, isAdmin: true },
          },
        },
        {
          role: {
            name: {
              in: [COMPANY_ADMIN_ROLE_NAME, CORPORATION_ADMIN_ROLE_NAME],
            },
          },
        },
      ],
    };

    const trimmedQuery = options?.query?.trim();
    if (trimmedQuery) {
      const words = trimmedQuery.split(/\s+/).filter((word) => word.length > 0);
      const searchOr: Prisma.AppUserWhereInput[] = [
        { firstName: { contains: trimmedQuery, mode: 'insensitive' } },
        { lastName: { contains: trimmedQuery, mode: 'insensitive' } },
        { nickname: { contains: trimmedQuery, mode: 'insensitive' } },
        { jobRole: { contains: trimmedQuery, mode: 'insensitive' } },
        { email: { contains: trimmedQuery, mode: 'insensitive' } },
      ];
      if (words.length >= 2) {
        searchOr.push({
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
      where.AND = [{ OR: searchOr }];
    }

    return this.prisma.appUser.findMany({
      where,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { userCode: 'asc' }],
      take: options?.limit,
      select: {
        cognitoSub: true,
        firstName: true,
        lastName: true,
        nickname: true,
        email: true,
        jobRole: true,
        ...(options?.includeAvatar ? { avatar: true } : {}),
        role: { select: { name: true } },
      },
    }) as Promise<PeerMentionProfile[]>;
  }

  /**
   * Loads the most recent scored/report_generated assessment for each peer ID,
   * returning a Map keyed by `userId` so callers can do O(1) lookups per peer.
   * If a user has multiple assessments only the latest (by `completedAt`) is kept.
   * Returns an empty Map when `userIds` is empty.
   */
  private async fetchLatestPeerAssessments(
    userIds: string[],
  ): Promise<Map<string, PeerMentionAssessmentRow>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const rows = (await this.prisma.assessment.findMany({
      where: {
        userId: { in: userIds },
        status: {
          in: [AssessmentStatus.scored, AssessmentStatus.report_generated],
        },
        assessmentScore: { isNot: null },
      },
      orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }],
      select: {
        userId: true,
        completedAt: true,
        assessmentScore: {
          select: {
            styles: {
              where: { context: { in: [...PEER_MENTION_CONTEXTS] } },
              select: {
                context: true,
                type: true,
                bspStyle: {
                  select: {
                    styleNumber: true,
                    title: true,
                    description: true,
                    environmentalPreferences: true,
                    interactionPreferences: true,
                    characterStrengths: true,
                    psychologicalNeeds: true,
                    workPreferences: true,
                    warningSigns: true,
                    whenFeelingStressed: true,
                  },
                },
              },
            },
          },
        },
      },
    })) as PeerMentionAssessmentRow[];

    const byUser = new Map<string, PeerMentionAssessmentRow>();
    for (const row of rows) {
      if (!byUser.has(row.userId)) {
        byUser.set(row.userId, row);
      }
    }
    return byUser;
  }

  /**
   * Loads the latest `report_generated` assessment per peer for the dashboard
   * peers snapshot. Only the overall BSP style is selected.
   */
  private async fetchLatestPeerSnapshotAssessments(
    userIds: string[],
  ): Promise<Map<string, PeerSnapshotAssessmentRow>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const rows = (await this.prisma.assessment.findMany({
      where: {
        userId: { in: userIds },
        status: AssessmentStatus.report_generated,
        assessmentScore: { isNot: null },
      },
      orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }],
      select: {
        userId: true,
        completedAt: true,
        assessmentScore: {
          select: {
            styles: {
              where: { context: 'overall' },
              take: 1,
              select: {
                context: true,
                bspStyle: {
                  select: {
                    styleNumber: true,
                    title: true,
                    description: true,
                  },
                },
              },
            },
          },
        },
      },
    })) as PeerSnapshotAssessmentRow[];

    const byUser = new Map<string, PeerSnapshotAssessmentRow>();
    for (const row of rows) {
      if (!byUser.has(row.userId)) {
        byUser.set(row.userId, row);
      }
    }
    return byUser;
  }

  /**
   * Assembles the privacy-safe payload sent to the chatbot for a single peer.
   *
   * Raw scores are never exposed. The shape contains only:
   * - identity fields (id, displayName, jobRole)
   * - `profileAvailable` flag so the LLM can gracefully skip unknown profiles
   * - a truncated `overallStyle` block (description capped, lists capped at 2–3 items)
   * - per-context style titles only (no full descriptions) via `contextStyles`
   *
   * When `assessment` is undefined the method still returns a valid object
   * with `profileAvailable: false` and null style fields.
   */
  private buildPeerBehaviorSummary(
    peer: PeerMentionProfile,
    assessment: PeerMentionAssessmentRow | undefined,
  ) {
    const styles = new Map<PeerMentionContext, PeerMentionAssessmentStyle>();
    for (const style of assessment?.assessmentScore?.styles ?? []) {
      styles.set(style.context, style);
    }

    const overall = styles.get('overall')?.bspStyle;
    const contexts = PEER_MENTION_CONTEXTS.reduce(
      (acc, context) => {
        if (context !== 'overall') {
          acc[context] = styles.get(context)?.bspStyle.title ?? null;
        }
        return acc;
      },
      {} as Record<Exclude<PeerMentionContext, 'overall'>, string | null>,
    );

    return {
      id: peer.cognitoSub,
      displayName: buildPeerDisplayName(peer),
      jobRole: peer.jobRole?.trim() || null,
      profileAvailable: Boolean(overall),
      overallStyle: overall
        ? {
            title: overall.title,
            description: truncatePeerText(overall.description),
            interactionPreferences: takeCompactList(
              overall.interactionPreferences,
            ),
            workPreferences: takeCompactList(overall.workPreferences),
            characterStrengths: takeCompactList(overall.characterStrengths),
            psychologicalNeeds: takeCompactList(overall.psychologicalNeeds, 2),
            warningSigns: takeCompactList(overall.warningSigns, 2),
            stressGuidance: truncatePeerText(overall.whenFeelingStressed, 220),
          }
        : null,
      contextStyles: contexts,
    };
  }

  /**
   * Builds the Prisma `where` clause for the user list from query filters
   * (search, status, category, corporationIds, companyIds, timezones), always excluding soft-deleted users,
   * rows with no email, and users with `user_type` {@link SUPER_ADMIN_APP_USER_TYPE} or
   * {@link INDIVIDUAL_APP_USER_TYPE} (Super Admin individual assessment invites).
   * `status=Expired` matches only runtime-expired pending invites (Pending + `invitation_sent_at` before the
   * configured cutover), not a literal `app_users.status` value.
   * `status=Pending` omits users whose display status would be runtime `Expired` (old invite send time).
   */
  private buildPrismaWhere(
    query: ListAppUsersQueryDto,
    adminListScope?: AppUserAdminListScope,
    excludeCognitoSub?: string,
  ): Prisma.AppUserWhereInput {
    const where: Prisma.AppUserWhereInput = {
      deletedAt: null,
      email: { not: null },
    };

    const requesterSub = excludeCognitoSub?.trim();
    if (requesterSub) {
      where.cognitoSub = { not: requesterSub };
    }

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      const orConditions: Prisma.AppUserWhereInput[] = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ];
      const words = searchTerm.split(/\s+/).filter((w) => w.length > 0);
      if (words.length >= 2) {
        const firstWord = words[0];
        const lastWord = words[words.length - 1];
        orConditions.push({
          AND: [
            { firstName: { contains: firstWord, mode: 'insensitive' } },
            { lastName: { contains: lastWord, mode: 'insensitive' } },
          ],
        });
      }
      where.OR = orConditions;
    }

    const statusFilter = query.status?.trim();
    if (statusFilter) {
      if (isRuntimeExpiredListStatusFilter(statusFilter)) {
        const expiredInvitesSentBefore = new Date(
          Date.now() - APP_USER_INVITE_PENDING_EXPIRY_MS,
        );
        this.appendListWhereAndClauses(where, [
          { status: { equals: APP_USER_STATUS.PENDING, mode: 'insensitive' } },
          { invitationSentAt: { lt: expiredInvitesSentBefore } },
        ]);
      } else if (isRuntimePendingListStatusFilter(statusFilter)) {
        const expiredInvitesSentBefore = new Date(
          Date.now() - APP_USER_INVITE_PENDING_EXPIRY_MS,
        );
        this.appendListWhereAndClauses(where, [
          { status: { equals: APP_USER_STATUS.PENDING, mode: 'insensitive' } },
          {
            OR: [
              { invitationSentAt: null },
              { invitationSentAt: { gte: expiredInvitesSentBefore } },
            ],
          },
        ]);
      } else {
        where.status = {
          equals: statusFilter,
          mode: 'insensitive',
        };
      }
    }

    if (query.categoryId) {
      where.role = {
        categoryId: query.categoryId,
      };
    }

    const corporationIds = query.corporationIds?.filter(Boolean);
    const companyIds = query.companyIds?.filter(Boolean);

    if (adminListScope) {
      let scopedBranch: Prisma.AppUserWhereInput;

      if (adminListScope.corporationId) {
        scopedBranch = { corporationId: adminListScope.corporationId };
        if (companyIds?.length) {
          scopedBranch = {
            AND: [
              { corporationId: adminListScope.corporationId },
              {
                companyAccess: {
                  some: {
                    companyId: { in: companyIds },
                    company: { deletedAt: null },
                  },
                },
              },
            ],
          };
        }
      } else if (adminListScope.companyIds?.length) {
        scopedBranch = {
          companyAccess: {
            some: {
              companyId: { in: adminListScope.companyIds },
              company: { deletedAt: null },
            },
          },
        };
      } else {
        scopedBranch = {};
      }

      if (adminListScope.includeAssessmentOnlyUsers) {
        this.appendListWhereAndClauses(where, [
          {
            OR: [
              { inviteType: APP_USER_INVITE_TYPE.ASSESSMENT_ONLY },
              scopedBranch,
            ],
          },
        ]);
      } else {
        this.appendListWhereAndClauses(where, [scopedBranch]);
      }
    } else {
      if (corporationIds?.length) {
        where.corporationId = { in: corporationIds };
      }

      if (companyIds?.length) {
        where.companyAccess = {
          some: {
            companyId: { in: companyIds },
            company: { deletedAt: null },
          },
        };
      }
    }

    const timezones = query.timezones?.filter((tz) => tz.length > 0);
    if (timezones?.length) {
      where.timezone = { in: timezones };
    }

    this.appendListSuperAdminExclusion(where);
    this.appendListIndividualUserExclusion(where);
    return where;
  }

  /**
   * Merges clauses into `where.AND` without replacing existing entries (e.g. status filters).
   */
  private appendListWhereAndClauses(
    where: Prisma.AppUserWhereInput,
    clauses: Prisma.AppUserWhereInput[],
  ): void {
    const existing = where.AND;
    if (existing === undefined) {
      where.AND = clauses;
      return;
    }
    where.AND = Array.isArray(existing)
      ? [...existing, ...clauses]
      : [existing, ...clauses];
  }

  /**
   * Excludes `user_type` super_admin while keeping rows with null `user_type`.
   * Prisma `NOT { equals }` drops NULLs in SQL; explicit OR matches {@link buildSqlWhereFragments}.
   */
  private appendListSuperAdminExclusion(where: Prisma.AppUserWhereInput): void {
    this.appendListWhereAndClauses(where, [
      {
        OR: [
          { userType: null },
          {
            userType: {
              not: SUPER_ADMIN_APP_USER_TYPE,
            },
          },
        ],
      },
    ]);
  }

  /**
   * Excludes Super Admin individual assessment invites (`user_type` individual).
   */
  private appendListIndividualUserExclusion(
    where: Prisma.AppUserWhereInput,
  ): void {
    this.appendListWhereAndClauses(where, [
      {
        OR: [
          { userType: null },
          {
            userType: {
              not: INDIVIDUAL_APP_USER_TYPE,
            },
          },
        ],
      },
    ]);
  }

  /**
   * SQL `WHERE` fragments for alias `app_users au`, kept in sync with {@link buildPrismaWhere}
   * (including `status=Expired` / `status=Pending` runtime rules) for raw queries (e.g. company-name sort).
   */
  private buildSqlWhereFragments(
    query: ListAppUsersQueryDto,
    adminListScope?: AppUserAdminListScope,
    excludeCognitoSub?: string,
  ): Prisma.Sql[] {
    const fragments: Prisma.Sql[] = [
      Prisma.sql`au.deleted_at IS NULL`,
      Prisma.sql`au.email IS NOT NULL`,
      Prisma.sql`(au.user_type IS NULL OR LOWER(au.user_type) <> LOWER(${SUPER_ADMIN_APP_USER_TYPE}))`,
      Prisma.sql`(au.user_type IS NULL OR LOWER(au.user_type) <> LOWER(${INDIVIDUAL_APP_USER_TYPE}))`,
    ];

    const requesterSub = excludeCognitoSub?.trim();
    if (requesterSub) {
      fragments.push(Prisma.sql`au.cognito_sub <> ${requesterSub}`);
    }

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      const pattern = `%${searchTerm}%`;
      const orParts: Prisma.Sql[] = [
        Prisma.sql`au.first_name ILIKE ${pattern}`,
        Prisma.sql`au.last_name ILIKE ${pattern}`,
        Prisma.sql`au.email ILIKE ${pattern}`,
      ];
      const words = searchTerm.split(/\s+/).filter((w) => w.length > 0);
      if (words.length >= 2) {
        const fp = `%${words[0]}%`;
        const lp = `%${words[words.length - 1]}%`;
        orParts.push(
          Prisma.sql`(au.first_name ILIKE ${fp} AND au.last_name ILIKE ${lp})`,
        );
      }
      fragments.push(Prisma.sql`(${Prisma.join(orParts, ' OR ')})`);
    }

    const statusFilter = query.status?.trim();
    if (statusFilter) {
      if (isRuntimeExpiredListStatusFilter(statusFilter)) {
        const expiredInvitesSentBefore = new Date(
          Date.now() - APP_USER_INVITE_PENDING_EXPIRY_MS,
        );
        fragments.push(
          Prisma.sql`LOWER(au.status) = 'pending' AND au.invitation_sent_at IS NOT NULL AND au.invitation_sent_at < ${expiredInvitesSentBefore}`,
        );
      } else if (isRuntimePendingListStatusFilter(statusFilter)) {
        const expiredInvitesSentBefore = new Date(
          Date.now() - APP_USER_INVITE_PENDING_EXPIRY_MS,
        );
        fragments.push(
          Prisma.sql`LOWER(au.status) = 'pending' AND (au.invitation_sent_at IS NULL OR au.invitation_sent_at >= ${expiredInvitesSentBefore})`,
        );
      } else {
        fragments.push(Prisma.sql`LOWER(au.status) = LOWER(${statusFilter})`);
      }
    }

    if (query.categoryId) {
      fragments.push(
        Prisma.sql`au.role_id IN (SELECT r.id FROM roles r WHERE r.category_id = ${query.categoryId})`,
      );
    }

    const corporationIds = query.corporationIds?.filter(Boolean);
    const companyIds = query.companyIds?.filter(Boolean);

    if (adminListScope) {
      const assessmentOnlySql = Prisma.sql`LOWER(au.invite_type) = LOWER(${APP_USER_INVITE_TYPE.ASSESSMENT_ONLY})`;

      if (adminListScope.corporationId) {
        const scopedParts: Prisma.Sql[] = [
          Prisma.sql`au.corporation_id = ${adminListScope.corporationId}`,
        ];
        if (companyIds?.length) {
          scopedParts.push(
            Prisma.sql`EXISTS (
              SELECT 1 FROM user_company_access uca
              INNER JOIN corporation_companies cc ON cc.id = uca.company_id AND cc.deleted_at IS NULL
              WHERE uca.user_id = au.cognito_sub
              AND uca.company_id IN (${Prisma.join(companyIds)})
            )`,
          );
        }
        if (adminListScope.includeAssessmentOnlyUsers) {
          fragments.push(
            Prisma.sql`(${assessmentOnlySql} OR (${Prisma.join(scopedParts, ' AND ')}))`,
          );
        } else {
          fragments.push(Prisma.join(scopedParts, ' AND '));
        }
      } else if (adminListScope.companyIds?.length) {
        const scopedSql = Prisma.sql`EXISTS (
          SELECT 1 FROM user_company_access uca
          INNER JOIN corporation_companies cc ON cc.id = uca.company_id AND cc.deleted_at IS NULL
          WHERE uca.user_id = au.cognito_sub
          AND uca.company_id IN (${Prisma.join(adminListScope.companyIds)})
        )`;
        if (adminListScope.includeAssessmentOnlyUsers) {
          fragments.push(Prisma.sql`(${assessmentOnlySql} OR ${scopedSql})`);
        } else {
          fragments.push(scopedSql);
        }
      }
    } else {
      if (corporationIds?.length) {
        fragments.push(
          Prisma.sql`au.corporation_id IN (${Prisma.join(corporationIds)})`,
        );
      }

      if (companyIds?.length) {
        fragments.push(
          Prisma.sql`EXISTS (
          SELECT 1 FROM user_company_access uca
          INNER JOIN corporation_companies cc ON cc.id = uca.company_id AND cc.deleted_at IS NULL
          WHERE uca.user_id = au.cognito_sub
          AND uca.company_id IN (${Prisma.join(companyIds)})
        )`,
        );
      }
    }

    const timezones = query.timezones?.filter((tz) => tz.length > 0);
    if (timezones?.length) {
      fragments.push(Prisma.sql`au.timezone IN (${Prisma.join(timezones)})`);
    }

    return fragments;
  }

  /**
   * Maps list `sortBy` / `sortOrder` to Prisma `orderBy` for `appUser.findMany`.
   * `companyName` is not handled here (see {@link fetchSubsOrderedByCompanyName}); the `companyName` branch falls back to `userCode` asc as a safe default if misrouted.
   */
  private buildOrderBy(
    sortBy: AppUserListSortBy,
    sortOrder: AppUserListSortOrder,
  ):
    | Prisma.AppUserOrderByWithRelationInput
    | Prisma.AppUserOrderByWithRelationInput[] {
    const dir = sortOrder;
    switch (sortBy) {
      case 'userCode':
        return { userCode: dir };
      case 'name':
        return [{ firstName: dir }, { lastName: dir }];
      case 'status':
        return { status: dir };
      case 'corporationName':
        return { corporation: { legalName: dir } };
      case 'roleName':
        return { role: { name: dir } };
      case 'categoryName':
        return { role: { category: { name: dir } } };
      case 'timezone':
        return { timezone: dir };
      case 'createdAt':
        return { createdAt: dir };
      case 'companyName':
      default:
        return { userCode: 'asc' };
    }
  }

  /**
   * Returns `cognito_sub` values for the current page, ordered by the legal name of the earliest
   * non-deleted `user_company_access` company (same rule as the list payload), using raw SQL because Prisma cannot express that sort on `AppUser` directly.
   */
  private async fetchSubsOrderedByCompanyName(
    query: ListAppUsersQueryDto,
    skip: number,
    limit: number,
    sortOrder: AppUserListSortOrder,
    adminListScope?: AppUserAdminListScope,
    excludeCognitoSub?: string,
  ): Promise<string[]> {
    const fragments = this.buildSqlWhereFragments(
      query,
      adminListScope,
      excludeCognitoSub,
    );
    const whereClause = Prisma.join(fragments, ' AND ');
    const orderDir = sortOrder === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    const rows = await this.prisma.$queryRaw<{ cognito_sub: string }[]>`
      SELECT au.cognito_sub
      FROM app_users au
      LEFT JOIN LATERAL (
        SELECT cc.legal_name AS company_sort_name
        FROM user_company_access uca
        INNER JOIN corporation_companies cc ON cc.id = uca.company_id AND cc.deleted_at IS NULL
        WHERE uca.user_id = au.cognito_sub
        ORDER BY uca.created_at ASC
        LIMIT 1
      ) fc ON true
      WHERE ${whereClause}
      ORDER BY fc.company_sort_name ${orderDir} NULLS LAST, au.user_code ASC
      LIMIT ${limit} OFFSET ${skip}
    `;
    return rows.map((r) => r.cognito_sub);
  }

  /** Shapes selected DB rows into the API list item DTO (dates formatted, nested company summary). */
  private mapUserRows(users: AppUserListRow[]) {
    return users.map((u) => ({
      cognitoSub: u.cognitoSub,
      userCode: u.userCode,
      roleId: u.roleId ?? null,
      inviteType: u.inviteType ?? null,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      email: u.email ?? null,
      status: resolveAppUserDetailDisplayStatus(u.status, u.invitationSentAt),
      corporationName: u.corporation?.legalName ?? null,
      corporationCode: u.corporation?.corporationCode ?? null,
      roleName: u.role?.name ?? null,
      categoryId: u.role?.category?.id ?? null,
      categoryName: u.role?.category?.name ?? null,
      workPhone: u.workPhone ?? null,
      timezone: u.timezone ?? null,
      createdAt: formatDateShort(u.createdAt),
      company: u.companyAccess[0]
        ? {
            companyName: u.companyAccess[0].company.legalName,
            region:
              u.companyAccess[0].company.corporation?.dataResidencyRegion ??
              null,
          }
        : null,
    }));
  }

  /**
   * Authorizes GET `/users` then delegates to {@link findAllPaginated}.
   * The authenticated caller is always excluded from results.
   * **SuperAdmin:** full list. **CorporationAdmin:** users under their linked corporation plus
   * Assessment Only users (not tied to a corporation). **CompanyAdmin:** users with access to
   * their admin companies plus Assessment Only users. **Others:** {@link ForbiddenException}.
   */
  async findAllPaginatedForRequester(
    query: ListAppUsersQueryDto,
    cognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const requesterSub = cognitoSub.trim();
    const groupSet = new Set(groups ?? []);
    if (groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      return this.findAllPaginated(query, undefined, requesterSub);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN)) {
      return this.findAllPaginatedForCorpAdmin(query, requesterSub);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN)) {
      return this.findAllPaginatedForCompanyAdmin(query, requesterSub);
    }
    throw new ForbiddenException(APP_USERS_LIST_FORBIDDEN_MSG);
  }

  /**
   * Paginated app_users list (non-deleted users only; excludes `user_type` super_admin and individual,
   * and optionally `excludeCognitoSub`). Includes corporation, role/category, and at most one company
   * (earliest user_company_access) with a non-deleted company. Sorting uses {@link buildOrderBy} except for
   * `sortBy=companyName`, which uses {@link fetchSubsOrderedByCompanyName}. Each item's `status`
   * may be runtime `Expired` when DB status is Pending and the invite send time is past the
   * pending-invite window (same rule as {@link findByCognitoSub}).
   */
  async findAllPaginated(
    query: ListAppUsersQueryDto,
    adminListScope?: AppUserAdminListScope,
    excludeCognitoSub?: string,
  ): Promise<ApiResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'userCode';
    const sortOrder = query.sortOrder ?? 'asc';

    const where = this.buildPrismaWhere(
      query,
      adminListScope,
      excludeCognitoSub,
    );

    try {
      const total = await this.prisma.appUser.count({ where });

      let users: AppUserListRow[];

      if (sortBy === 'companyName') {
        const orderedSubs = await this.fetchSubsOrderedByCompanyName(
          query,
          skip,
          limit,
          sortOrder,
          adminListScope,
          excludeCognitoSub,
        );
        if (orderedSubs.length === 0) {
          users = [];
        } else {
          const fetched = await this.prisma.appUser.findMany({
            where: { ...where, cognitoSub: { in: orderedSubs } },
            select: appUserListSelect,
          });
          const orderMap = new Map(orderedSubs.map((id, index) => [id, index]));
          users = [...fetched].sort(
            (a, b) =>
              (orderMap.get(a.cognitoSub) ?? 0) -
              (orderMap.get(b.cognitoSub) ?? 0),
          );
        }
      } else {
        users = await this.prisma.appUser.findMany({
          where,
          skip,
          take: limit,
          orderBy: this.buildOrderBy(sortBy, sortOrder),
          select: appUserListSelect,
        });
      }

      const totalPages = Math.ceil(total / limit);
      const items = this.mapUserRows(users);

      return ResponseHelper.success(APP_USERS_LIST_FETCHED_SUCCESS_MSG, {
        items,
        pagination: {
          total,
          page,
          pageSize: limit,
          totalPages,
        },
      });
    } catch (error) {
      this.logger.error(APP_USERS_LIST_FETCH_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(APP_USERS_LIST_FAILED_MSG);
    }
  }

  /**
   * CorporationAdmin list path: resolves the caller's linked corporation, rejects
   * `corporationIds` / `companyIds` outside that corporation, then delegates to
   * {@link findAllPaginated} scoped to that corporation plus all Assessment Only users.
   *
   * @throws {ForbiddenException} When no corporation is linked or filters target another corp.
   */
  private async findAllPaginatedForCorpAdmin(
    query: ListAppUsersQueryDto,
    cognitoSub: string,
  ): Promise<ApiResponse> {
    const myCorporationId =
      await this.resolveCorporationIdForCorpAdminCognitoSub(cognitoSub);
    if (!myCorporationId) {
      throw new ForbiddenException(COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG);
    }

    const requestedCorpIds = query.corporationIds?.filter(Boolean);
    if (
      requestedCorpIds?.length &&
      requestedCorpIds.some((id) => id !== myCorporationId)
    ) {
      throw new ForbiddenException(APP_USERS_LIST_CORP_ADMIN_WRONG_CORP_MSG);
    }

    const requestedCompanyIds = query.companyIds?.filter(Boolean);
    if (requestedCompanyIds?.length) {
      const companies = await this.prisma.corporationCompany.findMany({
        where: {
          id: { in: requestedCompanyIds },
          deletedAt: null,
        },
        select: { corporationId: true },
      });
      if (
        companies.length !== requestedCompanyIds.length ||
        companies.some((c) => c.corporationId !== myCorporationId)
      ) {
        throw new ForbiddenException(APP_USERS_LIST_CORP_ADMIN_WRONG_CORP_MSG);
      }
    }

    return this.findAllPaginated(
      query,
      {
        corporationId: myCorporationId,
        includeAssessmentOnlyUsers: true,
      },
      cognitoSub,
    );
  }

  /**
   * CompanyAdmin list path: resolves admin `user_company_access` company ids, rejects
   * out-of-scope `companyIds` / `corporationIds`, then delegates to {@link findAllPaginated}
   * scoped to those companies plus all Assessment Only users.
   *
   * @throws {ForbiddenException} When the caller has no admin companies or filters are out of scope.
   */
  private async findAllPaginatedForCompanyAdmin(
    query: ListAppUsersQueryDto,
    cognitoSub: string,
  ): Promise<ApiResponse> {
    const myCompanyIds =
      await this.resolveCompanyIdsForCompanyAdminCognitoSub(cognitoSub);
    if (myCompanyIds.length === 0) {
      throw new ForbiddenException(APP_USERS_LIST_COMPANY_ADMIN_UNASSIGNED_MSG);
    }

    const requestedCompanyIds = query.companyIds?.filter(Boolean);
    let scopedCompanyIds = myCompanyIds;
    if (requestedCompanyIds?.length) {
      const invalid = requestedCompanyIds.filter(
        (id) => !myCompanyIds.includes(id),
      );
      if (invalid.length > 0) {
        throw new ForbiddenException(
          APP_USERS_LIST_COMPANY_ADMIN_WRONG_COMPANY_MSG,
        );
      }
      scopedCompanyIds = requestedCompanyIds;
    }

    const requestedCorpIds = query.corporationIds?.filter(Boolean);
    if (requestedCorpIds?.length) {
      const companies = await this.prisma.corporationCompany.findMany({
        where: {
          id: { in: scopedCompanyIds },
          deletedAt: null,
        },
        select: { corporationId: true },
      });
      const allowedCorpIds = [
        ...new Set(
          companies
            .map((c) => c.corporationId)
            .filter((id): id is string => id != null),
        ),
      ];
      if (requestedCorpIds.some((id) => !allowedCorpIds.includes(id))) {
        throw new ForbiddenException(
          APP_USERS_LIST_COMPANY_ADMIN_WRONG_CORP_MSG,
        );
      }
    }

    return this.findAllPaginated(
      query,
      {
        companyIds: scopedCompanyIds,
        includeAssessmentOnlyUsers: true,
      },
      cognitoSub,
    );
  }

  /**
   * Corporation id for a Cognito user provisioned as corporation admin
   * (`app_users.user_type` contains corp_admin, not deleted).
   */
  private async resolveCorporationIdForCorpAdminCognitoSub(
    cognitoSub: string,
  ): Promise<string | null> {
    const row = await this.prisma.appUser.findFirst({
      where: {
        cognitoSub,
        corporationId: { not: null },
        deletedAt: null,
        userType: {
          contains: CORPORATION_ADMIN_APP_USER_TYPE,
          mode: 'insensitive',
        },
      },
      select: { corporationId: true },
    });
    return row?.corporationId ?? null;
  }

  /**
   * Company ids where the Cognito user has admin `user_company_access` on a non-deleted company.
   * Returns an empty array when none qualify (caller should treat that as unassigned).
   */
  private async resolveCompanyIdsForCompanyAdminCognitoSub(
    cognitoSub: string,
  ): Promise<string[]> {
    const rows = await this.prisma.userCompanyAccess.findMany({
      where: {
        userId: cognitoSub,
        isAdmin: true,
        company: { deletedAt: null },
      },
      select: { companyId: true },
    });
    return rows.map((r) => r.companyId);
  }

  /**
   * Authorizes GET `/users/:cognitoSub` then delegates to {@link findByCognitoSub}.
   * **SuperAdmin:** any non-deleted user. **CorporationAdmin** / **CompanyAdmin:** same list scope as
   * GET `/users` and {@link setBlockedStatusForRequester}. **Others:** {@link ForbiddenException}.
   */
  async findByCognitoSubForRequester(
    cognitoSub: string,
    requesterCognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const groupSet = new Set(groups ?? []);
    if (groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      return this.findByCognitoSub(cognitoSub);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN)) {
      await this.assertTargetUserInCorpAdminListScope(
        cognitoSub,
        requesterCognitoSub.trim(),
      );
      return this.findByCognitoSub(cognitoSub);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN)) {
      await this.assertTargetUserInCompanyAdminListScope(
        cognitoSub,
        requesterCognitoSub.trim(),
      );
      return this.findByCognitoSub(cognitoSub);
    }
    throw new ForbiddenException(APP_USER_VIEW_FORBIDDEN_MSG);
  }

  /**
   * Single app user for the admin "view user" screen: basic profile, corporation,
   * earliest linked company, role, category (name and `categoryId` from `roles`), and
   * `inviteType` (maps to `app_users.invite_type`; no team fields). Soft-deleted users return 404.
   * When DB status is Pending, `status` in the response may be runtime `Expired` if the invite
   * was last sent more than {@link APP_USER_INVITE_PENDING_EXPIRY_DAYS} days ago; the row is not updated.
   * Call via {@link findByCognitoSubForRequester} for role-scoped access.
   */
  async findByCognitoSub(cognitoSub: string): Promise<ApiResponse> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    try {
      const user = await this.prisma.appUser.findFirst({
        where: { cognitoSub: trimmedSub, deletedAt: null },
        select: appUserDetailSelect,
      });

      if (!user) {
        throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
      }

      const corp = user.corporation;
      const companyRow = user.companyAccess[0]?.company;

      return ResponseHelper.success(APP_USER_VIEW_FETCHED_SUCCESS_MSG, {
        cognitoSub: user.cognitoSub,
        userCode: user.userCode,
        status: resolveAppUserDetailDisplayStatus(
          user.status,
          user.invitationSentAt,
        ),
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        nickname: user.nickname?.trim() || null,
        email: user.email ?? null,
        workPhone: user.workPhone ?? null,
        cellPhone: user.cellPhone ?? null,
        timezone: user.timezone ?? null,
        createdOn: formatDateShort(user.createdAt),
        corporation:
          corp != null
            ? {
                legalName: corp.legalName,
                corporationCode: corp.corporationCode,
              }
            : null,
        company:
          companyRow != null
            ? {
                legalName: companyRow.legalName,
              }
            : null,
        category: user.role?.category?.name ?? null,
        roleName: user.role?.name?.trim() ?? null,
        roleId: user.roleId ?? null,
        categoryId: user.role?.categoryId ?? null,
        inviteType: user.inviteType ?? null,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(APP_USER_VIEW_FETCH_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(APP_USER_VIEW_FAILED_MSG);
    }
  }

  /**
   * Autocomplete endpoint for the chatbot `@mention` UI.
   *
   * Returns up to 10 active, non-admin peers who share at least one company
   * with the authenticated user. Results are ordered by first name, last name,
   * then user code. Supports an optional `query` param for partial-name search
   * (case-insensitive, matches first name, last name, nickname, job role, or email).
   */
  async listPeerMentions(
    cognitoSub: string,
    query: ListPeerMentionsQueryDto,
  ): Promise<ApiResponse> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    try {
      const peers = await this.fetchPeersForRequester(trimmedSub, {
        query: query.query,
        limit: 10,
      });

      return ResponseHelper.success(
        APP_USER_PEER_MENTIONS_FETCHED_SUCCESS_MSG,
        {
          peers: peers.map((peer) => ({
            id: peer.cognitoSub,
            type: 'person',
            displayName: buildPeerDisplayName(peer),
            email: peer.email?.trim() || null,
            jobRole: peer.jobRole?.trim() || null,
          })),
        },
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(APP_USER_PEER_MENTIONS_FETCH_FAILED_MSG, error);
      throw new InternalServerErrorException(
        APP_USER_PEER_MENTIONS_FETCH_FAILED_MSG,
      );
    }
  }

  /**
   * Dashboard Peers Snapshot: active, non-admin peers who share at least one
   * company with the authenticated user and have a latest `report_generated`
   * assessment with an overall BSP style.
   *
   * Monthly-plan only (enforced by {@link MonthlyPlanGuard} on the controller).
   * Supports optional `query` for case-insensitive name/email search.
   */
  async getMyPeerSnapshot(
    cognitoSub: string,
    query: ListPeerMentionsQueryDto,
  ): Promise<ApiResponse> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    try {
      const [allPeers, filteredPeers] = await Promise.all([
        this.fetchPeersForRequester(trimmedSub, { includeAvatar: true }),
        this.fetchPeersForRequester(trimmedSub, {
          query: query.query,
          includeAvatar: true,
        }),
      ]);

      const peerIds = [
        ...new Set([
          ...allPeers.map((peer) => peer.cognitoSub),
          ...filteredPeers.map((peer) => peer.cognitoSub),
        ]),
      ];
      const assessments =
        await this.fetchLatestPeerSnapshotAssessments(peerIds);

      const buildSnapshotPeer = (peer: PeerMentionProfile) => {
        const overallStyle = (
          assessments.get(peer.cognitoSub)?.assessmentScore?.styles ?? []
        ).find((style) => style.context === 'overall')?.bspStyle;

        if (!overallStyle) {
          return null;
        }

        return {
          id: peer.cognitoSub,
          email: peer.email?.trim() || null,
          firstName: peer.firstName?.trim() || null,
          lastName: peer.lastName?.trim() || null,
          avatar: this.resolveAvatarPublicUrl(peer.avatar ?? null),
          styleNumber: overallStyle.styleNumber,
          styleTitle: overallStyle.title?.trim() || null,
          styleDescription: truncateToFirstStatement(overallStyle.description),
        };
      };

      const eligiblePeers = allPeers
        .map((peer) => buildSnapshotPeer(peer))
        .filter((peer): peer is NonNullable<typeof peer> => peer != null);
      const eligibleFilteredPeers = filteredPeers
        .map((peer) => buildSnapshotPeer(peer))
        .filter((peer): peer is NonNullable<typeof peer> => peer != null);

      return ResponseHelper.success(PEER_SNAPSHOT_FETCHED_SUCCESS_MSG, {
        totalCount: eligiblePeers.length,
        peers: eligibleFilteredPeers,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(PEER_SNAPSHOT_FETCH_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(PEER_SNAPSHOT_FETCH_FAILED_MSG);
    }
  }

  /**
   * Resolves a list of peer IDs into compact BSP behavioral summaries for
   * chatbot context injection.
   *
   * Re-validates each requested ID against the requester's company access so
   * peers who were removed or had their access revoked since autocomplete are
   * silently excluded. The response includes a `degradedCount` indicating how
   * many requested IDs could not be resolved, allowing the chatbot to inform
   * the LLM that some mentions are unavailable.
   */
  async resolvePeerMentions(
    cognitoSub: string,
    body: ResolvePeerMentionsDto,
  ): Promise<ApiResponse> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    try {
      const requestedPeerIds = uniqueNonEmptyPeerIds(body.peerIds ?? []);
      const peers = await this.fetchPeersForRequester(trimmedSub, {
        peerIds: requestedPeerIds,
      });
      const peerById = new Map(peers.map((peer) => [peer.cognitoSub, peer]));
      const orderedPeers = requestedPeerIds
        .map((id) => peerById.get(id))
        .filter((peer): peer is PeerMentionProfile => Boolean(peer));
      const assessments = await this.fetchLatestPeerAssessments(
        orderedPeers.map((peer) => peer.cognitoSub),
      );

      return ResponseHelper.success(
        APP_USER_PEER_MENTIONS_RESOLVED_SUCCESS_MSG,
        {
          peers: orderedPeers.map((peer) =>
            this.buildPeerBehaviorSummary(
              peer,
              assessments.get(peer.cognitoSub),
            ),
          ),
          degradedCount: Math.max(
            0,
            requestedPeerIds.length - orderedPeers.length,
          ),
        },
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(APP_USER_PEER_MENTIONS_RESOLVE_FAILED_MSG, error);
      throw new InternalServerErrorException(
        APP_USER_PEER_MENTIONS_RESOLVE_FAILED_MSG,
      );
    }
  }

  /**
   * Compact BSP + role context for the authenticated user's chatbot session.
   *
   * The Nest backend owns authorization and data shaping. Raw assessment scores
   * never leave this service — the chatbot receives the same privacy-safe summary
   * shape used for peer @mentions, plus role metadata for tone adaptation.
   */
  async getMyChatbotPersonalizationContext(
    cognitoSub: string,
  ): Promise<ApiResponse> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    try {
      const user = (await this.prisma.appUser.findFirst({
        where: { cognitoSub: trimmedSub, deletedAt: null },
        select: {
          cognitoSub: true,
          firstName: true,
          lastName: true,
          nickname: true,
          jobRole: true,
          userType: true,
          role: { select: { name: true } },
        },
      })) as (PeerMentionProfile & { userType: string | null }) | null;

      if (!user) {
        throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
      }

      const assessments = await this.fetchLatestPeerAssessments([trimmedSub]);
      const summary = this.buildPeerBehaviorSummary(
        user,
        assessments.get(trimmedSub),
      );

      return ResponseHelper.success(
        APP_USER_CHATBOT_PERSONALIZATION_FETCHED_SUCCESS_MSG,
        {
          ...summary,
          roleName: user.role?.name?.trim() || null,
          userType: user.userType?.trim() || null,
        },
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        APP_USER_CHATBOT_PERSONALIZATION_FETCH_ERROR_LOG_MSG,
        error,
      );
      throw new InternalServerErrorException(
        APP_USER_CHATBOT_PERSONALIZATION_FETCH_FAILED_MSG,
      );
    }
  }

  /**
   * Profile payload for the authenticated user.
   * Returns a compact shape for the web app with onboarding progress and tenancy fields,
   * including `corporationId` from `app_users` and `companyId` from the earliest
   * `user_company_access` row on a non-deleted company (aligned with `companyName`),
   * and `jobRole` from `app_users.job_role`.
   */
  async getMyProfile(
    cognitoSub: string,
    groups: string[] = [],
  ): Promise<ApiResponse> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    try {
      type AppUserSelfProfileRow = {
        cognitoSub: string;
        corporationId: string | null;
        email: string | null;
        userCode: number;
        status: string;
        firstName: string | null;
        lastName: string | null;
        nickname: string | null;
        jobRole: string | null;
        avatar: string | null;
        workPhone: string | null;
        cellPhone: string | null;
        timezone: string | null;
        professionalTitle: string | null;
        yearsOfExperience: number | null;
        bio: string | null;
        userType: string | null;
        inviteType: string | null;
        invitationSentAt: Date | null;
        completedOnboardingSteps?: number | null;
        corporation: { legalName: string } | null;
        role: { name: string; category: { name: string } | null } | null;
        companyAccess: { companyId: string; company: { legalName: string } }[];
      };

      const user = (await this.prisma.appUser.findFirst({
        where: { cognitoSub: trimmedSub, deletedAt: null },
        select: {
          cognitoSub: true,
          corporationId: true,
          email: true,
          userCode: true,
          status: true,
          firstName: true,
          lastName: true,
          nickname: true,
          jobRole: true,
          avatar: true,
          workPhone: true,
          cellPhone: true,
          timezone: true,
          professionalTitle: true,
          yearsOfExperience: true,
          bio: true,
          userType: true,
          inviteType: true,
          invitationSentAt: true,
          completedOnboardingSteps: true,
          corporation: {
            select: { legalName: true },
          },
          role: {
            select: {
              name: true,
              category: {
                select: { name: true },
              },
            },
          },
          companyAccess: {
            where: {
              company: { deletedAt: null },
            },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: {
              companyId: true,
              company: {
                select: {
                  legalName: true,
                },
              },
            },
          },
        } as unknown as Prisma.AppUserSelect,
      })) as AppUserSelfProfileRow | null;

      if (!user) {
        throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
      }

      const assessmentCompletionCount = await this.prisma.assessment.count({
        where: {
          userId: trimmedSub,
          status: AssessmentStatus.report_generated,
        },
      });

      const firstAccess = user.companyAccess[0];
      const companyName = firstAccess?.company?.legalName ?? null;
      const companyId = firstAccess?.companyId ?? null;

      // Load subscription context for the user's primary company
      let subscriptionStatus: string | null = null;
      let planTypeId: string | null = null;
      if (companyId) {
        const companyRow = await this.prisma.corporationCompany.findFirst({
          where: { id: companyId, deletedAt: null },
          select: {
            subscriptionStatus: true,
            plan: { select: { planTypeId: true } },
          },
        });
        subscriptionStatus =
          companyRow?.subscriptionStatus?.toLowerCase() ?? null;
        planTypeId = companyRow?.plan?.planTypeId ?? null;
      }

      const authorization = await this.rbacAccess.resolveForUser(
        trimmedSub,
        groups,
      );

      return ResponseHelper.success(APP_USER_SELF_PROFILE_FETCHED_SUCCESS_MSG, {
        cognitoSub: user.cognitoSub,
        corporationId: user.corporationId ?? null,
        companyId,
        email: user.email?.trim() ?? null,
        userCode: user.userCode,
        status: resolveAppUserDetailDisplayStatus(
          user.status,
          user.invitationSentAt,
        ),
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        nickname: user.nickname?.trim() || null,
        jobRole: user.jobRole?.trim() || null,
        avatar: this.resolveAvatarPublicUrl(user.avatar),
        workPhone: user.workPhone ?? null,
        cellPhone: user.cellPhone ?? null,
        timezone: user.timezone ?? null,
        professionalTitle: user.professionalTitle?.trim() || null,
        yearsOfExperience: user.yearsOfExperience ?? null,
        bio: user.bio?.trim() || null,
        completedOnboardingSteps: user.completedOnboardingSteps ?? 0,
        assessmentCompletionCount,
        corporation: user.corporation?.legalName ?? null,
        companyName,
        roleName: user.role?.name?.trim() ?? null,
        category: user.role?.category?.name ?? null,
        userType: user.userType ?? null,
        inviteType: user.inviteType ?? null,
        subscriptionStatus,
        planTypeId,
        submodules: authorization.submodules,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(APP_USER_SELF_PROFILE_FETCH_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(
        APP_USER_SELF_PROFILE_FETCH_FAILED_MSG,
      );
    }
  }

  /**
   * Returns subscription status and plan type for the authenticated user's primary company.
   * Always succeeds (returns nulls when no company is assigned).
   * Used by the frontend to enforce plan-level feature gating without a full profile reload.
   */
  async getMySubscriptionAccess(cognitoSub: string): Promise<ApiResponse> {
    const access = await this.subscriptionAccess.resolveForUser(cognitoSub);
    return ResponseHelper.success('Subscription access context loaded', access);
  }

  /**
   * Updates nickname, work phone, cell phone, and timezone for the authenticated non-deleted app user.
   * When a non-deleted `app_key_contacts` row exists with `app_user_id` = this user,
   * mirrors the same four fields on that contact row.
   */
  async updateMyProfile(
    cognitoSub: string,
    dto: UpdateMyProfileDto,
  ): Promise<ApiResponse> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    const providedKeys = (
      [
        'nickname',
        'workPhone',
        'cellPhone',
        'timezone',
        'professionalTitle',
        'yearsOfExperience',
        'bio',
      ] as const
    ).filter((k) => dto[k] !== undefined);
    if (providedKeys.length === 0) {
      throw new BadRequestException(APP_USER_UPDATE_EMPTY_BODY_MSG);
    }

    const trimToNull = (v: string): string | null => {
      const t = v.trim();
      return t.length === 0 ? null : t;
    };

    const data: Prisma.AppUserUpdateInput = {};
    if (dto.nickname !== undefined) {
      data.nickname = trimToNull(dto.nickname);
    }
    if (dto.workPhone !== undefined) {
      data.workPhone = trimToNull(dto.workPhone);
    }
    if (dto.cellPhone !== undefined) {
      data.cellPhone = trimToNull(dto.cellPhone);
    }
    if (dto.timezone !== undefined) {
      data.timezone = trimToNull(dto.timezone);
    }
    if (dto.professionalTitle !== undefined) {
      data.professionalTitle = trimToNull(dto.professionalTitle);
    }
    if (dto.yearsOfExperience !== undefined) {
      data.yearsOfExperience = dto.yearsOfExperience;
    }
    if (dto.bio !== undefined) {
      data.bio = trimToNull(dto.bio);
    }

    try {
      const existing = await this.prisma.appUser.findFirst({
        where: { cognitoSub: trimmedSub, deletedAt: null },
        select: { cognitoSub: true },
      });

      if (!existing) {
        throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        const user = await tx.appUser.update({
          where: { cognitoSub: trimmedSub },
          data,
          select: {
            cognitoSub: true,
            nickname: true,
            workPhone: true,
            cellPhone: true,
            timezone: true,
            professionalTitle: true,
            yearsOfExperience: true,
            bio: true,
          },
        });

        const keyContact = await tx.appKeyContact.findFirst({
          where: { appUserId: trimmedSub, deletedAt: null },
          select: { id: true },
        });

        if (keyContact) {
          await tx.appKeyContact.update({
            where: { id: keyContact.id },
            data: {
              nickname: user.nickname,
              workPhone: user.workPhone,
              cellPhone: user.cellPhone,
              timezone: user.timezone,
            },
          });
        }

        return user;
      });

      return ResponseHelper.success(APP_USER_SELF_PROFILE_UPDATED_MSG, {
        cognitoSub: updated.cognitoSub,
        nickname: updated.nickname?.trim() || null,
        workPhone: updated.workPhone ?? null,
        cellPhone: updated.cellPhone ?? null,
        timezone: updated.timezone ?? null,
        professionalTitle: updated.professionalTitle?.trim() || null,
        yearsOfExperience: updated.yearsOfExperience ?? null,
        bio: updated.bio?.trim() || null,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(APP_USER_SELF_PROFILE_UPDATE_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(
        APP_USER_SELF_PROFILE_UPDATE_FAILED_MSG,
      );
    }
  }

  /**
   * Uploads an avatar for the authenticated non-deleted app user.
   * Accepts PNG or JPG up to 10 MB. Replaces any existing avatar in S3 and DB.
   *
   * @param cognitoSub - Cognito `sub` for the current user
   * @param file - Uploaded multipart file
   * @returns Success response with public `avatar` URL
   */
  async uploadMyAvatar(
    cognitoSub: string,
    file: Express.Multer.File,
  ): Promise<ApiResponse<{ avatar: string }>> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    if (!file?.buffer) {
      throw new BadRequestException(APP_USER_AVATAR_FILE_REQUIRED_MSG);
    }

    const mimetype = file.mimetype?.toLowerCase();
    if (
      !APP_USER_AVATAR_ALLOWED_MIMES.includes(
        mimetype as (typeof APP_USER_AVATAR_ALLOWED_MIMES)[number],
      )
    ) {
      throw new BadRequestException(APP_USER_AVATAR_INVALID_TYPE_MSG);
    }

    if (file.size > APP_USER_AVATAR_MAX_SIZE_BYTES) {
      throw new BadRequestException(
        APP_USER_AVATAR_MAX_SIZE_MSG(
          APP_USER_AVATAR_MAX_SIZE_BYTES / (1024 * 1024),
        ),
      );
    }

    try {
      const existing = await this.prisma.appUser.findFirst({
        where: { cognitoSub: trimmedSub, deletedAt: null },
        select: { cognitoSub: true, avatar: true },
      });

      if (!existing) {
        throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
      }

      const existingFilename = existing.avatar?.trim();
      if (existingFilename) {
        const existingKey = existingFilename.startsWith(
          this.s3Service.getUserAvatarsPrefix(),
        )
          ? existingFilename
          : this.s3Service.buildUserAvatarKey(existingFilename);
        const exists = await this.s3Service.objectExists(existingKey);
        if (exists) {
          try {
            await this.s3Service.delete(existingKey);
          } catch (err) {
            this.logger.warn(
              `Failed to delete existing avatar from S3 (key: ${existingKey}): ${err instanceof Error ? err.message : err}`,
            );
          }
        }
      }

      const ext = APP_USER_AVATAR_EXTENSION_BY_MIME[mimetype] ?? 'png';
      const uniqueFilename = `${crypto.randomUUID()}.${ext}`;
      const key = this.s3Service.buildUserAvatarKey(uniqueFilename);

      await this.s3Service.upload(key, file.buffer, mimetype);

      await this.prisma.appUser.update({
        where: { cognitoSub: trimmedSub },
        data: { avatar: uniqueFilename },
      });

      this.logger.log(
        `Avatar uploaded for app user ${trimmedSub}: ${uniqueFilename}`,
      );

      const avatarUrl = this.s3Service.getPublicUrl(key);
      return ResponseHelper.success(APP_USER_AVATAR_UPLOADED_SUCCESS_MSG, {
        avatar: avatarUrl,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(APP_USER_AVATAR_UPLOAD_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(APP_USER_AVATAR_UPLOAD_FAILED_MSG);
    }
  }

  /**
   * Deletes the avatar for the authenticated non-deleted app user.
   * Removes the file from S3 when present and clears `app_users.avatar`.
   * Idempotent when no avatar is stored.
   *
   * @param cognitoSub - Cognito `sub` for the current user
   */
  async deleteMyAvatar(cognitoSub: string): Promise<ApiResponse<void>> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    try {
      const existing = await this.prisma.appUser.findFirst({
        where: { cognitoSub: trimmedSub, deletedAt: null },
        select: { cognitoSub: true, avatar: true },
      });

      if (!existing) {
        throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
      }

      const existingFilename = existing.avatar?.trim();
      if (existingFilename) {
        const existingKey = existingFilename.startsWith(
          this.s3Service.getUserAvatarsPrefix(),
        )
          ? existingFilename
          : this.s3Service.buildUserAvatarKey(existingFilename);
        const exists = await this.s3Service.objectExists(existingKey);
        if (exists) {
          try {
            await this.s3Service.delete(existingKey);
          } catch (err) {
            this.logger.warn(
              `Failed to delete avatar from S3 (key: ${existingKey}): ${err instanceof Error ? err.message : err}`,
            );
          }
        }
      }

      await this.prisma.appUser.update({
        where: { cognitoSub: trimmedSub },
        data: { avatar: null },
      });

      this.logger.log(`Avatar deleted for app user ${trimmedSub}`);

      return ResponseHelper.success(APP_USER_AVATAR_DELETED_SUCCESS_MSG);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(APP_USER_AVATAR_DELETE_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(APP_USER_AVATAR_DELETE_FAILED_MSG);
    }
  }

  /**
   * Resolves a stored avatar filename or key to its public URL.
   */
  private resolveAvatarPublicUrl(
    stored: string | null | undefined,
  ): string | null {
    const trimmed = stored?.trim();
    if (!trimmed) {
      return null;
    }
    const key = trimmed.startsWith(this.s3Service.getUserAvatarsPrefix())
      ? trimmed
      : this.s3Service.buildUserAvatarKey(trimmed);
    return this.s3Service.getPublicUrl(key);
  }

  /**
   * Minimal tenant context for client analytics (PostHog group keys). No PII.
   */
  async getAnalyticsContextForSelf(cognitoSub: string): Promise<ApiResponse> {
    const trimmedSub = cognitoSub?.trim();
    const emptyPayload = {
      corporationId: null as string | null,
      companyIds: [] as string[],
      primaryCompanyId: null as string | null,
      inviteType: null as string | null,
      isB2cAssessmentOnly: false,
    };

    if (!trimmedSub) {
      return ResponseHelper.success(
        USER_ANALYTICS_CONTEXT_SUCCESS_MSG,
        emptyPayload,
      );
    }

    try {
      const user = await this.prisma.appUser.findFirst({
        where: { cognitoSub: trimmedSub, deletedAt: null },
        select: {
          corporationId: true,
          inviteType: true,
          companyAccess: {
            where: { company: { deletedAt: null } },
            orderBy: { createdAt: 'asc' },
            select: { companyId: true },
          },
        },
      });

      if (!user) {
        return ResponseHelper.success(
          USER_ANALYTICS_CONTEXT_SUCCESS_MSG,
          emptyPayload,
        );
      }

      const companyIds = user.companyAccess.map((a) => a.companyId);
      const primaryCompanyId = companyIds[0] ?? null;
      const inviteType = user.inviteType ?? null;
      const isB2cAssessmentOnly =
        inviteType === APP_USER_INVITE_TYPE.ASSESSMENT_ONLY;

      return ResponseHelper.success(USER_ANALYTICS_CONTEXT_SUCCESS_MSG, {
        corporationId: user.corporationId,
        companyIds,
        primaryCompanyId,
        inviteType,
        isB2cAssessmentOnly,
      });
    } catch (error) {
      this.logger.error('getAnalyticsContextForSelf failed', error);
      throw new InternalServerErrorException(
        APP_USER_ANALYTICS_CONTEXT_FAILED_MSG,
      );
    }
  }

  /**
   * Updates onboarding progress for the authenticated app user.
   * `consent` maps to step 1 and `intro_video` maps to step 2.
   */
  async updateMyOnboardingStep(
    cognitoSub: string,
    dto: UpdateMyOnboardingStepDto,
  ): Promise<ApiResponse> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    const stepNumber = APP_USER_ONBOARDING_STEP_BY_TYPE[dto.type];

    try {
      const existing = await this.prisma.appUser.findFirst({
        where: { cognitoSub: trimmedSub, deletedAt: null },
        select: {
          cognitoSub: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!existing) {
        throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
      }

      const updated = await this.prisma.appUser.update({
        where: { cognitoSub: trimmedSub },
        data: {
          completedOnboardingSteps: stepNumber,
        } as unknown as Prisma.AppUserUncheckedUpdateInput,
        select: { cognitoSub: true },
      });

      if (dto.type === APP_USER_ONBOARDING_STEP_TYPE.CONSENT) {
        await this.sendOnboardingConsentWelcomeEmail(existing);
      }

      return ResponseHelper.success(APP_USER_ONBOARDING_STEP_UPDATED_MSG, {
        cognitoSub: updated.cognitoSub,
        completedOnboardingSteps: stepNumber,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(APP_USER_ONBOARDING_STEP_UPDATE_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(
        APP_USER_ONBOARDING_STEP_UPDATE_FAILED_MSG,
      );
    }
  }

  /**
   * Sends the onboarding consent completion email to the authenticated user.
   * This is best-effort and does not fail the onboarding-step update flow.
   */
  private async sendOnboardingConsentWelcomeEmail(existing: {
    cognitoSub: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  }): Promise<void> {
    const to = existing.email?.trim().toLowerCase();
    if (!to) {
      this.logger.error(
        `${APP_USER_ONBOARDING_CONSENT_EMAIL_SEND_FAILED_LOG_MSG}: missing recipient email (cognitoSub=${existing.cognitoSub})`,
      );
      return;
    }

    const employeeDisplayName =
      `${existing.firstName ?? ''} ${existing.lastName ?? ''}`.trim();
    const supportEmail = this.config
      .get<string>('SUPPORT_CONTACT_EMAIL')
      ?.trim();
    if (!supportEmail) {
      this.logger.error(
        `${APP_USER_ONBOARDING_CONSENT_EMAIL_SEND_FAILED_LOG_MSG}: SUPPORT_CONTACT_EMAIL is not configured`,
      );
      return;
    }
    const ok = await this.emailService.sendEmail({
      to,
      subject: APP_USER_ONBOARDING_CONSENT_EMAIL_SUBJECT,
      htmlBody: getOnboardingConsentCompleteEmailHtml({
        employeeDisplayName,
        supportEmail,
      }),
      textBody: getOnboardingConsentCompleteEmailText({
        employeeDisplayName,
        supportEmail,
      }),
    });

    if (!ok) {
      this.logger.error(
        `${APP_USER_ONBOARDING_CONSENT_EMAIL_SEND_FAILED_LOG_MSG} (cognitoSub=${existing.cognitoSub})`,
      );
    }
  }

  /**
   * Authorizes PATCH `/users/:cognitoSub` then delegates to {@link update}.
   * **SuperAdmin:** any non-deleted user. **CorporationAdmin:** only users under their linked
   * corporation (same scope as GET `/users`). **CompanyAdmin:** only users with access to
   * companies where they have admin `user_company_access`. **Others:** {@link ForbiddenException}.
   */
  async updateForRequester(
    cognitoSub: string,
    dto: UpdateAppUserDto,
    requesterCognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const groupSet = new Set(groups ?? []);
    if (groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      return this.update(cognitoSub, dto);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN)) {
      await this.assertTargetUserInCorpAdminListScope(
        cognitoSub,
        requesterCognitoSub.trim(),
      );
      return this.update(cognitoSub, dto);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN)) {
      await this.assertTargetUserInCompanyAdminListScope(
        cognitoSub,
        requesterCognitoSub.trim(),
      );
      return this.update(cognitoSub, dto);
    }
    throw new ForbiddenException(APP_USER_UPDATE_FORBIDDEN_MSG);
  }

  /**
   * Updates allowed profile and role fields for a non-deleted app user.
   * When `app_key_contacts` has a non-deleted row with `app_user_id` = this user,
   * mirrors firstName, lastName, nickname, workPhone, cellPhone, and timezone from the updated user.
   * Call via {@link updateForRequester} for role-scoped access.
   */
  async update(
    cognitoSub: string,
    dto: UpdateAppUserDto,
  ): Promise<ApiResponse> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    const providedKeys = (
      Object.keys(dto) as (keyof UpdateAppUserDto)[]
    ).filter((k) => dto[k] !== undefined);
    if (providedKeys.length === 0) {
      throw new BadRequestException(APP_USER_UPDATE_EMPTY_BODY_MSG);
    }

    const existing = await this.prisma.appUser.findFirst({
      where: { cognitoSub: trimmedSub, deletedAt: null },
      select: {
        cognitoSub: true,
        status: true,
        email: true,
        roleId: true,
        userType: true,
        inviteType: true,
        role: { select: { name: true } },
        corporation: { select: { status: true } },
        companyAccess: {
          where: { company: { deletedAt: null } },
          select: { company: { select: { status: true } } },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    if (
      existing.userType?.trim().toLowerCase() ===
      SUPER_ADMIN_APP_USER_TYPE.toLowerCase()
    ) {
      throw new BadRequestException(
        APP_USER_UPDATE_SUPER_ADMIN_NOT_ALLOWED_MSG,
      );
    }

    const isCorpOrCompanyAdminRoleName = (
      name: string | null | undefined,
    ): boolean => {
      const n = name?.trim();
      if (!n) {
        return false;
      }
      return n === CORPORATION_ADMIN_ROLE_NAME || n === COMPANY_ADMIN_ROLE_NAME;
    };

    const sameRoleId = (
      a: string | null | undefined,
      b: string | null | undefined,
    ): boolean => (a ?? null) === (b ?? null);

    if (dto.roleId !== undefined) {
      const currentRoleName = existing.role?.name?.trim() ?? null;

      if (isCorpOrCompanyAdminRoleName(currentRoleName)) {
        if (!sameRoleId(dto.roleId, existing.roleId)) {
          throw new BadRequestException(
            APP_USER_UPDATE_ROLE_CHANGE_NOT_ALLOWED_CORP_COMPANY_ADMIN_MSG,
          );
        }
      } else if (dto.roleId !== null) {
        const targetRole = await this.prisma.role.findUnique({
          where: { id: dto.roleId },
          select: { id: true, name: true },
        });
        if (!targetRole) {
          throw new BadRequestException(APP_USER_UPDATE_INVALID_ROLE_MSG);
        }
        if (isCorpOrCompanyAdminRoleName(targetRole.name)) {
          throw new BadRequestException(
            APP_USER_UPDATE_CANNOT_ASSIGN_CORP_COMPANY_ADMIN_MSG,
          );
        }
      }
    }

    const trimToNull = (v: string): string | null => {
      const t = v.trim();
      return t.length === 0 ? null : t;
    };

    const data: Prisma.AppUserUpdateInput = {};
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.firstName !== undefined) {
      data.firstName = trimToNull(dto.firstName);
    }
    if (dto.lastName !== undefined) {
      data.lastName = trimToNull(dto.lastName);
    }
    if (dto.nickname !== undefined) {
      data.nickname = trimToNull(dto.nickname);
    }
    if (dto.workPhone !== undefined) {
      data.workPhone = trimToNull(dto.workPhone);
    }
    if (dto.cellPhone !== undefined) {
      data.cellPhone = trimToNull(dto.cellPhone);
    }
    if (dto.timezone !== undefined) {
      data.timezone = trimToNull(dto.timezone);
    }
    if (dto.roleId !== undefined) {
      data.role =
        dto.roleId === null
          ? { disconnect: true }
          : { connect: { id: dto.roleId } };
    }

    const newStatus = dto.status !== undefined ? dto.status : existing.status;
    const statusChanging =
      dto.status !== undefined && dto.status !== existing.status;

    if (statusChanging && newStatus === APP_USER_STATUS.ACTIVE) {
      this.assertTargetUserOrgNotSuspended(
        existing.inviteType,
        existing.corporation?.status,
        existing.companyAccess.map((access) => access.company.status),
        APP_USER_UPDATE_ACTIVE_ORG_SUSPENDED_MSG,
      );
    }

    const cognitoUsername = existing.email?.trim().toLowerCase() ?? trimmedSub;

    if (statusChanging) {
      try {
        if (newStatus === APP_USER_STATUS.ACTIVE) {
          await setCognitoUserEnabled(
            this.cognitoClient,
            this.userPoolId,
            cognitoUsername,
            true,
            this.logger,
          );
        } else if (
          newStatus === APP_USER_STATUS.BLOCKED ||
          newStatus === APP_USER_STATUS.EXPIRED
        ) {
          await setCognitoUserEnabled(
            this.cognitoClient,
            this.userPoolId,
            cognitoUsername,
            false,
            this.logger,
          );
        }
      } catch (error) {
        this.logger.error(APP_USER_UPDATE_ERROR_LOG_MSG, error);
        throw new InternalServerErrorException(APP_USER_UPDATE_FAILED_MSG);
      }
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const user = await tx.appUser.update({
          where: { cognitoSub: trimmedSub },
          data,
          select: {
            cognitoSub: true,
            userCode: true,
            roleId: true,
            status: true,
            firstName: true,
            lastName: true,
            nickname: true,
            email: true,
            workPhone: true,
            cellPhone: true,
            timezone: true,
            createdAt: true,
            corporation: {
              select: {
                legalName: true,
                corporationCode: true,
              },
            },
            role: {
              select: {
                name: true,
                category: {
                  select: { name: true },
                },
              },
            },
            companyAccess: {
              where: {
                company: { deletedAt: null },
              },
              orderBy: { createdAt: 'asc' },
              take: 1,
              select: {
                company: {
                  select: {
                    legalName: true,
                  },
                },
              },
            },
          },
        });

        const keyContact = await tx.appKeyContact.findFirst({
          where: { appUserId: trimmedSub, deletedAt: null },
          select: { id: true },
        });

        if (keyContact) {
          await tx.appKeyContact.update({
            where: { id: keyContact.id },
            data: {
              firstName: user.firstName,
              lastName: user.lastName,
              nickname: user.nickname,
              workPhone: user.workPhone,
              cellPhone: user.cellPhone,
              timezone: user.timezone,
            },
          });
        }

        return user;
      });

      const corp = updated.corporation;
      const companyRow = updated.companyAccess[0]?.company;

      return ResponseHelper.success(APP_USER_UPDATED_MSG, {
        cognitoSub: updated.cognitoSub,
        userCode: updated.userCode,
        status: updated.status,
        firstName: updated.firstName ?? null,
        lastName: updated.lastName ?? null,
        nickname: updated.nickname?.trim() || null,
        email: updated.email ?? null,
        workPhone: updated.workPhone ?? null,
        cellPhone: updated.cellPhone ?? null,
        timezone: updated.timezone ?? null,
        createdOn: formatDateShort(updated.createdAt),
        corporation:
          corp != null
            ? {
                legalName: corp.legalName,
                corporationCode: corp.corporationCode,
              }
            : null,
        company:
          companyRow != null
            ? {
                legalName: companyRow.legalName,
              }
            : null,
        category: updated.role?.category?.name ?? null,
        roleName: updated.role?.name?.trim() ?? null,
        roleId: updated.roleId ?? null,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(APP_USER_UPDATE_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(APP_USER_UPDATE_FAILED_MSG);
    }
  }

  /**
   * Authorizes POST `/users/invite` then delegates to {@link inviteAppUser}.
   * **SuperAdmin:** any invite. **CorporationAdmin** / **CompanyAdmin:** for BSPBlueprint,
   * `corporationId` and `companyId` must stay within their scope; Assessment Only invites
   * skip corp/company scope. **Others:** {@link ForbiddenException}.
   */
  async inviteAppUserForRequester(
    dto: InviteAppUserDto,
    requesterCognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const groupSet = new Set(groups ?? []);
    if (groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      return this.inviteAppUser(dto);
    }
    if (
      groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN) ||
      groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN)
    ) {
      if (dto.inviteType === APP_USER_INVITE_TYPE.BSP_BLUEPRINT) {
        await this.assertInviteCorpCompanyScopeForRequester(
          {
            corporationId: dto.corporationId,
            companyId: dto.companyId,
          },
          requesterCognitoSub.trim(),
          groups,
          {
            corpAdminWrongCorp: APP_USER_INVITE_CORP_ADMIN_WRONG_CORP_MSG,
            companyAdminWrongCompany:
              APP_USER_INVITE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
            companyAdminWrongCorp: APP_USER_INVITE_COMPANY_ADMIN_WRONG_CORP_MSG,
          },
        );
      }
      return this.inviteAppUser(dto);
    }
    throw new ForbiddenException(APP_USER_INVITE_FORBIDDEN_MSG);
  }

  /**
   * When a CorporationAdmin or CompanyAdmin sends a BSPBlueprint invite with
   * `corporationId` and/or `companyId`, ensures those ids stay within their linked
   * corporation or admin companies.
   */
  private async assertInviteCorpCompanyScopeForRequester(
    scoped: { corporationId?: string; companyId?: string },
    requesterCognitoSub: string,
    groups: string[],
    forbiddenMessages: {
      corpAdminWrongCorp: string;
      companyAdminWrongCompany: string;
      companyAdminWrongCorp: string;
    },
  ): Promise<void> {
    if (!scoped.corporationId && !scoped.companyId) {
      return;
    }

    const groupSet = new Set(groups ?? []);
    if (groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      return;
    }

    const sub = requesterCognitoSub.trim();

    if (groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN)) {
      const myCorporationId =
        await this.resolveCorporationIdForCorpAdminCognitoSub(sub);
      if (!myCorporationId) {
        throw new ForbiddenException(COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG);
      }
      if (scoped.corporationId && scoped.corporationId !== myCorporationId) {
        throw new ForbiddenException(forbiddenMessages.corpAdminWrongCorp);
      }
      if (scoped.companyId) {
        const company = await this.prisma.corporationCompany.findFirst({
          where: { id: scoped.companyId, deletedAt: null },
          select: { corporationId: true },
        });
        if (!company || company.corporationId !== myCorporationId) {
          throw new ForbiddenException(forbiddenMessages.corpAdminWrongCorp);
        }
      }
      return;
    }

    if (groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN)) {
      const myCompanyIds =
        await this.resolveCompanyIdsForCompanyAdminCognitoSub(sub);
      if (myCompanyIds.length === 0) {
        throw new ForbiddenException(
          APP_USERS_LIST_COMPANY_ADMIN_UNASSIGNED_MSG,
        );
      }
      if (scoped.companyId && !myCompanyIds.includes(scoped.companyId)) {
        throw new ForbiddenException(
          forbiddenMessages.companyAdminWrongCompany,
        );
      }
      if (scoped.corporationId && !scoped.companyId) {
        return;
      }
      if (scoped.corporationId) {
        const companies = await this.prisma.corporationCompany.findMany({
          where: {
            id: { in: myCompanyIds },
            deletedAt: null,
          },
          select: { corporationId: true },
        });
        const allowedCorpIds = [
          ...new Set(
            companies
              .map((c) => c.corporationId)
              .filter((id): id is string => id != null),
          ),
        ];
        if (!allowedCorpIds.includes(scoped.corporationId)) {
          throw new ForbiddenException(forbiddenMessages.companyAdminWrongCorp);
        }
      }
    }
  }

  /**
   * Creates a Cognito user in the `User` pool group, persists `app_users` (and company access for
   * BSPBlueprint invites), and sends invitation email.
   */
  async inviteAppUser(dto: InviteAppUserDto): Promise<ApiResponse> {
    const emailNorm = dto.email.trim().toLowerCase();
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();

    const duplicate = await this.prisma.appUser.findFirst({
      where: { email: emailNorm, deletedAt: null },
      select: { cognitoSub: true },
    });
    if (duplicate) {
      throw new BadRequestException(APP_USER_INVITE_DUPLICATE_EMAIL_MSG);
    }

    let scopedCompanyId: string | undefined;
    let scopedCorporationId: string | undefined;
    let scopedRoleId: string | undefined;

    if (dto.inviteType === APP_USER_INVITE_TYPE.BSP_BLUEPRINT) {
      scopedCorporationId = dto.corporationId!;
      scopedCompanyId = dto.companyId!;
      scopedRoleId = dto.roleId!;

      const company = await this.prisma.corporationCompany.findFirst({
        where: {
          id: scopedCompanyId,
          corporationId: scopedCorporationId,
          deletedAt: null,
        },
        select: {
          id: true,
          planId: true,
          plan: { select: { employeeRangeMax: true } },
        },
      });

      if (!company) {
        throw new BadRequestException(APP_USER_INVITE_COMPANY_NOT_FOUND_MSG);
      }

      if (!company.planId || !company.plan) {
        throw new BadRequestException(APP_USER_INVITE_COMPANY_NO_PLAN_MSG);
      }

      const maxEmployees = company.plan.employeeRangeMax;
      if (maxEmployees != null) {
        const currentCount = await this.prisma.appUser.count({
          where: {
            deletedAt: null,
            companyAccess: { some: { companyId: company.id } },
          },
        });
        if (currentCount >= maxEmployees) {
          throw new BadRequestException(APP_USER_INVITE_PLAN_SEAT_EXCEEDED_MSG);
        }
      }

      const role = await this.prisma.role.findUnique({
        where: { id: scopedRoleId },
        select: { id: true, name: true },
      });
      if (!role) {
        throw new BadRequestException(
          APP_USER_INVITE_INVALID_END_USER_ROLE_MSG,
        );
      }
      const rn = role.name?.trim() ?? '';
      if (
        rn === CORPORATION_ADMIN_ROLE_NAME ||
        rn === COMPANY_ADMIN_ROLE_NAME
      ) {
        throw new BadRequestException(
          APP_USER_INVITE_INVALID_END_USER_ROLE_MSG,
        );
      }
    }

    const userGroupRow = await this.prisma.cognitoUserGroup.findUnique({
      where: { name: COGNITO_GROUP_NAMES.USER },
      select: { id: true },
    });
    if (!userGroupRow) {
      throw new InternalServerErrorException(
        `CognitoUserGroup "${COGNITO_GROUP_NAMES.USER}" is missing; apply migrations.`,
      );
    }

    const { temporaryPassword } = await provisionCognitoForAppUserInvite(
      this.cognitoClient,
      this.userPoolId,
      this.logger,
      emailNorm,
      COGNITO_GROUP_NAMES.USER,
    );

    let cognitoSub: string;
    try {
      cognitoSub = await getCognitoSubByUsername(
        this.cognitoClient,
        this.userPoolId,
        emailNorm,
        COGNITO_USER_SUB_NOT_RESOLVED_MESSAGE,
      );
    } catch (err) {
      await deleteCognitoUser(
        this.cognitoClient,
        this.userPoolId,
        emailNorm,
        this.logger,
      );
      throw err;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.appUser.create({
          data: {
            cognitoSub,
            email: emailNorm,
            firstName,
            lastName,
            nickname: dto.nickname?.trim() || undefined,
            workPhone: dto.workPhone.trim(),
            cellPhone: dto.cellPhone?.trim() || undefined,
            timezone: dto.timezone.trim(),
            inviteType: dto.inviteType,
            userType: dto.userType?.trim() || undefined,
            paymentStatus:
              dto.userType?.trim() === INDIVIDUAL_APP_USER_TYPE
                ? INDIVIDUAL_PAYMENT_STATUS.PENDING
                : undefined,
            pricingPlanId: dto.pricingPlanId ?? undefined,
            promoCodeId: dto.promoCodeId ?? undefined,
            status: APP_USER_STATUS.PENDING,
            corporationId: scopedCorporationId ?? undefined,
            roleId: scopedRoleId ?? undefined,
            invitationSentAt: new Date(),
          },
        });

        await tx.appUserGroupMembership.create({
          data: {
            userId: cognitoSub,
            groupId: userGroupRow.id,
          },
        });

        if (
          dto.inviteType === APP_USER_INVITE_TYPE.BSP_BLUEPRINT &&
          scopedCompanyId
        ) {
          await tx.userCompanyAccess.create({
            data: {
              userId: cognitoSub,
              companyId: scopedCompanyId,
              isAdmin: false,
            },
          });
        }
      });
    } catch (err) {
      await deleteCognitoUser(
        this.cognitoClient,
        this.userPoolId,
        emailNorm,
        this.logger,
      );
      throw err;
    }

    const sent = await sendAppUserInviteEmail(this.emailService, this.config, {
      toEmail: emailNorm,
      temporaryPassword,
      firstName,
      lastName,
    });

    if (!sent) {
      this.logger.error(
        `Failed to send user invite email to ${emailNorm} (cognitoSub=${cognitoSub})`,
      );
      throw new InternalServerErrorException(APP_USER_INVITE_EMAIL_FAILED_MSG);
    }

    captureUserInviteEmailSent(this.config, cognitoSub, {
      invite_source: 'users_invite',
      invite_type: dto.inviteType,
    });

    return ResponseHelper.success(APP_USER_INVITE_SUCCESS_MSG, {
      cognitoSub,
      email: emailNorm,
      inviteType: dto.inviteType,
    });
  }

  /**
   * Authorizes PATCH `/users/:cognitoSub/block` then delegates to {@link setBlockedStatus}.
   * **SuperAdmin:** any non-deleted user. **CorporationAdmin:** only users under their linked
   * corporation (same scope as GET `/users`). **CompanyAdmin:** only users with
   * `user_company_access` to companies where they are admin. **Others:** {@link ForbiddenException}.
   */
  async setBlockedStatusForRequester(
    cognitoSub: string,
    dto: SetAppUserBlockDto,
    requesterCognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const groupSet = new Set(groups ?? []);
    if (groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      return this.setBlockedStatus(cognitoSub, dto);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN)) {
      await this.assertTargetUserInCorpAdminListScope(
        cognitoSub,
        requesterCognitoSub.trim(),
      );
      return this.setBlockedStatus(cognitoSub, dto);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN)) {
      await this.assertTargetUserInCompanyAdminListScope(
        cognitoSub,
        requesterCognitoSub.trim(),
      );
      return this.setBlockedStatus(cognitoSub, dto);
    }
    throw new ForbiddenException(APP_USER_BLOCK_FORBIDDEN_MSG);
  }

  /**
   * CorporationAdmin scope: target `app_users.corporation_id` must match the caller's
   * linked corporation when the target's `invite_type` is BSPBlueprint (same rule as
   * {@link findAllPaginatedForCorpAdmin}). Assessment-only users skip this check.
   */
  private async assertTargetUserInCorpAdminListScope(
    targetCognitoSub: string,
    requesterCognitoSub: string,
  ): Promise<void> {
    const trimmedTargetSub = targetCognitoSub?.trim();
    if (!trimmedTargetSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    const target = await this.prisma.appUser.findFirst({
      where: { cognitoSub: trimmedTargetSub, deletedAt: null },
      select: { corporationId: true, inviteType: true },
    });
    if (!target) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }
    if (target.inviteType !== APP_USER_INVITE_TYPE.BSP_BLUEPRINT) {
      return;
    }

    const myCorporationId =
      await this.resolveCorporationIdForCorpAdminCognitoSub(
        requesterCognitoSub,
      );
    if (!myCorporationId) {
      throw new ForbiddenException(COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG);
    }
    if (target.corporationId !== myCorporationId) {
      throw new ForbiddenException(APP_USERS_LIST_CORP_ADMIN_WRONG_CORP_MSG);
    }
  }

  /**
   * CompanyAdmin scope: target must have admin-visible `user_company_access` on at least
   * one of the caller's admin companies when the target's `invite_type` is BSPBlueprint
   * (same rule as {@link findAllPaginatedForCompanyAdmin}). Assessment-only users skip this check.
   */
  private async assertTargetUserInCompanyAdminListScope(
    targetCognitoSub: string,
    requesterCognitoSub: string,
  ): Promise<void> {
    const trimmedTargetSub = targetCognitoSub?.trim();
    if (!trimmedTargetSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    const targetMeta = await this.prisma.appUser.findFirst({
      where: { cognitoSub: trimmedTargetSub, deletedAt: null },
      select: { cognitoSub: true, inviteType: true },
    });
    if (!targetMeta) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }
    if (targetMeta.inviteType !== APP_USER_INVITE_TYPE.BSP_BLUEPRINT) {
      return;
    }

    const myCompanyIds =
      await this.resolveCompanyIdsForCompanyAdminCognitoSub(
        requesterCognitoSub,
      );
    if (myCompanyIds.length === 0) {
      throw new ForbiddenException(APP_USERS_LIST_COMPANY_ADMIN_UNASSIGNED_MSG);
    }

    const target = await this.prisma.appUser.findFirst({
      where: {
        cognitoSub: trimmedTargetSub,
        deletedAt: null,
        companyAccess: {
          some: {
            companyId: { in: myCompanyIds },
            company: { deletedAt: null },
          },
        },
      },
      select: { cognitoSub: true },
    });
    if (!target) {
      throw new ForbiddenException(
        APP_USERS_LIST_COMPANY_ADMIN_WRONG_COMPANY_MSG,
      );
    }
  }

  /**
   * BSPBlueprint users cannot proceed while their linked corporation or any non-deleted
   * company they have access to is suspended or closed. Assessment-only users skip this check.
   */
  private assertTargetUserOrgNotSuspended(
    inviteType: string | null | undefined,
    corporationStatus: string | null | undefined,
    companyStatuses: Array<string | null | undefined>,
    message: string,
  ): void {
    if (inviteType !== APP_USER_INVITE_TYPE.BSP_BLUEPRINT) {
      return;
    }

    const normalizedCorpStatus = corporationStatus?.trim().toUpperCase();
    if (
      normalizedCorpStatus === CORPORATION_STATUS.SUSPENDED ||
      normalizedCorpStatus === CORPORATION_STATUS.CLOSED
    ) {
      throw new BadRequestException(message);
    }

    const hasBlockedCompany = companyStatuses.some((status) => {
      const normalized = status?.trim().toUpperCase();
      return (
        normalized === COMPANY_STATUS.SUSPENDED ||
        normalized === COMPANY_STATUS.CLOSED
      );
    });
    if (hasBlockedCompany) {
      throw new BadRequestException(message);
    }
  }

  /**
   * Sets app user status to Blocked or Active from a boolean flag.
   * Soft-deleted users are not updated and return 404. Call via {@link setBlockedStatusForRequester}
   * for role-scoped access.
   */
  async setBlockedStatus(
    cognitoSub: string,
    dto: SetAppUserBlockDto,
  ): Promise<ApiResponse> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    const existing = await this.prisma.appUser.findFirst({
      where: { cognitoSub: trimmedSub, deletedAt: null },
      select: {
        cognitoSub: true,
        email: true,
        userType: true,
        inviteType: true,
        corporation: { select: { status: true } },
        companyAccess: {
          where: { company: { deletedAt: null } },
          select: { company: { select: { status: true } } },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    if (
      existing.userType?.trim().toLowerCase() ===
      SUPER_ADMIN_APP_USER_TYPE.toLowerCase()
    ) {
      throw new BadRequestException(APP_USER_BLOCK_SUPER_ADMIN_NOT_ALLOWED_MSG);
    }

    this.assertTargetUserOrgNotSuspended(
      existing.inviteType,
      existing.corporation?.status,
      existing.companyAccess.map((access) => access.company.status),
      APP_USER_BLOCK_ORG_SUSPENDED_MSG,
    );

    const newStatus = dto.blocked
      ? APP_USER_STATUS.BLOCKED
      : APP_USER_STATUS.ACTIVE;
    const cognitoUsername = existing.email?.trim().toLowerCase() ?? trimmedSub;

    try {
      await setCognitoUserEnabled(
        this.cognitoClient,
        this.userPoolId,
        cognitoUsername,
        !dto.blocked,
        this.logger,
      );

      const updated = await this.prisma.appUser.update({
        where: { cognitoSub: trimmedSub },
        data: {
          status: newStatus,
          ...(dto.blocked ? { blockedCancelledOn: new Date() } : {}),
        },
        select: { cognitoSub: true, status: true },
      });

      return ResponseHelper.success(APP_USER_BLOCK_STATUS_UPDATED_MSG, {
        cognitoSub: updated.cognitoSub,
        status: updated.status,
      });
    } catch (error) {
      this.logger.error(APP_USER_BLOCK_STATUS_UPDATE_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(APP_USER_BLOCK_STATUS_FAILED_MSG);
    }
  }

  /**
   * Authorizes PATCH `/users/:cognitoSub/invitation/cancel` then delegates to {@link cancelInvitation}.
   * **SuperAdmin:** any non-deleted user. **CorporationAdmin** / **CompanyAdmin:** same list scope as
   * GET `/users` and {@link setBlockedStatusForRequester}. **Others:** {@link ForbiddenException}.
   */
  async cancelInvitationForRequester(
    cognitoSub: string,
    requesterCognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const groupSet = new Set(groups ?? []);
    if (groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      return this.cancelInvitation(cognitoSub);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN)) {
      await this.assertTargetUserInCorpAdminListScope(
        cognitoSub,
        requesterCognitoSub.trim(),
      );
      return this.cancelInvitation(cognitoSub);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN)) {
      await this.assertTargetUserInCompanyAdminListScope(
        cognitoSub,
        requesterCognitoSub.trim(),
      );
      return this.cancelInvitation(cognitoSub);
    }
    throw new ForbiddenException(APP_USER_INVITATION_CANCEL_FORBIDDEN_MSG);
  }

  /**
   * Marks a pending invitation as canceled by setting `app_users.status` to Cancelled.
   * Idempotent when status is already Cancelled. Soft-deleted users return 404; non-Pending (e.g. Expired) return 400.
   * Call via {@link cancelInvitationForRequester} for role-scoped access.
   */
  async cancelInvitation(cognitoSub: string): Promise<ApiResponse> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    const existing = await this.prisma.appUser.findFirst({
      where: { cognitoSub: trimmedSub, deletedAt: null },
      select: { cognitoSub: true, status: true, email: true },
    });

    if (!existing) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    if (existing.status === APP_USER_STATUS.CANCELLED) {
      return ResponseHelper.success(APP_USER_INVITATION_CANCELED_MSG, {
        cognitoSub: existing.cognitoSub,
        status: existing.status,
      });
    }

    if (existing.status !== APP_USER_STATUS.PENDING) {
      throw new BadRequestException(APP_USER_INVITATION_CANCEL_NOT_PENDING_MSG);
    }

    const cognitoUsername = existing.email?.trim().toLowerCase() ?? trimmedSub;

    try {
      await setCognitoUserEnabled(
        this.cognitoClient,
        this.userPoolId,
        cognitoUsername,
        false,
        this.logger,
      );

      const updated = await this.prisma.appUser.update({
        where: { cognitoSub: trimmedSub },
        data: {
          status: APP_USER_STATUS.CANCELLED,
          blockedCancelledOn: new Date(),
        },
        select: { cognitoSub: true, status: true },
      });

      return ResponseHelper.success(APP_USER_INVITATION_CANCELED_MSG, {
        cognitoSub: updated.cognitoSub,
        status: updated.status,
      });
    } catch (error) {
      this.logger.error(APP_USER_INVITATION_CANCEL_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(
        APP_USER_INVITATION_CANCEL_FAILED_MSG,
      );
    }
  }

  /**
   * Authorizes POST `/users/:cognitoSub/invitation/resend` then delegates to {@link resendInvitation}.
   * **SuperAdmin:** any non-deleted user. **CorporationAdmin** / **CompanyAdmin:** same list scope as
   * GET `/users` and {@link setBlockedStatusForRequester}. **Others:** {@link ForbiddenException}.
   */
  async resendInvitationForRequester(
    cognitoSub: string,
    requesterCognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const groupSet = new Set(groups ?? []);
    if (groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      return this.resendInvitation(cognitoSub);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN)) {
      await this.assertTargetUserInCorpAdminListScope(
        cognitoSub,
        requesterCognitoSub.trim(),
      );
      return this.resendInvitation(cognitoSub);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN)) {
      await this.assertTargetUserInCompanyAdminListScope(
        cognitoSub,
        requesterCognitoSub.trim(),
      );
      return this.resendInvitation(cognitoSub);
    }
    throw new ForbiddenException(APP_USER_INVITATION_RESEND_FORBIDDEN_MSG);
  }

  /**
   * Resends invitation email for an existing app user.
   * Allowed when stored status is Pending or Cancelled. (Expired is a runtime display
   * status, not written to the DB.) Cancelled users are re-enabled in Cognito and status
   * is set back to Pending on success. Does not create new user records.
   * Call via {@link resendInvitationForRequester} for role-scoped access.
   */
  async resendInvitation(cognitoSub: string): Promise<ApiResponse> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    const existing = await this.prisma.appUser.findFirst({
      where: { cognitoSub: trimmedSub, deletedAt: null },
      select: {
        cognitoSub: true,
        status: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    const canResend =
      existing.status === APP_USER_STATUS.PENDING ||
      existing.status === APP_USER_STATUS.CANCELLED;
    if (!canResend) {
      throw new BadRequestException(APP_USER_INVITATION_RESEND_NOT_PENDING_MSG);
    }

    const emailNorm = existing.email?.trim().toLowerCase();
    if (!emailNorm) {
      throw new BadRequestException(
        APP_USER_INVITATION_RESEND_EMAIL_MISSING_MSG,
      );
    }

    const cognitoUsername = emailNorm;

    try {
      if (existing.status === APP_USER_STATUS.CANCELLED) {
        await setCognitoUserEnabled(
          this.cognitoClient,
          this.userPoolId,
          cognitoUsername,
          true,
          this.logger,
        );
      }

      const temporaryPassword = await resolveInviteTemporaryPassword(
        this.cognitoClient,
        this.userPoolId,
        emailNorm,
      );

      const sent = await sendAppUserInviteEmail(
        this.emailService,
        this.config,
        {
          toEmail: emailNorm,
          temporaryPassword,
          firstName: existing.firstName?.trim() ?? '',
          lastName: existing.lastName?.trim() ?? '',
        },
      );

      if (!sent) {
        throw new InternalServerErrorException(
          APP_USER_INVITATION_RESEND_EMAIL_FAILED_MSG,
        );
      }

      const updated = await this.prisma.appUser.update({
        where: { cognitoSub: trimmedSub },
        data: {
          invitationSentAt: new Date(),
          ...(existing.status === APP_USER_STATUS.CANCELLED
            ? { status: APP_USER_STATUS.PENDING }
            : {}),
        },
        select: { status: true },
      });

      return ResponseHelper.success(APP_USER_INVITATION_RESENT_MSG, {
        cognitoSub: existing.cognitoSub,
        status: updated.status,
        email: emailNorm,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      this.logger.error(APP_USER_INVITATION_RESEND_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(
        APP_USER_INVITATION_RESEND_FAILED_MSG,
      );
    }
  }

  /**
   * Authorizes DELETE `/users/:cognitoSub` then delegates to {@link softDelete}.
   * **SuperAdmin:** any non-deleted user. **CorporationAdmin** / **CompanyAdmin:** same list scope as
   * GET `/users` and {@link setBlockedStatusForRequester}. **Others:** {@link ForbiddenException}.
   */
  async softDeleteForRequester(
    cognitoSub: string,
    requesterCognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const groupSet = new Set(groups ?? []);
    if (groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      return this.softDelete(cognitoSub);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN)) {
      await this.assertTargetUserInCorpAdminListScope(
        cognitoSub,
        requesterCognitoSub.trim(),
      );
      return this.softDelete(cognitoSub);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN)) {
      await this.assertTargetUserInCompanyAdminListScope(
        cognitoSub,
        requesterCognitoSub.trim(),
      );
      return this.softDelete(cognitoSub);
    }
    throw new ForbiddenException(APP_USER_SOFT_DELETE_FORBIDDEN_MSG);
  }

  /**
   * Soft-deletes an app user (`deleted_at`), removes `app_user_group_memberships` rows, and
   * removes the Cognito user from each mirrored pool group, then deletes the user from the Cognito
   * pool (pool username is normalized email). Cognito is updated before DB so a subsequent JWT
   * sync does not re-insert memberships. Idempotent for already-deleted users (404).
   * Call via {@link softDeleteForRequester} for role-scoped access.
   */
  async softDelete(cognitoSub: string): Promise<ApiResponse> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    const existing = await this.prisma.appUser.findFirst({
      where: { cognitoSub: trimmedSub, deletedAt: null },
      select: {
        cognitoSub: true,
        email: true,
        userType: true,
        role: { select: { name: true } },
        groupMemberships: {
          select: {
            group: { select: { name: true } },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(APP_USER_NOT_FOUND_MSG);
    }

    if (
      existing.userType?.trim().toLowerCase() ===
      SUPER_ADMIN_APP_USER_TYPE.toLowerCase()
    ) {
      throw new BadRequestException(
        APP_USER_SOFT_DELETE_SUPER_ADMIN_NOT_ALLOWED_MSG,
      );
    }

    const roleName = existing.role?.name?.trim() ?? '';
    if (
      roleName === CORPORATION_ADMIN_ROLE_NAME ||
      roleName === COMPANY_ADMIN_ROLE_NAME
    ) {
      throw new BadRequestException(
        APP_USER_SOFT_DELETE_CORP_COMPANY_ADMIN_NOT_ALLOWED_MSG,
      );
    }

    const groupNames = [
      ...new Set(
        existing.groupMemberships
          .map((m) => m.group.name?.trim())
          .filter((n): n is string => Boolean(n)),
      ),
    ];

    const cognitoUsername = existing.email?.trim().toLowerCase();

    if (cognitoUsername) {
      try {
        for (const groupName of groupNames) {
          await removeUserFromCognitoGroup(
            this.cognitoClient,
            this.userPoolId,
            cognitoUsername,
            groupName,
            this.logger,
          );
        }
        await deleteCognitoUser(
          this.cognitoClient,
          this.userPoolId,
          cognitoUsername,
          this.logger,
        );
      } catch (error) {
        this.logger.error(APP_USER_SOFT_DELETE_ERROR_LOG_MSG, error);
        throw new InternalServerErrorException(APP_USER_SOFT_DELETE_FAILED_MSG);
      }
    } else if (groupNames.length > 0) {
      this.logger.warn(
        `Soft-delete ${trimmedSub}: no email; skipping Cognito group removal and pool delete (${groupNames.length} groups in DB)`,
      );
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.appUserGroupMembership.deleteMany({
          where: { userId: trimmedSub },
        });
        await tx.appUser.update({
          where: { cognitoSub: trimmedSub },
          data: { deletedAt: new Date() },
          select: { cognitoSub: true },
        });
      });

      return ResponseHelper.success(APP_USER_SOFT_DELETED_MSG, {
        cognitoSub: trimmedSub,
      });
    } catch (error) {
      this.logger.error(APP_USER_SOFT_DELETE_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(APP_USER_SOFT_DELETE_FAILED_MSG);
    }
  }

  /**
   * Invites many app users in one request: resolves corporation, company, role category, and role
   * from display names (batched DB reads), then reuses {@link inviteAppUser} per row. Assessment
   * Only rows use bounded concurrency ({@link APP_USER_BULK_INVITE_ASSESSMENT_ONLY_CONCURRENCY}).
   * BSPBlueprint rows sharing a company run sequentially so plan seat checks stay correct. Rows that
   * fail validation or invite are reported without failing the whole request.
   */
  async bulkInviteAppUsers(
    dto: BulkInviteAppUsersDto,
    requester?: BulkInviteRequesterContext,
  ): Promise<
    ApiResponse<{
      succeeded: BulkInviteAppUserSucceededItem[];
      failed: BulkInviteAppUserFailedItem[];
    }>
  > {
    const users = dto.users;
    if (users.length > APP_USER_BULK_INVITE_MAX_USERS) {
      throw new BadRequestException(APP_USER_BULK_INVITE_MAX_ROWS_EXCEEDED_MSG);
    }
    const ctx = await this.buildBulkInviteNameResolutionContext(users);
    const failed: BulkInviteAppUserFailedItem[] = [];
    const ready: {
      rowIndex: number;
      inviteDto: InviteAppUserDto;
      emailNorm: string;
    }[] = [];
    const seenInFile = new Set<string>();

    for (let rowIndex = 0; rowIndex < users.length; rowIndex++) {
      const row = users[rowIndex];
      const emailNorm = row.email.trim().toLowerCase();
      const mapped = this.mapBulkInviteRowToInviteDto(row, ctx);
      if ('error' in mapped) {
        failed.push({ rowIndex, email: emailNorm, message: mapped.error });
        continue;
      }
      if (seenInFile.has(emailNorm)) {
        failed.push({
          rowIndex,
          email: emailNorm,
          message: APP_USER_BULK_INVITE_ROW_DUPLICATE_EMAIL_IN_FILE_MSG,
        });
        continue;
      }
      if (ctx.existingEmailsNormalized.has(emailNorm)) {
        failed.push({
          rowIndex,
          email: emailNorm,
          message: APP_USER_INVITE_DUPLICATE_EMAIL_MSG,
        });
        continue;
      }
      seenInFile.add(emailNorm);
      ready.push({
        rowIndex,
        inviteDto: mapped.dto,
        emailNorm,
      });
    }

    const succeeded: BulkInviteAppUserSucceededItem[] = [];
    const assessment: typeof ready = [];
    const byCompanyId = new Map<string, typeof ready>();

    for (const item of ready) {
      if (
        item.inviteDto.inviteType === APP_USER_INVITE_TYPE.BSP_BLUEPRINT &&
        item.inviteDto.companyId
      ) {
        const list = byCompanyId.get(item.inviteDto.companyId) ?? [];
        list.push(item);
        byCompanyId.set(item.inviteDto.companyId, list);
      } else {
        assessment.push(item);
      }
    }

    const companyChains = [...byCompanyId.values()].map((group) =>
      this.runBulkInviteSequential(group, succeeded, failed, requester),
    );

    await Promise.all([
      ...companyChains,
      this.runBulkInviteParallelAssessment(
        assessment,
        succeeded,
        failed,
        requester,
      ),
    ]);

    succeeded.sort((a, b) => a.rowIndex - b.rowIndex);
    failed.sort((a, b) => a.rowIndex - b.rowIndex);

    return ResponseHelper.success(APP_USER_BULK_INVITE_COMPLETED_MSG, {
      succeeded,
      failed,
    });
  }

  /**
   * Accepts a CSV upload, persists it as an `app_user_bulk_invite_jobs` row, returns immediately with
   * `jobId`, and schedules {@link executeBulkInviteJob} on the Node event loop (in-process; no
   * Redis). The client should poll {@link getBulkInviteJobForRequester} until `status` is
   * `completed` or `failed`.
   *
   * **SuperAdmin**, **CorporationAdmin**, and **CompanyAdmin** only; others receive
   * {@link ForbiddenException}.
   */
  async enqueueBulkInviteCsvJob(
    file: Express.Multer.File,
    requestedByCognitoSub: string,
    requesterEmail: string | null | undefined,
    groups: string[],
  ): Promise<ApiResponse<{ jobId: string }>> {
    this.assertSuperCorpCompanyAdminRequesterAllowed(
      groups,
      APP_USER_BULK_INVITE_JOB_FORBIDDEN_MSG,
    );

    if (!file?.buffer?.length) {
      throw new BadRequestException(APP_USER_BULK_CSV_MISSING_FILE_MSG);
    }
    if (file.buffer.length > APP_USER_BULK_CSV_MAX_BYTES) {
      throw new BadRequestException(APP_USER_BULK_CSV_SIZE_REJECT_MSG);
    }
    const csvBody = file.buffer.toString('utf-8');
    if (csvBody.length > APP_USER_BULK_CSV_MAX_BYTES) {
      throw new BadRequestException(APP_USER_BULK_CSV_SIZE_REJECT_MSG);
    }

    const job = await this.prisma.appUserBulkInviteJob.create({
      data: {
        status: APP_USER_BULK_INVITE_JOB_STATUS.PENDING,
        csvBody,
        originalFileName: file.originalname?.slice(0, 512) ?? null,
        requestedByCognitoSub: requestedByCognitoSub.trim(),
        requestedByEmail: requesterEmail?.trim() || null,
        resultJson: {
          _meta: { requesterGroups: groups ?? [] },
        } as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    const jobId = job.id;
    setImmediate(() => {
      void this.executeBulkInviteJob(jobId).catch((err: unknown) => {
        this.logger.error(APP_USER_BULK_INVITE_JOB_PROCESS_ERROR_LOG_MSG, err);
      });
    });

    return ResponseHelper.success(APP_USER_BULK_INVITE_JOB_ENQUEUED_MSG, {
      jobId,
    });
  }

  /**
   * Ensures the caller is SuperAdmin, CorporationAdmin, or CompanyAdmin.
   */
  private assertSuperCorpCompanyAdminRequesterAllowed(
    groups: string[],
    forbiddenMsg: string,
  ): void {
    const groupSet = new Set(groups ?? []);
    const isAdmin =
      groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN) ||
      groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN) ||
      groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN);
    if (!isAdmin) {
      throw new ForbiddenException(forbiddenMsg);
    }
  }

  /**
   * Returns one bulk-invite job by id. **SuperAdmin**, **CorporationAdmin**, and **CompanyAdmin**
   * may poll any job; other roles receive {@link ForbiddenException}.
   */
  async getBulkInviteJobForRequester(
    jobId: string,
    groups: string[],
  ): Promise<
    ApiResponse<{
      id: string;
      status: string;
      originalFileName: string | null;
      createdAt: string;
      updatedAt: string;
      startedAt: string | null;
      completedAt: string | null;
      result: {
        succeeded: BulkInviteAppUserSucceededItem[];
        failed: BulkInviteAppUserFailedItem[];
        message: string;
      } | null;
      errorMessage: string | null;
    }>
  > {
    this.assertSuperCorpCompanyAdminRequesterAllowed(
      groups,
      APP_USER_BULK_INVITE_JOB_FORBIDDEN_MSG,
    );

    const job = await this.prisma.appUserBulkInviteJob.findUnique({
      where: { id: jobId },
      select: appUserBulkInviteJobStatusSelect,
    });
    if (!job) {
      throw new NotFoundException(APP_USER_BULK_INVITE_JOB_NOT_FOUND_MSG);
    }

    const resultRaw = job.resultJson;
    const result =
      resultRaw !== null &&
      typeof resultRaw === 'object' &&
      !Array.isArray(resultRaw) &&
      'succeeded' in resultRaw &&
      'failed' in resultRaw &&
      'message' in resultRaw
        ? {
            succeeded: (
              resultRaw as unknown as {
                succeeded: BulkInviteAppUserSucceededItem[];
              }
            ).succeeded,
            failed: (
              resultRaw as unknown as {
                failed: BulkInviteAppUserFailedItem[];
              }
            ).failed,
            message: String(
              (resultRaw as unknown as { message: unknown }).message,
            ),
          }
        : null;

    return ResponseHelper.success(APP_USER_BULK_INVITE_JOB_FETCHED_MSG, {
      id: job.id,
      status: job.status,
      originalFileName: job.originalFileName,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      result,
      errorMessage: job.errorMessage,
    });
  }

  /**
   * Claims a pending job, parses CSV, runs {@link bulkInviteAppUsers}, and stores outcome or
   * failure on the job row.
   */
  private async executeBulkInviteJob(jobId: string): Promise<void> {
    const claim = await this.prisma.appUserBulkInviteJob.updateMany({
      where: {
        id: jobId,
        status: APP_USER_BULK_INVITE_JOB_STATUS.PENDING,
      },
      data: {
        status: APP_USER_BULK_INVITE_JOB_STATUS.PROCESSING,
        startedAt: new Date(),
      },
    });
    if (claim.count === 0) {
      return;
    }

    const job = await this.prisma.appUserBulkInviteJob.findUnique({
      where: { id: jobId },
      select: {
        csvBody: true,
        requestedByCognitoSub: true,
        resultJson: true,
      },
    });
    if (!job) {
      return;
    }

    try {
      const requesterGroups = await this.resolveBulkInviteRequesterGroups(
        job.requestedByCognitoSub,
        job.resultJson,
      );
      const { users, preFailed, sourceCsvLineByUserIndex } =
        this.parseBulkInviteCsvUtf8TextOrThrow(job.csvBody);
      const { succeeded, failed } = await this.runBulkInviteCsvAfterParse(
        users,
        preFailed,
        sourceCsvLineByUserIndex,
        {
          cognitoSub: job.requestedByCognitoSub,
          groups: requesterGroups,
        },
      );
      const resultPayload = {
        succeeded,
        failed,
        message: APP_USER_BULK_INVITE_COMPLETED_MSG,
      } as unknown as Prisma.InputJsonValue;
      await this.prisma.appUserBulkInviteJob.update({
        where: { id: jobId },
        data: {
          status: APP_USER_BULK_INVITE_JOB_STATUS.COMPLETED,
          completedAt: new Date(),
          resultJson: resultPayload,
          errorMessage: null,
        },
      });
    } catch (err) {
      const msg = this.formatBulkInviteJobFailureMessage(err);
      await this.prisma.appUserBulkInviteJob.update({
        where: { id: jobId },
        data: {
          status: APP_USER_BULK_INVITE_JOB_STATUS.FAILED,
          completedAt: new Date(),
          errorMessage: msg,
        },
      });
    }

    const finalized = await this.prisma.appUserBulkInviteJob.findUnique({
      where: { id: jobId },
    });
    if (
      finalized &&
      finalized.status === APP_USER_BULK_INVITE_JOB_STATUS.COMPLETED
    ) {
      try {
        await this.sendBulkInviteJobCompletionEmail(finalized);
      } catch (notifyErr) {
        this.logger.error(
          APP_USER_BULK_INVITE_COMPLETION_EMAIL_LOG_SEND_FAILED_MSG,
          notifyErr,
        );
      }
    }
  }

  /**
   * Resolves the Super Admin mailbox for the completion notice (JWT email or `app_users.email`).
   */
  private async resolveBulkInviteNotificationEmail(
    job: Pick<
      AppUserBulkInviteJob,
      'requestedByEmail' | 'requestedByCognitoSub'
    >,
  ): Promise<string | null> {
    const fromJwt = job.requestedByEmail?.trim();
    if (fromJwt) {
      return fromJwt;
    }
    const row = await this.prisma.appUser.findFirst({
      where: {
        cognitoSub: job.requestedByCognitoSub.trim(),
        deletedAt: null,
      },
      select: { email: true },
    });
    const fromDb = row?.email?.trim();
    return fromDb || null;
  }

  /**
   * Sends **one** email to the admin after the job is `completed` and every CSV row has been
   * processed: full success, partial success, or all rows failed. Error cases attach a single CSV of
   * failed rows (`row`, `email`, `message`). No email when `result_json` is missing or invalid.
   */
  private async sendBulkInviteJobCompletionEmail(
    job: AppUserBulkInviteJob,
  ): Promise<void> {
    if (job.status !== APP_USER_BULK_INVITE_JOB_STATUS.COMPLETED) {
      return;
    }

    const parsed = this.parseBulkInviteJobResultJson(job.resultJson);
    if (!parsed) {
      this.logger.warn(
        `${APP_USER_BULK_INVITE_COMPLETION_EMAIL_LOG_BAD_RESULT_MSG} (jobId=${job.id})`,
      );
      return;
    }

    const succeededCount = parsed.succeeded.length;
    const failedRows = parsed.failed;

    const to = await this.resolveBulkInviteNotificationEmail(job);
    if (!to) {
      this.logger.warn(
        `${APP_USER_BULK_INVITE_COMPLETION_EMAIL_LOG_NO_RECIPIENT_MSG} (jobId=${job.id})`,
      );
      return;
    }

    if (failedRows.length === 0) {
      await this.sendBulkInviteJobCompletionEmailFullSuccess(
        job.id,
        to,
        succeededCount,
      );
      return;
    }

    if (succeededCount > 0) {
      await this.sendBulkInviteJobCompletionEmailPartialSuccess(
        job.id,
        to,
        succeededCount,
        failedRows,
      );
      return;
    }

    await this.sendBulkInviteJobCompletionEmailAllFailed(
      job.id,
      to,
      failedRows,
    );
  }

  /**
   * Template 1: no failures; plain SES message (no attachment). “View employees” link uses
   * {@link getInvitePublicAppOrigin} (same base as invite/login links).
   */
  private async sendBulkInviteJobCompletionEmailFullSuccess(
    jobId: string,
    to: string,
    succeededCount: number,
  ): Promise<void> {
    const line1 = this.interpolateBulkInviteRecordCount(
      APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUCCESS_RECORDS_LINE,
      succeededCount,
    );
    const ctaUrl = getInvitePublicAppOrigin(this.config);

    const textBody = [
      line1,
      '',
      `${APP_USER_BULK_INVITE_COMPLETION_EMAIL_VIEW_EMPLOYEES_LABEL} ${ctaUrl}`,
      '',
      APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUPPORT_FOOTER,
    ].join('\n');

    const mainHtml = [
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333333;">${escapeHtmlForEmail(line1)}</p>`,
      `<p style="margin:0;font-size:15px;line-height:1.6;color:#333333;">${escapeHtmlForEmail(APP_USER_BULK_INVITE_COMPLETION_EMAIL_VIEW_EMPLOYEES_LABEL)} <a href="${escapeHtmlForEmail(ctaUrl)}" style="color:#1a73e8;word-break:break-all;">${escapeHtmlForEmail(ctaUrl)}</a></p>`,
    ].join('');
    const htmlBody = getBulkInviteJobCompletionEmailHtml({
      mainHtml,
    });

    const ok = await this.emailService.sendEmail({
      to,
      subject: APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUBJECT_SUCCESS,
      textBody,
      htmlBody,
    });
    if (!ok) {
      this.logger.error(
        `${APP_USER_BULK_INVITE_COMPLETION_EMAIL_LOG_SEND_FAILED_MSG} (jobId=${jobId})`,
      );
    }
  }

  /** Template 2: partial success + errors CSV attachment. */
  private async sendBulkInviteJobCompletionEmailPartialSuccess(
    jobId: string,
    to: string,
    succeededCount: number,
    failedRows: BulkInviteAppUserFailedItem[],
  ): Promise<void> {
    const countLine = this.interpolateBulkInviteRecordCount(
      APP_USER_BULK_INVITE_COMPLETION_EMAIL_PARTIAL_SUCCESS_COUNT_LINE,
      succeededCount,
    );
    const textBody = [
      APP_USER_BULK_INVITE_COMPLETION_EMAIL_PARTIAL_INTRO,
      '',
      countLine,
      '',
      APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUPPORT_FOOTER,
    ].join('\n');

    const mainHtml = [
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333333;">${escapeHtmlForEmail(APP_USER_BULK_INVITE_COMPLETION_EMAIL_PARTIAL_INTRO)}</p>`,
      `<p style="margin:0;font-size:15px;line-height:1.6;color:#333333;">${escapeHtmlForEmail(countLine)}</p>`,
    ].join('');
    const htmlBody = getBulkInviteJobCompletionEmailHtml({
      mainHtml,
    });

    const csvBuffer = buildBulkInviteFailedRowsCsvBuffer(failedRows);
    const ok = await this.emailService.sendEmailWithPdfAttachments({
      to,
      subject: APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUBJECT_WITH_ERRORS,
      textBody,
      htmlBody,
      attachments: [
        {
          filename: APP_USER_BULK_INVITE_ERRORS_CSV_FILENAME,
          content: csvBuffer,
          contentType: 'text/csv; charset=UTF-8',
        },
      ],
    });
    if (!ok) {
      this.logger.error(
        `${APP_USER_BULK_INVITE_COMPLETION_EMAIL_LOG_SEND_FAILED_MSG} (jobId=${jobId})`,
      );
    }
  }

  /** Template 3: every row failed; errors CSV attachment. */
  private async sendBulkInviteJobCompletionEmailAllFailed(
    jobId: string,
    to: string,
    failedRows: BulkInviteAppUserFailedItem[],
  ): Promise<void> {
    const textBody = [
      APP_USER_BULK_INVITE_COMPLETION_EMAIL_ALL_FAILED_INTRO,
      '',
      APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUPPORT_FOOTER,
    ].join('\n');

    const mainHtml = `<p style="margin:0;font-size:15px;line-height:1.6;color:#333333;">${escapeHtmlForEmail(APP_USER_BULK_INVITE_COMPLETION_EMAIL_ALL_FAILED_INTRO)}</p>`;
    const htmlBody = getBulkInviteJobCompletionEmailHtml({
      mainHtml,
    });

    const csvBuffer = buildBulkInviteFailedRowsCsvBuffer(failedRows);
    const ok = await this.emailService.sendEmailWithPdfAttachments({
      to,
      subject: APP_USER_BULK_INVITE_COMPLETION_EMAIL_SUBJECT_ALL_FAILED,
      textBody,
      htmlBody,
      attachments: [
        {
          filename: APP_USER_BULK_INVITE_ERRORS_CSV_FILENAME,
          content: csvBuffer,
          contentType: 'text/csv; charset=UTF-8',
        },
      ],
    });
    if (!ok) {
      this.logger.error(
        `${APP_USER_BULK_INVITE_COMPLETION_EMAIL_LOG_SEND_FAILED_MSG} (jobId=${jobId})`,
      );
    }
  }

  private interpolateBulkInviteRecordCount(
    template: string,
    recordCount: number,
  ): string {
    return template.replaceAll('{record_count}', String(recordCount));
  }

  /**
   * Reads `result_json` from a completed job into typed succeeded/failed arrays.
   */
  private parseBulkInviteJobResultJson(
    resultJson: AppUserBulkInviteJob['resultJson'],
  ): {
    succeeded: BulkInviteAppUserSucceededItem[];
    failed: BulkInviteAppUserFailedItem[];
  } | null {
    if (
      resultJson === null ||
      typeof resultJson !== 'object' ||
      Array.isArray(resultJson) ||
      !('succeeded' in resultJson) ||
      !('failed' in resultJson)
    ) {
      return null;
    }
    return {
      succeeded: (
        resultJson as unknown as {
          succeeded: BulkInviteAppUserSucceededItem[];
        }
      ).succeeded,
      failed: (
        resultJson as unknown as { failed: BulkInviteAppUserFailedItem[] }
      ).failed,
    };
  }

  /**
   * Parses bulk-invite CSV text and returns invite rows plus parse-phase failures (throws on
   * invalid file structure or headers).
   */
  private parseBulkInviteCsvUtf8TextOrThrow(text: string): {
    users: BulkInviteAppUserRowDto[];
    preFailed: BulkInviteAppUserFailedItem[];
    sourceCsvLineByUserIndex: number[];
  } {
    const { headers, dataRows } = parseAppUserBulkInviteCsvToRows(text);
    if (headers.length === 0) {
      throw new BadRequestException(APP_USER_BULK_CSV_EMPTY_MSG);
    }

    const headerIndex = buildAppUserBulkInviteHeaderIndex(headers);
    for (const h of APP_USER_BULK_CSV_REQUIRED_HEADER_KEYS) {
      if (!headerIndex.has(h)) {
        throw new BadRequestException(APP_USER_BULK_CSV_INVALID_HEADER_MSG);
      }
    }
    for (const h of APP_USER_BULK_CSV_OPTIONAL_HEADER_KEYS) {
      if (!headerIndex.has(h)) {
        headerIndex.set(h, -1);
      }
    }

    const getCell = (row: string[], key: string): string => {
      const idx = headerIndex.get(key);
      if (idx === undefined || idx < 0) {
        return '';
      }
      return (row[idx] ?? '').trim();
    };

    const preFailed: BulkInviteAppUserFailedItem[] = [];
    const users: BulkInviteAppUserRowDto[] = [];
    const sourceCsvLineByUserIndex: number[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const csvLineNumber = i + 2;
      const firstName = getCell(row, 'firstname');
      const lastName = getCell(row, 'lastname');
      const emailRaw = getCell(row, 'email');
      const workPhone = getCell(row, 'workphone');
      const timezone = getCell(row, 'timezone');
      const inviteTypeRaw = getCell(row, 'invitetype');
      const emailNorm = emailRaw.trim().toLowerCase();

      if (
        !firstName ||
        !lastName ||
        !emailRaw ||
        !workPhone ||
        !timezone ||
        !inviteTypeRaw
      ) {
        preFailed.push({
          rowIndex: csvLineNumber,
          email: emailNorm || emailRaw,
          message: APP_USER_BULK_CSV_ROW_REQUIRED_FIELD_MSG,
        });
        continue;
      }

      if (!isEmail(emailRaw)) {
        preFailed.push({
          rowIndex: csvLineNumber,
          email: emailRaw,
          message: APP_USER_BULK_CSV_ROW_INVALID_EMAIL_MSG,
        });
        continue;
      }

      const inviteType = parseAppUserInviteTypeFromCsvCell(inviteTypeRaw);
      if (!inviteType) {
        preFailed.push({
          rowIndex: csvLineNumber,
          email: emailNorm,
          message: APP_USER_BULK_CSV_INVALID_INVITE_TYPE_MSG,
        });
        continue;
      }

      const nickname = getCell(row, 'nickname');
      const cellPhone = getCell(row, 'cellphone');
      const corporationName = getCell(row, 'corporationname');
      const companyName = getCell(row, 'companyname');
      const roleName = getCell(row, 'rolename');
      const categoryName = getCell(row, 'categoryname');

      if (inviteType === APP_USER_INVITE_TYPE.BSP_BLUEPRINT) {
        if (!corporationName || !companyName || !roleName || !categoryName) {
          preFailed.push({
            rowIndex: csvLineNumber,
            email: emailNorm,
            message: APP_USER_BULK_CSV_ROW_BSP_SCOPING_FIELDS_REQUIRED_MSG,
          });
          continue;
        }
      }

      const rowDto: BulkInviteAppUserRowDto = {
        firstName,
        lastName,
        email: emailRaw.trim(),
        workPhone,
        timezone,
        inviteType,
        nickname: nickname || undefined,
        cellPhone: cellPhone || undefined,
      };

      if (inviteType === APP_USER_INVITE_TYPE.BSP_BLUEPRINT) {
        rowDto.corporationName = corporationName;
        rowDto.companyName = companyName;
        rowDto.roleName = roleName;
        rowDto.categoryName = categoryName;
      }

      users.push(rowDto);
      sourceCsvLineByUserIndex.push(csvLineNumber);
    }

    return { users, preFailed, sourceCsvLineByUserIndex };
  }

  /**
   * Reads requester Cognito groups stored on the job at enqueue time; falls back to
   * `app_user_group_memberships` when `_meta.requesterGroups` is missing.
   */
  private async resolveBulkInviteRequesterGroups(
    requesterCognitoSub: string,
    resultJson: unknown,
  ): Promise<string[]> {
    if (
      resultJson !== null &&
      typeof resultJson === 'object' &&
      !Array.isArray(resultJson)
    ) {
      const meta = (resultJson as { _meta?: { requesterGroups?: unknown } })
        ._meta;
      if (Array.isArray(meta?.requesterGroups)) {
        const fromMeta = meta.requesterGroups.filter(
          (g): g is string => typeof g === 'string',
        );
        if (fromMeta.length > 0) {
          return fromMeta;
        }
      }
    }

    const rows = await this.prisma.appUserGroupMembership.findMany({
      where: { userId: requesterCognitoSub.trim() },
      select: { group: { select: { name: true } } },
    });
    return rows
      .map((r) => r.group.name?.trim())
      .filter((n): n is string => Boolean(n));
  }

  /**
   * Runs {@link bulkInviteAppUsers} after CSV parsing and remaps row indexes to CSV line numbers.
   */
  private async runBulkInviteCsvAfterParse(
    users: BulkInviteAppUserRowDto[],
    preFailed: BulkInviteAppUserFailedItem[],
    sourceCsvLineByUserIndex: number[],
    requester: BulkInviteRequesterContext,
  ): Promise<{
    succeeded: BulkInviteAppUserSucceededItem[];
    failed: BulkInviteAppUserFailedItem[];
  }> {
    try {
      if (users.length === 0) {
        const mergedFailed = [...preFailed].sort(
          (a, b) => a.rowIndex - b.rowIndex,
        );
        return { succeeded: [], failed: mergedFailed };
      }

      const bulk = await this.bulkInviteAppUsers({ users }, requester);
      const payload = bulk.data;
      if (!payload) {
        throw new InternalServerErrorException(
          APP_USER_BULK_CSV_IMPORT_FAILED_MSG,
        );
      }

      const lineForUserIndex = (userIdx: number): number =>
        sourceCsvLineByUserIndex[userIdx] ?? userIdx + 2;

      const succeeded = payload.succeeded.map((s) => ({
        ...s,
        rowIndex: lineForUserIndex(s.rowIndex),
      }));
      const failedFromBulk = payload.failed.map((f) => ({
        ...f,
        rowIndex: lineForUserIndex(f.rowIndex),
      }));

      const failed = [...preFailed, ...failedFromBulk].sort(
        (a, b) => a.rowIndex - b.rowIndex,
      );

      return { succeeded, failed };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(APP_USER_BULK_CSV_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(
        APP_USER_BULK_CSV_IMPORT_FAILED_MSG,
      );
    }
  }

  /**
   * Maps job worker errors to a persisted `error_message` string.
   */
  private formatBulkInviteJobFailureMessage(error: unknown): string {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof InternalServerErrorException
    ) {
      const body = error.getResponse();
      if (typeof body === 'string') {
        return body;
      }
      if (typeof body === 'object' && body !== null && 'message' in body) {
        const msg = (body as { message?: string | string[] }).message;
        if (Array.isArray(msg)) {
          return msg.join('; ');
        }
        if (typeof msg === 'string') {
          return msg;
        }
      }
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }

  /**
   * Normalizes a bulk-import name field for case-insensitive comparison (trim + lowercase).
   */
  private normalizeBulkInviteText(value: string): string {
    return value.trim().toLowerCase();
  }

  /**
   * Builds a single case-insensitive name → id map from Prisma rows; tracks normalized names that
   * collide so callers can reject ambiguous matches.
   */
  private mergeBulkInviteUniqueNameRows<T extends { id: string }>(
    rows: readonly T[],
    nameSelector: (row: T) => string,
  ): {
    idByNormalizedName: Map<string, string>;
    ambiguousNormalizedNames: Set<string>;
  } {
    const idByNormalizedName = new Map<string, string>();
    const ambiguousNormalizedNames = new Set<string>();
    for (const row of rows) {
      const key = this.normalizeBulkInviteText(nameSelector(row));
      const existing = idByNormalizedName.get(key);
      if (existing === undefined) {
        idByNormalizedName.set(key, row.id);
      } else if (existing !== row.id) {
        ambiguousNormalizedNames.add(key);
        idByNormalizedName.delete(key);
      }
    }
    return { idByNormalizedName, ambiguousNormalizedNames };
  }

  /**
   * Loads corporation rows, role categories, existing app user emails, then company and role rows
   * needed for BSPBlueprint rows — parallelized where dependencies allow fewer round trips.
   */
  private async buildBulkInviteNameResolutionContext(
    rows: BulkInviteAppUserRowDto[],
  ): Promise<{
    corporationIdByNormalizedLegalName: Map<string, string>;
    ambiguousCorporationNormalizedNames: Set<string>;
    companyIdByCorpIdAndNormalizedCompanyName: Map<string, string>;
    ambiguousCompanyKeys: Set<string>;
    categoryIdByNormalizedName: Map<string, string>;
    ambiguousCategoryNormalizedNames: Set<string>;
    roleByCategoryIdAndNormalizedRoleName: Map<
      string,
      { id: string; name: string }
    >;
    existingEmailsNormalized: Set<string>;
  }> {
    const bspRows = rows.filter(
      (r) => r.inviteType === APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
    );
    const corpNames = [
      ...new Set(
        bspRows.map((r) => this.normalizeBulkInviteText(r.corporationName!)),
      ),
    ];
    const catNames = [
      ...new Set(
        bspRows.map((r) => this.normalizeBulkInviteText(r.categoryName!)),
      ),
    ];
    const allEmailsNorm = rows.map((r) => r.email.trim().toLowerCase());

    const [corporationRows, categoryRows, existingUsers] = await Promise.all([
      corpNames.length === 0
        ? Promise.resolve([] as { id: string; legalName: string }[])
        : this.prisma.corporation.findMany({
            where: {
              OR: corpNames.map((legal) => ({
                legalName: { equals: legal, mode: 'insensitive' },
              })),
            },
            select: { id: true, legalName: true },
          }),
      catNames.length === 0
        ? Promise.resolve([] as { id: string; name: string }[])
        : this.prisma.roleCategory.findMany({
            where: {
              OR: catNames.map((n) => ({
                name: { equals: n, mode: 'insensitive' },
              })),
            },
            select: { id: true, name: true },
          }),
      this.prisma.appUser.findMany({
        where: { deletedAt: null, email: { in: allEmailsNorm } },
        select: { email: true },
      }),
    ]);

    const corpMerge = this.mergeBulkInviteUniqueNameRows(
      corporationRows,
      (r) => r.legalName,
    );
    const catMerge = this.mergeBulkInviteUniqueNameRows(
      categoryRows,
      (r) => r.name,
    );

    const distinctCompanyPairs: { corpId: string; companyNorm: string }[] = [];
    const seenCompanyPair = new Set<string>();
    for (const r of bspRows) {
      const corpNorm = this.normalizeBulkInviteText(r.corporationName!);
      if (corpMerge.ambiguousNormalizedNames.has(corpNorm)) {
        continue;
      }
      const corpId = corpMerge.idByNormalizedName.get(corpNorm);
      if (!corpId) {
        continue;
      }
      const companyNorm = this.normalizeBulkInviteText(r.companyName!);
      const pairKey = `${corpId}|${companyNorm}`;
      if (seenCompanyPair.has(pairKey)) {
        continue;
      }
      seenCompanyPair.add(pairKey);
      distinctCompanyPairs.push({ corpId, companyNorm });
    }

    const categoryIds = [...new Set(catMerge.idByNormalizedName.values())];

    const [companyRows, roleRows] = await Promise.all([
      distinctCompanyPairs.length === 0
        ? Promise.resolve(
            [] as { id: string; corporationId: string; legalName: string }[],
          )
        : this.prisma.corporationCompany.findMany({
            where: {
              deletedAt: null,
              OR: distinctCompanyPairs.map((p) => ({
                corporationId: p.corpId,
                legalName: { equals: p.companyNorm, mode: 'insensitive' },
              })),
            },
            select: { id: true, corporationId: true, legalName: true },
          }),
      categoryIds.length === 0
        ? Promise.resolve(
            [] as { id: string; name: string; categoryId: string }[],
          )
        : this.prisma.role.findMany({
            where: { categoryId: { in: categoryIds } },
            select: { id: true, name: true, categoryId: true },
          }),
    ]);

    const byCorpAndCompanyNorm = new Map<
      string,
      { id: string; corporationId: string; legalName: string }[]
    >();
    for (const row of companyRows) {
      const k = `${row.corporationId}|${this.normalizeBulkInviteText(row.legalName)}`;
      const list = byCorpAndCompanyNorm.get(k) ?? [];
      list.push(row);
      byCorpAndCompanyNorm.set(k, list);
    }

    const companyIdByCorpIdAndNormalizedCompanyName = new Map<string, string>();
    const ambiguousCompanyKeys = new Set<string>();
    for (const p of distinctCompanyPairs) {
      const key = `${p.corpId}|${p.companyNorm}`;
      const matches = byCorpAndCompanyNorm.get(key) ?? [];
      if (matches.length === 0) {
        continue;
      }
      if (matches.length > 1) {
        ambiguousCompanyKeys.add(key);
        continue;
      }
      companyIdByCorpIdAndNormalizedCompanyName.set(key, matches[0].id);
    }

    const roleByCategoryIdAndNormalizedRoleName = new Map<
      string,
      { id: string; name: string }
    >();
    for (const role of roleRows) {
      const mapKey = `${role.categoryId}|${this.normalizeBulkInviteText(role.name)}`;
      const existing = roleByCategoryIdAndNormalizedRoleName.get(mapKey);
      if (!existing) {
        roleByCategoryIdAndNormalizedRoleName.set(mapKey, {
          id: role.id,
          name: role.name,
        });
      }
    }

    return {
      corporationIdByNormalizedLegalName: corpMerge.idByNormalizedName,
      ambiguousCorporationNormalizedNames: corpMerge.ambiguousNormalizedNames,
      companyIdByCorpIdAndNormalizedCompanyName,
      ambiguousCompanyKeys,
      categoryIdByNormalizedName: catMerge.idByNormalizedName,
      ambiguousCategoryNormalizedNames: catMerge.ambiguousNormalizedNames,
      roleByCategoryIdAndNormalizedRoleName,
      existingEmailsNormalized: new Set(
        existingUsers
          .map((u) => u.email?.trim().toLowerCase())
          .filter((e): e is string => Boolean(e)),
      ),
    };
  }

  /**
   * Maps one CSV/API row to {@link InviteAppUserDto} using preloaded name resolution maps, or
   * returns a stable validation message (no I/O).
   */
  private mapBulkInviteRowToInviteDto(
    row: BulkInviteAppUserRowDto,
    ctx: Awaited<
      ReturnType<AppUserService['buildBulkInviteNameResolutionContext']>
    >,
  ): { dto: InviteAppUserDto } | { error: string } {
    if (row.inviteType === APP_USER_INVITE_TYPE.ASSESSMENT_ONLY) {
      return {
        dto: {
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          email: row.email.trim(),
          workPhone: row.workPhone.trim(),
          timezone: row.timezone.trim(),
          nickname: row.nickname?.trim() || undefined,
          cellPhone: row.cellPhone?.trim() || undefined,
          inviteType: row.inviteType,
        },
      };
    }

    const corpNorm = this.normalizeBulkInviteText(row.corporationName!);
    if (ctx.ambiguousCorporationNormalizedNames.has(corpNorm)) {
      return { error: APP_USER_BULK_INVITE_ROW_CORPORATION_AMBIGUOUS_MSG };
    }
    const corporationId = ctx.corporationIdByNormalizedLegalName.get(corpNorm);
    if (!corporationId) {
      return { error: APP_USER_BULK_INVITE_ROW_CORPORATION_NOT_RESOLVED_MSG };
    }

    const companyKey = `${corporationId}|${this.normalizeBulkInviteText(row.companyName!)}`;
    if (ctx.ambiguousCompanyKeys.has(companyKey)) {
      return { error: APP_USER_BULK_INVITE_ROW_COMPANY_AMBIGUOUS_MSG };
    }
    const companyId =
      ctx.companyIdByCorpIdAndNormalizedCompanyName.get(companyKey);
    if (!companyId) {
      return { error: APP_USER_BULK_INVITE_ROW_COMPANY_NOT_RESOLVED_MSG };
    }

    const catNorm = this.normalizeBulkInviteText(row.categoryName!);
    if (ctx.ambiguousCategoryNormalizedNames.has(catNorm)) {
      return { error: APP_USER_BULK_INVITE_ROW_CATEGORY_NOT_RESOLVED_MSG };
    }
    const categoryId = ctx.categoryIdByNormalizedName.get(catNorm);
    if (!categoryId) {
      return { error: APP_USER_BULK_INVITE_ROW_CATEGORY_NOT_RESOLVED_MSG };
    }

    const roleKey = `${categoryId}|${this.normalizeBulkInviteText(row.roleName!)}`;
    const role = ctx.roleByCategoryIdAndNormalizedRoleName.get(roleKey);
    if (!role) {
      return { error: APP_USER_BULK_INVITE_ROW_ROLE_NOT_RESOLVED_MSG };
    }
    const rn = role.name?.trim() ?? '';
    if (rn === CORPORATION_ADMIN_ROLE_NAME || rn === COMPANY_ADMIN_ROLE_NAME) {
      return { error: APP_USER_INVITE_INVALID_END_USER_ROLE_MSG };
    }

    return {
      dto: {
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        email: row.email.trim(),
        workPhone: row.workPhone.trim(),
        timezone: row.timezone.trim(),
        nickname: row.nickname?.trim() || undefined,
        cellPhone: row.cellPhone?.trim() || undefined,
        inviteType: row.inviteType,
        corporationId,
        companyId,
        roleId: role.id,
      },
    };
  }

  /**
   * Runs {@link inviteAppUserForRequester} for each item in order (same company) so seat-capacity
   * checks observe prior invites in this batch.
   */
  private async runBulkInviteSequential(
    group: {
      rowIndex: number;
      inviteDto: InviteAppUserDto;
      emailNorm: string;
    }[],
    succeeded: BulkInviteAppUserSucceededItem[],
    failed: BulkInviteAppUserFailedItem[],
    requester?: BulkInviteRequesterContext,
  ): Promise<void> {
    for (const item of group) {
      await this.runSingleBulkInviteItem(item, succeeded, failed, requester);
    }
  }

  /**
   * Runs Assessment Only invites in fixed-size batches so Cognito and the DB are not overwhelmed
   * (unbounded {@link Promise.all} caused TooManyRequests and transaction errors on large CSVs).
   */
  private async runBulkInviteParallelAssessment(
    group: {
      rowIndex: number;
      inviteDto: InviteAppUserDto;
      emailNorm: string;
    }[],
    succeeded: BulkInviteAppUserSucceededItem[],
    failed: BulkInviteAppUserFailedItem[],
    requester?: BulkInviteRequesterContext,
  ): Promise<void> {
    const batchSize = APP_USER_BULK_INVITE_ASSESSMENT_ONLY_CONCURRENCY;
    for (let i = 0; i < group.length; i += batchSize) {
      const chunk = group.slice(i, i + batchSize);
      await Promise.all(
        chunk.map((item) =>
          this.runSingleBulkInviteItem(item, succeeded, failed, requester),
        ),
      );
    }
  }

  /**
   * Invokes {@link inviteAppUserForRequester} for one resolved row and appends to succeeded or
   * failed lists.
   */
  private async runSingleBulkInviteItem(
    item: {
      rowIndex: number;
      inviteDto: InviteAppUserDto;
      emailNorm: string;
    },
    succeeded: BulkInviteAppUserSucceededItem[],
    failed: BulkInviteAppUserFailedItem[],
    requester?: BulkInviteRequesterContext,
  ): Promise<void> {
    try {
      const res = requester
        ? await this.inviteAppUserForRequester(
            item.inviteDto,
            requester.cognitoSub,
            requester.groups,
          )
        : await this.inviteAppUser(item.inviteDto);
      const data = res.data as
        | { cognitoSub?: string; inviteType?: string }
        | undefined;
      succeeded.push({
        rowIndex: item.rowIndex,
        email: item.emailNorm,
        cognitoSub: data?.cognitoSub ?? '',
        inviteType: data?.inviteType ?? item.inviteDto.inviteType,
      });
    } catch (err) {
      failed.push({
        rowIndex: item.rowIndex,
        email: item.emailNorm,
        message: this.formatBulkInviteFailureMessage(err),
      });
    }
  }

  /**
   * Maps thrown values from {@link inviteAppUserForRequester} / {@link inviteAppUser} to a short
   * string for the bulk `failed` array.
   */
  private formatBulkInviteFailureMessage(error: unknown): string {
    if (
      error instanceof BadRequestException ||
      error instanceof ForbiddenException ||
      error instanceof NotFoundException ||
      error instanceof InternalServerErrorException
    ) {
      const body = error.getResponse();
      if (typeof body === 'string') {
        return body;
      }
      if (typeof body === 'object' && body !== null && 'message' in body) {
        const msg = (body as { message?: string | string[] }).message;
        if (Array.isArray(msg)) {
          return msg.join('; ');
        }
        if (typeof msg === 'string') {
          return msg;
        }
      }
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
