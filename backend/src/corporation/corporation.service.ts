import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { PrismaService } from '../prisma';
import { S3Service } from '../s3';
import {
  CreateCorporationDto,
  UpdateCorporationDto,
  UpdateStepsDto,
  UpsertKeyContactDto,
  SuspendCloseCorporationDto,
} from './dto';
import {
  ResponseHelper,
  ApiResponse,
  formatDateShort,
  adminUserGlobalSignOut,
  isPrismaUniqueConstraintError,
  setCognitoUserEnabled,
  getCreatedDateFilterStartDate,
  countSystemAnalytics,
} from '../common';
import { EmailService } from '../email';
import { CompanyService } from '../company/company.service';
import { StripeService } from '../stripe/stripe.service';
import type { BillingSubscriptionActorContext } from '../stripe/stripe-billing-actor.util';
import {
  FINANCE_BILLING_NO_SUBSCRIPTION_ID_MSG,
  FINANCE_BILLING_SUBSCRIPTION_ALREADY_CANCELED_MSG,
} from '../stripe/stripe.constants';
import {
  getCorporationSuspendedEmailHtml,
  getCorporationSuspendedEmailText,
} from './templates/corporation-suspended-email.template';
import {
  getCorporationClosedEmailHtml,
  getCorporationClosedEmailText,
} from './templates/corporation-closed-email.template';
import {
  getCorporationReinstatedEmailHtml,
  getCorporationReinstatedEmailText,
} from './templates/corporation-reinstated-email.template';
import { COMPANY_STATUS } from '../company/constants/company.status';
import { COMPANY_DETAIL_CORP_ADMIN_WRONG_CORP_MSG } from '../company/constants/company.messages';
import { APP_USER_STATUS } from '../user/constants/app-user.constants';
import { Corporation, Prisma } from '@prisma/client';
import {
  BRAND_LOGO_ALLOWED_MIMES,
  BRAND_LOGO_EXTENSION_BY_MIME,
  BRAND_LOGO_FILE_REQUIRED_MSG,
  BRAND_LOGO_INVALID_TYPE_MSG,
  BRAND_LOGO_MAX_SIZE_BYTES,
  BRAND_LOGO_MAX_SIZE_MSG,
  CORPORATION_BRAND_LOGO_UPLOADED_SUCCESS_MSG,
  CORPORATION_BRAND_LOGO_DELETED_SUCCESS_MSG,
  CORPORATION_KEY_CONTACT_UPSERTED_SUCCESS_MSG,
  CORPORATION_KEY_CONTACT_DELETED_SUCCESS_MSG,
  APP_KEY_CONTACT_TYPE_EXEC_SPONSOR,
  APP_KEY_CONTACT_TYPE_LEGAL_COMPLIANCE,
  CORPORATION_ADMIN_ROLE_NAME,
  CORPORATION_ADMIN_ROLE_NOT_CONFIGURED_MSG,
  CORPORATION_ADMIN_APP_USER_TYPE,
  CORPORATION_ADMIN_APP_INVITE_TYPE,
  CORPORATION_CREATED_SUCCESS_MSG,
  CORPORATION_UPDATED_SUCCESS_MSG,
  CORPORATION_STEPS_UPDATED_SUCCESS_MSG,
  CORPORATION_FETCHED_SUCCESS_MSG,
  CORPORATION_LIST_FETCHED_SUCCESS_MSG,
  CORPORATION_ACTIVE_LIST_FETCHED_SUCCESS_MSG,
  CORPORATION_ALL_FETCHED_SUCCESS_MSG,
  CORPORATION_ALL_FETCH_ERROR_LOG_MSG,
  CORPORATION_REINSTATED_SUCCESS_MSG,
  CORPORATION_REINSTATE_NOT_SUSPENDED_MSG,
  CORPORATION_REINSTATE_COGNITO_ERROR_LOG_MSG,
  CORPORATION_REINSTATE_DB_TRANSACTION_ERROR_LOG_MSG,
  CORPORATION_REINSTATE_FAILED_MSG,
  CORPORATION_CLOSED_SUCCESS_MSG,
  CORPORATION_SUSPENDED_SUCCESS_MSG,
  CORPORATION_ALREADY_SUSPENDED_MSG,
  CORPORATION_CANNOT_SUSPEND_CLOSED_MSG,
  CORPORATION_ALREADY_CLOSED_MSG,
  CORPORATION_CANNOT_UPDATE_CLOSED_MSG,
  CORPORATION_SUSPEND_COGNITO_ERROR_LOG_MSG,
  CORPORATION_SUSPEND_DB_TRANSACTION_ERROR_LOG_MSG,
  CORPORATION_SUSPEND_FAILED_MSG,
  CORPORATION_CLOSE_COGNITO_ERROR_LOG_MSG,
  CORPORATION_CLOSE_DB_TRANSACTION_ERROR_LOG_MSG,
  CORPORATION_CLOSE_FAILED_MSG,
  CORPORATION_CLOSE_SUBSCRIPTION_CANCEL_FAILED_LOG_MSG,
  CORPORATION_CLOSE_SUBSCRIPTION_CANCEL_SKIPPED_LOG_MSG,
  CORPORATION_SUSPENDED_EMAIL_SUBJECT,
  CORPORATION_SUSPENDED_EMAIL_SEND_FAILED_LOG_MSG,
  CORPORATION_CLOSED_EMAIL_SUBJECT,
  CORPORATION_CLOSED_EMAIL_SEND_FAILED_LOG_MSG,
  CORPORATION_REINSTATED_EMAIL_SUBJECT,
  CORPORATION_REINSTATED_EMAIL_SEND_FAILED_LOG_MSG,
  CORPORATION_DETAIL_CORP_ADMIN_UNASSIGNED_MSG,
  CORPORATION_DETAIL_CORP_ADMIN_WRONG_CORP_MSG,
  CORPORATION_DETAIL_FORBIDDEN_MSG,
  CORPORATION_DETAIL_SUPER_ADMIN_ME_PATH_MSG,
  CORPORATION_DASHBOARD_ANALYTICS_SUCCESS_MSG,
  CORPORATION_DASHBOARD_ANALYTICS_FORBIDDEN_MSG,
  CORPORATION_STATUS,
} from './constants';
import type { CancelBillingSubscriptionDto } from '../stripe/dto/cancel-billing-subscription.dto';
import {
  ListCorporationQueryDto,
  CorporationSortBy,
  CorporationSortOrder,
  CorporationDashboardAnalyticsQueryDto,
} from './dto';
import { UserSyncService } from '../user';
import { COGNITO_GROUP_NAMES } from '../user/cognito-groups.constants';
import { CorporationCognitoProvisioningService } from './corporation-cognito-provisioning.service';
import { CorporationAdminOnboardingService } from './corporation-admin-onboarding.service';

const corporationLegalComplianceKeyContactSelect =
  Prisma.validator<Prisma.AppKeyContactSelect>()({
    id: true,
    appUserId: true,
    contactType: true,
    firstName: true,
    lastName: true,
    nickname: true,
    jobRole: true,
    email: true,
    workPhone: true,
    cellPhone: true,
  });

type LegalComplianceAppKeyContactRow = Prisma.AppKeyContactGetPayload<{
  select: typeof corporationLegalComplianceKeyContactSelect;
}>;

/** Matches GET corporations/:id/companies list: earliest isAdmin row per company, app user not deleted. */
const corporationDetailCompanyAdminAccessSelect =
  Prisma.validator<Prisma.UserCompanyAccessSelect>()({
    companyId: true,
    user: {
      select: {
        firstName: true,
        lastName: true,
        nickname: true,
        jobRole: true,
        email: true,
        workPhone: true,
        cellPhone: true,
      },
    },
  });

type CorporationDetailCompanyAdminAccessRow =
  Prisma.UserCompanyAccessGetPayload<{
    select: typeof corporationDetailCompanyAdminAccessSelect;
  }>;

/** API shape returned by PATCH `corporations/:id/key-contact` when upserting legal compliance contact. */
type CorporationLegalComplianceKeyContactPayload = {
  id: string;
  contactType: string | null;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  jobRole: string | null;
  email: string | null;
  workPhone: string | null;
  cellPhone: string | null;
};

/**
 * Maps a Prisma `app_key_contacts` row (legal/compliance select) to the PATCH key-contact response body.
 *
 * @param row - Subset of `AppKeyContact` from {@link corporationLegalComplianceKeyContactSelect}
 * @returns Payload suitable for `ResponseHelper.success` data on key-contact upsert
 */
function mapAppKeyContactToLegalCompliancePayload(
  row: LegalComplianceAppKeyContactRow,
): CorporationLegalComplianceKeyContactPayload {
  return {
    id: row.id,
    contactType: row.contactType,
    firstName: row.firstName,
    lastName: row.lastName,
    nickname: row.nickname,
    jobRole: row.jobRole,
    email: row.email,
    workPhone: row.workPhone,
    cellPhone: row.cellPhone,
  };
}

