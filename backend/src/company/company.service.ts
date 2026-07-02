import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma';
import { S3Service } from '../s3';
import {
  CreateCompanyDto,
  ListCompanyQueryDto,
  ListCompanyDirectoryQueryDto,
  UpdateCompanyDto,
  UpdateCompanyStep1Dto,
  CompanyDirectorySortBy,
  CompanyDirectorySortOrder,
  CreateNewCompanyDto,
  UpsertCompanyKeyContactItemDto,
  UpsertCompanyPlanSeatDto,
  UpsertCompanyConfigurationDto,
  SuspendCompanyDto,
  CompanyDashboardAnalyticsQueryDto,
} from './dto';
import {
  ResponseHelper,
  ApiResponse,
  formatDateShort,
  parseRequiredDateString,
  adminUserGlobalSignOut,
  setCognitoUserEnabled,
  getCreatedDateFilterStartDate,
  countSystemAnalytics,
} from '../common';
import { CorporationCompany } from '@prisma/client';
import {
  BRAND_LOGO_ALLOWED_MIMES,
  BRAND_LOGO_EXTENSION_BY_MIME,
  BRAND_LOGO_INVALID_TYPE_MSG,
  BRAND_LOGO_MAX_SIZE_BYTES,
  BRAND_LOGO_MAX_SIZE_MSG,
  BRAND_LOGO_SINGLE_FILE_ONLY_MSG,
  CORPORATION_ADMIN_APP_USER_TYPE,
  CORPORATION_CANNOT_UPDATE_CLOSED_MSG,
  CORPORATION_STATUS,
} from '../corporation/constants';
import {
  COMPANY_CREATED_SUCCESS_MSG,
  COMPANY_UPDATED_SUCCESS_MSG,
  COMPANY_DELETED_SUCCESS_MSG,
  COMPANY_FETCHED_SUCCESS_MSG,
  COMPANY_LIST_FETCHED_SUCCESS_MSG,
  COMPANY_ACTIVE_SUMMARIES_FETCHED_SUCCESS_MSG,
  COMPANY_ALL_FETCHED_SUCCESS_MSG,
  COMPANY_ALL_FETCH_ERROR_LOG_MSG,
  COMPANY_DIRECTORY_LIST_FETCHED_SUCCESS_MSG,
  COMPANY_DIRECTORY_LIST_FAILED_MSG,
  COMPANY_DIRECTORY_FILTER_OPTIONS_FETCHED_SUCCESS_MSG,
  COMPANY_DIRECTORY_FILTER_OPTIONS_FAILED_MSG,
  COMPANY_ID_REQUIRED_MSG,
  CORPORATION_ID_REQUIRED_MSG,
  LEGAL_NAME_DUPLICATE_MSG,
  CANNOT_DELETE_LAST_COMPANY_MSG,
  COMPANY_KEY_CONTACTS_UPDATED_SUCCESS_MSG,
  COMPANY_PLAN_SEAT_UPDATED_SUCCESS_MSG,
  COMPANY_PLAN_SEAT_ACTIVE_SUBSCRIPTION_SKIP_MSG,
  COMPANY_PLAN_SEAT_AMOUNTS_NON_NEGATIVE_MSG,
  COMPANY_PLAN_SEAT_DISCOUNT_EXCEEDS_PLAN_PRICE_MSG,
  COMPANY_PLAN_SEAT_TRIAL_DATES_BOTH_OR_OMIT_MSG,
  COMPANY_PLAN_SEAT_TRIAL_END_ON_OR_AFTER_START_MSG,
  COMPANY_PLAN_SEAT_TRIAL_DATES_REQUIRED_WHEN_NOT_ZERO_TRIAL_MSG,
  COMPANY_CONFIGURATION_UPDATED_SUCCESS_MSG,
  COMPANY_BRAND_LOGO_DELETED_SUCCESS_MSG,
  COMPANY_CONFIRMATION_SUCCESS_MSG,
  COMPANY_ADMIN_ACCESS_NOT_FOUND_FOR_UPDATE_MSG,
  SAME_AS_CORP_ADMIN_MISMATCH_STEP1_MSG,
  COMPANY_ADMIN_PROFILE_FIELDS_NOT_EDITABLE_SAME_AS_CORP_STEP1_MSG,
  COMPANY_STEP1_PATCH_AT_LEAST_ONE_FIELD_MSG,
  COMPANY_SUSPENDED_SUCCESS_MSG,
  COMPANY_ALREADY_SUSPENDED_MSG,
  COMPANY_SUSPEND_REQUIRES_ACTIVE_MSG,
  COMPANY_SUSPEND_FAILED_MSG,
  COMPANY_SUSPEND_COGNITO_ERROR_LOG_MSG,
  COMPANY_SUSPEND_DB_TRANSACTION_ERROR_LOG_MSG,
  COMPANY_SUBSCRIPTION_LAPSE_DISABLE_LOG_MSG,
  COMPANY_SUBSCRIPTION_RESTORE_ENABLE_LOG_MSG,
  COMPANY_REINSTATED_SUCCESS_MSG,
  COMPANY_ALREADY_ACTIVE_REINSTATE_MSG,
  COMPANY_REINSTATE_NOT_SUSPENDED_MSG,
  COMPANY_REINSTATE_CORPORATION_SUSPENDED_MSG,
  COMPANY_REINSTATE_FAILED_MSG,
  COMPANY_REINSTATE_COGNITO_ERROR_LOG_MSG,
  COMPANY_REINSTATE_DB_TRANSACTION_ERROR_LOG_MSG,
  COMPANY_DETAIL_FORBIDDEN_MSG,
  COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG,
  COMPANY_DETAIL_CORP_ADMIN_WRONG_CORP_MSG,
  COMPANY_DETAIL_COMPANY_ADMIN_FORBIDDEN_MSG,
  COMPANY_DETAIL_SUPER_ADMIN_ME_PATH_MSG,
  COMPANY_DETAIL_CORP_ADMIN_ME_PATH_MSG,
  COMPANY_DETAIL_COMPANY_ADMIN_ME_UNASSIGNED_MSG,
  COMPANY_DASHBOARD_ANALYTICS_SUCCESS_MSG,
  COMPANY_DASHBOARD_ANALYTICS_FORBIDDEN_MSG,
  COMPANY_DASHBOARD_ANALYTICS_FETCH_FAILED_LOG,
  COMPANY_LIST_FORBIDDEN_MSG,
  COMPANY_DIRECTORY_LIST_FORBIDDEN_MSG,
  COMPANY_DIRECTORY_FILTER_OPTIONS_FORBIDDEN_MSG,
  COMPANY_ACTIVE_SUMMARIES_FORBIDDEN_MSG,
  COMPANY_ALL_FORBIDDEN_MSG,
  COMPANY_SUSPENDED_EMAIL_SUBJECT,
  COMPANY_SUSPENDED_EMAIL_SEND_FAILED_LOG_MSG,
  COMPANY_CLOSED_EMAIL_SUBJECT,
  COMPANY_CLOSED_EMAIL_SEND_FAILED_LOG_MSG,
  COMPANY_REINSTATED_EMAIL_SUBJECT,
  COMPANY_REINSTATED_EMAIL_SEND_FAILED_LOG_MSG,
} from './constants';
import { COMPANY_STATUS } from './constants/company.status';
import { EmailService } from '../email';
import {
  getCompanySuspendedEmailHtml,
  getCompanySuspendedEmailText,
} from './templates/company-suspended-email.template';
import {
  getCompanyClosedEmailHtml,
  getCompanyClosedEmailText,
} from './templates/company-closed-email.template';
import {
  getCompanyReinstatedEmailHtml,
  getCompanyReinstatedEmailText,
} from './templates/company-reinstated-email.template';
import { COMPANY_KEY_CONTACT_TYPES } from './constants/company.enums';
import { CompanyAdminOnboardingService } from '../company-admin-onboarding';
import { APP_USER_STATUS } from '../user/constants/app-user.constants';
import { COGNITO_GROUP_NAMES } from '../user/cognito-groups.constants';
import {
  isSubscriptionStatusActive,
  normalizeSubscriptionStatus,
} from '../auth/subscription.constants';

type CompanyLinkedEndUser = {
  cognitoSub: string;
  email: string | null;
};

/** Fields returned in `data` after PATCH .../corporations/:corporationId/companies/:companyId. */
const COMPANY_UPDATE_RESULT_SELECT = {
  id: true,
  corporationId: true,
  companyCode: true,
  legalName: true,
  dbaName: true,
} satisfies Prisma.CorporationCompanySelect;

type CompanyUpdatePayload = Prisma.CorporationCompanyGetPayload<{
  select: typeof COMPANY_UPDATE_RESULT_SELECT;
}>;

const companyListAdminAccessSelect =
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

type CompanyListAdminAccessRow = Prisma.UserCompanyAccessGetPayload<{
  select: typeof companyListAdminAccessSelect;
}>;

/** Admin profile fields for Step 1 PATCH — gated by `sameAsCorpAdmin`, synced to `app_users` + company row. */
const UPDATE_COMPANY_STEP1_ADMIN_PROFILE_KEYS = [
  'firstName',
  'lastName',
  'jobRole',
  'nickname',
  'workPhone',
  'cellPhone',
] as const satisfies readonly (keyof UpdateCompanyStep1Dto)[];

/** Company-only scalars for Step 1 PATCH (excludes `sameAsCorpAdmin` and admin profile keys). */
const UPDATE_COMPANY_STEP1_COMPANY_SCALAR_KEYS = [
  'legalName',
  'dbaName',
  'website',
  'companyType',
  'officeType',
  'industry',
  'phoneNo',
  'submittedSteps',
  'status',
  'addressLine',
  'state',
  'city',
  'country',
  'zip',
] as const satisfies readonly (keyof UpdateCompanyStep1Dto)[];

function buildUpdateCompanyStep1CompanyRowData(
  dto: UpdateCompanyStep1Dto,
): Prisma.CorporationCompanyUncheckedUpdateInput {
  const data: Prisma.CorporationCompanyUncheckedUpdateInput = {};
  for (const key of UPDATE_COMPANY_STEP1_COMPANY_SCALAR_KEYS) {
    const value = dto[key];
    if (value !== undefined) {
      (data as Record<string, unknown>)[key] = value;
    }
  }
  return data;
}

/** Partial AppUser update from Step 1 body; property names match `AppUser` except DTO `jobRole` → same field. */
function buildUpdateCompanyStep1AppUserPatch(
  dto: UpdateCompanyStep1Dto,
): Prisma.AppUserUpdateInput {
  const patch: Prisma.AppUserUpdateInput = {};
  for (const key of UPDATE_COMPANY_STEP1_ADMIN_PROFILE_KEYS) {
    const value = dto[key];
    if (value !== undefined) {
      (patch as Record<string, unknown>)[key] = value;
    }
  }
  return patch;
}

function updateCompanyStep1HasPersistableFields(
  dto: UpdateCompanyStep1Dto,
): boolean {
  return Object.entries(dto).some(
    ([key, value]) => key !== 'sameAsCorpAdmin' && value !== undefined,
  );
}

