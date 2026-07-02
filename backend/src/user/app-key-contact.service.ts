import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { isEmail } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { EmailService } from '../email';
import {
  deleteCognitoUser,
  getCognitoSubByUsername,
  ResponseHelper,
  type ApiResponse,
} from '../common';
import {
  COMPANY_ADMIN_ROLE_NAME,
  COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG,
} from '../company/constants/company.messages';
import {
  CORPORATION_ADMIN_APP_USER_TYPE,
  CORPORATION_ADMIN_ROLE_NAME,
} from '../corporation/constants/corporation.messages';
import { COGNITO_USER_SUB_NOT_RESOLVED_MESSAGE } from '../company-admin-onboarding/company-admin-onboarding.constants';
import {
  COGNITO_GROUP_NAMES,
  COGNITO_USER_POOL_ID_ENV_NOT_SET_MESSAGE,
} from './cognito-groups.constants';
import {
  provisionCognitoForAppUserInvite,
  sendAppUserInviteEmail,
} from './app-user-invite-cognito.util';
import {
  APP_USER_INVITE_TYPE,
  APP_USER_INVITE_COMPANY_NOT_FOUND_MSG,
  APP_USER_INVITE_COMPANY_NO_PLAN_MSG,
  APP_USER_INVITE_DUPLICATE_EMAIL_MSG,
  APP_USER_INVITE_EMAIL_FAILED_MSG,
  APP_USER_INVITE_INVALID_END_USER_ROLE_MSG,
  APP_USER_INVITE_PLAN_SEAT_EXCEEDED_MSG,
  APP_USER_STATUS,
} from './constants/app-user.constants';
import { captureUserInviteEmailSent } from '../common/posthog-invite-capture';
import { resolveAppKeyContactTypeLabel } from '../common/contact-type.util';
import { formatDateShort } from '../common/date.util';
import {
  APP_KEY_CONTACTS_LIST_FAILED_MSG,
  APP_KEY_CONTACTS_LIST_FETCH_ERROR_LOG_MSG,
  APP_KEY_CONTACTS_LIST_FETCHED_SUCCESS_MSG,
  APP_KEY_CONTACTS_LIST_FORBIDDEN_MSG,
  APP_KEY_CONTACTS_LIST_CORP_ADMIN_WRONG_CORP_MSG,
  APP_KEY_CONTACTS_LIST_COMPANY_ADMIN_UNASSIGNED_MSG,
  APP_KEY_CONTACTS_LIST_COMPANY_ADMIN_WRONG_COMPANY_MSG,
  APP_KEY_CONTACTS_LIST_COMPANY_ADMIN_WRONG_CORP_MSG,
  APP_KEY_CONTACT_COMPANY_CORPORATION_MISMATCH_MSG,
  APP_KEY_CONTACT_COMPANY_NOT_FOUND_MSG,
  APP_KEY_CONTACT_CORPORATION_NOT_FOUND_MSG,
  APP_KEY_CONTACT_CREATE_ERROR_LOG_MSG,
  APP_KEY_CONTACT_CREATE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
  APP_KEY_CONTACT_CREATE_COMPANY_ADMIN_WRONG_CORP_MSG,
  APP_KEY_CONTACT_CREATE_CORP_ADMIN_WRONG_CORP_MSG,
  APP_KEY_CONTACT_CREATE_FORBIDDEN_MSG,
  APP_KEY_CONTACT_CREATE_FAILED_MSG,
  APP_KEY_CONTACT_CREATED_MSG,
  APP_KEY_CONTACT_EMAIL_DUPLICATE_MSG,
  APP_KEY_CONTACT_EMAIL_USED_BY_APP_USER_MSG,
  APP_KEY_CONTACT_INVITE_FORBIDDEN_MSG,
  APP_KEY_CONTACT_INVITE_CORP_ADMIN_WRONG_CORP_MSG,
  APP_KEY_CONTACT_INVITE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
  APP_KEY_CONTACT_INVITE_COMPANY_ADMIN_WRONG_CORP_MSG,
  APP_KEY_CONTACT_INVITE_SUCCESS_MSG,
  APP_KEY_CONTACT_INVITE_ERROR_LOG_MSG,
  APP_KEY_CONTACT_INVITE_FAILED_MSG,
  APP_KEY_CONTACT_INVITE_MISSING_CORPORATION_OR_COMPANY_MSG,
  APP_KEY_CONTACT_INVITE_ALREADY_LINKED_MSG,
  APP_KEY_CONTACT_STATUS_INVITED,
  APP_KEY_CONTACT_NOT_FOUND_MSG,
  APP_KEY_CONTACT_UPDATE_FORBIDDEN_MSG,
  APP_KEY_CONTACT_UPDATE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
  APP_KEY_CONTACT_UPDATE_COMPANY_ADMIN_WRONG_CORP_MSG,
  APP_KEY_CONTACT_UPDATE_CORP_ADMIN_WRONG_CORP_MSG,
  APP_KEY_CONTACT_UPDATE_EMPTY_BODY_MSG,
  APP_KEY_CONTACT_UPDATE_ERROR_LOG_MSG,
  APP_KEY_CONTACT_UPDATE_FAILED_MSG,
  APP_KEY_CONTACT_UPDATED_MSG,
  APP_KEY_CONTACT_VIEW_FAILED_MSG,
  APP_KEY_CONTACT_VIEW_FETCH_ERROR_LOG_MSG,
  APP_KEY_CONTACT_VIEW_FETCHED_SUCCESS_MSG,
  APP_KEY_CONTACT_SOFT_DELETE_FORBIDDEN_MSG,
  APP_KEY_CONTACT_SOFT_DELETE_CORP_ADMIN_WRONG_CORP_MSG,
  APP_KEY_CONTACT_SOFT_DELETE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
  APP_KEY_CONTACT_SOFT_DELETE_COMPANY_ADMIN_WRONG_CORP_MSG,
  APP_KEY_CONTACT_SOFT_DELETED_MSG,
  APP_KEY_CONTACT_SOFT_DELETE_ERROR_LOG_MSG,
  APP_KEY_CONTACT_SOFT_DELETE_FAILED_MSG,
  APP_KEY_CONTACT_DELETE_LINKED_TO_USER_MSG,
} from './constants/app-key-contact.constants';
import {
  KEY_CONTACT_BULK_COMPLETED_MSG,
  KEY_CONTACT_BULK_COMPANY_NAME_AMBIGUOUS_MSG,
  KEY_CONTACT_BULK_CSV_EMPTY_MSG,
  KEY_CONTACT_BULK_CSV_INVALID_HEADER_MSG,
  KEY_CONTACT_BULK_CSV_MISSING_FILE_MSG,
  KEY_CONTACT_BULK_IMPORT_FORBIDDEN_MSG,
  KEY_CONTACT_BULK_ERROR_LOG_MSG,
  KEY_CONTACT_BULK_FAILED_MSG,
  KEY_CONTACT_BULK_ROW_DUPLICATE_EMAIL_IN_FILE_MSG,
  KEY_CONTACT_BULK_ROW_INVALID_EMAIL_MSG,
  KEY_CONTACT_BULK_ROW_REQUIRED_FIELD_MSG,
} from './constants/app-key-contact-bulk.constants';
import {
  buildKeyContactHeaderIndex,
  KEY_CONTACT_CSV_OPTIONAL_HEADER_KEYS,
  KEY_CONTACT_CSV_REQUIRED_HEADER_KEYS,
  parseKeyContactCsvToRows,
} from './app-key-contact-csv.util';
import { CreateAppKeyContactDto } from './dto/create-app-key-contact.dto';
import {
  type AppKeyContactListSortBy,
  type AppKeyContactListSortOrder,
  ListAppKeyContactsQueryDto,
} from './dto/list-app-key-contacts-query.dto';
import { UpdateAppKeyContactDto } from './dto/update-app-key-contact.dto';
import { SendKeyContactInviteDto } from './dto/send-key-contact-invite.dto';