@Injectable()
export class CorporationService {
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly logger = new Logger(CorporationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly userSync: UserSyncService,
    private readonly corporationCognito: CorporationCognitoProvisioningService,
    private readonly corporationAdminOnboarding: CorporationAdminOnboardingService,
    private readonly emailService: EmailService,
    private readonly companyService: CompanyService,
    private readonly stripeService: StripeService,
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
   * Builds Prisma orderBy from list query sort params. Default: descending by createdAt.
   * When sortBy is companyCount or adminName, ordering is done in-memory.
   */
  private buildOrderBy(
    sortBy: CorporationSortBy,
    sortOrder: CorporationSortOrder,
  ) {
    const dir = sortOrder;
    switch (sortBy) {
      case 'corporationCode':
        return { corporationCode: dir };
      case 'legalName':
        return { legalName: dir };
      case 'status':
        return { status: dir };
      case 'adminName':
        return { createdAt: dir };
      case 'companyCount':
        return { createdAt: dir };
      case 'createdAt':
      default:
        return { createdAt: dir };
    }
  }

  /** `app_users` rows that represent the corporation admin for list/search/sort. */
  private readonly corpAdminAppUserWhere: Prisma.AppUserWhereInput = {
    deletedAt: null,
    userType: {
      contains: CORPORATION_ADMIN_APP_USER_TYPE,
      mode: 'insensitive',
    },
  };

  /** Select for list: only non-deleted companies so noOfCompanies reflects active count. */
  private listSelect = {
    id: true,
    corporationCode: true,
    legalName: true,
    dataResidencyRegion: true,
    createdAt: true,
    status: true,
    submittedSteps: true,
    mode: true,
    appUsers: {
      where: this.corpAdminAppUserWhere,
      take: 1,
      orderBy: { createdAt: 'asc' as const },
      select: { firstName: true, lastName: true, email: true },
    },
    companies: {
      where: { deletedAt: null },
      select: { id: true },
    },
  };

  /**
   * Fetches a paginated list of corporations with id, corporationCode, legalName,
   * dataResidencyRegion, corporation admin name/email (from `app_users`), noOfCompanies, and createdAt.
   *
   * @param query - Page, limit, optional search (legal name or admin name), sortBy (default createdAt), sortOrder (default desc)
   * @returns Paginated list with items and metadata (total, page, limit, totalPages)
   */
  async findAll(query: ListCorporationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const where: {
      createdAt?: { gte: Date };
      status?: string;
      OR?: Array<
        | { legalName: { contains: string; mode: 'insensitive' } }
        | { appUsers: { some: Prisma.AppUserWhereInput } }
      >;
    } = {};
    if (query.createdFilter) {
      where.createdAt = {
        gte: getCreatedDateFilterStartDate(query.createdFilter),
      };
    }
    if (query.status && query.status !== 'all') {
      where.status = query.status.toUpperCase();
    }
    const searchTerm = query.search?.trim();
    if (searchTerm) {
      const adminNameConditions: Prisma.AppUserWhereInput[] = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
      ];
      // Match "first last" sequence only: e.g. "aaa Doew" matches firstName contains "aaa" AND lastName contains "Doew"
      const words = searchTerm.split(/\s+/).filter((w) => w.length > 0);
      if (words.length >= 2) {
        const firstWord = words[0];
        const lastWord = words[words.length - 1];
        adminNameConditions.push({
          AND: [
            { firstName: { contains: firstWord, mode: 'insensitive' } },
            { lastName: { contains: lastWord, mode: 'insensitive' } },
          ],
        });
      }
      where.OR = [
        { legalName: { contains: searchTerm, mode: 'insensitive' } },
        {
          appUsers: {
            some: {
              ...this.corpAdminAppUserWhere,
              OR: adminNameConditions,
            },
          },
        },
      ];
    }
    const whereClause = Object.keys(where).length > 0 ? where : undefined;

    try {
      const sortInMemory = sortBy === 'companyCount' || sortBy === 'adminName';

      const [allCorporations, total] = await Promise.all([
        sortInMemory
          ? this.prisma.corporation.findMany({
              where: whereClause as never,
              orderBy: { createdAt: 'desc' },
              select: this.listSelect,
            })
          : this.prisma.corporation.findMany({
              skip,
              take: limit,
              where: whereClause as never,
              orderBy,
              select: this.listSelect,
            }),
        this.prisma.corporation.count({ where: whereClause as never }),
      ]);

      let corporations = allCorporations;
      if (sortBy === 'companyCount') {
        corporations = [...allCorporations].sort((a, b) =>
          sortOrder === 'desc'
            ? b.companies.length - a.companies.length
            : a.companies.length - b.companies.length,
        );
        corporations = corporations.slice(skip, skip + limit);
      } else if (sortBy === 'adminName') {
        const adminSortKey = (
          users: { firstName: string | null; lastName: string | null }[],
        ) => {
          const u = users[0];
          if (!u) return '';
          return [u.firstName, u.lastName]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        };
        corporations = [...allCorporations].sort((a, b) => {
          const cmp = adminSortKey(a.appUsers).localeCompare(
            adminSortKey(b.appUsers),
          );
          return sortOrder === 'desc' ? -cmp : cmp;
        });
        corporations = corporations.slice(skip, skip + limit);
      }

      const items = corporations.map((corporation) => {
        const createdDate = corporation.createdAt;
        const createdAtFormatted = new Intl.DateTimeFormat('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        })
          .format(createdDate)
          .replace(/\//g, '-');
        const corpAdminUser = corporation.appUsers[0];
        return {
          id: corporation.id,
          corporationCode: corporation.corporationCode,
          legalName: corporation.legalName,
          dataResidencyRegion: corporation.dataResidencyRegion,
          status: corporation.status,
          submittedSteps: corporation.submittedSteps,
          mode: corporation.mode,
          corporationAdminName:
            [corpAdminUser?.firstName, corpAdminUser?.lastName]
              .filter(Boolean)
              .join(' ') || null,
          corporationAdminEmail: corpAdminUser?.email ?? null,
          noOfCompanies: corporation.companies.length,
          createdAt: createdAtFormatted,
        };
      });

      const totalPages = Math.ceil(total / limit);

      return ResponseHelper.success(CORPORATION_LIST_FETCHED_SUCCESS_MSG, {
        items,
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      this.logger.error('Error fetching corporation list', error);
      throw error;
    }
  }

  /**
   * Fetches active corporations with id, legalName, ownershipType, dataResidencyRegion (region), and corporation admin
   * from `app_users` (earliest `corp_admin` row per corporation, not deleted). `corporationAdmin.id` is `cognito_sub`.
   * Used for dropdowns and minimal list views.
   */
  async findActiveList(): Promise<ApiResponse> {
    const rows = await this.prisma.corporation.findMany({
      where: { status: CORPORATION_STATUS.ACTIVE },
      select: {
        id: true,
        legalName: true,
        ownershipType: true,
        dataResidencyRegion: true,
        appUsers: {
          where: this.corpAdminAppUserWhere,
          take: 1,
          orderBy: { createdAt: 'asc' },
          select: {
            cognitoSub: true,
            corporationId: true,
            firstName: true,
            lastName: true,
            nickname: true,
            jobRole: true,
            email: true,
            workPhone: true,
            cellPhone: true,
          },
        },
      },
      orderBy: { legalName: 'asc' },
    });

    const corporations = rows.map((c) => {
      const u = c.appUsers[0];
      return {
        id: c.id,
        legalName: c.legalName,
        ownershipType: c.ownershipType,
        dataResidencyRegion: c.dataResidencyRegion,
        corporationAdmin: u
          ? {
              id: u.cognitoSub,
              corporationId: u.corporationId ?? c.id,
              firstName: u.firstName ?? '',
              lastName: u.lastName ?? '',
              nickname: u.nickname,
              jobRole: u.jobRole ?? '',
              email: u.email ?? '',
              workPhone: u.workPhone ?? '',
              cellPhone: u.cellPhone,
            }
          : null,
      };
    });

    return ResponseHelper.success(
      CORPORATION_ACTIVE_LIST_FETCHED_SUCCESS_MSG,
      corporations,
    );
  }

  /**
   * Returns every corporation's id and legalName, ordered by legalName ascending.
   * Includes all statuses; used for SuperAdmin dropdowns and lookups.
   */
  async findAllIdAndName(): Promise<ApiResponse> {
    try {
      const rows = await this.prisma.corporation.findMany({
        select: { id: true, legalName: true },
        orderBy: { legalName: 'asc' },
      });

      return ResponseHelper.success(CORPORATION_ALL_FETCHED_SUCCESS_MSG, rows);
    } catch (error) {
      this.logger.error(CORPORATION_ALL_FETCH_ERROR_LOG_MSG, error);
      throw error;
    }
  }

  /**
   * Authorizes GET `corporations/:id` then delegates to {@link findOne}.
   * - **SuperAdmin:** any corporation UUID (`id` must not be the literal `me`).
   * - **CorporationAdmin:** `id` must be their `app_users.corporation_id` or the sentinel `me`
   *   (case-insensitive).
   * - **Others:** {@link ForbiddenException}.
   */
  async findOneForRequester(
    idParam: string,
    cognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const trimmedId = idParam.trim();
    const sub = cognitoSub.trim();

    const isSuperAdmin = groups.includes(COGNITO_GROUP_NAMES.SUPER_ADMIN);
    if (isSuperAdmin) {
      if (trimmedId.toLowerCase() === 'me') {
        throw new BadRequestException(
          CORPORATION_DETAIL_SUPER_ADMIN_ME_PATH_MSG,
        );
      }
      return this.findOne(trimmedId);
    }

    const isCorpAdmin = groups.includes(COGNITO_GROUP_NAMES.CORPORATION_ADMIN);
    if (!isCorpAdmin) {
      throw new ForbiddenException(CORPORATION_DETAIL_FORBIDDEN_MSG);
    }

    const myCorporationId =
      await this.resolveCorporationIdForCorpAdminCognitoSub(sub);
    if (!myCorporationId) {
      throw new ForbiddenException(
        CORPORATION_DETAIL_CORP_ADMIN_UNASSIGNED_MSG,
      );
    }

    const requestedCorporationId =
      trimmedId.toLowerCase() === 'me' ? myCorporationId : trimmedId;
    if (requestedCorporationId !== myCorporationId) {
      throw new ForbiddenException(
        CORPORATION_DETAIL_CORP_ADMIN_WRONG_CORP_MSG,
      );
    }

    return this.findOne(myCorporationId);
  }

  /**
   * Looks up the corporation id for a Cognito user who is the provisioned corporation admin
   * (`app_users.user_type` contains corp_admin, not deleted).
   */
  private async resolveCorporationIdForCorpAdminCognitoSub(
    cognitoSub: string,
  ): Promise<string | null> {
    const row = await this.prisma.appUser.findFirst({
      where: {
        cognitoSub,
        corporationId: { not: null },
        ...this.corpAdminAppUserWhere,
      },
      select: { corporationId: true },
    });
    return row?.corporationId ?? null;
  }

  /**
   * Fetches a corporation by ID with its single address, corporation-level `app_key_contacts`
   * (no company, not soft-deleted), and the primary corporation admin from `app_users`
   * (`user_type` contains corp_admin, not deleted). Nested companies include name/email/phone
   * fields from the company admin (`user_company_access` isAdmin + `app_users`), same as
   * GET corporations/:id/companies.
   *
   * @param id - Corporation ID
   * @returns A success response containing the corporation with address and nested companies
   * @throws {NotFoundException} If the corporation does not exist
   */
  async findOne(id: string) {
    try {
      const corporation = await this.prisma.corporation.findUnique({
        where: { id },
        select: {
          id: true,
          corporationCode: true,
          legalName: true,
          dbaName: true,
          website: true,
          dataResidencyRegion: true,
          ownershipType: true,
          industry: true,
          phoneNo: true,
          brandLogo: true,
          status: true,
          mode: true,
          suspendCloseReason: true,
          suspendCloseAdditionalNotes: true,
          submittedSteps: true,
          passwordPolicy: true,
          MFA: true,
          sessionTimeout: true,
          address: {
            select: {
              id: true,
              corporationId: true,
              addressLine: true,
              state: true,
              city: true,
              country: true,
              zip: true,
              timezone: true,
            },
          },
          appKeyContacts: {
            where: { deletedAt: null, companyId: null },
            orderBy: { contactCode: 'asc' },
            select: {
              id: true,
              corporationId: true,
              firstName: true,
              lastName: true,
              nickname: true,
              email: true,
              contactType: true,
              jobRole: true,
              workPhone: true,
              cellPhone: true,
              sameAsCorpAdmin: true,
            },
          },
          appUsers: {
            where: this.corpAdminAppUserWhere,
            take: 1,
            orderBy: { createdAt: 'asc' },
            select: {
              cognitoSub: true,
              corporationId: true,
              email: true,
              firstName: true,
              lastName: true,
              nickname: true,
              workPhone: true,
              cellPhone: true,
              jobRole: true,
            },
          },
          companies: {
            where: { deletedAt: null },
            select: {
              id: true,
              corporationId: true,
              legalName: true,
              companyType: true,
              officeType: true,
              industry: true,
              phoneNo: true,
              sameAsCorpAdmin: true,
              planId: true,
              securityPosture: true,
              addressLine: true,
              state: true,
              city: true,
              country: true,
              zip: true,
              plan: {
                select: {
                  id: true,
                  planTypeId: true,
                  customerType: true,
                  employeeRangeMin: true,
                  employeeRangeMax: true,
                  price: true,
                  isCustomPricing: true,
                  planType: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!corporation) {
        throw new NotFoundException(`Corporation with ID "${id}" not found`);
      }

      const companyIds = corporation.companies.map((c) => c.id);
      let adminAccessRows: CorporationDetailCompanyAdminAccessRow[] = [];
      if (companyIds.length > 0) {
        adminAccessRows = await this.prisma.userCompanyAccess.findMany({
          where: {
            companyId: { in: companyIds },
            isAdmin: true,
            user: { deletedAt: null },
          },
          orderBy: { createdAt: 'asc' },
          select: corporationDetailCompanyAdminAccessSelect,
        });
      }

      const adminUserByCompanyId = new Map<
        string,
        CorporationDetailCompanyAdminAccessRow['user']
      >();
      for (const row of adminAccessRows) {
        if (!adminUserByCompanyId.has(row.companyId)) {
          adminUserByCompanyId.set(row.companyId, row.user);
        }
      }

      const companiesWithAdmin = corporation.companies.map((company) => {
        const admin = adminUserByCompanyId.get(company.id);
        return {
          ...company,
          firstName: admin?.firstName ?? null,
          lastName: admin?.lastName ?? null,
          nickname: admin?.nickname ?? null,
          jobRole: admin?.jobRole ?? null,
          email: admin?.email ?? null,
          workPhone: admin?.workPhone ?? null,
          cellPhone: admin?.cellPhone ?? null,
        };
      });

      const { appUsers, ...corporationRest } = corporation;
      const payload = {
        ...corporationRest,
        companies: companiesWithAdmin,
        corporationAdminAppUser: appUsers[0] ?? null,
      };
      if (payload.brandLogo?.trim()) {
        payload.brandLogo = this.s3Service.getPublicUrl(
          this.s3Service.buildBrandLogoKey(payload.brandLogo),
        );
      }

      return ResponseHelper.success(CORPORATION_FETCHED_SUCCESS_MSG, payload);
    } catch (error) {
      this.logger.error('Error fetching corporation details', error);
      throw error;
    }
  }

  /**
   * Creates a new corporation with auto-generated company code and address.
   *
   * This method:
   * - Auto-generates a unique corporationCode by finding the latest corporation by createdAt
   *   and incrementing its corporationCode (starts at 1 if no corporations exist)
   * - Sets the corporation status to CORPORATION_STATUS.INCOMPLETE by default
   * - Creates the corporation with a nested address only (no `corporation_executive_sponsors` or `corporation_admins` rows; admin is Cognito / `app_users`; executive sponsor may be stored in `app_key_contacts` when `sameAsCorpAdmin` is true [linked to admin] or false [sponsor fields only, no `app_user_id`])
   * - Returns the created corporation with address; `executiveSponsor` and `corporationAdmin` relations are null until added later if applicable
   *
   * @param createCorporationDto - The DTO containing corporation data, address, and executive sponsor information
   * @returns {Promise<ApiResponse<Corporation>>} A success response containing the created corporation with nested relations
   * @throws {Error} Re-throws any errors that occur during creation (handled by global exception filter)
   */
  async create(
    createCorporationDto: CreateCorporationDto,
  ): Promise<ApiResponse<Corporation>> {
    const {
      legalName,
      dbaName,
      website,
      dataResidencyRegion,
      ownershipType,
      industry,
      phoneNo,
      mode,
      address,
      executiveSponsor,
      corporationAdmin,
    } = createCorporationDto;

    const adminEmailNorm = corporationAdmin.email.trim().toLowerCase();

    try {
      // Auto-generate corporationCode: find the latest corporation by createdAt and increment
      const latestCorporation = await this.prisma.corporation.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { corporationCode: true },
      });

      const corporationCode = latestCorporation
        ? latestCorporation.corporationCode + 1
        : 1;

      // Check if a corporation with the same legalName already exists
      const existingCorporation = await this.prisma.corporation.findUnique({
        where: { legalName },
        select: { id: true, legalName: true },
      });

      if (existingCorporation) {
        throw new ConflictException(
          `A corporation with the legal name "${legalName}" already exists`,
        );
      }

      const existingAppUserByEmail = await this.prisma.appUser.findFirst({
        where: { email: adminEmailNorm, deletedAt: null },
        select: { cognitoSub: true, corporationId: true },
      });
      if (existingAppUserByEmail) {
        throw new ConflictException(
          `A user with email "${adminEmailNorm}" already exists; use a different corporation admin email`,
        );
      }

      const corporationAdminRole = await this.prisma.role.findFirst({
        where: { name: CORPORATION_ADMIN_ROLE_NAME },
        select: { id: true },
      });
      if (!corporationAdminRole) {
        throw new InternalServerErrorException(
          CORPORATION_ADMIN_ROLE_NOT_CONFIGURED_MSG,
        );
      }

      const { cognitoSub } =
        await this.corporationCognito.provisionCorporationAdminUser(
          corporationAdmin,
        );

      const corporation = await this.prisma.$transaction(async (tx) => {
        const corp = await tx.corporation.create({
          data: {
            corporationCode,
            legalName,
            dbaName,
            website,
            dataResidencyRegion,
            ownershipType,
            industry,
            phoneNo,
            mode,
            status: CORPORATION_STATUS.INCOMPLETE,
            address: {
              create: { ...address },
            },
          },
          include: {
            address: true,
          },
        });

        await this.userSync.recordCorporationAdminProvisioned(tx, {
          cognitoSub,
          corporationId: corp.id,
          roleId: corporationAdminRole.id,
          email: corporationAdmin.email,
          firstName: corporationAdmin.firstName,
          lastName: corporationAdmin.lastName,
          nickname: corporationAdmin.nickname ?? null,
          workPhone: corporationAdmin.workPhone,
          cellPhone: corporationAdmin.cellPhone ?? null,
          userType: CORPORATION_ADMIN_APP_USER_TYPE,
          inviteType: CORPORATION_ADMIN_APP_INVITE_TYPE,
          jobRole: corporationAdmin.jobRole,
        });

        if (executiveSponsor.sameAsCorpAdmin === true) {
          await tx.appKeyContact.create({
            data: {
              corporationId: corp.id,
              contactType: APP_KEY_CONTACT_TYPE_EXEC_SPONSOR,
              sameAsCorpAdmin: true,
              appUserId: cognitoSub,
              firstName: corporationAdmin.firstName,
              lastName: corporationAdmin.lastName,
              nickname: corporationAdmin.nickname ?? undefined,
              email: corporationAdmin.email.trim().toLowerCase(),
              jobRole: corporationAdmin.jobRole,
              workPhone: corporationAdmin.workPhone,
              cellPhone: corporationAdmin.cellPhone ?? undefined,
            },
          });
        } else if (executiveSponsor.sameAsCorpAdmin === false) {
          await tx.appKeyContact.create({
            data: {
              corporationId: corp.id,
              contactType: APP_KEY_CONTACT_TYPE_EXEC_SPONSOR,
              sameAsCorpAdmin: false,
              firstName: executiveSponsor.firstName,
              lastName: executiveSponsor.lastName,
              nickname: executiveSponsor.nickname ?? undefined,
              email: executiveSponsor.email.trim().toLowerCase(),
              jobRole: executiveSponsor.jobRole,
              workPhone: executiveSponsor.workPhone,
              cellPhone: executiveSponsor.cellPhone ?? undefined,
            },
          });
        }

        return corp;
      });

      this.logger.log(
        `Corporation created successfully with ID: ${corporation.id}`,
      );

      return ResponseHelper.success(
        CORPORATION_CREATED_SUCCESS_MSG,
        corporation,
      );
    } catch (error) {
      this.logger.error('Error creating corporation', error);

      // Handle Prisma unique constraint violation (P2002) as fallback
      if (isPrismaUniqueConstraintError(error)) {
        const meta = error.meta;
        const raw = meta?.target;
        const targets = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
        const targetStr = targets.join(' ');
        if (targetStr.includes('legal_name')) {
          throw new ConflictException(
            `A corporation with the legal name "${legalName}" already exists`,
          );
        }
        if (
          targets.includes('email') ||
          targetStr.includes('app_users_email_active_unique')
        ) {
          throw new ConflictException(
            `A user with email "${adminEmailNorm}" already exists; use a different corporation admin email`,
          );
        }
      }

      throw error;
    }
  }

  /**
   * Updates an existing corporation and its single address; sponsor/admin payload syncs `app_users` / `app_key_contacts`.
   *
   * This method:
   * - Validates that the corporation exists
   * - Ensures legalName is unique (excluding the current corporation)
   * - Updates corporation main fields and upserts the single address; sponsor and admin details are synced via `app_users` and `app_key_contacts` only
   * - Updates `app_users` for the corporation admin (`user_type` contains corp_admin, not deleted); does not change email
   * - Updates corporation-scoped `app_key_contacts` for `exec_sponsor` (not deleted); does not change `email` or `same_as_corp_admin`
   * - When that key contact has `app_user_id` set and is not same-as-corp-admin, mirrors sponsor fields onto that app user (not email)
   *
   * @param id - Corporation ID
   * @param updateCorporationDto - The DTO containing corporation data, address, and executive sponsor information
   * @returns {Promise<ApiResponse<Corporation>>} A success response containing the updated corporation with `address` included
   * @throws {NotFoundException} If the corporation does not exist
   * @throws {ConflictException} If another corporation with the same legal name exists
   */
  async update(
    id: string,
    updateCorporationDto: UpdateCorporationDto,
  ): Promise<ApiResponse<Corporation>> {
    const {
      legalName,
      dbaName,
      website,
      dataResidencyRegion,
      ownershipType,
      industry,
      phoneNo,
      address,
      executiveSponsor,
      corporationAdmin,
    } = updateCorporationDto;

    try {
      const existing = await this.prisma.corporation.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(`Corporation with ID "${id}" not found`);
      }

      if (existing.status === CORPORATION_STATUS.CLOSED) {
        throw new BadRequestException(CORPORATION_CANNOT_UPDATE_CLOSED_MSG);
      }

      // Check if another corporation (excluding current) has the same legalName
      const duplicate = await this.prisma.corporation.findFirst({
        where: {
          legalName,
          id: { not: id },
        },
        select: { id: true, legalName: true },
      });

      if (duplicate) {
        throw new ConflictException(
          `A corporation with the legal name "${legalName}" already exists`,
        );
      }

      const corporation = await this.prisma.$transaction(async (tx) => {
        const corp = await tx.corporation.update({
          where: { id },
          data: {
            legalName,
            dbaName,
            website,
            dataResidencyRegion,
            ownershipType,
            industry,
            phoneNo,
            address: {
              upsert: {
                create: { ...address },
                update: { ...address },
              },
            },
          },
          include: {
            address: true,
          },
        });

        await tx.appUser.updateMany({
          where: {
            corporationId: id,
            ...this.corpAdminAppUserWhere,
          },
          data: {
            firstName: corporationAdmin.firstName,
            lastName: corporationAdmin.lastName,
            nickname: corporationAdmin.nickname ?? null,
            jobRole: corporationAdmin.jobRole,
            workPhone: corporationAdmin.workPhone,
            cellPhone: corporationAdmin.cellPhone ?? null,
          },
        });

        const execKeyContactRow = await tx.appKeyContact.findFirst({
          where: {
            corporationId: id,
            companyId: null,
            contactType: APP_KEY_CONTACT_TYPE_EXEC_SPONSOR,
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, appUserId: true, sameAsCorpAdmin: true },
        });

        if (execKeyContactRow) {
          await tx.appKeyContact.update({
            where: { id: execKeyContactRow.id },
            data: {
              firstName: executiveSponsor.firstName,
              lastName: executiveSponsor.lastName,
              nickname: executiveSponsor.nickname ?? null,
              jobRole: executiveSponsor.jobRole,
              workPhone: executiveSponsor.workPhone,
              cellPhone: executiveSponsor.cellPhone ?? null,
            },
          });

          if (
            execKeyContactRow.appUserId &&
            !execKeyContactRow.sameAsCorpAdmin
          ) {
            await tx.appUser.updateMany({
              where: {
                cognitoSub: execKeyContactRow.appUserId,
                corporationId: id,
                deletedAt: null,
              },
              data: {
                firstName: executiveSponsor.firstName,
                lastName: executiveSponsor.lastName,
                nickname: executiveSponsor.nickname ?? null,
                jobRole: executiveSponsor.jobRole,
                workPhone: executiveSponsor.workPhone,
                cellPhone: executiveSponsor.cellPhone ?? null,
              },
            });
          }
        }

        return corp;
      });

      this.logger.log(`Corporation updated successfully with ID: ${id}`);

      return ResponseHelper.success(
        CORPORATION_UPDATED_SUCCESS_MSG,
        corporation,
      );
    } catch (error) {
      this.logger.error('Error updating corporation', error);

      if (isPrismaUniqueConstraintError(error)) {
        const meta = error.meta;
        if (meta?.target?.includes('legal_name')) {
          throw new ConflictException(
            `A corporation with the legal name "${legalName}" already exists`,
          );
        }
      }

      throw error;
    }
  }

  /**
   * Adds, updates, or soft-deletes the corporation legal/compliance row in `app_key_contacts`
   * (`contact_type` = legal_compliance_contact; job title in `job_role`).
   * When complianceContact is false, sets `deleted_at` on that row if present.
   * When complianceContact is true, creates or updates the row and clears `deleted_at`.
   *
   * @param id - Corporation ID
   * @param dto - complianceContact toggle and key contact fields (required when true, except jobRole)
   * @returns Success with key contact data when upserted, or success with null when soft-deleted
   * @throws {NotFoundException} If the corporation does not exist
   */
  async upsertKeyContact(
    id: string,
    dto: UpsertKeyContactDto,
  ): Promise<ApiResponse<CorporationLegalComplianceKeyContactPayload | null>> {
    const existing = await this.prisma.corporation.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        submittedSteps: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Corporation with ID "${id}" not found`);
    }

    if (existing.status === CORPORATION_STATUS.CLOSED) {
      throw new BadRequestException(CORPORATION_CANNOT_UPDATE_CLOSED_MSG);
    }

    const legalType = APP_KEY_CONTACT_TYPE_LEGAL_COMPLIANCE;

    if (!dto.complianceContact) {
      await this.prisma.appKeyContact.updateMany({
        where: {
          corporationId: id,
          contactType: legalType,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
      this.logger.log(
        `Legal compliance app key contact soft-deleted for corporation ${id}`,
      );
      if (existing.submittedSteps < 4) {
        await this.prisma.corporation.update({
          where: { id },
          data: { submittedSteps: 4 },
        });
        this.logger.log(
          `Updated submittedSteps to 4 for corporation ${id} (key contact skipped)`,
        );
      }
      return ResponseHelper.success(
        CORPORATION_KEY_CONTACT_DELETED_SUCCESS_MSG,
        null,
      );
    }

    const {
      firstName,
      lastName,
      nickname,
      jobRole,
      email,
      workPhone,
      cellPhone,
    } = dto;
    const trimmedJobRole = jobRole?.trim();
    const emailNorm = email!.trim().toLowerCase();
    const rowDataShared = {
      firstName: firstName!,
      lastName: lastName!,
      nickname: nickname ?? null,
      jobRole: trimmedJobRole ? trimmedJobRole : null,
      workPhone: workPhone!,
      cellPhone: cellPhone ?? null,
      deletedAt: null,
      corporationId: id,
      contactType: legalType,
    };

    const existingRow = await this.prisma.appKeyContact.findFirst({
      where: {
        corporationId: id,
        contactType: legalType,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    /** Do not change `email` on update (app_key_contacts or app_users). */
    const appUserMirrorData = {
      firstName: rowDataShared.firstName,
      lastName: rowDataShared.lastName,
      nickname: rowDataShared.nickname,
      jobRole: rowDataShared.jobRole,
      workPhone: rowDataShared.workPhone,
      cellPhone: rowDataShared.cellPhone,
    };

    const saved = await this.prisma.$transaction(async (tx) => {
      const contact = existingRow
        ? await tx.appKeyContact.update({
            where: { id: existingRow.id },
            data: rowDataShared,
            select: corporationLegalComplianceKeyContactSelect,
          })
        : await tx.appKeyContact.create({
            data: { ...rowDataShared, email: emailNorm },
            select: corporationLegalComplianceKeyContactSelect,
          });

      if (contact.appUserId) {
        await tx.appUser.update({
          where: { cognitoSub: contact.appUserId },
          data: appUserMirrorData,
        });
      }

      return contact;
    });

    if (existing.submittedSteps < 4) {
      await this.prisma.corporation.update({
        where: { id },
        data: { submittedSteps: 4 },
      });
    }

    this.logger.log(
      `${existingRow ? 'Updated' : 'Created'} legal compliance app key contact for corporation ${id}`,
    );

    return ResponseHelper.success(
      CORPORATION_KEY_CONTACT_UPSERTED_SUCCESS_MSG,
      mapAppKeyContactToLegalCompliancePayload(saved),
    );
  }

  /**
   * Updates corporation status to SUSPENDED or CLOSED with optional reason and notes.
   * When status is SUSPENDED, also suspends every non-deleted company under the corporation
   * (same fields as POST `/corporations/companies/:id/suspend`), blocks linked app users,
   * and disables them in Cognito. When status is CLOSED, sets every non-deleted company to
   * CLOSED with the same reason/notes, blocks linked app users, and disables them in Cognito.
   *
   * When status is CLOSED, also schedules Stripe subscription cancellation at period end
   * for every non-deleted company under the corporation (same as finance cancel-subscription).
   *
   * @param id - Corporation ID
   * @param dto - status (SUSPENDED | CLOSED), suspendCloseReason, optional suspendCloseAdditionalNotes
   * @param billingActorUser - Authenticated Super Admin performing the action (used for billing audit on close)
   * @returns Success with updated corporation id and status
   * @throws {NotFoundException} If the corporation does not exist
   */
  async suspendOrClose(
    id: string,
    dto: SuspendCloseCorporationDto,
    billingActorUser: { cognitoSub: string; groups: string[] },
  ): Promise<ApiResponse<{ id: string; status: string }>> {
    const existing = await this.prisma.corporation.findFirst({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw new NotFoundException(`Corporation with ID "${id}" not found`);
    }

    const requestedStatus = dto.status.toUpperCase();

    // Already suspended → suspend again is disabled
    if (
      existing.status === CORPORATION_STATUS.SUSPENDED &&
      requestedStatus === CORPORATION_STATUS.SUSPENDED
    ) {
      throw new BadRequestException(CORPORATION_ALREADY_SUSPENDED_MSG);
    }

    // Closed corporation cannot be suspended
    if (
      existing.status === CORPORATION_STATUS.CLOSED &&
      requestedStatus === CORPORATION_STATUS.SUSPENDED
    ) {
      throw new BadRequestException(CORPORATION_CANNOT_SUSPEND_CLOSED_MSG);
    }

    // Already closed → close again is blocked
    if (
      existing.status === CORPORATION_STATUS.CLOSED &&
      requestedStatus === CORPORATION_STATUS.CLOSED
    ) {
      throw new BadRequestException(CORPORATION_ALREADY_CLOSED_MSG);
    }

    if (requestedStatus === CORPORATION_STATUS.SUSPENDED) {
      return this.suspendCorporationWithCompanyCascade(id, dto, existing.id);
    }

    return this.closeCorporationWithCompanyCascade(
      id,
      dto,
      existing.id,
      billingActorUser,
    );
  }

  /**
   * Suspends the corporation and cascades to all non-deleted companies and their users
   * (mirrors {@link CompanyService.suspendCompany} per company).
   */
  private async suspendCorporationWithCompanyCascade(
    corporationId: string,
    dto: SuspendCloseCorporationDto,
    corporationIdForResponse: string,
  ): Promise<ApiResponse<{ id: string; status: string }>> {
    const [corporation, companies] = await Promise.all([
      this.prisma.corporation.findFirst({
        where: { id: corporationId },
        select: { legalName: true },
      }),
      this.prisma.corporationCompany.findMany({
        where: { corporationId, deletedAt: null },
        select: { id: true, legalName: true },
      }),
    ]);
    const companyIds = companies.map((company) => company.id);

    const accessRows =
      companyIds.length === 0
        ? []
        : await this.prisma.userCompanyAccess.findMany({
            where: { companyId: { in: companyIds } },
            select: { userId: true },
          });
    const accessUserIds = [...new Set(accessRows.map((row) => row.userId))];

    const userOrClauses: Prisma.AppUserWhereInput[] = [{ corporationId }];
    if (accessUserIds.length > 0) {
      userOrClauses.push({ cognitoSub: { in: accessUserIds } });
    }

    const users = await this.prisma.appUser.findMany({
      where: {
        deletedAt: null,
        OR: userOrClauses,
      },
      select: { cognitoSub: true, email: true },
    });

    for (const user of users) {
      const cognitoUsername =
        user.email?.trim().toLowerCase() ?? user.cognitoSub;
      try {
        await adminUserGlobalSignOut(
          this.cognitoClient,
          this.userPoolId,
          cognitoUsername,
          this.logger,
        );
        await setCognitoUserEnabled(
          this.cognitoClient,
          this.userPoolId,
          cognitoUsername,
          false,
          this.logger,
        );
      } catch (error) {
        this.logger.error(CORPORATION_SUSPEND_COGNITO_ERROR_LOG_MSG, error);
        throw new InternalServerErrorException(CORPORATION_SUSPEND_FAILED_MSG);
      }
    }

    const userIdsToBlock = users.map((user) => user.cognitoSub);
    const suspendedClosedOn = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.corporation.update({
          where: { id: corporationId },
          data: {
            status: CORPORATION_STATUS.SUSPENDED,
            suspendCloseReason: dto.suspendCloseReason,
            suspendCloseAdditionalNotes:
              dto.suspendCloseAdditionalNotes ?? null,
            suspendedClosedOn,
          },
        });

        if (companyIds.length > 0) {
          await tx.corporationCompany.updateMany({
            where: { id: { in: companyIds } },
            data: {
              status: COMPANY_STATUS.SUSPENDED,
              suspendReason: dto.suspendCloseReason,
              suspendAdditionalNotes: dto.suspendCloseAdditionalNotes ?? null,
              suspendedClosedOn,
            },
          });
        }

        if (userIdsToBlock.length > 0) {
          await tx.appUser.updateMany({
            where: {
              cognitoSub: { in: userIdsToBlock },
              deletedAt: null,
            },
            data: { status: APP_USER_STATUS.BLOCKED },
          });
        }
      });
    } catch (error) {
      this.logger.error(
        CORPORATION_SUSPEND_DB_TRANSACTION_ERROR_LOG_MSG,
        error,
      );
      throw new InternalServerErrorException(CORPORATION_SUSPEND_FAILED_MSG);
    }

    this.logger.log(
      `Corporation ${corporationId} suspended; ${companyIds.length} company(ies), ${users.length} app user(s) blocked and signed out in Cognito (reason: ${dto.suspendCloseReason})`,
    );

    const corporationDisplayName = corporation?.legalName?.trim() ?? '';
    const suspendReason = dto.suspendCloseReason.trim();

    await this.sendCorporationSuspendedEmailToAdmin(
      corporationId,
      corporationDisplayName,
      suspendReason,
    );

    await Promise.all(
      companies.map((company) =>
        this.companyService.sendCompanySuspendedEmailToAdmin(
          company.id,
          company.legalName?.trim() ?? '',
          suspendReason,
        ),
      ),
    );

    return ResponseHelper.success(CORPORATION_SUSPENDED_SUCCESS_MSG, {
      id: corporationIdForResponse,
      status: CORPORATION_STATUS.SUSPENDED,
    });
  }

  /**
   * Closes the corporation and cascades to all non-deleted companies and their users
   * (mirrors {@link suspendCorporationWithCompanyCascade} with CLOSED status).
   */
  private async closeCorporationWithCompanyCascade(
    corporationId: string,
    dto: SuspendCloseCorporationDto,
    corporationIdForResponse: string,
    billingActorUser: { cognitoSub: string; groups: string[] },
  ): Promise<ApiResponse<{ id: string; status: string }>> {
    const [corporation, companies] = await Promise.all([
      this.prisma.corporation.findFirst({
        where: { id: corporationId },
        select: { legalName: true },
      }),
      this.prisma.corporationCompany.findMany({
        where: { corporationId, deletedAt: null },
        select: { id: true, legalName: true, stripeSubscriptionId: true },
      }),
    ]);
    const companyIds = companies.map((company) => company.id);

    const accessRows =
      companyIds.length === 0
        ? []
        : await this.prisma.userCompanyAccess.findMany({
            where: { companyId: { in: companyIds } },
            select: { userId: true },
          });
    const accessUserIds = [...new Set(accessRows.map((row) => row.userId))];

    const userOrClauses: Prisma.AppUserWhereInput[] = [{ corporationId }];
    if (accessUserIds.length > 0) {
      userOrClauses.push({ cognitoSub: { in: accessUserIds } });
    }

    const users = await this.prisma.appUser.findMany({
      where: {
        deletedAt: null,
        OR: userOrClauses,
      },
      select: { cognitoSub: true, email: true },
    });

    for (const user of users) {
      const cognitoUsername =
        user.email?.trim().toLowerCase() ?? user.cognitoSub;
      try {
        await adminUserGlobalSignOut(
          this.cognitoClient,
          this.userPoolId,
          cognitoUsername,
          this.logger,
        );
        await setCognitoUserEnabled(
          this.cognitoClient,
          this.userPoolId,
          cognitoUsername,
          false,
          this.logger,
        );
      } catch (error) {
        this.logger.error(CORPORATION_CLOSE_COGNITO_ERROR_LOG_MSG, error);
        throw new InternalServerErrorException(CORPORATION_CLOSE_FAILED_MSG);
      }
    }

    const userIdsToBlock = users.map((user) => user.cognitoSub);
    const suspendedClosedOn = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.corporation.update({
          where: { id: corporationId },
          data: {
            status: CORPORATION_STATUS.CLOSED,
            suspendCloseReason: dto.suspendCloseReason,
            suspendCloseAdditionalNotes:
              dto.suspendCloseAdditionalNotes ?? null,
            suspendedClosedOn,
          },
        });

        if (companyIds.length > 0) {
          await tx.corporationCompany.updateMany({
            where: { id: { in: companyIds } },
            data: {
              status: COMPANY_STATUS.CLOSED,
              suspendReason: dto.suspendCloseReason,
              suspendAdditionalNotes: dto.suspendCloseAdditionalNotes ?? null,
              suspendedClosedOn,
            },
          });
        }

        if (userIdsToBlock.length > 0) {
          await tx.appUser.updateMany({
            where: {
              cognitoSub: { in: userIdsToBlock },
              deletedAt: null,
            },
            data: { status: APP_USER_STATUS.BLOCKED },
          });
        }
      });
    } catch (error) {
      this.logger.error(CORPORATION_CLOSE_DB_TRANSACTION_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(CORPORATION_CLOSE_FAILED_MSG);
    }

    this.logger.log(
      `Corporation ${corporationId} closed; ${companyIds.length} company(ies), ${users.length} app user(s) blocked and signed out in Cognito (reason: ${dto.suspendCloseReason})`,
    );

    const billingActor =
      await this.stripeService.resolveBillingSubscriptionActor(
        billingActorUser.cognitoSub,
        billingActorUser.groups,
      );
    await this.cancelRelatedCompanySubscriptionsOnClose(
      companies,
      dto,
      billingActor,
    );

    const corporationDisplayName = corporation?.legalName?.trim() ?? '';
    const closeReason = dto.suspendCloseReason.trim();

    await this.sendCorporationClosedEmailToAdmin(
      corporationId,
      corporationDisplayName,
      closeReason,
    );

    await Promise.all(
      companies.map((company) =>
        this.companyService.sendCompanyClosedEmailToAdmin(
          company.id,
          company.legalName?.trim() ?? '',
          corporationDisplayName,
          closeReason,
        ),
      ),
    );

    return ResponseHelper.success(CORPORATION_CLOSED_SUCCESS_MSG, {
      id: corporationIdForResponse,
      status: CORPORATION_STATUS.CLOSED,
    });
  }

  /**
   * Schedules Stripe subscription cancellation at period end for companies under a closed corporation.
   * Uses the same Stripe path as finance cancel-subscription. Failures are logged only; close already completed.
   */
  private async cancelRelatedCompanySubscriptionsOnClose(
    companies: Array<{ id: string; stripeSubscriptionId: string | null }>,
    dto: SuspendCloseCorporationDto,
    actor: BillingSubscriptionActorContext,
  ): Promise<void> {
    const cancelDto: CancelBillingSubscriptionDto = {
      reason: dto.suspendCloseReason,
      additionalNotes: dto.suspendCloseAdditionalNotes,
    };
    const companiesWithSubscription = companies.filter((company) =>
      company.stripeSubscriptionId?.trim(),
    );

    await Promise.all(
      companiesWithSubscription.map(async (company) => {
        try {
          await this.stripeService.cancelCompanySubscriptionForAdmin(
            company.id,
            cancelDto,
            actor,
          );
        } catch (error) {
          if (
            error instanceof BadRequestException &&
            (error.message === FINANCE_BILLING_NO_SUBSCRIPTION_ID_MSG ||
              error.message ===
                FINANCE_BILLING_SUBSCRIPTION_ALREADY_CANCELED_MSG)
          ) {
            this.logger.warn(
              `${CORPORATION_CLOSE_SUBSCRIPTION_CANCEL_SKIPPED_LOG_MSG} (companyId=${company.id}): ${error.message}`,
            );
            return;
          }
          this.logger.error(
            `${CORPORATION_CLOSE_SUBSCRIPTION_CANCEL_FAILED_LOG_MSG} (companyId=${company.id})`,
            error instanceof Error ? error.stack : error,
          );
        }
      }),
    );
  }

  /**
   * Notifies the earliest corporation admin (`app_users` with `corp_admin` user type) that the
   * corporation was suspended. Email failure is logged only; suspend already completed.
   */
  private async sendCorporationSuspendedEmailToAdmin(
    corporationId: string,
    corporationDisplayName: string,
    suspendReason: string,
  ): Promise<void> {
    try {
      const corpAdmin = await this.prisma.appUser.findFirst({
        where: {
          corporationId,
          deletedAt: null,
          userType: {
            contains: CORPORATION_ADMIN_APP_USER_TYPE,
            mode: 'insensitive',
          },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      const to = corpAdmin?.email?.trim().toLowerCase();
      if (!to || !corpAdmin) {
        this.logger.warn(
          `${CORPORATION_SUSPENDED_EMAIL_SEND_FAILED_LOG_MSG}: no corporation admin email (corporationId=${corporationId})`,
        );
        return;
      }

      const supportEmail = this.config
        .get<string>('SUPPORT_CONTACT_EMAIL')
        ?.trim();
      if (!supportEmail) {
        this.logger.error(
          `${CORPORATION_SUSPENDED_EMAIL_SEND_FAILED_LOG_MSG}: SUPPORT_CONTACT_EMAIL is not configured (corporationId=${corporationId})`,
        );
        return;
      }

      const recipientDisplayName =
        `${corpAdmin.firstName ?? ''} ${corpAdmin.lastName ?? ''}`.trim();

      const templateParams = {
        recipientDisplayName,
        corporationName: corporationDisplayName,
        effectiveDate: formatDateShort(new Date()),
        suspensionReason: suspendReason,
        supportEmail,
      };

      const ok = await this.emailService.sendEmail({
        to,
        subject: CORPORATION_SUSPENDED_EMAIL_SUBJECT,
        htmlBody: getCorporationSuspendedEmailHtml(templateParams),
        textBody: getCorporationSuspendedEmailText(templateParams),
      });

      if (!ok) {
        this.logger.error(
          `${CORPORATION_SUSPENDED_EMAIL_SEND_FAILED_LOG_MSG} (corporationId=${corporationId}, to=${to})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `${CORPORATION_SUSPENDED_EMAIL_SEND_FAILED_LOG_MSG} (corporationId=${corporationId})`,
        error,
      );
    }
  }

  /**
   * Notifies the earliest corporation admin (`app_users` with `corp_admin` user type) that the
   * corporation was closed. Email failure is logged only; close already completed.
   */
  private async sendCorporationClosedEmailToAdmin(
    corporationId: string,
    corporationDisplayName: string,
    closeReason: string,
  ): Promise<void> {
    try {
      const corpAdmin = await this.prisma.appUser.findFirst({
        where: {
          corporationId,
          deletedAt: null,
          userType: {
            contains: CORPORATION_ADMIN_APP_USER_TYPE,
            mode: 'insensitive',
          },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      const to = corpAdmin?.email?.trim().toLowerCase();
      if (!to || !corpAdmin) {
        this.logger.warn(
          `${CORPORATION_CLOSED_EMAIL_SEND_FAILED_LOG_MSG}: no corporation admin email (corporationId=${corporationId})`,
        );
        return;
      }

      const supportEmail = this.config
        .get<string>('SUPPORT_CONTACT_EMAIL')
        ?.trim();
      if (!supportEmail) {
        this.logger.error(
          `${CORPORATION_CLOSED_EMAIL_SEND_FAILED_LOG_MSG}: SUPPORT_CONTACT_EMAIL is not configured (corporationId=${corporationId})`,
        );
        return;
      }

      const recipientDisplayName =
        `${corpAdmin.firstName ?? ''} ${corpAdmin.lastName ?? ''}`.trim();

      const templateParams = {
        recipientDisplayName,
        corporationName: corporationDisplayName,
        closureReason: closeReason,
        supportEmail,
      };

      const ok = await this.emailService.sendEmail({
        to,
        subject: CORPORATION_CLOSED_EMAIL_SUBJECT,
        htmlBody: getCorporationClosedEmailHtml(templateParams),
        textBody: getCorporationClosedEmailText(templateParams),
      });

      if (!ok) {
        this.logger.error(
          `${CORPORATION_CLOSED_EMAIL_SEND_FAILED_LOG_MSG} (corporationId=${corporationId}, to=${to})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `${CORPORATION_CLOSED_EMAIL_SEND_FAILED_LOG_MSG} (corporationId=${corporationId})`,
        error,
      );
    }
  }

  /**
   * Reinstates a corporation by setting its status from SUSPENDED to ACTIVE and cascading
   * to every non-deleted SUSPENDED company under it and their users (mirrors
   * {@link CompanyService.reinstateCompany} and {@link suspendCorporationWithCompanyCascade}).
   *
   * @param id - Corporation ID
   * @returns Success with reinstated corporation id
   * @throws {NotFoundException} If the corporation does not exist
   * @throws {BadRequestException} If the corporation status is not SUSPENDED
   */
  async reinstate(id: string): Promise<ApiResponse<{ id: string }>> {
    const corporation = await this.prisma.corporation.findUnique({
      where: { id },
      select: { id: true, status: true, legalName: true },
    });

    if (!corporation) {
      throw new NotFoundException(`Corporation with ID "${id}" not found`);
    }

    if (corporation.status !== CORPORATION_STATUS.SUSPENDED) {
      throw new BadRequestException(CORPORATION_REINSTATE_NOT_SUSPENDED_MSG);
    }

    const suspendedCompanies = await this.prisma.corporationCompany.findMany({
      where: {
        corporationId: id,
        deletedAt: null,
        status: COMPANY_STATUS.SUSPENDED,
      },
      select: { id: true, legalName: true },
    });
    const companyIds = suspendedCompanies.map((company) => company.id);

    const accessRows =
      companyIds.length === 0
        ? []
        : await this.prisma.userCompanyAccess.findMany({
            where: { companyId: { in: companyIds } },
            select: { userId: true },
          });
    const accessUserIds = [...new Set(accessRows.map((row) => row.userId))];

    const userOrClauses: Prisma.AppUserWhereInput[] = [{ corporationId: id }];
    if (accessUserIds.length > 0) {
      userOrClauses.push({ cognitoSub: { in: accessUserIds } });
    }

    const users = await this.prisma.appUser.findMany({
      where: {
        deletedAt: null,
        OR: userOrClauses,
      },
      select: { cognitoSub: true, email: true },
    });

    const userIdsToActivate = users.map((user) => user.cognitoSub);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.corporation.update({
          where: { id },
          data: { status: CORPORATION_STATUS.ACTIVE },
        });

        if (companyIds.length > 0) {
          await tx.corporationCompany.updateMany({
            where: { id: { in: companyIds } },
            data: { status: COMPANY_STATUS.ACTIVE },
          });
        }

        if (userIdsToActivate.length > 0) {
          await tx.appUser.updateMany({
            where: {
              cognitoSub: { in: userIdsToActivate },
              deletedAt: null,
            },
            data: { status: APP_USER_STATUS.ACTIVE },
          });
        }
      });
    } catch (error) {
      this.logger.error(
        CORPORATION_REINSTATE_DB_TRANSACTION_ERROR_LOG_MSG,
        error,
      );
      throw new InternalServerErrorException(CORPORATION_REINSTATE_FAILED_MSG);
    }

    for (const user of users) {
      const cognitoUsername =
        user.email?.trim().toLowerCase() ?? user.cognitoSub;
      try {
        await setCognitoUserEnabled(
          this.cognitoClient,
          this.userPoolId,
          cognitoUsername,
          true,
          this.logger,
        );
      } catch (error) {
        this.logger.error(CORPORATION_REINSTATE_COGNITO_ERROR_LOG_MSG, error);
        throw new InternalServerErrorException(
          CORPORATION_REINSTATE_FAILED_MSG,
        );
      }
    }

    this.logger.log(
      `Corporation ${id} reinstated; ${companyIds.length} company(ies), ${users.length} app user(s) set Active and enabled in Cognito`,
    );

    const corporationDisplayName = corporation.legalName?.trim() ?? '';

    await this.sendCorporationReinstatedEmailToAdmin(
      id,
      corporationDisplayName,
    );

    await Promise.all(
      suspendedCompanies.map((company) =>
        this.companyService.sendCompanyReinstatedEmailToAdmin(
          company.id,
          company.legalName?.trim() ?? '',
        ),
      ),
    );

    return ResponseHelper.success(CORPORATION_REINSTATED_SUCCESS_MSG, {
      id: corporation.id,
    });
  }

  /**
   * Notifies the earliest corporation admin (`app_users` with `corp_admin` user type) that the
   * corporation was reinstated. Email failure is logged only; reinstate already completed.
   */
  private async sendCorporationReinstatedEmailToAdmin(
    corporationId: string,
    corporationDisplayName: string,
  ): Promise<void> {
    try {
      const corpAdmin = await this.prisma.appUser.findFirst({
        where: {
          corporationId,
          deletedAt: null,
          userType: {
            contains: CORPORATION_ADMIN_APP_USER_TYPE,
            mode: 'insensitive',
          },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      const to = corpAdmin?.email?.trim().toLowerCase();
      if (!to || !corpAdmin) {
        this.logger.warn(
          `${CORPORATION_REINSTATED_EMAIL_SEND_FAILED_LOG_MSG}: no corporation admin email (corporationId=${corporationId})`,
        );
        return;
      }

      const supportEmail = this.config
        .get<string>('SUPPORT_CONTACT_EMAIL')
        ?.trim();
      if (!supportEmail) {
        this.logger.error(
          `${CORPORATION_REINSTATED_EMAIL_SEND_FAILED_LOG_MSG}: SUPPORT_CONTACT_EMAIL is not configured (corporationId=${corporationId})`,
        );
        return;
      }

      const recipientDisplayName =
        `${corpAdmin.firstName ?? ''} ${corpAdmin.lastName ?? ''}`.trim();

      const templateParams = {
        recipientDisplayName,
        corporationName: corporationDisplayName,
        effectiveDate: formatDateShort(new Date()),
        supportEmail,
      };

      const ok = await this.emailService.sendEmail({
        to,
        subject: CORPORATION_REINSTATED_EMAIL_SUBJECT,
        htmlBody: getCorporationReinstatedEmailHtml(templateParams),
        textBody: getCorporationReinstatedEmailText(templateParams),
      });

      if (!ok) {
        this.logger.error(
          `${CORPORATION_REINSTATED_EMAIL_SEND_FAILED_LOG_MSG} (corporationId=${corporationId}, to=${to})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `${CORPORATION_REINSTATED_EMAIL_SEND_FAILED_LOG_MSG} (corporationId=${corporationId})`,
        error,
      );
    }
  }

  /**
   * Updates submitted steps for a corporation based on type and mode.
   * When type is "company": sets submittedSteps to 2 only if current submittedSteps is 1.
   * When type is "branding": sets submittedSteps to 3 only if current submittedSteps is 2 (optional step; progress stored even when user skips logo).
   * When type is "confirmation": sends the corporation admin invitation when eligible (matching
   * `app_users`: `corp_admin`, not deleted, `invitation_sent_at` null), then if mode is "quick"
   * sets submittedSteps to 3, otherwise to 5, and sets status to ACTIVE.
   *
   * @param id - Corporation ID
   * @param updateStepsDto - DTO containing type (mandatory)
   * @returns Updated corporation with submittedSteps
   * @throws {NotFoundException} If the corporation does not exist
   */
  async updateSteps(
    id: string,
    updateStepsDto: UpdateStepsDto,
  ): Promise<ApiResponse<Corporation>> {
    try {
      const { type } = updateStepsDto;

      const corporation = await this.prisma.corporation.findUnique({
        where: { id },
        select: { id: true, status: true, mode: true, submittedSteps: true },
      });

      if (!corporation) {
        throw new NotFoundException(`Corporation with ID "${id}" not found`);
      }

      if (corporation.status === CORPORATION_STATUS.CLOSED) {
        throw new BadRequestException(CORPORATION_CANNOT_UPDATE_CLOSED_MSG);
      }

      if (type === 'company') {
        if (corporation.submittedSteps === 1) {
          const submittedSteps = 2;
          const updated = await this.prisma.corporation.update({
            where: { id },
            data: { submittedSteps },
          });
          this.logger.log(
            `Updated submittedSteps to ${submittedSteps} for corporation ${id} (type: ${type})`,
          );
          return ResponseHelper.success(
            CORPORATION_STEPS_UPDATED_SUCCESS_MSG,
            updated,
          );
        }
        const corporationData = await this.prisma.corporation.findUnique({
          where: { id },
        });
        return ResponseHelper.success(
          CORPORATION_STEPS_UPDATED_SUCCESS_MSG,
          corporationData!,
        );
      }

      if (type === 'branding') {
        if (corporation.submittedSteps === 2) {
          const submittedSteps = 3;
          const updated = await this.prisma.corporation.update({
            where: { id },
            data: { submittedSteps },
          });
          this.logger.log(
            `Updated submittedSteps to ${submittedSteps} for corporation ${id} (type: ${type})`,
          );
          return ResponseHelper.success(
            CORPORATION_STEPS_UPDATED_SUCCESS_MSG,
            updated,
          );
        }
        const corporationData = await this.prisma.corporation.findUnique({
          where: { id },
        });
        return ResponseHelper.success(
          CORPORATION_STEPS_UPDATED_SUCCESS_MSG,
          corporationData!,
        );
      }

      if (type === 'confirmation') {
        const submittedSteps = corporation.mode === 'quick' ? 3 : 5;
        await this.corporationAdminOnboarding.sendPendingCorporationAdminInvite(
          id,
        );
        const updated = await this.prisma.corporation.update({
          where: { id },
          data: { submittedSteps, status: CORPORATION_STATUS.ACTIVE },
        });
        this.logger.log(
          `Updated submittedSteps to ${submittedSteps} for corporation ${id} (type: ${type}, mode: ${corporation.mode})`,
        );
        return ResponseHelper.success(
          CORPORATION_STEPS_UPDATED_SUCCESS_MSG,
          updated,
        );
      }

      const corporationData = await this.prisma.corporation.findUnique({
        where: { id },
      });
      return ResponseHelper.success(
        CORPORATION_STEPS_UPDATED_SUCCESS_MSG,
        corporationData!,
      );
    } catch (error) {
      this.logger.error('Error updating corporation steps', error);
      throw error;
    }
  }

  /**
   * Uploads a brand logo for a corporation. Accepts PNG or JPG up to 10 MB.
   * Uploads to S3 frontend bucket under brand-logos/ with a unique filename.
   * If the corporation already has a brand logo, the old file is deleted from S3 before uploading the new one.
   * If submittedSteps is 2, it is updated to 3.
   *
   * @param id - Corporation ID
   * @param file - Uploaded file (multipart)
   * @returns Success response with updated brandLogo path
   * @throws {NotFoundException} If the corporation does not exist
   * @throws {BadRequestException} If file is missing, invalid type, or exceeds 10 MB
   */
  async uploadBrandLogo(
    id: string,
    file: Express.Multer.File,
  ): Promise<ApiResponse<{ brandLogo: string }>> {
    if (!file?.buffer) {
      throw new BadRequestException(BRAND_LOGO_FILE_REQUIRED_MSG);
    }

    const mimetype = file.mimetype?.toLowerCase();
    if (
      !BRAND_LOGO_ALLOWED_MIMES.includes(
        mimetype as (typeof BRAND_LOGO_ALLOWED_MIMES)[number],
      )
    ) {
      throw new BadRequestException(BRAND_LOGO_INVALID_TYPE_MSG);
    }

    if (file.size > BRAND_LOGO_MAX_SIZE_BYTES) {
      throw new BadRequestException(
        BRAND_LOGO_MAX_SIZE_MSG(BRAND_LOGO_MAX_SIZE_BYTES / (1024 * 1024)),
      );
    }

    const corporation = await this.prisma.corporation.findUnique({
      where: { id },
      select: { id: true, status: true, brandLogo: true, submittedSteps: true },
    });

    if (!corporation) {
      throw new NotFoundException(`Corporation with ID "${id}" not found`);
    }

    if (corporation.status === CORPORATION_STATUS.CLOSED) {
      throw new BadRequestException(CORPORATION_CANNOT_UPDATE_CLOSED_MSG);
    }

    const existingFilename = corporation.brandLogo?.trim();
    if (existingFilename) {
      const existingKey = existingFilename.startsWith(
        this.s3Service.getBrandLogosPrefix(),
      )
        ? existingFilename
        : this.s3Service.buildBrandLogoKey(existingFilename);
      const exists = await this.s3Service.objectExists(existingKey);
      if (exists) {
        try {
          await this.s3Service.delete(existingKey);
        } catch (err) {
          this.logger.warn(
            `Failed to delete existing brand logo from S3 (key: ${existingKey}): ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }

    const ext = BRAND_LOGO_EXTENSION_BY_MIME[mimetype] ?? 'png';
    const uniqueFilename = `${crypto.randomUUID()}.${ext}`;
    const key = this.s3Service.buildBrandLogoKey(uniqueFilename);

    await this.s3Service.upload(key, file.buffer, mimetype);

    const updateData: { brandLogo: string; submittedSteps?: number } = {
      brandLogo: uniqueFilename,
    };
    if (corporation.submittedSteps === 2) {
      updateData.submittedSteps = 3;
    }
    await this.prisma.corporation.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(
      `Brand logo uploaded for corporation ${id}: ${uniqueFilename}`,
    );

    const brandLogoUrl = this.s3Service.getPublicUrl(key);
    return ResponseHelper.success(CORPORATION_BRAND_LOGO_UPLOADED_SUCCESS_MSG, {
      brandLogo: brandLogoUrl,
    });
  }

  /**
   * Deletes the brand logo for a corporation. Removes the file from S3 (if present)
   * and clears the brandLogo field in the database.
   *
   * @param id - Corporation ID
   * @returns Success response
   * @throws {NotFoundException} If the corporation does not exist
   */
  async deleteBrandLogo(id: string): Promise<ApiResponse<void>> {
    const corporation = await this.prisma.corporation.findUnique({
      where: { id },
      select: { id: true, status: true, brandLogo: true },
    });

    if (!corporation) {
      throw new NotFoundException(`Corporation with ID "${id}" not found`);
    }

    if (corporation.status === CORPORATION_STATUS.CLOSED) {
      throw new BadRequestException(CORPORATION_CANNOT_UPDATE_CLOSED_MSG);
    }

    const existingFilename = corporation.brandLogo?.trim();
    if (existingFilename) {
      const existingKey = existingFilename.startsWith(
        this.s3Service.getBrandLogosPrefix(),
      )
        ? existingFilename
        : this.s3Service.buildBrandLogoKey(existingFilename);
      const exists = await this.s3Service.objectExists(existingKey);
      if (exists) {
        try {
          await this.s3Service.delete(existingKey);
        } catch (err) {
          this.logger.warn(
            `Failed to delete brand logo from S3 (key: ${existingKey}): ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }

    await this.prisma.corporation.update({
      where: { id },
      data: { brandLogo: null },
    });

    this.logger.log(`Brand logo deleted for corporation ${id}`);

    return ResponseHelper.success(CORPORATION_BRAND_LOGO_DELETED_SUCCESS_MSG);
  }

  /**
   * Corporation Admin dashboard analytics scoped to the caller's corporation.
   * Optional companyId must belong to that corporation. Assessment counts use the
   * same rules as Super Admin system analytics (`report_generated` = completed).
   */
  async getDashboardAnalyticsForRequester(
    query: CorporationDashboardAnalyticsQueryDto,
    cognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const groupSet = new Set(groups ?? []);
    if (!groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN)) {
      throw new ForbiddenException(
        CORPORATION_DASHBOARD_ANALYTICS_FORBIDDEN_MSG,
      );
    }

    const myCorporationId =
      await this.resolveCorporationIdForCorpAdminCognitoSub(cognitoSub.trim());
    if (!myCorporationId) {
      throw new ForbiddenException(
        CORPORATION_DETAIL_CORP_ADMIN_UNASSIGNED_MSG,
      );
    }

    const companyId = query.companyId?.trim();
    if (companyId) {
      const company = await this.prisma.corporationCompany.findFirst({
        where: {
          id: companyId,
          corporationId: myCorporationId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!company) {
        throw new ForbiddenException(COMPANY_DETAIL_CORP_ADMIN_WRONG_CORP_MSG);
      }
    }

    try {
      const { companies, users, assessments } = await countSystemAnalytics(
        this.prisma,
        {
          corporationId: myCorporationId,
          companyId,
          timeFilter: query.timeFilter,
        },
      );
      return ResponseHelper.success(
        CORPORATION_DASHBOARD_ANALYTICS_SUCCESS_MSG,
        { companies, users, assessments },
      );
    } catch (error) {
      this.logger.error(
        `Corporation dashboard analytics failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