function updateCompanyStep1DtoHasAdminProfilePatch(
  dto: UpdateCompanyStep1Dto,
): boolean {
  return UPDATE_COMPANY_STEP1_ADMIN_PROFILE_KEYS.some(
    (key) => dto[key] !== undefined,
  );
}

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly companyAdminOnboarding: CompanyAdminOnboardingService,
    private readonly emailService: EmailService,
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
   * Builds Prisma orderBy for company directory list. Default: createdAt desc.
   */
  private buildDirectoryOrderBy(
    sortBy: CompanyDirectorySortBy,
    sortOrder: CompanyDirectorySortOrder,
  ): Prisma.CorporationCompanyOrderByWithRelationInput {
    const dir = sortOrder;
    switch (sortBy) {
      case 'companyCode':
        return { companyCode: dir };
      case 'legalName':
        return { legalName: dir };
      case 'status':
        return { status: dir };
      case 'corporationName':
        return { corporation: { legalName: dir } };
      case 'plan':
        return { plan: { planType: { name: dir } } };
      case 'updatedAt':
        return { updatedAt: dir };
      case 'createdAt':
      default:
        return { createdAt: dir };
    }
  }

  /**
   * Formats company code as display ID (e.g. COMP-001).
   */
  private formatCompanyId(companyCode: number): string {
    return `COMP-${String(companyCode).padStart(3, '0')}`;
  }

  /**
   * Fetches a paginated list of all companies (Company Directory) with server-side
   * pagination, default sort by Created On descending. Supports search and filters
   * by status (company), corporation, plan, and created date range.
   */
  async findAllPaginated(
    query: ListCompanyDirectoryQueryDto,
  ): Promise<ApiResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.CorporationCompanyWhereInput = {
      deletedAt: null,
    };

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      const searchConditions: Prisma.CorporationCompanyWhereInput[] = [
        { legalName: { contains: searchTerm, mode: 'insensitive' } },
        {
          corporation: {
            legalName: { contains: searchTerm, mode: 'insensitive' },
          },
        },
      ];
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { OR: searchConditions },
      ];
    }

    if (query.status && query.status !== 'all') {
      where.status = query.status.toUpperCase();
    }
    const corporationFilter: Prisma.CorporationWhereInput = {};
    if (query.corporationId) {
      where.corporationId = query.corporationId;
      corporationFilter.id = query.corporationId;
    }
    if (Object.keys(corporationFilter).length > 0) {
      where.corporation = corporationFilter;
    }

    if (query.planTypeId?.trim()) {
      where.plan = { planTypeId: query.planTypeId.trim() };
    }

    const createdFrom = query.createdFilter
      ? getCreatedDateFilterStartDate(query.createdFilter)
      : undefined;
    if (createdFrom) {
      where.createdAt = { gte: createdFrom };
    }

    try {
      const [companies, total] = await Promise.all([
        this.prisma.corporationCompany.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: this.buildDirectoryOrderBy(sortBy, sortOrder),
          select: {
            id: true,
            companyCode: true,
            legalName: true,
            city: true,
            country: true,
            submittedSteps: true,
            createdAt: true,
            updatedAt: true,
            corporation: {
              select: {
                id: true,
                legalName: true,
                corporationCode: true,
              },
            },
            status: true,
            plan: {
              select: {
                id: true,
                planTypeId: true,
                customerType: true,
                planType: { select: { name: true } },
              },
            },
          },
        }),
        this.prisma.corporationCompany.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);
      const items = companies.map((c) => ({
        id: c.id,
        companyId: this.formatCompanyId(c.companyCode),
        name: c.legalName,
        location: [c.city, c.country].filter(Boolean).join(', ') || null,
        submittedSteps: c.submittedSteps,
        status: c?.status ?? null,
        assignedCorporation: c.corporation
          ? {
              id: c.corporation.id,
              name: c.corporation.legalName,
              corporationCode: `CORP-${String(c.corporation.corporationCode).padStart(3, '0')}`,
            }
          : null,
        plan: c.plan
          ? {
              id: c.plan.id,
              planTypeId: c.plan.planTypeId,
              name: c.plan.planType?.name ?? null,
              customerType: c.plan.customerType ?? null,
            }
          : null,
        createdAt: formatDateShort(c.createdAt),
        updatedAt: formatDateShort(c.updatedAt),
      }));

      return ResponseHelper.success(
        COMPANY_DIRECTORY_LIST_FETCHED_SUCCESS_MSG,
        {
          items,
          pagination: {
            total,
            page,
            pageSize: limit,
            totalPages,
          },
        },
      );
    } catch (error) {
      this.logger.error('Error fetching company directory list', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(COMPANY_DIRECTORY_LIST_FAILED_MSG);
    }
  }

  /**
   * Authorizes GET `/companies` (Company Directory list) then delegates to {@link findAllPaginated}.
   * **SuperAdmin:** full directory. **CorporationAdmin:** only companies in their corporation; if
   * `query.corporationId` is set it must equal their linked corporation. **Others:** {@link ForbiddenException}.
   */
  async findAllPaginatedForRequester(
    query: ListCompanyDirectoryQueryDto,
    cognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const groupSet = new Set(groups ?? []);
    if (groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      return this.findAllPaginated(query);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN)) {
      const myCorporationId =
        await this.resolveCorporationIdForCorpAdminCognitoSub(
          cognitoSub.trim(),
        );
      if (!myCorporationId) {
        throw new ForbiddenException(COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG);
      }
      const requestedCorp = query.corporationId?.trim();
      if (requestedCorp && requestedCorp !== myCorporationId) {
        throw new ForbiddenException(COMPANY_DETAIL_CORP_ADMIN_WRONG_CORP_MSG);
      }
      return this.findAllPaginated({
        ...query,
        corporationId: myCorporationId,
      });
    }
    throw new ForbiddenException(COMPANY_DIRECTORY_LIST_FORBIDDEN_MSG);
  }

  /** Display labels for company status (Company Directory status filter). */
  private static readonly COMPANY_STATUS_LABELS: Record<string, string> = {
    [COMPANY_STATUS.ACTIVE]: 'Active',
    [COMPANY_STATUS.INCOMPLETE]: 'Incomplete',
    [COMPANY_STATUS.SUSPENDED]: 'Suspended',
    [COMPANY_STATUS.CLOSED]: 'Closed',
  };

  /**
   * Authorizes GET `/companies/filter-options`.
   * SuperAdmin gets corporation options; CorporationAdmin/CompanyAdmin get an empty corporation list.
   */
  async getDirectoryFilterOptionsForRequester(
    groups: string[],
  ): Promise<ApiResponse> {
    const groupSet = new Set(groups ?? []);
    const isSuperAdmin = groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN);
    const isAllowed =
      isSuperAdmin ||
      groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN) ||
      groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN);

    if (!isAllowed) {
      throw new ForbiddenException(
        COMPANY_DIRECTORY_FILTER_OPTIONS_FORBIDDEN_MSG,
      );
    }

    return this.getDirectoryFilterOptions(isSuperAdmin);
  }

  /**
   * Returns dropdown options for Company Directory filters: status, corporation, and plan.
   * Used by the frontend to populate Status, Corporation, and Plan filter dropdowns.
   */
  async getDirectoryFilterOptions(
    includeCorporations = true,
  ): Promise<ApiResponse> {
    try {
      const statuses = Object.values(COMPANY_STATUS).map((value) => ({
        value: value.toLowerCase(),
        label: CompanyService.COMPANY_STATUS_LABELS[value] ?? value,
      }));

      const corporationOptions = includeCorporations
        ? (
            await this.prisma.corporation.findMany({
              where: { status: CORPORATION_STATUS.ACTIVE },
              orderBy: { legalName: 'asc' },
              select: { id: true, legalName: true, corporationCode: true },
            })
          ).map((c) => ({
            id: c.id,
            label: `${c.legalName} (CORP-${String(c.corporationCode).padStart(3, '0')})`,
          }))
        : [];

      const planTypes = await this.prisma.planType.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
      const planOptions = planTypes.map((pt) => ({
        value: pt.id,
        label: pt.name,
      }));

      return ResponseHelper.success(
        COMPANY_DIRECTORY_FILTER_OPTIONS_FETCHED_SUCCESS_MSG,
        {
          statuses,
          corporations: corporationOptions,
          plans: planOptions,
        },
      );
    } catch (error) {
      this.logger.error(
        'Error fetching company directory filter options',
        error,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        COMPANY_DIRECTORY_FILTER_OPTIONS_FAILED_MSG,
      );
    }
  }

  /**
   * Fetches a list of companies for a corporation with optional search and filters.
   * Default: all companies (no filters). Supports search on company name, filter by company type,
   * region (corporation dataResidencyRegion), and plan type (plan_types.id). No sorting.
   * List item contact fields come from the company admin app user (earliest isAdmin user_company_access).
   *
   * @param corporationId - The corporation ID from the path parameter
   * @param query - Search and filters
   * @returns List of items (no pagination)
   */
  async findAll(
    corporationId: string,
    query: ListCompanyQueryDto,
  ): Promise<ApiResponse> {
    if (!corporationId) {
      throw new BadRequestException(CORPORATION_ID_REQUIRED_MSG);
    }

    const where: {
      corporationId: string;
      deletedAt: null;
      legalName?: { contains: string; mode: 'insensitive' };
      companyType?: string;
      corporation?: { dataResidencyRegion: string };
      plan?: { planTypeId: string };
    } = {
      corporationId,
      deletedAt: null,
    };

    if (query.search?.trim()) {
      where.legalName = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }
    if (query.companyType?.trim()) {
      where.companyType = query.companyType.trim();
    }
    if (query.region?.trim()) {
      where.corporation = { dataResidencyRegion: query.region.trim() };
    }
    if (query.planTypeId?.trim()) {
      where.plan = { planTypeId: query.planTypeId.trim() };
    }

    try {
      const corporation = await this.prisma.corporation.findUnique({
        where: { id: corporationId },
        select: { id: true },
      });
      if (!corporation) {
        throw new NotFoundException(
          `Corporation with ID "${corporationId}" not found`,
        );
      }

      const companies = await this.prisma.corporationCompany.findMany({
        where,
        select: {
          id: true,
          corporationId: true,
          companyCode: true,
          legalName: true,
          companyType: true,
          officeType: true,
          industry: true,
          phoneNo: true,
          sameAsCorpAdmin: true,
          planId: true,
          securityPosture: true,
          submittedSteps: true,
          status: true,
          addressLine: true,
          state: true,
          city: true,
          country: true,
          zip: true,
          corporation: {
            select: {
              dataResidencyRegion: true,
            },
          },
          plan: {
            select: {
              id: true,
              planTypeId: true,
              employeeRangeMin: true,
              employeeRangeMax: true,
              planType: { select: { name: true } },
            },
          },
        },
      });

      const companyIds = companies.map((c) => c.id);
      let adminAccessRows: CompanyListAdminAccessRow[] = [];
      if (companyIds.length > 0) {
        adminAccessRows = await this.prisma.userCompanyAccess.findMany({
          where: {
            companyId: { in: companyIds },
            isAdmin: true,
            user: { deletedAt: null },
          },
          orderBy: { createdAt: 'asc' },
          select: companyListAdminAccessSelect,
        });
      }

      const adminUserByCompanyId = new Map<
        string,
        CompanyListAdminAccessRow['user']
      >();
      for (const row of adminAccessRows) {
        if (!adminUserByCompanyId.has(row.companyId)) {
          adminUserByCompanyId.set(row.companyId, row.user);
        }
      }

      const items = companies.map((company) => {
        const { plan, corporation, ...rest } = company;
        const admin = adminUserByCompanyId.get(company.id);
        return {
          ...rest,
          firstName: admin?.firstName ?? null,
          lastName: admin?.lastName ?? null,
          nickname: admin?.nickname ?? null,
          role: admin?.jobRole ?? null,
          email: admin?.email ?? null,
          workPhone: admin?.workPhone ?? null,
          cellPhone: admin?.cellPhone ?? null,
          region: corporation?.dataResidencyRegion ?? null,
          planName: plan?.planType?.name ?? null,
          plan: plan
            ? {
                id: plan.id,
                planTypeId: plan.planTypeId,
                employeeRangeMin: plan.employeeRangeMin,
                employeeRangeMax: plan.employeeRangeMax,
              }
            : null,
        };
      });

      return ResponseHelper.success(COMPANY_LIST_FETCHED_SUCCESS_MSG, {
        items,
      });
    } catch (error) {
      this.logger.error('Error fetching company list', error);
      throw error;
    }
  }

  /**
   * Authorizes GET `corporations/:corporationId/companies` then delegates to {@link findAll}.
   * **SuperAdmin:** any corporation id. **CorporationAdmin:** only their `app_users.corporation_id`
   * must equal `corporationId`. **Others:** {@link ForbiddenException}.
   */
  async findAllForRequester(
    corporationId: string,
    query: ListCompanyQueryDto,
    cognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const groupSet = new Set(groups ?? []);
    if (groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      return this.findAll(corporationId, query);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN)) {
      const myCorporationId =
        await this.resolveCorporationIdForCorpAdminCognitoSub(
          cognitoSub.trim(),
        );
      if (!myCorporationId) {
        throw new ForbiddenException(COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG);
      }
      if (corporationId.trim() !== myCorporationId) {
        throw new ForbiddenException(COMPANY_DETAIL_CORP_ADMIN_WRONG_CORP_MSG);
      }
      return this.findAll(corporationId, query);
    }
    throw new ForbiddenException(COMPANY_LIST_FORBIDDEN_MSG);
  }

  /**
   * Authorizes GET `corporations/companies/active` then delegates to {@link findActiveCompanies}.
   * **SuperAdmin:** all active companies. **CorporationAdmin:** only under their linked corporation.
   * **Others:** {@link ForbiddenException}.
   */
  async findActiveCompaniesForRequester(
    cognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const groupSet = new Set(groups ?? []);
    if (groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      return this.findActiveCompanies();
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN)) {
      const myCorporationId =
        await this.resolveCorporationIdForCorpAdminCognitoSub(
          cognitoSub.trim(),
        );
      if (!myCorporationId) {
        throw new ForbiddenException(COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG);
      }
      return this.findActiveCompanies(myCorporationId);
    }
    throw new ForbiddenException(COMPANY_ACTIVE_SUMMARIES_FORBIDDEN_MSG);
  }

  /**
   * Active (non-deleted) companies: id, corporationId, and legalName, ordered by legal name.
   *
   * @param corporationId - When set, only companies under this corporation.
   */
  async findActiveCompanies(corporationId?: string): Promise<ApiResponse> {
    try {
      const items = await this.prisma.corporationCompany.findMany({
        where: {
          deletedAt: null,
          status: COMPANY_STATUS.ACTIVE,
          ...(corporationId ? { corporationId } : {}),
        },
        orderBy: { legalName: 'asc' },
        select: { id: true, corporationId: true, legalName: true },
      });

      return ResponseHelper.success(
        COMPANY_ACTIVE_SUMMARIES_FETCHED_SUCCESS_MSG,
        { items },
      );
    } catch (error) {
      this.logger.error('Error fetching active companies', error);
      throw error;
    }
  }

  /**
   * Authorizes GET `corporations/companies/all` then delegates to {@link findAllCompanies}.
   * **SuperAdmin:** any corporation id. **CorporationAdmin:** only their linked corporation.
   * **Others:** {@link ForbiddenException}.
   */
  async findAllCompaniesForRequester(
    corporationId: string,
    cognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const groupSet = new Set(groups ?? []);
    if (groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      return this.findAllCompanies(corporationId);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN)) {
      const myCorporationId =
        await this.resolveCorporationIdForCorpAdminCognitoSub(
          cognitoSub.trim(),
        );
      if (!myCorporationId) {
        throw new ForbiddenException(COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG);
      }
      if (corporationId.trim() !== myCorporationId) {
        throw new ForbiddenException(COMPANY_DETAIL_CORP_ADMIN_WRONG_CORP_MSG);
      }
      return this.findAllCompanies(corporationId);
    }
    throw new ForbiddenException(COMPANY_ALL_FORBIDDEN_MSG);
  }

  /**
   * Non-deleted companies: id and legalName, ordered by legal name.
   * Includes all statuses.
   *
   * @param corporationId - When set, only companies under this corporation.
   */
  async findAllCompanies(corporationId?: string): Promise<ApiResponse> {
    try {
      const rows = await this.prisma.corporationCompany.findMany({
        where: {
          deletedAt: null,
          ...(corporationId ? { corporationId } : {}),
        },
        orderBy: { legalName: 'asc' },
        select: { id: true, legalName: true },
      });

      return ResponseHelper.success(COMPANY_ALL_FETCHED_SUCCESS_MSG, rows);
    } catch (error) {
      this.logger.error(COMPANY_ALL_FETCH_ERROR_LOG_MSG, error);
      throw error;
    }
  }

  /**
   * Fetches a single company by ID (excludes soft-deleted).
   * Used by GET corporations/companies/:companyId.
   *
   * @param companyId - The company ID from the path parameter
   * @returns {Promise<ApiResponse>} A success response containing the company with plan, configuration, app key contacts (non-deleted), company admin from access + app user, corporation admin profile from `app_users` (corp_admin, not deleted) under `corporation.corporationAdmin`, plan seat, and `brandLogo` as a public URL when set
   * @throws {NotFoundException} If the company does not exist
   * @throws {BadRequestException} If company ID is missing
   */
  async findOne(companyId: string): Promise<ApiResponse> {
    if (!companyId) {
      throw new BadRequestException(COMPANY_ID_REQUIRED_MSG);
    }

    const company = await this.prisma.corporationCompany.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        corporationId: true,
        companyCode: true,
        legalName: true,
        dbaName: true,
        website: true,
        phoneNo: true,
        companyType: true,
        officeType: true,
        industry: true,
        sameAsCorpAdmin: true,
        planId: true,
        securityPosture: true,
        submittedSteps: true,
        status: true,
        subscriptionStatus: true,
        assessmentQuantity: true,
        addressLine: true,
        state: true,
        city: true,
        country: true,
        zip: true,
        brandLogo: true,
        configuration: {
          select: {
            id: true,
            companyId: true,
            authMethod: true,
            passwordPolicy: true,
            mfa: true,
            sessionTimeout: true,
            securityPosture: true,
            primaryLanguage: true,
          },
        },
        plan: {
          select: {
            id: true,
            planTypeId: true,
            planType: {
              select: {
                name: true,
              },
            },
            employeeRangeMin: true,
            employeeRangeMax: true,
          },
        },
        corporation: {
          select: {
            legalName: true,
            ownershipType: true,
            dataResidencyRegion: true,
          },
        },
        appKeyContacts: {
          where: { deletedAt: null },
          orderBy: { contactCode: 'asc' },
          select: {
            id: true,
            contactType: true,
            firstName: true,
            lastName: true,
            nickname: true,
            jobRole: true,
            email: true,
            workPhone: true,
            cellPhone: true,
          },
        },
        userCompanyAccesses: {
          where: {
            isAdmin: true,
            user: { deletedAt: null },
          },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                nickname: true,
                email: true,
                workPhone: true,
                cellPhone: true,
                jobRole: true,
                role: { select: { name: true } },
              },
            },
          },
        },
        planSeat: {
          select: {
            id: true,
            zeroTrial: true,
            trialLengthDuration: true,
            trialLengthType: true,
            trialStartDate: true,
            trialEndDate: true,
            planPrice: true,
            discount: true,
            invoiceAmount: true,
            billingCurrency: true,
            autoConvertTrial: true,
            checkoutPromoCode: true,
            onsiteTrainingOption: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    const corpAdminAppUser = await this.prisma.appUser.findFirst({
      where: {
        corporationId: company.corporationId,
        deletedAt: null,
        userType: {
          contains: CORPORATION_ADMIN_APP_USER_TYPE,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        firstName: true,
        lastName: true,
        nickname: true,
        jobRole: true,
        email: true,
        workPhone: true,
        cellPhone: true,
      },
    });

    const corporationAdmin = corpAdminAppUser
      ? {
          firstName: corpAdminAppUser.firstName ?? '',
          lastName: corpAdminAppUser.lastName ?? '',
          nickname: corpAdminAppUser.nickname,
          jobRole: corpAdminAppUser.jobRole ?? '',
          email: corpAdminAppUser.email ?? '',
          workPhone: corpAdminAppUser.workPhone ?? '',
          cellPhone: corpAdminAppUser.cellPhone,
        }
      : null;

    const { appKeyContacts, userCompanyAccesses, corporation, ...companyRest } =
      company;
    const adminUser = userCompanyAccesses[0]?.user;
    const payload = {
      ...companyRest,
      corporation: corporation ? { ...corporation, corporationAdmin } : null,
      keyContacts: appKeyContacts.map((k) => ({
        id: k.id,
        contactType: k.contactType,
        firstName: k.firstName,
        lastName: k.lastName,
        nickname: k.nickname,
        jobRole: k.jobRole,
        email: k.email,
        workPhone: k.workPhone,
        cellPhone: k.cellPhone,
      })),
      companyAdmin: adminUser
        ? {
            firstName: adminUser.firstName,
            lastName: adminUser.lastName,
            nickname: adminUser.nickname,
            jobRole: adminUser.jobRole,
            email: adminUser.email,
            workPhone: adminUser.workPhone,
            cellPhone: adminUser.cellPhone,
          }
        : null,
    };
    if (payload.brandLogo?.trim()) {
      payload.brandLogo = this.s3Service.getPublicUrl(
        this.s3Service.buildCompanyBrandLogoKey(payload.brandLogo.trim()),
      );
    }

    return ResponseHelper.success(COMPANY_FETCHED_SUCCESS_MSG, payload);
  }

  /**
   * Authorizes GET `corporations/companies/:companyId` then delegates to {@link findOne}.
   * A user may hold **multiple** of CorporationAdmin and CompanyAdmin; access is granted if **any**
   * applicable rule passes (union).
   * - **SuperAdmin:** any non-deleted company UUID (not the literal `me`).
   * - **Path `me`:** only **CompanyAdmin** may use it (resolves earliest admin `user_company_access` on a
   *   non-deleted company). CorporationAdmin without CompanyAdmin must not use `me` ({@link BadRequestException}).
   * - **UUID:** **CorporationAdmin** — company exists under their linked corporation; **CompanyAdmin** —
   *   admin `user_company_access` for that company. If both groups apply, either path authorizes.
   * - **Others:** {@link ForbiddenException}.
   */
  async findOneForRequester(
    companyId: string,
    cognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const idParam = companyId.trim();
    const sub = cognitoSub.trim();
    const groupSet = new Set(groups ?? []);
    const isMePath = idParam.toLowerCase() === 'me';

    if (groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      if (isMePath) {
        throw new BadRequestException(COMPANY_DETAIL_SUPER_ADMIN_ME_PATH_MSG);
      }
      return this.findOne(idParam);
    }

    const isCorpAdmin = groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN);
    const isCompanyAdmin = groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN);

    if (!isCorpAdmin && !isCompanyAdmin) {
      throw new ForbiddenException(COMPANY_DETAIL_FORBIDDEN_MSG);
    }

    if (isMePath) {
      if (!isCompanyAdmin) {
        if (isCorpAdmin) {
          throw new BadRequestException(COMPANY_DETAIL_CORP_ADMIN_ME_PATH_MSG);
        }
        throw new ForbiddenException(COMPANY_DETAIL_FORBIDDEN_MSG);
      }
      return this.findOne(await this.resolveCompanyAdminMeCompanyId(sub));
    }

    let corpAdminWrongCorporation = false;

    if (isCorpAdmin) {
      const myCorporationId =
        await this.resolveCorporationIdForCorpAdminCognitoSub(sub);
      if (myCorporationId) {
        const companyRow = await this.prisma.corporationCompany.findFirst({
          where: { id: idParam, deletedAt: null },
          select: { corporationId: true },
        });
        if (!companyRow) {
          return this.findOne(idParam);
        }
        if (companyRow.corporationId === myCorporationId) {
          return this.findOne(idParam);
        }
        corpAdminWrongCorporation = true;
      } else if (!isCompanyAdmin) {
        throw new ForbiddenException(COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG);
      }
    }

    if (isCompanyAdmin) {
      const accessCount = await this.prisma.userCompanyAccess.count({
        where: {
          userId: sub,
          companyId: idParam,
          isAdmin: true,
        },
      });
      if (accessCount > 0) {
        return this.findOne(idParam);
      }
      if (corpAdminWrongCorporation) {
        throw new ForbiddenException(COMPANY_DETAIL_CORP_ADMIN_WRONG_CORP_MSG);
      }
      throw new ForbiddenException(COMPANY_DETAIL_COMPANY_ADMIN_FORBIDDEN_MSG);
    }

    if (corpAdminWrongCorporation) {
      throw new ForbiddenException(COMPANY_DETAIL_CORP_ADMIN_WRONG_CORP_MSG);
    }

    throw new ForbiddenException(COMPANY_DETAIL_FORBIDDEN_MSG);
  }

  /**
   * Resolves path `me` for a company admin: earliest admin `user_company_access` on a non-deleted company.
   *
   * @throws {ForbiddenException} When there is no qualifying access row.
   */
  private async resolveCompanyAdminMeCompanyId(
    cognitoSub: string,
  ): Promise<string> {
    const row = await this.prisma.userCompanyAccess.findFirst({
      where: {
        userId: cognitoSub,
        isAdmin: true,
        company: { deletedAt: null },
      },
      orderBy: { createdAt: 'asc' },
      select: { companyId: true },
    });
    if (!row) {
      throw new ForbiddenException(
        COMPANY_DETAIL_COMPANY_ADMIN_ME_UNASSIGNED_MSG,
      );
    }
    return row.companyId;
  }

  /**
   * Looks up the corporation id for a Cognito user who is the provisioned corporation admin
   * (`app_users.user_type` contains corp_admin, not deleted), same rule as corporation detail.
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
   * Ensures a stub `company_plan_seats` row exists when a company is assigned a
   * `plan_id` during corporation setup (quick or advanced). Used by
   * `POST/PATCH …/corporations/:corporationId/companies`. Full plan-seat details
   * are still captured on the Add Company Plan & Seats step.
   */
  private async ensureInitialPlanSeatForPlanId(
    companyId: string,
    planId: string,
    db: Pick<PrismaService, 'pricingPlan' | 'companyPlanSeat'> = this.prisma,
    options?: {
      syncPricingWhenIncomplete?: boolean;
      submittedSteps?: number;
    },
  ): Promise<void> {
    const trimmedPlanId = planId?.trim();
    if (!trimmedPlanId) {
      return;
    }

    const pricingPlan = await db.pricingPlan.findUnique({
      where: { id: trimmedPlanId },
      select: { id: true, price: true },
    });
    if (!pricingPlan) {
      throw new BadRequestException(
        `Pricing plan with ID "${trimmedPlanId}" not found`,
      );
    }

    const planPrice = new Prisma.Decimal(pricingPlan.price);
    const existing = await db.companyPlanSeat.findUnique({
      where: { companyId },
      select: { id: true },
    });
    if (existing) {
      if (
        options?.syncPricingWhenIncomplete &&
        (options.submittedSteps ?? 0) < 3
      ) {
        await db.companyPlanSeat.update({
          where: { companyId },
          data: {
            planPrice,
            invoiceAmount: planPrice,
          },
        });
      }
      return;
    }

    await db.companyPlanSeat.create({
      data: {
        companyId,
        zeroTrial: false,
        trialLengthDuration: 14,
        trialLengthType: 'days',
        trialStartDate: null,
        trialEndDate: null,
        planPrice,
        discount: new Prisma.Decimal(0),
        invoiceAmount: planPrice,
        billingCurrency: 'USD ($)',
        autoConvertTrial: false,
        checkoutPromoCode: null,
        onsiteTrainingOption: 'off',
      },
    });
  }

  /**
   * Creates or updates the single plan seat row for a company (one-to-one).
   * When zeroTrial is false, trialStartDate and trialEndDate are required.
   * When zeroTrial is true, trial dates are optional; omit both to clear stored dates.
   * Sets `corporation_companies.plan_id` from `dto.planLevel` (must exist in `pricing_plans`).
   * Sets company submittedSteps to 3 when current value is less than 3.
   * When `subscription_status` is `active`, returns success without upserting.
   */
  async upsertCompanyPlanSeat(
    companyId: string,
    dto: UpsertCompanyPlanSeatDto,
  ): Promise<ApiResponse> {
    if (!companyId) {
      throw new BadRequestException(COMPANY_ID_REQUIRED_MSG);
    }

    const company = await this.prisma.corporationCompany.findFirst({
      where: { id: companyId, deletedAt: null },
      select: {
        id: true,
        submittedSteps: true,
        subscriptionStatus: true,
      },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    if (company.subscriptionStatus?.toLowerCase() === 'active') {
      return ResponseHelper.success(
        COMPANY_PLAN_SEAT_ACTIVE_SUBSCRIPTION_SKIP_MSG,
      );
    }

    const pricingPlan = await this.prisma.pricingPlan.findUnique({
      where: { id: dto.planLevel },
      select: { id: true },
    });
    if (!pricingPlan) {
      throw new BadRequestException(
        `Pricing plan with ID "${dto.planLevel}" not found`,
      );
    }

    const planPrice = new Prisma.Decimal(dto.planPrice);
    const discount = new Prisma.Decimal(dto.discount ?? 0);
    const invoiceAmount = new Prisma.Decimal(dto.invoiceAmount);

    if (planPrice.lt(0) || discount.lt(0) || invoiceAmount.lt(0)) {
      throw new BadRequestException(COMPANY_PLAN_SEAT_AMOUNTS_NON_NEGATIVE_MSG);
    }
    if (discount.gt(planPrice)) {
      throw new BadRequestException(
        COMPANY_PLAN_SEAT_DISCOUNT_EXCEEDS_PLAN_PRICE_MSG,
      );
    }

    let trialStartDate: Date | null = null;
    let trialEndDate: Date | null = null;

    if (dto.zeroTrial) {
      const hasStart =
        dto.trialStartDate != null && String(dto.trialStartDate).trim() !== '';
      const hasEnd =
        dto.trialEndDate != null && String(dto.trialEndDate).trim() !== '';
      if (hasStart !== hasEnd) {
        throw new BadRequestException(
          COMPANY_PLAN_SEAT_TRIAL_DATES_BOTH_OR_OMIT_MSG,
        );
      }
      if (hasStart && hasEnd) {
        trialStartDate = parseRequiredDateString(
          String(dto.trialStartDate),
          'trialStartDate',
        );
        trialEndDate = parseRequiredDateString(
          String(dto.trialEndDate),
          'trialEndDate',
        );
        if (trialEndDate < trialStartDate) {
          throw new BadRequestException(
            COMPANY_PLAN_SEAT_TRIAL_END_ON_OR_AFTER_START_MSG,
          );
        }
      }
    } else {
      if (
        dto.trialStartDate == null ||
        dto.trialEndDate == null ||
        !String(dto.trialStartDate).trim() ||
        !String(dto.trialEndDate).trim()
      ) {
        throw new BadRequestException(
          COMPANY_PLAN_SEAT_TRIAL_DATES_REQUIRED_WHEN_NOT_ZERO_TRIAL_MSG,
        );
      }
      trialStartDate = parseRequiredDateString(
        String(dto.trialStartDate),
        'trialStartDate',
      );
      trialEndDate = parseRequiredDateString(
        String(dto.trialEndDate),
        'trialEndDate',
      );
      if (trialEndDate < trialStartDate) {
        throw new BadRequestException(
          COMPANY_PLAN_SEAT_TRIAL_END_ON_OR_AFTER_START_MSG,
        );
      }
    }

    const checkoutPromoCode =
      dto.checkoutPromoCode != null &&
      String(dto.checkoutPromoCode).trim() !== ''
        ? String(dto.checkoutPromoCode).trim()
        : null;

    const seatData = {
      zeroTrial: dto.zeroTrial,
      trialLengthDuration: dto.trialLengthDuration ?? 14,
      trialLengthType: dto.trialLengthType ?? 'days',
      trialStartDate,
      trialEndDate,
      planPrice,
      discount,
      invoiceAmount,
      billingCurrency: dto.billingCurrency ?? 'USD ($)',
      autoConvertTrial: dto.autoConvertTrial ?? false,
      checkoutPromoCode,
      onsiteTrainingOption: dto.onsiteTrainingOption ?? 'off',
    };

    const planSeat = await this.prisma.companyPlanSeat.upsert({
      where: { companyId },
      create: {
        companyId,
        ...seatData,
      },
      update: seatData,
    });

    const companyUpdateData: Prisma.CorporationCompanyUncheckedUpdateInput = {
      planId: dto.planLevel,
    };
    if (company.submittedSteps < 3) {
      companyUpdateData.submittedSteps = 3;
    }
    await this.prisma.corporationCompany.update({
      where: { id: companyId },
      data: companyUpdateData,
    });

    return ResponseHelper.success(
      COMPANY_PLAN_SEAT_UPDATED_SUCCESS_MSG,
      planSeat,
    );
  }

  /**
   * Creates or updates `company_configuration` (at most one row per company).
   * All DTO string fields are required; body is validated before this runs.
   * Sets company `submittedSteps` to 4 when the current value is less than 4.
   * Optional multipart `logo` (PNG or JPG, max 10 MB): uploaded to S3 under
   * `company-brand-logos/`, replaces any previous logo, and updates `brand_logo` on the company.
   */
  async upsertCompanyConfiguration(
    companyId: string,
    dto: UpsertCompanyConfigurationDto,
    logoFiles?: Express.Multer.File[],
  ): Promise<ApiResponse> {
    if (!companyId) {
      throw new BadRequestException(COMPANY_ID_REQUIRED_MSG);
    }

    if (logoFiles && logoFiles.length > 1) {
      throw new BadRequestException(BRAND_LOGO_SINGLE_FILE_ONLY_MSG);
    }
    const logoFile = logoFiles?.[0];

    const company = await this.prisma.corporationCompany.findFirst({
      where: { id: companyId, deletedAt: null },
      select: {
        id: true,
        submittedSteps: true,
        brandLogo: true,
      },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    if (logoFile) {
      if (!logoFile.buffer?.length) {
        throw new BadRequestException(
          'Logo file is missing, empty, or could not be read',
        );
      }
      const mimetype = logoFile.mimetype?.toLowerCase();
      if (
        !BRAND_LOGO_ALLOWED_MIMES.includes(
          mimetype as (typeof BRAND_LOGO_ALLOWED_MIMES)[number],
        )
      ) {
        throw new BadRequestException(BRAND_LOGO_INVALID_TYPE_MSG);
      }
      if (logoFile.size > BRAND_LOGO_MAX_SIZE_BYTES) {
        throw new BadRequestException(
          BRAND_LOGO_MAX_SIZE_MSG(BRAND_LOGO_MAX_SIZE_BYTES / (1024 * 1024)),
        );
      }
    }

    const configData = {
      authMethod: dto.authMethod,
      passwordPolicy: dto.passwordPolicy,
      mfa: dto.mfa,
      sessionTimeout: dto.sessionTimeout,
      securityPosture: dto.securityPosture,
      primaryLanguage: dto.primaryLanguage,
    };

    const configuration = await this.prisma.companyConfiguration.upsert({
      where: { companyId },
      create: {
        companyId,
        ...configData,
      },
      update: configData,
    });

    const companyUpdateData: Prisma.CorporationCompanyUncheckedUpdateInput = {};
    if (company.submittedSteps < 4) {
      companyUpdateData.submittedSteps = 4;
    }

    if (logoFile) {
      const existingFilename = company.brandLogo?.trim();
      if (existingFilename) {
        const existingKey = existingFilename.startsWith(
          this.s3Service.getCompanyBrandLogosPrefix(),
        )
          ? existingFilename
          : this.s3Service.buildCompanyBrandLogoKey(existingFilename);
        const exists = await this.s3Service.objectExists(existingKey);
        if (exists) {
          try {
            await this.s3Service.delete(existingKey);
          } catch (err) {
            this.logger.warn(
              `Failed to delete existing company brand logo from S3 (key: ${existingKey}): ${err instanceof Error ? err.message : err}`,
            );
          }
        }
      }

      const ext =
        BRAND_LOGO_EXTENSION_BY_MIME[logoFile.mimetype?.toLowerCase() ?? ''] ??
        'png';
      const uniqueFilename = `${randomUUID()}.${ext}`;
      const key = this.s3Service.buildCompanyBrandLogoKey(uniqueFilename);
      await this.s3Service.upload(
        key,
        logoFile.buffer,
        logoFile.mimetype ?? 'application/octet-stream',
      );
      companyUpdateData.brandLogo = uniqueFilename;
      this.logger.log(
        `Company brand logo uploaded for ${companyId}: ${uniqueFilename}`,
      );
    }

    if (Object.keys(companyUpdateData).length > 0) {
      await this.prisma.corporationCompany.update({
        where: { id: companyId },
        data: companyUpdateData,
      });
    }

    const storedBrandLogoFilename =
      typeof companyUpdateData.brandLogo === 'string'
        ? companyUpdateData.brandLogo
        : (company.brandLogo?.trim() ?? null);

    const brandLogo = storedBrandLogoFilename
      ? this.s3Service.getPublicUrl(
          this.s3Service.buildCompanyBrandLogoKey(storedBrandLogoFilename),
        )
      : null;

    return ResponseHelper.success(COMPANY_CONFIGURATION_UPDATED_SUCCESS_MSG, {
      ...configuration,
      brandLogo,
    });
  }

  /**
   * Deletes the company brand logo: removes the object from S3 when present and clears `brand_logo`.
   * Idempotent when no logo is stored.
   */
  async deleteCompanyBrandLogo(companyId: string): Promise<ApiResponse<void>> {
    if (!companyId) {
      throw new BadRequestException(COMPANY_ID_REQUIRED_MSG);
    }

    const company = await this.prisma.corporationCompany.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true, brandLogo: true },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    const existingFilename = company.brandLogo?.trim();
    if (existingFilename) {
      const existingKey = existingFilename.startsWith(
        this.s3Service.getCompanyBrandLogosPrefix(),
      )
        ? existingFilename
        : this.s3Service.buildCompanyBrandLogoKey(existingFilename);
      const exists = await this.s3Service.objectExists(existingKey);
      if (exists) {
        try {
          await this.s3Service.delete(existingKey);
        } catch (err) {
          this.logger.warn(
            `Failed to delete company brand logo from S3 (key: ${existingKey}): ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    }

    await this.prisma.corporationCompany.update({
      where: { id: companyId },
      data: { brandLogo: null },
    });

    this.logger.log(`Company brand logo deleted for ${companyId}`);

    return ResponseHelper.success(COMPANY_BRAND_LOGO_DELETED_SUCCESS_MSG);
  }

  /**
   * Completes add-company confirmation: sets `status` to ACTIVE and `submittedSteps` to 5.
   */
  async confirmCompany(companyId: string): Promise<ApiResponse> {
    if (!companyId) {
      throw new BadRequestException(COMPANY_ID_REQUIRED_MSG);
    }

    const existing = await this.prisma.corporationCompany.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    const updated = await this.prisma.corporationCompany.update({
      where: { id: companyId },
      data: {
        status: COMPANY_STATUS.ACTIVE,
        submittedSteps: 5,
      },
      select: {
        id: true,
        status: true,
        submittedSteps: true,
      },
    });

    try {
      await this.companyAdminOnboarding.onCompanyActivated(
        companyId,
        COMPANY_STATUS.INCOMPLETE,
        updated.status,
      );
    } catch (err) {
      await this.prisma.corporationCompany.update({
        where: { id: companyId },
        data: { status: COMPANY_STATUS.INCOMPLETE },
      });
      throw err;
    }

    return ResponseHelper.success(COMPANY_CONFIRMATION_SUCCESS_MSG, updated);
  }

  /**
   * Suspends a company: sets `corporation_companies.status` to SUSPENDED, persists
   * {@link SuspendCompanyDto.suspendReason} and optional {@link SuspendCompanyDto.suspendAdditionalNotes},
   * sets `app_users` linked via `user_company_access` as Blocked, and for each runs Cognito
   * `AdminUserGlobalSignOut` (revokes refresh tokens) then disables the pool user.
   * Only `ACTIVE` companies; `SUSPENDED` is rejected. Cognito user-not-found is logged and ignored.
   *
   * @param companyId - `corporation_companies.id`
   * @param dto - suspend reason (required) and optional additional notes
   * @returns Success payload with company id and new status
   * @throws {BadRequestException} If company is not ACTIVE or is already SUSPENDED
   * @throws {NotFoundException} If the company does not exist or is soft-deleted
   */
  async suspendCompany(
    companyId: string,
    dto: SuspendCompanyDto,
  ): Promise<ApiResponse<{ id: string; status: string }>> {
    if (!companyId) {
      throw new BadRequestException(COMPANY_ID_REQUIRED_MSG);
    }

    const company = await this.prisma.corporationCompany.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true, status: true, legalName: true },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    if (company.status === COMPANY_STATUS.SUSPENDED) {
      throw new BadRequestException(COMPANY_ALREADY_SUSPENDED_MSG);
    }

    if (company.status !== COMPANY_STATUS.ACTIVE) {
      throw new BadRequestException(COMPANY_SUSPEND_REQUIRES_ACTIVE_MSG);
    }

    const accessRows = await this.prisma.userCompanyAccess.findMany({
      where: { companyId },
      select: { userId: true },
    });
    const userIds = [...new Set(accessRows.map((r) => r.userId))];

    const users =
      userIds.length === 0
        ? []
        : await this.prisma.appUser.findMany({
            where: { cognitoSub: { in: userIds }, deletedAt: null },
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
        this.logger.error(COMPANY_SUSPEND_COGNITO_ERROR_LOG_MSG, error);
        throw new InternalServerErrorException(COMPANY_SUSPEND_FAILED_MSG);
      }
    }

    const suspendedClosedOn = new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.corporationCompany.update({
          where: { id: companyId },
          data: {
            status: COMPANY_STATUS.SUSPENDED,
            suspendReason: dto.suspendReason,
            suspendAdditionalNotes: dto.suspendAdditionalNotes ?? null,
            suspendedClosedOn,
          },
        });
        if (userIds.length > 0) {
          await tx.appUser.updateMany({
            where: { cognitoSub: { in: userIds }, deletedAt: null },
            data: { status: APP_USER_STATUS.BLOCKED },
          });
        }
      });
    } catch (error) {
      this.logger.error(COMPANY_SUSPEND_DB_TRANSACTION_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(COMPANY_SUSPEND_FAILED_MSG);
    }

    this.logger.log(
      `Company ${companyId} suspended; ${users.length} app user(s) blocked and signed out in Cognito`,
    );

    const companyDisplayName = company.legalName?.trim() ?? '';
    await this.sendCompanySuspendedEmailToAdmin(
      companyId,
      companyDisplayName,
      dto.suspendReason,
    );

    return ResponseHelper.success(COMPANY_SUSPENDED_SUCCESS_MSG, {
      id: company.id,
      status: COMPANY_STATUS.SUSPENDED,
    });
  }

  /**
   * Notifies the earliest company admin (`user_company_access.isAdmin`) that the company was suspended.
   * Email failure is logged only; suspend already completed.
   */
  async sendCompanySuspendedEmailToAdmin(
    companyId: string,
    companyDisplayName: string,
    suspendReason: string,
  ): Promise<void> {
    try {
      const adminAccess = await this.prisma.userCompanyAccess.findFirst({
        where: {
          companyId,
          isAdmin: true,
          user: { deletedAt: null },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      const adminUser = adminAccess?.user;
      const to = adminUser?.email?.trim().toLowerCase();
      if (!to || !adminUser) {
        this.logger.warn(
          `${COMPANY_SUSPENDED_EMAIL_SEND_FAILED_LOG_MSG}: no company admin email (companyId=${companyId})`,
        );
        return;
      }

      const supportEmail = this.config
        .get<string>('SUPPORT_CONTACT_EMAIL')
        ?.trim();
      if (!supportEmail) {
        this.logger.error(
          `${COMPANY_SUSPENDED_EMAIL_SEND_FAILED_LOG_MSG}: SUPPORT_CONTACT_EMAIL is not configured (companyId=${companyId})`,
        );
        return;
      }

      const recipientDisplayName =
        `${adminUser.firstName ?? ''} ${adminUser.lastName ?? ''}`.trim();

      const templateParams = {
        recipientDisplayName,
        companyName: companyDisplayName,
        effectiveDate: formatDateShort(new Date()),
        suspensionReason: suspendReason.trim(),
        supportEmail,
      };

      const ok = await this.emailService.sendEmail({
        to,
        subject: COMPANY_SUSPENDED_EMAIL_SUBJECT,
        htmlBody: getCompanySuspendedEmailHtml(templateParams),
        textBody: getCompanySuspendedEmailText(templateParams),
      });

      if (!ok) {
        this.logger.error(
          `${COMPANY_SUSPENDED_EMAIL_SEND_FAILED_LOG_MSG} (companyId=${companyId}, to=${to})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `${COMPANY_SUSPENDED_EMAIL_SEND_FAILED_LOG_MSG} (companyId=${companyId})`,
        error,
      );
    }
  }

  /**
   * Notifies the earliest company admin (`user_company_access.isAdmin`) that the company was closed
   * because its parent corporation was closed. Email failure is logged only; close already completed.
   */
  async sendCompanyClosedEmailToAdmin(
    companyId: string,
    companyDisplayName: string,
    corporationDisplayName: string,
    closeReason: string,
  ): Promise<void> {
    try {
      const adminAccess = await this.prisma.userCompanyAccess.findFirst({
        where: {
          companyId,
          isAdmin: true,
          user: { deletedAt: null },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      const adminUser = adminAccess?.user;
      const to = adminUser?.email?.trim().toLowerCase();
      if (!to || !adminUser) {
        this.logger.warn(
          `${COMPANY_CLOSED_EMAIL_SEND_FAILED_LOG_MSG}: no company admin email (companyId=${companyId})`,
        );
        return;
      }

      const supportEmail = this.config
        .get<string>('SUPPORT_CONTACT_EMAIL')
        ?.trim();
      if (!supportEmail) {
        this.logger.error(
          `${COMPANY_CLOSED_EMAIL_SEND_FAILED_LOG_MSG}: SUPPORT_CONTACT_EMAIL is not configured (companyId=${companyId})`,
        );
        return;
      }

      const recipientDisplayName =
        `${adminUser.firstName ?? ''} ${adminUser.lastName ?? ''}`.trim();

      const templateParams = {
        recipientDisplayName,
        companyName: companyDisplayName,
        corporationName: corporationDisplayName,
        closureReason: closeReason.trim(),
        supportEmail,
      };

      const ok = await this.emailService.sendEmail({
        to,
        subject: COMPANY_CLOSED_EMAIL_SUBJECT,
        htmlBody: getCompanyClosedEmailHtml(templateParams),
        textBody: getCompanyClosedEmailText(templateParams),
      });

      if (!ok) {
        this.logger.error(
          `${COMPANY_CLOSED_EMAIL_SEND_FAILED_LOG_MSG} (companyId=${companyId}, to=${to})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `${COMPANY_CLOSED_EMAIL_SEND_FAILED_LOG_MSG} (companyId=${companyId})`,
        error,
      );
    }
  }

  /**
   * Reinstates a suspended company: sets `corporation_companies.status` to ACTIVE and sets every
   * non–soft-deleted `app_users` row linked via `user_company_access` for this company to Active,
   * then enables each user in Cognito. Only `SUSPENDED` companies; `ACTIVE` is rejected with a
   * distinct message; other statuses use the generic not-suspended error. Cognito user-not-found
   * is logged and ignored by `setCognitoUserEnabled`.
   *
   * @param companyId - `corporation_companies.id`
   * @returns Success payload with company id and new status
   * @throws {BadRequestException} If company is ACTIVE, not SUSPENDED, or parent corporation is SUSPENDED
   * @throws {NotFoundException} If the company does not exist or is soft-deleted
   */
  async reinstateCompany(
    companyId: string,
  ): Promise<ApiResponse<{ id: string; status: string }>> {
    if (!companyId) {
      throw new BadRequestException(COMPANY_ID_REQUIRED_MSG);
    }

    const company = await this.prisma.corporationCompany.findFirst({
      where: { id: companyId, deletedAt: null },
      select: {
        id: true,
        status: true,
        legalName: true,
        corporation: { select: { status: true } },
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    if (company.status === COMPANY_STATUS.ACTIVE) {
      throw new BadRequestException(COMPANY_ALREADY_ACTIVE_REINSTATE_MSG);
    }

    if (company.status !== COMPANY_STATUS.SUSPENDED) {
      throw new BadRequestException(COMPANY_REINSTATE_NOT_SUSPENDED_MSG);
    }

    if (company.corporation?.status === CORPORATION_STATUS.SUSPENDED) {
      throw new BadRequestException(
        COMPANY_REINSTATE_CORPORATION_SUSPENDED_MSG,
      );
    }

    const accessRows = await this.prisma.userCompanyAccess.findMany({
      where: { companyId },
      select: { userId: true },
    });
    const userIds = [...new Set(accessRows.map((r) => r.userId))];

    const users =
      userIds.length === 0
        ? []
        : await this.prisma.appUser.findMany({
            where: { cognitoSub: { in: userIds }, deletedAt: null },
            select: { cognitoSub: true, email: true },
          });

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.corporationCompany.update({
          where: { id: companyId },
          data: { status: COMPANY_STATUS.ACTIVE },
        });
        if (userIds.length > 0) {
          await tx.appUser.updateMany({
            where: { cognitoSub: { in: userIds }, deletedAt: null },
            data: { status: APP_USER_STATUS.ACTIVE },
          });
        }
      });
    } catch (error) {
      this.logger.error(COMPANY_REINSTATE_DB_TRANSACTION_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(COMPANY_REINSTATE_FAILED_MSG);
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
        this.logger.error(COMPANY_REINSTATE_COGNITO_ERROR_LOG_MSG, error);
        throw new InternalServerErrorException(COMPANY_REINSTATE_FAILED_MSG);
      }
    }

    this.logger.log(
      `Company ${companyId} reinstated; ${users.length} app user(s) set Active and enabled in Cognito`,
    );

    const companyDisplayName = company.legalName?.trim() ?? '';
    await this.sendCompanyReinstatedEmailToAdmin(companyId, companyDisplayName);

    return ResponseHelper.success(COMPANY_REINSTATED_SUCCESS_MSG, {
      id: company.id,
      status: COMPANY_STATUS.ACTIVE,
    });
  }

  /**
   * Loads all end users linked to a company from `user_company_access`.
   */
  private async loadLinkedEndUsersForCompany(
    companyId: string,
  ): Promise<CompanyLinkedEndUser[]> {
    const accessRows = await this.prisma.userCompanyAccess.findMany({
      where: { companyId },
      select: { userId: true },
    });
    const userIds = [...new Set(accessRows.map((r) => r.userId))];
    if (userIds.length === 0) {
      return [];
    }

    return this.prisma.appUser.findMany({
      where: { cognitoSub: { in: userIds }, deletedAt: null },
      select: { cognitoSub: true, email: true },
    });
  }

  /**
   * Signs out and disables Cognito users linked to a company and sets `app_users.status` to Blocked.
   * Does not change `corporation_companies.status` (used by subscription lapse).
   */
  async disableLinkedEndUsersForCompany(companyId: string): Promise<number> {
    const users = await this.loadLinkedEndUsersForCompany(companyId);
    const userIds = users.map((u) => u.cognitoSub);

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
        this.logger.error(COMPANY_SUSPEND_COGNITO_ERROR_LOG_MSG, error);
        throw new InternalServerErrorException(COMPANY_SUSPEND_FAILED_MSG);
      }
    }

    if (userIds.length > 0) {
      await this.prisma.appUser.updateMany({
        where: { cognitoSub: { in: userIds }, deletedAt: null },
        data: { status: APP_USER_STATUS.BLOCKED },
      });
    }

    return users.length;
  }

  /**
   * Enables Cognito users linked to a company and sets `app_users.status` to Active.
   * Does not change `corporation_companies.status` (used by subscription restore).
   */
  async enableLinkedEndUsersForCompany(companyId: string): Promise<number> {
    const users = await this.loadLinkedEndUsersForCompany(companyId);
    const userIds = users.map((u) => u.cognitoSub);

    if (userIds.length > 0) {
      await this.prisma.appUser.updateMany({
        where: { cognitoSub: { in: userIds }, deletedAt: null },
        data: { status: APP_USER_STATUS.ACTIVE },
      });
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
        this.logger.error(COMPANY_REINSTATE_COGNITO_ERROR_LOG_MSG, error);
        throw new InternalServerErrorException(COMPANY_REINSTATE_FAILED_MSG);
      }
    }

    return users.length;
  }

  /**
   * When subscription lapses or is restored, block or unblock company end users (same Cognito/DB
   * steps as suspend/reinstate). Skipped while the company is manually SUSPENDED or CLOSED
   * (e.g. after corporation suspend/close — Stripe may still emit `active` on cancel_at_period_end).
   */
  async syncEndUserAccessForSubscription(
    companyId: string,
    subscriptionStatus: string | null | undefined,
  ): Promise<void> {
    const trimmedId = companyId?.trim();
    if (!trimmedId) {
      return;
    }

    const company = await this.prisma.corporationCompany.findFirst({
      where: { id: trimmedId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (
      !company ||
      company.status === COMPANY_STATUS.SUSPENDED ||
      company.status === COMPANY_STATUS.CLOSED
    ) {
      return;
    }

    const normalized = normalizeSubscriptionStatus(subscriptionStatus);
    if (isSubscriptionStatusActive(normalized)) {
      const count = await this.enableLinkedEndUsersForCompany(trimmedId);
      if (count > 0) {
        this.logger.log(
          `${COMPANY_SUBSCRIPTION_RESTORE_ENABLE_LOG_MSG}: company ${trimmedId}, ${count} user(s)`,
        );
      }
      return;
    }

    const count = await this.disableLinkedEndUsersForCompany(trimmedId);
    if (count > 0) {
      this.logger.log(
        `${COMPANY_SUBSCRIPTION_LAPSE_DISABLE_LOG_MSG}: company ${trimmedId}, ${count} user(s)`,
      );
    }
  }

  /**
   * Notifies the earliest company admin (`user_company_access.isAdmin`) that the company was reinstated.
   * Email failure is logged only; reinstate already completed.
   */
  async sendCompanyReinstatedEmailToAdmin(
    companyId: string,
    companyDisplayName: string,
  ): Promise<void> {
    try {
      const adminAccess = await this.prisma.userCompanyAccess.findFirst({
        where: {
          companyId,
          isAdmin: true,
          user: { deletedAt: null },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      const adminUser = adminAccess?.user;
      const to = adminUser?.email?.trim().toLowerCase();
      if (!to || !adminUser) {
        this.logger.warn(
          `${COMPANY_REINSTATED_EMAIL_SEND_FAILED_LOG_MSG}: no company admin email (companyId=${companyId})`,
        );
        return;
      }

      const supportEmail = this.config
        .get<string>('SUPPORT_CONTACT_EMAIL')
        ?.trim();
      if (!supportEmail) {
        this.logger.error(
          `${COMPANY_REINSTATED_EMAIL_SEND_FAILED_LOG_MSG}: SUPPORT_CONTACT_EMAIL is not configured (companyId=${companyId})`,
        );
        return;
      }

      const recipientDisplayName =
        `${adminUser.firstName ?? ''} ${adminUser.lastName ?? ''}`.trim();

      const templateParams = {
        recipientDisplayName,
        companyName: companyDisplayName,
        effectiveDate: formatDateShort(new Date()),
        supportEmail,
      };

      const ok = await this.emailService.sendEmail({
        to,
        subject: COMPANY_REINSTATED_EMAIL_SUBJECT,
        htmlBody: getCompanyReinstatedEmailHtml(templateParams),
        textBody: getCompanyReinstatedEmailText(templateParams),
      });

      if (!ok) {
        this.logger.error(
          `${COMPANY_REINSTATED_EMAIL_SEND_FAILED_LOG_MSG} (companyId=${companyId}, to=${to})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `${COMPANY_REINSTATED_EMAIL_SEND_FAILED_LOG_MSG} (companyId=${companyId})`,
        error,
      );
    }
  }

  /**
   * Upserts company key contacts in `app_key_contacts` (scoped by `companyId`).
   * For each item: `available: false` soft-deletes; `available: true` updates the active row for
   * `companyId` + `contactType` if present, otherwise creates. Email is only set on create.
   * When `app_user_id` is set on the row, `app_users` is updated with name, job role, and phones.
   */
  async upsertKeyContacts(
    companyId: string,
    items: UpsertCompanyKeyContactItemDto[],
  ): Promise<ApiResponse> {
    if (!companyId) {
      throw new BadRequestException(COMPANY_ID_REQUIRED_MSG);
    }

    const company = await this.prisma.corporationCompany.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true, corporationId: true, submittedSteps: true },
    });
    if (!company) {
      throw new NotFoundException(`Company with ID "${companyId}" not found`);
    }

    const allowedTypes = new Set(COMPANY_KEY_CONTACT_TYPES);

    for (const item of items) {
      if (
        !allowedTypes.has(
          item.contactType as (typeof COMPANY_KEY_CONTACT_TYPES)[number],
        )
      ) {
        throw new BadRequestException(
          `Key contact type must be one of: ${COMPANY_KEY_CONTACT_TYPES.join(', ')}. Received: "${item.contactType}"`,
        );
      }

      if (item.available === false) {
        await this.prisma.appKeyContact.updateMany({
          where: {
            companyId,
            contactType: item.contactType,
            deletedAt: null,
          },
          data: { deletedAt: new Date() },
        });
        continue;
      }

      if (
        item.firstName == null ||
        item.lastName == null ||
        item.email == null ||
        item.workPhone == null
      ) {
        throw new BadRequestException(
          `Key contact for contactType "${item.contactType}": firstName, lastName, email, and workPhone are required when available is true`,
        );
      }

      const trimmedJobRole = item.jobRole?.trim();
      const jobRoleValue = trimmedJobRole ? trimmedJobRole : null;
      const emailNorm = item.email.trim().toLowerCase();

      const baseFields = {
        firstName: item.firstName,
        lastName: item.lastName,
        nickname: item.nickname ?? null,
        jobRole: jobRoleValue,
        workPhone: item.workPhone,
        cellPhone: item.cellPhone ?? null,
        corporationId: company.corporationId,
        companyId,
        contactType: item.contactType,
        deletedAt: null,
      };

      const appUserMirrorData = {
        firstName: baseFields.firstName,
        lastName: baseFields.lastName,
        nickname: baseFields.nickname,
        jobRole: baseFields.jobRole,
        workPhone: baseFields.workPhone,
        cellPhone: baseFields.cellPhone,
      };

      const existing = await this.prisma.appKeyContact.findFirst({
        where: {
          companyId,
          contactType: item.contactType,
          deletedAt: null,
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, appUserId: true },
      });

      await this.prisma.$transaction(async (tx) => {
        let appUserId: string | null = null;

        if (existing) {
          await tx.appKeyContact.update({
            where: { id: existing.id },
            data: baseFields,
          });
          appUserId = existing.appUserId;
        } else {
          await tx.appKeyContact.create({
            data: { ...baseFields, email: emailNorm },
          });
        }

        if (appUserId) {
          await tx.appUser.update({
            where: { cognitoSub: appUserId },
            data: appUserMirrorData,
          });
        }
      });
    }

    if (company.submittedSteps === 1) {
      await this.prisma.corporationCompany.update({
        where: { id: companyId },
        data: { submittedSteps: 2 },
      });
    }

    return ResponseHelper.success(COMPANY_KEY_CONTACTS_UPDATED_SUCCESS_MSG, {});
  }

  /**
   * Creates a new company for an existing corporation.
   *
   * This method:
   * - Validates that the corporation exists and retrieves its mode and submittedSteps
   * - Creates a new company record associated with the corporation
   * - If the corporation mode is "quick", increments submittedSteps by 1
   * - Returns the created company data
   *
   * @param corporationId - The corporation ID from the path parameter
   * @param createCompanyDto - The DTO containing company data
   * @returns {Promise<ApiResponse<CorporationCompany>>} A success response containing the created company
   * @throws {NotFoundException} If the corporation does not exist
   * @throws {BadRequestException} If corporation ID is missing
   * @throws {Error} Re-throws any errors that occur during creation (handled by global exception filter)
   */
  async create(
    corporationId: string,
    createCompanyDto: CreateCompanyDto,
  ): Promise<ApiResponse<CorporationCompany>> {
    if (!corporationId) {
      throw new BadRequestException(CORPORATION_ID_REQUIRED_MSG);
    }

    try {
      // Check if the corporation exists and retrieve its mode and submittedSteps
      const corporation = await this.prisma.corporation.findUnique({
        where: { id: corporationId },
        select: { id: true, status: true, mode: true, submittedSteps: true },
      });

      if (!corporation) {
        throw new NotFoundException(
          `Corporation with ID "${corporationId}" not found`,
        );
      }

      if (corporation.status === CORPORATION_STATUS.CLOSED) {
        throw new BadRequestException(CORPORATION_CANNOT_UPDATE_CLOSED_MSG);
      }

      // Legal name must be unique within the corporation (active companies only)
      const existingWithLegalName =
        await this.prisma.corporationCompany.findFirst({
          where: {
            corporationId,
            legalName: createCompanyDto.legalName,
            deletedAt: null,
          },
          select: { id: true },
        });
      if (existingWithLegalName) {
        throw new ConflictException(LEGAL_NAME_DUPLICATE_MSG);
      }

      const sameAsCorpAdmin = Boolean(createCompanyDto.sameAsCorpAdmin);
      const {
        firstName,
        lastName,
        nickname,
        jobRole,
        email,
        workPhone,
        cellPhone,
        phoneNo,
        ...companyFields
      } = createCompanyDto;

      let company: CorporationCompany | undefined;
      try {
        company = await this.prisma.corporationCompany.create({
          data: {
            ...companyFields,
            phoneNo,
            corporationId,
            submittedSteps: 1,
            status: COMPANY_STATUS.INCOMPLETE,
            sameAsCorpAdmin,
          },
        });

        if (companyFields.planId) {
          // Quick and advanced corporation setup both POST here with planId.
          await this.ensureInitialPlanSeatForPlanId(
            company.id,
            companyFields.planId,
          );
        }

        await this.companyAdminOnboarding.provisionCompanyAdminWhenCompanyCreated(
          {
            corporationId,
            companyId: company.id,
            sameAsCorpAdmin,
            firstName,
            lastName,
            nickname,
            jobRole,
            email,
            workPhone,
            cellPhone,
            isAdmin: true,
          },
        );
      } catch (err) {
        if (company?.id) {
          await this.prisma.corporationCompany
            .delete({ where: { id: company.id } })
            .catch(() => undefined);
        }
        throw err;
      }

      // If mode is "quick", increment submittedSteps by 1
      if (corporation.mode === 'quick') {
        await this.prisma.corporation.update({
          where: { id: corporationId },
          data: {
            submittedSteps: corporation.submittedSteps + 1,
          },
        });

        this.logger.log(
          `Incremented submittedSteps for corporation ${corporationId} (mode: quick)`,
        );
      }

      this.logger.log(
        `Company created successfully with ID: ${company.id} for corporation: ${corporationId}`,
      );

      return ResponseHelper.success(COMPANY_CREATED_SUCCESS_MSG, company);
    } catch (error) {
      this.logger.error('Error creating company', error);
      throw error;
    }
  }

  /**
   * Creates a new company for an existing corporation - company directory.
   *
   * This method:
   * - Validates that the corporation exists and optionally loads corporation admin app user when sameAsCorpAdmin
   * - Creates a new company record; company setup progress is stored on company.submittedSteps (not corporation.submittedSteps)
   * - Provisions Cognito and the company admin app user (same as corporation quick-add) via
   *   provisionCompanyAdminWhenCompanyCreated; the invite email is sent when the company becomes ACTIVE
   * - Returns the created company data
   *
   * @param corporationId - The corporation ID from the path parameter
   * @param createCompanyDto - The DTO containing company data (submittedSteps/status for company progress)
   * @returns {Promise<ApiResponse<CorporationCompany>>} A success response containing the created company
   * @throws {NotFoundException} If the corporation does not exist
   * @throws {BadRequestException} If corporation ID is missing
   * @throws {Error} Re-throws any errors that occur during creation (handled by global exception filter)
   */
  async createNew(
    corporationId: string,
    createCompanyDto: CreateNewCompanyDto,
  ): Promise<ApiResponse<CorporationCompany>> {
    if (!corporationId) {
      throw new BadRequestException(CORPORATION_ID_REQUIRED_MSG);
    }

    try {
      const sameAsCorpAdmin = Boolean(createCompanyDto.sameAsCorpAdmin);
      // Check if the corporation exists; when sameAsCorpAdmin, also load corp admin app user.
      const corporation = await this.prisma.corporation.findUnique({
        where: { id: corporationId },
        select: {
          id: true,
          status: true,
          appUsers: sameAsCorpAdmin
            ? {
                where: {
                  deletedAt: null,
                  userType: {
                    contains: CORPORATION_ADMIN_APP_USER_TYPE,
                    mode: 'insensitive',
                  },
                },
                take: 1,
                orderBy: { createdAt: 'asc' },
                select: {
                  firstName: true,
                  lastName: true,
                  nickname: true,
                  jobRole: true,
                  email: true,
                  workPhone: true,
                  cellPhone: true,
                },
              }
            : false,
        },
      });

      if (!corporation) {
        throw new NotFoundException(
          `Corporation with ID "${corporationId}" not found`,
        );
      }

      if (corporation.status === CORPORATION_STATUS.CLOSED) {
        throw new BadRequestException(CORPORATION_CANNOT_UPDATE_CLOSED_MSG);
      }

      let corpAdmin: {
        firstName: string | null;
        lastName: string | null;
        nickname: string | null;
        jobRole: string | null;
        email: string | null;
        workPhone: string | null;
        cellPhone: string | null;
      } | null = null;
      if (sameAsCorpAdmin) {
        const admins = corporation.appUsers;
        if (!admins?.length) {
          throw new BadRequestException(
            'Corporation has no admin. Cannot use "Same as corporate admin" until the corporation admin is set.',
          );
        }
        corpAdmin = admins[0];
      }

      // Legal name must be unique within the corporation (active companies only)
      const existingWithLegalName =
        await this.prisma.corporationCompany.findFirst({
          where: {
            corporationId,
            legalName: createCompanyDto.legalName,
            deletedAt: null,
          },
          select: { id: true },
        });
      if (existingWithLegalName) {
        throw new ConflictException(LEGAL_NAME_DUPLICATE_MSG);
      }

      const companyAdminData = corpAdmin
        ? {
            firstName: corpAdmin.firstName!,
            lastName: corpAdmin.lastName!,
            nickname: corpAdmin.nickname,
            jobRole: corpAdmin.jobRole ?? null,
            email: corpAdmin.email!,
            workPhone: corpAdmin.workPhone!,
            cellPhone: corpAdmin.cellPhone,
          }
        : {
            firstName: createCompanyDto.firstName!,
            lastName: createCompanyDto.lastName!,
            nickname: createCompanyDto.nickname,
            jobRole: createCompanyDto.jobRole ?? null,
            email: createCompanyDto.email!,
            workPhone: createCompanyDto.workPhone!,
            cellPhone: createCompanyDto.cellPhone,
          };

      const phoneNo =
        createCompanyDto.phoneNo != null &&
        createCompanyDto.phoneNo.trim() !== ''
          ? createCompanyDto.phoneNo
          : companyAdminData.workPhone;

      const createData = {
        corporationId,
        legalName: createCompanyDto.legalName,
        dbaName: createCompanyDto.dbaName ?? null,
        website: createCompanyDto.website ?? null,
        companyType: createCompanyDto.companyType,
        officeType: createCompanyDto.officeType,
        industry: createCompanyDto.industry,
        primaryLanguage: createCompanyDto.primaryLanguage ?? null,
        phoneNo,
        sameAsCorpAdmin,
        planId: createCompanyDto.planId ?? null,
        securityPosture: createCompanyDto.securityPosture,
        submittedSteps: createCompanyDto.submittedSteps ?? 1,
        status: createCompanyDto.status ?? COMPANY_STATUS.INCOMPLETE,
        addressLine: createCompanyDto.addressLine,
        state: createCompanyDto.state,
        city: createCompanyDto.city,
        country: createCompanyDto.country,
        zip: createCompanyDto.zip,
      };

      let company: CorporationCompany | undefined;
      try {
        company = await this.prisma.corporationCompany.create({
          data: createData,
        });

        await this.companyAdminOnboarding.provisionCompanyAdminWhenCompanyCreated(
          {
            corporationId,
            companyId: company.id,
            sameAsCorpAdmin,
            firstName: companyAdminData.firstName,
            lastName: companyAdminData.lastName,
            nickname: companyAdminData.nickname ?? null,
            jobRole: companyAdminData.jobRole ?? undefined,
            email: companyAdminData.email,
            workPhone: companyAdminData.workPhone,
            cellPhone: companyAdminData.cellPhone ?? null,
            isAdmin: true,
          },
        );
      } catch (err) {
        if (company?.id) {
          await this.prisma.corporationCompany
            .delete({ where: { id: company.id } })
            .catch(() => undefined);
        }
        throw err;
      }

      if (company.status === COMPANY_STATUS.ACTIVE) {
        try {
          await this.companyAdminOnboarding.onCompanyActivated(
            company.id,
            COMPANY_STATUS.INCOMPLETE,
            company.status,
          );
        } catch (err) {
          await this.prisma.corporationCompany.update({
            where: { id: company.id },
            data: { status: COMPANY_STATUS.INCOMPLETE },
          });
          throw err;
        }
      }

      // Company setup progress is stored on company.submittedSteps only; corporation.submittedSteps is for corporation setup.
      this.logger.log(
        `Company created successfully with ID: ${company.id} for corporation: ${corporationId}`,
      );

      return ResponseHelper.success(COMPANY_CREATED_SUCCESS_MSG, company);
    } catch (error) {
      this.logger.error('Error creating company', error);
      throw error;
    }
  }

  /**
   * Updates an existing company by company ID (PATCH .../corporations/:corporationId/companies/:companyId).
   *
   * Corporation company row: business/address/plan fields from the body are updated; `jobRole` maps to `role` on the company row.
   * When the stored company has sameAsCorpAdmin false, firstName, lastName, nickname, jobRole, workPhone, and cellPhone
   * update the company admin AppUser (via user_company_access where isAdmin is true).
   * Company admin email and sameAsCorpAdmin are not on {@link UpdateCompanyDto}.
   *
   * @returns Selected corporation company scalars (no relations); see {@link COMPANY_UPDATE_RESULT_SELECT}.
   */
  async update(
    corporationId: string,
    companyId: string,
    updateCompanyDto: UpdateCompanyDto,
  ): Promise<ApiResponse<CompanyUpdatePayload>> {
    if (!corporationId) {
      throw new BadRequestException(CORPORATION_ID_REQUIRED_MSG);
    }
    if (!companyId) {
      throw new BadRequestException(COMPANY_ID_REQUIRED_MSG);
    }

    const corpFieldKeys: (keyof UpdateCompanyDto)[] = [
      'legalName',
      'companyType',
      'officeType',
      'industry',
      'planId',
      'phoneNo',
      'addressLine',
      'state',
      'city',
      'country',
      'zip',
      'securityPosture',
    ];

    try {
      const corporation = await this.prisma.corporation.findUnique({
        where: { id: corporationId },
        select: { id: true, status: true },
      });
      if (!corporation) {
        throw new NotFoundException(
          `Corporation with ID "${corporationId}" not found`,
        );
      }
      if (corporation.status === CORPORATION_STATUS.CLOSED) {
        throw new BadRequestException(CORPORATION_CANNOT_UPDATE_CLOSED_MSG);
      }

      const company = await this.prisma.corporationCompany.findFirst({
        where: {
          id: companyId,
          corporationId,
          deletedAt: null,
        },
        select: { id: true, sameAsCorpAdmin: true, submittedSteps: true },
      });

      if (!company) {
        throw new NotFoundException(
          `Company with ID "${companyId}" not found for corporation "${corporationId}"`,
        );
      }

      // If legalName is being updated, it must remain unique within the corporation (active only)
      if (updateCompanyDto.legalName !== undefined) {
        const existingWithLegalName =
          await this.prisma.corporationCompany.findFirst({
            where: {
              corporationId,
              legalName: updateCompanyDto.legalName,
              id: { not: companyId },
              deletedAt: null,
            },
            select: { id: true },
          });
        if (existingWithLegalName) {
          throw new ConflictException(LEGAL_NAME_DUPLICATE_MSG);
        }
      }

      const corpData: Prisma.CorporationCompanyUpdateInput = {};
      for (const key of corpFieldKeys) {
        const value = updateCompanyDto[key];
        if (value !== undefined) {
          (corpData as Record<string, unknown>)[key] = value;
        }
      }

      const appUserData: Prisma.AppUserUpdateInput = {
        firstName: updateCompanyDto.firstName,
        lastName: updateCompanyDto.lastName,
        jobRole: updateCompanyDto.jobRole,
        cellPhone: updateCompanyDto.cellPhone,
        nickname: updateCompanyDto.nickname,
        workPhone: updateCompanyDto.workPhone,
      };

      const hasCorpUpdate = Object.keys(corpData).length > 0;
      const hasAppUserUpdate = !company.sameAsCorpAdmin;

      await this.prisma.$transaction(async (tx) => {
        if (hasCorpUpdate) {
          await tx.corporationCompany.update({
            where: { id: companyId },
            data: corpData,
          });
          if (updateCompanyDto.planId) {
            await this.ensureInitialPlanSeatForPlanId(
              companyId,
              updateCompanyDto.planId,
              tx,
              {
                syncPricingWhenIncomplete: true,
                submittedSteps: company.submittedSteps,
              },
            );
          }
        }
        if (hasAppUserUpdate) {
          const access = await tx.userCompanyAccess.findFirst({
            where: { companyId, isAdmin: true },
          });
          if (!access) {
            throw new BadRequestException(
              COMPANY_ADMIN_ACCESS_NOT_FOUND_FOR_UPDATE_MSG,
            );
          }
          await tx.appUser.update({
            where: { cognitoSub: access.userId },
            data: appUserData,
          });
        }
      });

      const updatedCompany = await this.prisma.corporationCompany.findUnique({
        where: { id: companyId },
        select: COMPANY_UPDATE_RESULT_SELECT,
      });
      if (!updatedCompany) {
        throw new NotFoundException(
          `Company with ID "${companyId}" not found for corporation "${corporationId}"`,
        );
      }

      this.logger.log(
        `Company updated successfully with ID: ${companyId} for corporation: ${corporationId}`,
      );

      return ResponseHelper.success(
        COMPANY_UPDATED_SUCCESS_MSG,
        updatedCompany,
      );
    } catch (error) {
      this.logger.error('Error updating company', error);
      throw error;
    }
  }

  /**
   * Partial update for Add Company wizard Step 1 (by company ID only).
   * Parent corporation is read from the company row for validation.
   * Optional `sameAsCorpAdmin` on the body must match the stored company value (not updated here).
   * When the company does not share the corporation admin, admin profile fields update `app_users` (and denormalized columns on the company row).
   * Used by PATCH /corporations/companies/:companyId.
   */
  async updateCompanyStep1(
    companyId: string,
    dto: UpdateCompanyStep1Dto,
  ): Promise<ApiResponse<CorporationCompany>> {
    if (!companyId) {
      throw new BadRequestException(COMPANY_ID_REQUIRED_MSG);
    }

    try {
      const companyRow = await this.prisma.corporationCompany.findFirst({
        where: { id: companyId, deletedAt: null },
        select: {
          id: true,
          corporationId: true,
          status: true,
          sameAsCorpAdmin: true,
        },
      });

      if (!companyRow) {
        throw new NotFoundException(`Company with ID "${companyId}" not found`);
      }

      const previousStatus = companyRow.status;
      const corporationId = companyRow.corporationId;

      const sharesCorporationAdmin = companyRow.sameAsCorpAdmin;

      if (
        dto.sameAsCorpAdmin !== undefined &&
        dto.sameAsCorpAdmin !== sharesCorporationAdmin
      ) {
        throw new BadRequestException(SAME_AS_CORP_ADMIN_MISMATCH_STEP1_MSG);
      }

      const hasAdminProfilePatch =
        updateCompanyStep1DtoHasAdminProfilePatch(dto);
      if (sharesCorporationAdmin && hasAdminProfilePatch) {
        throw new BadRequestException(
          COMPANY_ADMIN_PROFILE_FIELDS_NOT_EDITABLE_SAME_AS_CORP_STEP1_MSG,
        );
      }

      if (!updateCompanyStep1HasPersistableFields(dto)) {
        throw new BadRequestException(
          COMPANY_STEP1_PATCH_AT_LEAST_ONE_FIELD_MSG,
        );
      }

      const corporation = await this.prisma.corporation.findUnique({
        where: { id: corporationId },
        select: { id: true, status: true },
      });
      if (!corporation) {
        throw new NotFoundException(
          `Corporation with ID "${corporationId}" not found`,
        );
      }
      if (corporation.status === CORPORATION_STATUS.CLOSED) {
        throw new BadRequestException(CORPORATION_CANNOT_UPDATE_CLOSED_MSG);
      }

      if (dto.legalName !== undefined) {
        const existingWithLegalName =
          await this.prisma.corporationCompany.findFirst({
            where: {
              corporationId,
              legalName: dto.legalName,
              id: { not: companyId },
              deletedAt: null,
            },
            select: { id: true },
          });
        if (existingWithLegalName) {
          throw new ConflictException(LEGAL_NAME_DUPLICATE_MSG);
        }
      }

      const companyData = buildUpdateCompanyStep1CompanyRowData(dto);
      const appUserPatch = sharesCorporationAdmin
        ? {}
        : buildUpdateCompanyStep1AppUserPatch(dto);

      const hasCompanyUpdate = Object.keys(companyData).length > 0;
      const hasAppUserUpdate = Object.keys(appUserPatch).length > 0;

      await this.prisma.$transaction(async (tx) => {
        if (hasCompanyUpdate) {
          await tx.corporationCompany.update({
            where: { id: companyId },
            data: companyData,
          });
        }
        if (hasAppUserUpdate) {
          const access = await tx.userCompanyAccess.findFirst({
            where: { companyId, isAdmin: true },
          });
          if (!access) {
            throw new BadRequestException(
              COMPANY_ADMIN_ACCESS_NOT_FOUND_FOR_UPDATE_MSG,
            );
          }
          await tx.appUser.update({
            where: { cognitoSub: access.userId },
            data: appUserPatch,
          });
        }
      });

      const updatedCompany = await this.prisma.corporationCompany.findUnique({
        where: { id: companyId },
      });
      if (!updatedCompany) {
        throw new NotFoundException(`Company with ID "${companyId}" not found`);
      }

      const becameActive =
        previousStatus !== COMPANY_STATUS.ACTIVE &&
        updatedCompany.status === COMPANY_STATUS.ACTIVE;

      if (becameActive) {
        try {
          await this.companyAdminOnboarding.onCompanyActivated(
            companyId,
            previousStatus,
            updatedCompany.status,
          );
        } catch (err) {
          await this.prisma.corporationCompany.update({
            where: { id: companyId },
            data: { status: previousStatus },
          });
          throw err;
        }
      }

      this.logger.log(
        `Company Step 1 updated for ID: ${companyId} (corporation: ${corporationId})`,
      );

      return ResponseHelper.success(
        COMPANY_UPDATED_SUCCESS_MSG,
        updatedCompany,
      );
    } catch (error) {
      this.logger.error('Error updating company (Step 1)', error);
      throw error;
    }
  }

  /**
   * Soft-deletes a company by setting deletedAt. Does not remove the record.
   * Fails if this is the only remaining (non-deleted) company in the corporation.
   *
   * @param corporationId - The corporation ID from the path parameter
   * @param companyId - The company ID from the path parameter
   * @returns {Promise<ApiResponse<CorporationCompany>>} A success response containing the updated company
   * @throws {BadRequestException} If corporation or company ID is missing, or if only one company remains
   * @throws {NotFoundException} If the company does not exist or is already deleted
   */
  async remove(
    corporationId: string,
    companyId: string,
  ): Promise<ApiResponse<CorporationCompany>> {
    if (!corporationId) {
      throw new BadRequestException(CORPORATION_ID_REQUIRED_MSG);
    }
    if (!companyId) {
      throw new BadRequestException(COMPANY_ID_REQUIRED_MSG);
    }

    try {
      const corporation = await this.prisma.corporation.findUnique({
        where: { id: corporationId },
        select: { id: true, status: true },
      });
      if (!corporation) {
        throw new NotFoundException(
          `Corporation with ID "${corporationId}" not found`,
        );
      }
      if (corporation.status === CORPORATION_STATUS.CLOSED) {
        throw new BadRequestException(CORPORATION_CANNOT_UPDATE_CLOSED_MSG);
      }

      const company = await this.prisma.corporationCompany.findFirst({
        where: {
          id: companyId,
          corporationId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!company) {
        throw new NotFoundException(
          `Company with ID "${companyId}" not found for corporation "${corporationId}"`,
        );
      }

      const activeCompanyCount = await this.prisma.corporationCompany.count({
        where: {
          corporationId,
          deletedAt: null,
        },
      });

      if (activeCompanyCount <= 1) {
        throw new BadRequestException(CANNOT_DELETE_LAST_COMPANY_MSG);
      }

      const updatedCompany = await this.prisma.corporationCompany.update({
        where: { id: companyId },
        data: { deletedAt: new Date() },
      });

      this.logger.log(
        `Company soft-deleted with ID: ${companyId} for corporation: ${corporationId}`,
      );

      return ResponseHelper.success(
        COMPANY_DELETED_SUCCESS_MSG,
        updatedCompany,
      );
    } catch (error) {
      this.logger.error('Error deleting company', error);
      throw error;
    }
  }

  /**
   * Company Admin dashboard analytics for users and assessments linked to the caller's
   * admin company (`user_company_access` with `isAdmin`). Assessment rules match Super Admin
   * system analytics (`report_generated` = completed).
   */
  async getDashboardAnalyticsForCompanyAdmin(
    cognitoSub: string,
    groups: string[],
    query: CompanyDashboardAnalyticsQueryDto,
  ): Promise<ApiResponse> {
    const groupSet = new Set(groups ?? []);
    if (!groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN)) {
      throw new ForbiddenException(COMPANY_DASHBOARD_ANALYTICS_FORBIDDEN_MSG);
    }

    const companyId = await this.resolveCompanyAdminMeCompanyId(
      cognitoSub.trim(),
    );

    try {
      const { users, assessments } = await countSystemAnalytics(this.prisma, {
        companyId,
        timeFilter: query.timeFilter,
      });
      return ResponseHelper.success(COMPANY_DASHBOARD_ANALYTICS_SUCCESS_MSG, {
        users,
        assessments,
      });
    } catch (error) {
      this.logger.error(
        `${COMPANY_DASHBOARD_ANALYTICS_FETCH_FAILED_LOG}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