const appKeyContactListSelect = Prisma.validator<Prisma.AppKeyContactSelect>()({
  id: true,
  contactCode: true,
  firstName: true,
  lastName: true,
  email: true,
  contactType: true,
  jobRole: true,
  workPhone: true,
  timezone: true,
  createdAt: true,
  corporation: {
    select: {
      legalName: true,
      corporationCode: true,
      dataResidencyRegion: true,
    },
  },
  company: {
    select: {
      legalName: true,
    },
  },
});

type AppKeyContactListRow = Prisma.AppKeyContactGetPayload<{
  select: typeof appKeyContactListSelect;
}>;

const appKeyContactDetailSelect =
  Prisma.validator<Prisma.AppKeyContactSelect>()({
    id: true,
    contactCode: true,
    status: true,
    firstName: true,
    lastName: true,
    nickname: true,
    email: true,
    contactType: true,
    jobRole: true,
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
    company: {
      select: {
        legalName: true,
      },
    },
  });

type FailedRow = { row: number; email: string | null; message: string };

@Injectable()
export class AppKeyContactService {
  private readonly logger = new Logger(AppKeyContactService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
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
   * Builds the Prisma `where` clause for the key contacts list: always non-deleted
   * rows with no `app_user_id`, plus optional search, `contactType`, corporationIds,
   * companyIds, and timezones from the query DTO.
   */
  private buildWhere(
    query: ListAppKeyContactsQueryDto,
  ): Prisma.AppKeyContactWhereInput {
    const where: Prisma.AppKeyContactWhereInput = {
      deletedAt: null,
      appUserId: null,
    };

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      const orConditions: Prisma.AppKeyContactWhereInput[] = [
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

    const contactTypeFilter = query.contactType?.trim();
    if (contactTypeFilter) {
      where.contactType = {
        equals: contactTypeFilter,
        mode: 'insensitive',
      };
    }

    const corporationIds = query.corporationIds?.filter(Boolean);
    if (corporationIds?.length) {
      where.corporationId = { in: corporationIds };
    }

    const companyIds = query.companyIds?.filter(Boolean);
    if (companyIds?.length) {
      where.companyId = { in: companyIds };
    }

    const timezones = query.timezones?.filter((tz) => tz.length > 0);
    if (timezones?.length) {
      where.timezone = { in: timezones };
    }

    return where;
  }

  /**
   * Maps list `sortBy` / `sortOrder` to Prisma `orderBy` for `appKeyContact.findMany`.
   * Relation sorts use `corporation` / `company` where applicable; unknown `sortBy`
   * falls back to `contactCode` ascending.
   */
  private buildOrderBy(
    sortBy: AppKeyContactListSortBy,
    sortOrder: AppKeyContactListSortOrder,
  ):
    | Prisma.AppKeyContactOrderByWithRelationInput
    | Prisma.AppKeyContactOrderByWithRelationInput[] {
    const dir = sortOrder;
    switch (sortBy) {
      case 'contactCode':
        return { contactCode: dir };
      case 'name':
        return [{ firstName: dir }, { lastName: dir }];
      case 'corporationName':
        return { corporation: { legalName: dir } };
      case 'companyName':
        return { company: { legalName: dir } };
      case 'contactType':
        return { contactType: dir };
      case 'jobRole':
        return { jobRole: dir };
      case 'timezone':
        return { timezone: dir };
      case 'createdAt':
        return { createdAt: dir };
      default:
        return { contactCode: 'asc' };
    }
  }

  /**
   * Shapes Prisma rows into list items: flattens corporation/company fields,
   * formats `createdAt`, and resolves `contactType` to a display label via the util.
   */
  private mapRows(rows: AppKeyContactListRow[]) {
    return rows.map((row) => ({
      id: row.id,
      contactCode: row.contactCode,
      firstName: row.firstName ?? null,
      lastName: row.lastName ?? null,
      email: row.email ?? null,
      corporationName: row.corporation?.legalName ?? null,
      corporationCode: row.corporation?.corporationCode ?? null,
      companyName: row.company?.legalName ?? null,
      corporationRegion: row.corporation?.dataResidencyRegion ?? null,
      contactType: resolveAppKeyContactTypeLabel(row.contactType),
      jobRole: row.jobRole ?? null,
      workPhone: row.workPhone ?? null,
      timezone: row.timezone ?? null,
      createdAt: formatDateShort(row.createdAt),
    }));
  }

  /**
   * Authorizes POST `/key-contacts` then delegates to {@link create}.
   * **SuperAdmin:** any payload. **CorporationAdmin:** when `corporationId` or `companyId`
   * is sent, the contact must belong to their linked corporation. **CompanyAdmin:** when
   * `companyId` or `corporationId` is sent, the contact must belong to their admin companies.
   * **Others:** {@link ForbiddenException}.
   */
  async createForRequester(
    dto: CreateAppKeyContactDto,
    requesterCognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    this.assertSuperCorpCompanyAdminRequesterAllowed(
      groups,
      APP_KEY_CONTACT_CREATE_FORBIDDEN_MSG,
    );
    await this.assertKeyContactCorpCompanyScopeForRequester(
      dto,
      requesterCognitoSub,
      groups,
      {
        corpAdminWrongCorp: APP_KEY_CONTACT_CREATE_CORP_ADMIN_WRONG_CORP_MSG,
        companyAdminWrongCompany:
          APP_KEY_CONTACT_CREATE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
        companyAdminWrongCorp:
          APP_KEY_CONTACT_CREATE_COMPANY_ADMIN_WRONG_CORP_MSG,
      },
    );
    return this.create(dto);
  }

  /**
   * When a CorporationAdmin or CompanyAdmin sends `corporationId` and/or `companyId`,
   * ensures the scoped ids stay within their linked corporation or admin companies.
   * **CompanyAdmin** with only `corporationId` (no `companyId`) skips corporation scope
   * checks because `companyId` is optional on the contact.
   */
  private async assertKeyContactCorpCompanyScopeForRequester(
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
          APP_KEY_CONTACTS_LIST_COMPANY_ADMIN_UNASSIGNED_MSG,
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
   * Creates a standalone app key contact (`app_user_id` null). Optional `companyId`
   * resolves the corporation from the company; if both IDs are sent they must match.
   * Email must be unique among non-deleted contacts and must not match an app user.
   */
  async create(dto: CreateAppKeyContactDto): Promise<ApiResponse> {
    const emailNorm = dto.email.trim().toLowerCase();

    const trimToNull = (v: string | undefined): string | null => {
      if (v === undefined) {
        return null;
      }
      const t = v.trim();
      return t.length === 0 ? null : t;
    };

    try {
      const otherWithEmail = await this.prisma.appKeyContact.findFirst({
        where: {
          deletedAt: null,
          email: { equals: emailNorm, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (otherWithEmail) {
        throw new ConflictException(APP_KEY_CONTACT_EMAIL_DUPLICATE_MSG);
      }

      const appUserWithEmail = await this.prisma.appUser.findFirst({
        where: {
          deletedAt: null,
          email: { equals: emailNorm, mode: 'insensitive' },
        },
        select: { cognitoSub: true },
      });
      if (appUserWithEmail) {
        throw new ConflictException(APP_KEY_CONTACT_EMAIL_USED_BY_APP_USER_MSG);
      }

      let corporationId: string | null = null;
      let companyId: string | null = null;

      if (dto.companyId) {
        const company = await this.prisma.corporationCompany.findFirst({
          where: { id: dto.companyId, deletedAt: null },
          select: { id: true, corporationId: true },
        });
        if (!company) {
          throw new NotFoundException(APP_KEY_CONTACT_COMPANY_NOT_FOUND_MSG);
        }
        if (dto.corporationId && company.corporationId !== dto.corporationId) {
          throw new BadRequestException(
            APP_KEY_CONTACT_COMPANY_CORPORATION_MISMATCH_MSG,
          );
        }
        corporationId = company.corporationId;
        companyId = company.id;
      } else if (dto.corporationId) {
        const corp = await this.prisma.corporation.findUnique({
          where: { id: dto.corporationId },
          select: { id: true },
        });
        if (!corp) {
          throw new NotFoundException(
            APP_KEY_CONTACT_CORPORATION_NOT_FOUND_MSG,
          );
        }
        corporationId = corp.id;
      }

      const created = await this.prisma.appKeyContact.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: emailNorm,
          workPhone: dto.workPhone,
          contactType: dto.contactType,
          nickname: trimToNull(dto.nickname),
          timezone: trimToNull(dto.timezone),
          cellPhone: trimToNull(dto.cellPhone),
          jobRole: trimToNull(dto.jobRole),
          corporationId,
          companyId,
          appUserId: null,
        },
        select: { id: true },
      });

      const detail = await this.findById(created.id);
      return ResponseHelper.success(APP_KEY_CONTACT_CREATED_MSG, detail.data);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(APP_KEY_CONTACT_CREATE_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(APP_KEY_CONTACT_CREATE_FAILED_MSG);
    }
  }

  /**
   * Authorizes GET `/key-contacts` then delegates to {@link findAllPaginated}.
   * **SuperAdmin:** full list. **CorporationAdmin:** only contacts under their linked
   * corporation. **CompanyAdmin:** only contacts for companies where they have admin
   * `user_company_access`. **Others:** {@link ForbiddenException}.
   */
  async findAllPaginatedForRequester(
    query: ListAppKeyContactsQueryDto,
    cognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    const groupSet = new Set(groups ?? []);
    if (groupSet.has(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      return this.findAllPaginated(query);
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.CORPORATION_ADMIN)) {
      return this.findAllPaginatedForCorpAdmin(query, cognitoSub.trim());
    }
    if (groupSet.has(COGNITO_GROUP_NAMES.COMPANY_ADMIN)) {
      return this.findAllPaginatedForCompanyAdmin(query, cognitoSub.trim());
    }
    throw new ForbiddenException(APP_KEY_CONTACTS_LIST_FORBIDDEN_MSG);
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
   * Paginated `app_key_contacts` where the row is not soft-deleted and not linked
   * to an app user (`app_user_id` IS NULL).
   */
  async findAllPaginated(
    query: ListAppKeyContactsQueryDto,
  ): Promise<ApiResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = this.buildWhere(query);
    const sortBy = query.sortBy ?? 'contactCode';
    const sortOrder = query.sortOrder ?? 'asc';

    try {
      const [total, rows] = await Promise.all([
        this.prisma.appKeyContact.count({ where }),
        this.prisma.appKeyContact.findMany({
          where,
          skip,
          take: limit,
          orderBy: this.buildOrderBy(sortBy, sortOrder),
          select: appKeyContactListSelect,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);
      const items = this.mapRows(rows);

      return ResponseHelper.success(APP_KEY_CONTACTS_LIST_FETCHED_SUCCESS_MSG, {
        items,
        pagination: {
          total,
          page,
          pageSize: limit,
          totalPages,
        },
      });
    } catch (error) {
      this.logger.error(APP_KEY_CONTACTS_LIST_FETCH_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(APP_KEY_CONTACTS_LIST_FAILED_MSG);
    }
  }

  /**
   * CorporationAdmin list path: resolves the caller's linked corporation, rejects
   * `corporationIds` / `companyIds` outside that corporation, then delegates to
   * {@link findAllPaginated} with `corporationIds` forced to that id.
   *
   * @throws {ForbiddenException} When no corporation is linked or filters target another corp.
   */
  private async findAllPaginatedForCorpAdmin(
    query: ListAppKeyContactsQueryDto,
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
      throw new ForbiddenException(
        APP_KEY_CONTACTS_LIST_CORP_ADMIN_WRONG_CORP_MSG,
      );
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
        throw new ForbiddenException(
          APP_KEY_CONTACTS_LIST_CORP_ADMIN_WRONG_CORP_MSG,
        );
      }
    }

    return this.findAllPaginated({
      ...query,
      corporationIds: [myCorporationId],
    });
  }

  /**
   * CompanyAdmin list path: resolves admin `user_company_access` company ids, rejects
   * out-of-scope `companyIds` / `corporationIds`, then delegates to {@link findAllPaginated}
   * with `companyIds` set to the allowed set (all admin companies or a validated subset).
   *
   * @throws {ForbiddenException} When the caller has no admin companies or filters are out of scope.
   */
  private async findAllPaginatedForCompanyAdmin(
    query: ListAppKeyContactsQueryDto,
    cognitoSub: string,
  ): Promise<ApiResponse> {
    const myCompanyIds =
      await this.resolveCompanyIdsForCompanyAdminCognitoSub(cognitoSub);
    if (myCompanyIds.length === 0) {
      throw new ForbiddenException(
        APP_KEY_CONTACTS_LIST_COMPANY_ADMIN_UNASSIGNED_MSG,
      );
    }

    const requestedCompanyIds = query.companyIds?.filter(Boolean);
    let scopedCompanyIds = myCompanyIds;
    if (requestedCompanyIds?.length) {
      const invalid = requestedCompanyIds.filter(
        (id) => !myCompanyIds.includes(id),
      );
      if (invalid.length > 0) {
        throw new ForbiddenException(
          APP_KEY_CONTACTS_LIST_COMPANY_ADMIN_WRONG_COMPANY_MSG,
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
          APP_KEY_CONTACTS_LIST_COMPANY_ADMIN_WRONG_CORP_MSG,
        );
      }
    }

    return this.findAllPaginated({
      ...query,
      companyIds: scopedCompanyIds,
    });
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
   * Authorizes GET `/key-contacts/:id` then delegates to {@link findById}.
   * **SuperAdmin:** any standalone contact. **CorporationAdmin:** only contacts under
   * their linked corporation. **CompanyAdmin:** only contacts for their admin companies.
   * **Others:** {@link ForbiddenException}.
   */
  async findByIdForRequester(
    id: string,
    requesterCognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    this.assertSuperCorpCompanyAdminRequesterAllowed(
      groups,
      APP_KEY_CONTACTS_LIST_FORBIDDEN_MSG,
    );

    const contact = await this.prisma.appKeyContact.findFirst({
      where: { id, deletedAt: null, appUserId: null },
      select: { corporationId: true, companyId: true },
    });
    if (!contact) {
      throw new NotFoundException(APP_KEY_CONTACT_NOT_FOUND_MSG);
    }

    await this.assertKeyContactCorpCompanyScopeForRequester(
      {
        corporationId: contact.corporationId ?? undefined,
        companyId: contact.companyId ?? undefined,
      },
      requesterCognitoSub,
      groups,
      {
        corpAdminWrongCorp: APP_KEY_CONTACTS_LIST_CORP_ADMIN_WRONG_CORP_MSG,
        companyAdminWrongCompany:
          APP_KEY_CONTACTS_LIST_COMPANY_ADMIN_WRONG_COMPANY_MSG,
        companyAdminWrongCorp:
          APP_KEY_CONTACTS_LIST_COMPANY_ADMIN_WRONG_CORP_MSG,
      },
    );

    return this.findById(id);
  }

  /**
   * Single standalone app key contact (same scope as the list: not soft-deleted,
   * not linked to an app user). For admin detail view; includes contactType (label from
   * contact-type.util) and jobRole; no role category fields.
   */
  async findById(id: string): Promise<ApiResponse> {
    try {
      const row = await this.prisma.appKeyContact.findFirst({
        where: { id, deletedAt: null, appUserId: null },
        select: appKeyContactDetailSelect,
      });

      if (!row) {
        throw new NotFoundException(APP_KEY_CONTACT_NOT_FOUND_MSG);
      }

      const corp = row.corporation;
      const companyRow = row.company;

      return ResponseHelper.success(APP_KEY_CONTACT_VIEW_FETCHED_SUCCESS_MSG, {
        id: row.id,
        contactCode: row.contactCode,
        firstName: row.firstName ?? null,
        lastName: row.lastName ?? null,
        nickname: row.nickname?.trim() || null,
        email: row.email ?? null,
        workPhone: row.workPhone ?? null,
        cellPhone: row.cellPhone ?? null,
        timezone: row.timezone ?? null,
        contactType: resolveAppKeyContactTypeLabel(row.contactType),
        jobRole: row.jobRole ?? null,
        createdOn: formatDateShort(row.createdAt),
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
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(APP_KEY_CONTACT_VIEW_FETCH_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(APP_KEY_CONTACT_VIEW_FAILED_MSG);
    }
  }

  /**
   * Authorizes PATCH `/key-contacts/:id` then delegates to {@link update}.
   * **SuperAdmin:** any payload. **CorporationAdmin:** when `corporationId` or `companyId`
   * is sent, the contact must belong to their linked corporation. **CompanyAdmin:** when
   * `companyId` or `corporationId` is sent, the contact must belong to their admin companies.
   * **Others:** {@link ForbiddenException}.
   */
  async updateForRequester(
    id: string,
    dto: UpdateAppKeyContactDto,
    requesterCognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    this.assertSuperCorpCompanyAdminRequesterAllowed(
      groups,
      APP_KEY_CONTACT_UPDATE_FORBIDDEN_MSG,
    );
    await this.assertKeyContactCorpCompanyScopeForRequester(
      dto,
      requesterCognitoSub,
      groups,
      {
        corpAdminWrongCorp: APP_KEY_CONTACT_UPDATE_CORP_ADMIN_WRONG_CORP_MSG,
        companyAdminWrongCompany:
          APP_KEY_CONTACT_UPDATE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
        companyAdminWrongCorp:
          APP_KEY_CONTACT_UPDATE_COMPANY_ADMIN_WRONG_CORP_MSG,
      },
    );
    return this.update(id, dto);
  }

  /**
   * Updates allowed fields on a standalone app key contact (not soft-deleted,
   * `app_user_id` null). Email must be unique among non-deleted contacts and
   * must not match a non-deleted `app_users.email` (case-insensitive).
   * Optional `corporationId` / `companyId` are applied as given when present.
   */
  async update(id: string, dto: UpdateAppKeyContactDto): Promise<ApiResponse> {
    const providedKeys = (
      Object.keys(dto) as (keyof UpdateAppKeyContactDto)[]
    ).filter((k) => dto[k] !== undefined);
    if (providedKeys.length === 0) {
      throw new BadRequestException(APP_KEY_CONTACT_UPDATE_EMPTY_BODY_MSG);
    }

    const trimToNull = (v: string): string | null => {
      const t = v.trim();
      return t.length === 0 ? null : t;
    };

    try {
      const existing = await this.prisma.appKeyContact.findFirst({
        where: { id, deletedAt: null, appUserId: null },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundException(APP_KEY_CONTACT_NOT_FOUND_MSG);
      }

      if (dto.email !== undefined) {
        const emailNorm = dto.email.trim().toLowerCase();

        const otherWithEmail = await this.prisma.appKeyContact.findFirst({
          where: {
            deletedAt: null,
            id: { not: id },
            email: { equals: emailNorm, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (otherWithEmail) {
          throw new ConflictException(APP_KEY_CONTACT_EMAIL_DUPLICATE_MSG);
        }

        const appUserWithEmail = await this.prisma.appUser.findFirst({
          where: {
            deletedAt: null,
            email: { equals: emailNorm, mode: 'insensitive' },
          },
          select: { cognitoSub: true },
        });
        if (appUserWithEmail) {
          throw new ConflictException(
            APP_KEY_CONTACT_EMAIL_USED_BY_APP_USER_MSG,
          );
        }
      }

      const data: Prisma.AppKeyContactUpdateInput = {};
      if (dto.firstName !== undefined) {
        data.firstName = trimToNull(dto.firstName);
      }
      if (dto.lastName !== undefined) {
        data.lastName = trimToNull(dto.lastName);
      }
      if (dto.nickname !== undefined) {
        data.nickname = trimToNull(dto.nickname);
      }
      if (dto.email !== undefined) {
        data.email = dto.email.trim().toLowerCase();
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
      if (dto.contactType !== undefined) {
        data.contactType = trimToNull(dto.contactType);
      }
      if (dto.jobRole !== undefined) {
        data.jobRole = trimToNull(dto.jobRole);
      }

      if (dto.corporationId !== undefined) {
        data.corporation = { connect: { id: dto.corporationId } };
      }
      if (dto.companyId !== undefined) {
        data.company = { connect: { id: dto.companyId } };
      }

      await this.prisma.appKeyContact.update({
        where: { id },
        data,
      });

      const detail = await this.findById(id);
      return ResponseHelper.success(APP_KEY_CONTACT_UPDATED_MSG, detail.data);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(APP_KEY_CONTACT_UPDATE_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(APP_KEY_CONTACT_UPDATE_FAILED_MSG);
    }
  }

  /**
   * Authorizes DELETE `/key-contacts/:id` then delegates to {@link softDelete}.
   * **SuperAdmin:** any standalone contact. **CorporationAdmin:** when the contact has
   * `corporationId` or `companyId`, it must belong to their linked corporation.
   * **CompanyAdmin:** when the contact has those fields, it must belong to their admin
   * companies. **Others:** {@link ForbiddenException}.
   */
  async softDeleteForRequester(
    id: string,
    requesterCognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    this.assertSuperCorpCompanyAdminRequesterAllowed(
      groups,
      APP_KEY_CONTACT_SOFT_DELETE_FORBIDDEN_MSG,
    );

    const contact = await this.prisma.appKeyContact.findFirst({
      where: { id, deletedAt: null, appUserId: null },
      select: { corporationId: true, companyId: true },
    });
    if (!contact) {
      throw new NotFoundException(APP_KEY_CONTACT_NOT_FOUND_MSG);
    }

    await this.assertKeyContactCorpCompanyScopeForRequester(
      {
        corporationId: contact.corporationId ?? undefined,
        companyId: contact.companyId ?? undefined,
      },
      requesterCognitoSub,
      groups,
      {
        corpAdminWrongCorp:
          APP_KEY_CONTACT_SOFT_DELETE_CORP_ADMIN_WRONG_CORP_MSG,
        companyAdminWrongCompany:
          APP_KEY_CONTACT_SOFT_DELETE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
        companyAdminWrongCorp:
          APP_KEY_CONTACT_SOFT_DELETE_COMPANY_ADMIN_WRONG_CORP_MSG,
      },
    );

    return this.softDelete(id);
  }

  /**
   * Sets `deleted_at` on a standalone app key contact (not already soft-deleted,
   * `app_user_id` null). Linked contacts are rejected; same scope as update/list detail.
   */
  async softDelete(id: string): Promise<ApiResponse> {
    try {
      const existing = await this.prisma.appKeyContact.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, appUserId: true },
      });

      if (!existing) {
        throw new NotFoundException(APP_KEY_CONTACT_NOT_FOUND_MSG);
      }

      if (existing.appUserId) {
        throw new BadRequestException(
          APP_KEY_CONTACT_DELETE_LINKED_TO_USER_MSG,
        );
      }

      await this.prisma.appKeyContact.update({
        where: { id },
        data: { deletedAt: new Date() },
        select: { id: true },
      });

      return ResponseHelper.success(APP_KEY_CONTACT_SOFT_DELETED_MSG, { id });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(APP_KEY_CONTACT_SOFT_DELETE_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(
        APP_KEY_CONTACT_SOFT_DELETE_FAILED_MSG,
      );
    }
  }

  /**
   * Authorizes POST `/key-contacts/:id/invite` then delegates to {@link sendInvite}.
   * **SuperAdmin:** any contact. **CorporationAdmin:** when the contact has
   * `corporationId` or `companyId`, it must belong to their linked corporation.
   * **CompanyAdmin:** when the contact has those fields, it must belong to their admin
   * companies. **Others:** {@link ForbiddenException}.
   */
  async sendInviteForRequester(
    id: string,
    dto: SendKeyContactInviteDto,
    requesterCognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    this.assertSuperCorpCompanyAdminRequesterAllowed(
      groups,
      APP_KEY_CONTACT_INVITE_FORBIDDEN_MSG,
    );

    const contact = await this.prisma.appKeyContact.findFirst({
      where: { id, deletedAt: null },
      select: { corporationId: true, companyId: true },
    });
    if (!contact) {
      throw new NotFoundException(APP_KEY_CONTACT_NOT_FOUND_MSG);
    }

    await this.assertKeyContactCorpCompanyScopeForRequester(
      {
        corporationId: contact.corporationId ?? undefined,
        companyId: contact.companyId ?? undefined,
      },
      requesterCognitoSub,
      groups,
      {
        corpAdminWrongCorp: APP_KEY_CONTACT_INVITE_CORP_ADMIN_WRONG_CORP_MSG,
        companyAdminWrongCompany:
          APP_KEY_CONTACT_INVITE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
        companyAdminWrongCorp:
          APP_KEY_CONTACT_INVITE_COMPANY_ADMIN_WRONG_CORP_MSG,
      },
    );

    return this.sendInvite(id, dto);
  }

  /**
   * Provisions an app user from a key contact: Cognito, `app_users`, `user_company_access`,
   * links `app_key_contacts.app_user_id`, and sends the same email as `POST /users/invite`.
   */
  async sendInvite(
    id: string,
    dto: SendKeyContactInviteDto,
  ): Promise<ApiResponse> {
    const roleId = dto.roleId;

    try {
      const contact = await this.prisma.appKeyContact.findFirst({
        where: { id, deletedAt: null },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          nickname: true,
          workPhone: true,
          cellPhone: true,
          timezone: true,
          corporationId: true,
          companyId: true,
          appUserId: true,
        },
      });

      if (!contact) {
        throw new NotFoundException(APP_KEY_CONTACT_NOT_FOUND_MSG);
      }

      if (contact.appUserId) {
        throw new BadRequestException(
          APP_KEY_CONTACT_INVITE_ALREADY_LINKED_MSG,
        );
      }

      if (!contact.corporationId || !contact.companyId) {
        throw new BadRequestException(
          APP_KEY_CONTACT_INVITE_MISSING_CORPORATION_OR_COMPANY_MSG,
        );
      }

      const firstName = contact.firstName?.trim() ?? '';
      const lastName = contact.lastName?.trim() ?? '';
      const emailNorm = (contact.email?.trim() ?? '').toLowerCase();
      const workPhone = contact.workPhone?.trim() ?? '';
      const timezone = contact.timezone?.trim() ?? '';

      const duplicate = await this.prisma.appUser.findFirst({
        where: { email: emailNorm, deletedAt: null },
        select: { cognitoSub: true },
      });
      if (duplicate) {
        throw new BadRequestException(APP_USER_INVITE_DUPLICATE_EMAIL_MSG);
      }

      const corporationId = contact.corporationId;
      const companyId = contact.companyId;

      const company = await this.prisma.corporationCompany.findFirst({
        where: {
          id: companyId,
          corporationId: corporationId,
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
        where: { id: roleId },
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

      const nickname = contact.nickname?.trim() || undefined;
      const cellPhone = contact.cellPhone?.trim() || undefined;

      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.appUser.create({
            data: {
              cognitoSub,
              email: emailNorm,
              firstName,
              lastName,
              nickname: nickname || undefined,
              workPhone,
              cellPhone: cellPhone || undefined,
              timezone,
              inviteType: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
              status: APP_USER_STATUS.PENDING,
              corporationId: corporationId,
              roleId: roleId,
              invitationSentAt: new Date(),
            },
          });

          await tx.appUserGroupMembership.create({
            data: {
              userId: cognitoSub,
              groupId: userGroupRow.id,
            },
          });

          await tx.userCompanyAccess.create({
            data: {
              userId: cognitoSub,
              companyId: companyId,
              isAdmin: false,
            },
          });

          await tx.appKeyContact.update({
            where: { id: contact.id },
            data: {
              appUserId: cognitoSub,
              status: APP_KEY_CONTACT_STATUS_INVITED,
            },
          });
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

      const sent = await sendAppUserInviteEmail(
        this.emailService,
        this.config,
        {
          toEmail: emailNorm,
          temporaryPassword,
          firstName,
          lastName,
        },
      );

      if (!sent) {
        this.logger.error(
          `Failed to send key contact invite email to ${emailNorm} (cognitoSub=${cognitoSub})`,
        );
        throw new InternalServerErrorException(
          APP_USER_INVITE_EMAIL_FAILED_MSG,
        );
      }

      captureUserInviteEmailSent(this.config, cognitoSub, {
        invite_source: 'key_contact_invite',
        invite_type: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
      });

      return ResponseHelper.success(APP_KEY_CONTACT_INVITE_SUCCESS_MSG, {
        id: contact.id,
        cognitoSub,
        email: emailNorm,
        inviteType: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
        roleId,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(APP_KEY_CONTACT_INVITE_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(APP_KEY_CONTACT_INVITE_FAILED_MSG);
    }
  }

  /**
   * Parses a UTF-8 CSV and inserts one standalone `app_key_contacts` row per
   * successful line, mirroring `POST /key-contacts` rules with
   * `corporationName` / `companyName` resolved to IDs. Rows that fail validation,
   * resolution, or requester scope are listed in `failed` without aborting other rows.
   * **SuperAdmin:** any row. **CorporationAdmin:** when `corporationName` and/or
   * `companyName` resolve to ids, they must belong to their linked corporation.
   * **CompanyAdmin:** when those names resolve to ids, they must belong to their admin
   * companies (same rules as {@link createForRequester}). **Others:**
   * {@link ForbiddenException}.
   */
  async importFromCsvFile(
    file: Express.Multer.File,
    requesterCognitoSub: string,
    groups: string[],
  ): Promise<ApiResponse> {
    this.assertSuperCorpCompanyAdminRequesterAllowed(
      groups,
      KEY_CONTACT_BULK_IMPORT_FORBIDDEN_MSG,
    );

    if (!file?.buffer?.length) {
      throw new BadRequestException(KEY_CONTACT_BULK_CSV_MISSING_FILE_MSG);
    }

    const text = file.buffer.toString('utf-8');
    const { headers, dataRows } = parseKeyContactCsvToRows(text);
    if (headers.length === 0) {
      throw new BadRequestException(KEY_CONTACT_BULK_CSV_EMPTY_MSG);
    }

    const headerIndex = buildKeyContactHeaderIndex(headers);
    for (const h of KEY_CONTACT_CSV_REQUIRED_HEADER_KEYS) {
      if (!headerIndex.has(h)) {
        throw new BadRequestException(KEY_CONTACT_BULK_CSV_INVALID_HEADER_MSG);
      }
    }
    for (const h of KEY_CONTACT_CSV_OPTIONAL_HEADER_KEYS) {
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

    const trimToNull = (s: string): string | null =>
      s.length === 0 ? null : s;

    try {
      const preNormEmails: string[] = [];
      for (const row of dataRows) {
        const e = getCell(row, 'email').toLowerCase();
        if (e) {
          preNormEmails.push(e);
        }
      }
      const { fromKeyContact, fromAppUser } =
        await this.loadExistingEmailBlockSetsForBulk(
          Array.from(new Set(preNormEmails)),
        );

      const failed: FailedRow[] = [];
      const createdIds: string[] = [];
      const firstRowByEmail = new Map<string, number>();

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2;
        const firstName = getCell(row, 'firstname');
        const lastName = getCell(row, 'lastname');
        const emailRaw = getCell(row, 'email');
        const workPhone = getCell(row, 'workphone');
        const contactType = getCell(row, 'contacttype');
        const emailNorm = emailRaw.trim().toLowerCase();

        if (emailNorm) {
          if (firstRowByEmail.has(emailNorm)) {
            if (firstRowByEmail.get(emailNorm) !== rowNumber) {
              failed.push({
                row: rowNumber,
                email: emailRaw || null,
                message: KEY_CONTACT_BULK_ROW_DUPLICATE_EMAIL_IN_FILE_MSG,
              });
              continue;
            }
          } else {
            firstRowByEmail.set(emailNorm, rowNumber);
          }
        }

        if (
          !firstName ||
          !lastName ||
          !emailRaw ||
          !workPhone ||
          !contactType
        ) {
          failed.push({
            row: rowNumber,
            email: emailRaw || null,
            message: KEY_CONTACT_BULK_ROW_REQUIRED_FIELD_MSG,
          });
          continue;
        }

        if (!isEmail(emailRaw)) {
          failed.push({
            row: rowNumber,
            email: emailRaw,
            message: KEY_CONTACT_BULK_ROW_INVALID_EMAIL_MSG,
          });
          continue;
        }

        if (fromAppUser.has(emailNorm)) {
          failed.push({
            row: rowNumber,
            email: emailRaw,
            message: APP_KEY_CONTACT_EMAIL_USED_BY_APP_USER_MSG,
          });
          continue;
        }
        if (fromKeyContact.has(emailNorm)) {
          failed.push({
            row: rowNumber,
            email: emailRaw,
            message: APP_KEY_CONTACT_EMAIL_DUPLICATE_MSG,
          });
          continue;
        }

        const nickname = getCell(row, 'nickname');
        const timezone = getCell(row, 'timezone');
        const cellPhone = getCell(row, 'cellphone');
        const jobRole = getCell(row, 'jobrole');
        const corporationName = getCell(row, 'corporationname');
        const companyName = getCell(row, 'companyname');

        try {
          const { corporationId, companyId } =
            await this.resolveCorporationAndCompanyFromNamesForBulk(
              corporationName || undefined,
              companyName || undefined,
            );
          await this.assertKeyContactCorpCompanyScopeForRequester(
            {
              corporationId: corporationId ?? undefined,
              companyId: companyId ?? undefined,
            },
            requesterCognitoSub,
            groups,
            {
              corpAdminWrongCorp:
                APP_KEY_CONTACT_CREATE_CORP_ADMIN_WRONG_CORP_MSG,
              companyAdminWrongCompany:
                APP_KEY_CONTACT_CREATE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
              companyAdminWrongCorp:
                APP_KEY_CONTACT_CREATE_COMPANY_ADMIN_WRONG_CORP_MSG,
            },
          );
          const id = await this.createStandaloneKeyContactInDbForBulk({
            firstName,
            lastName,
            emailNorm,
            workPhone,
            contactType,
            nickname: trimToNull(nickname),
            timezone: trimToNull(timezone),
            cellPhone: trimToNull(cellPhone),
            jobRole: trimToNull(jobRole),
            corporationId,
            companyId,
          });
          createdIds.push(id);
          fromKeyContact.add(emailNorm);
        } catch (err) {
          const message =
            err instanceof NotFoundException ||
            err instanceof BadRequestException ||
            err instanceof ForbiddenException
              ? String(err.message ?? KEY_CONTACT_BULK_FAILED_MSG)
              : err instanceof Error
                ? err.message
                : KEY_CONTACT_BULK_FAILED_MSG;
          failed.push({ row: rowNumber, email: emailRaw, message });
        }
      }

      return ResponseHelper.success(KEY_CONTACT_BULK_COMPLETED_MSG, {
        createdCount: createdIds.length,
        createdIds,
        failed,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(KEY_CONTACT_BULK_ERROR_LOG_MSG, error);
      throw new InternalServerErrorException(KEY_CONTACT_BULK_FAILED_MSG);
    }
  }

  /**
   * For bulk CSV import: loads normalized email sets already taken by
   * non-deleted `app_key_contacts` and `app_users` for the given addresses, so
   * each row can be rejected if the email is already in use.
   */
  private async loadExistingEmailBlockSetsForBulk(
    uniqueNormEmails: string[],
  ): Promise<{
    fromKeyContact: Set<string>;
    fromAppUser: Set<string>;
  }> {
    if (uniqueNormEmails.length === 0) {
      return { fromKeyContact: new Set(), fromAppUser: new Set() };
    }
    const orKc: Prisma.AppKeyContactWhereInput[] = uniqueNormEmails.map(
      (e) => ({ email: { equals: e, mode: 'insensitive' } }),
    );
    const orAu: Prisma.AppUserWhereInput[] = uniqueNormEmails.map((e) => ({
      email: { equals: e, mode: 'insensitive' },
    }));
    const [fromKc, fromAu] = await Promise.all([
      this.prisma.appKeyContact.findMany({
        where: { deletedAt: null, OR: orKc },
        select: { email: true },
      }),
      this.prisma.appUser.findMany({
        where: { deletedAt: null, OR: orAu },
        select: { email: true },
      }),
    ]);
    const sKc = new Set<string>();
    const sAu = new Set<string>();
    for (const r of fromKc) {
      if (r.email) {
        sKc.add(r.email.trim().toLowerCase());
      }
    }
    for (const r of fromAu) {
      if (r.email) {
        sAu.add(r.email.trim().toLowerCase());
      }
    }
    return { fromKeyContact: sKc, fromAppUser: sAu };
  }

  /**
   * Matches `corporationCompany.legalName` to `corporation.legalName` when both
   * names are given; company-only (unique), or corporation-only. Mirrors the
   * scoping of `CreateAppKeyContactDto` with ids.
   */
  private async resolveCorporationAndCompanyFromNamesForBulk(
    corporationNameRaw: string | undefined,
    companyNameRaw: string | undefined,
  ): Promise<{ corporationId: string | null; companyId: string | null }> {
    const corp = corporationNameRaw?.trim() || null;
    const comp = companyNameRaw?.trim() || null;

    if (comp) {
      if (corp) {
        const company = await this.prisma.corporationCompany.findFirst({
          where: {
            deletedAt: null,
            legalName: { equals: comp, mode: 'insensitive' },
            corporation: { legalName: { equals: corp, mode: 'insensitive' } },
          },
          select: { id: true, corporationId: true },
        });
        if (!company) {
          throw new NotFoundException(APP_KEY_CONTACT_COMPANY_NOT_FOUND_MSG);
        }
        return {
          corporationId: company.corporationId,
          companyId: company.id,
        };
      }
      const companies = await this.prisma.corporationCompany.findMany({
        where: {
          deletedAt: null,
          legalName: { equals: comp, mode: 'insensitive' },
        },
        select: { id: true, corporationId: true },
      });
      if (companies.length === 0) {
        throw new NotFoundException(APP_KEY_CONTACT_COMPANY_NOT_FOUND_MSG);
      }
      if (companies.length > 1) {
        throw new BadRequestException(
          KEY_CONTACT_BULK_COMPANY_NAME_AMBIGUOUS_MSG,
        );
      }
      const [only] = companies;
      return {
        corporationId: only.corporationId,
        companyId: only.id,
      };
    }
    if (corp) {
      const row = await this.prisma.corporation.findFirst({
        where: { legalName: { equals: corp, mode: 'insensitive' } },
        select: { id: true },
      });
      if (!row) {
        throw new NotFoundException(APP_KEY_CONTACT_CORPORATION_NOT_FOUND_MSG);
      }
      return { corporationId: row.id, companyId: null };
    }
    return { corporationId: null, companyId: null };
  }

  /**
   * Inserts a single directory key contact (`app_user_id` null) for one CSV
   * row; returns the new `app_key_contacts.id`. Caller is responsible for
   * pre-validated data and resolved corporation/company ids.
   */
  private async createStandaloneKeyContactInDbForBulk(data: {
    firstName: string;
    lastName: string;
    emailNorm: string;
    workPhone: string;
    contactType: string;
    nickname: string | null;
    timezone: string | null;
    cellPhone: string | null;
    jobRole: string | null;
    corporationId: string | null;
    companyId: string | null;
  }): Promise<string> {
    const created = await this.prisma.appKeyContact.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.emailNorm,
        workPhone: data.workPhone,
        contactType: data.contactType,
        nickname: data.nickname,
        timezone: data.timezone,
        cellPhone: data.cellPhone,
        jobRole: data.jobRole,
        corporationId: data.corporationId,
        companyId: data.companyId,
        appUserId: null,
      },
      select: { id: true },
    });
    return created.id;
  }
}
