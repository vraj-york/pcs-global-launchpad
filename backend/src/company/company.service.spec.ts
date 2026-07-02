/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompanyService } from './company.service';
import { PrismaService } from '../prisma';
import { S3Service } from '../s3';
import {
  CreateCompanyDto,
  CreateNewCompanyDto,
  ListCompanyDirectoryQueryDto,
  UpdateCompanyDto,
  UpsertCompanyPlanSeatDto,
  UpsertCompanyConfigurationDto,
} from './dto';
import { COMPANY_STATUS } from './constants/company.status';
import { CORPORATION_STATUS } from '../corporation/constants/corporation.status';
import {
  COMPANY_ADMIN_ACCESS_NOT_FOUND_FOR_UPDATE_MSG,
  COMPANY_ACTIVE_SUMMARIES_FETCHED_SUCCESS_MSG,
  COMPANY_ALL_FETCHED_SUCCESS_MSG,
  COMPANY_ALL_FORBIDDEN_MSG,
  COMPANY_KEY_CONTACTS_UPDATED_SUCCESS_MSG,
  COMPANY_ID_REQUIRED_MSG,
  COMPANY_DETAIL_FORBIDDEN_MSG,
  COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG,
  COMPANY_DETAIL_CORP_ADMIN_WRONG_CORP_MSG,
  COMPANY_DETAIL_COMPANY_ADMIN_FORBIDDEN_MSG,
  COMPANY_DETAIL_SUPER_ADMIN_ME_PATH_MSG,
  COMPANY_DETAIL_CORP_ADMIN_ME_PATH_MSG,
  COMPANY_DETAIL_COMPANY_ADMIN_ME_UNASSIGNED_MSG,
  COMPANY_LIST_FORBIDDEN_MSG,
  COMPANY_ACTIVE_SUMMARIES_FORBIDDEN_MSG,
  COMPANY_DIRECTORY_LIST_FORBIDDEN_MSG,
  COMPANY_DIRECTORY_FILTER_OPTIONS_FORBIDDEN_MSG,
  COMPANY_ALREADY_SUSPENDED_MSG,
  COMPANY_SUSPEND_REQUIRES_ACTIVE_MSG,
  COMPANY_ALREADY_ACTIVE_REINSTATE_MSG,
  COMPANY_REINSTATE_NOT_SUSPENDED_MSG,
  COMPANY_REINSTATE_CORPORATION_SUSPENDED_MSG,
} from './constants/company.messages';
import * as CognitoIdpUtil from '../common/cognito-idp.util';
import { CompanyAdminOnboardingService } from '../company-admin-onboarding';
import { EmailService } from '../email';
import {
  COMPANY_REINSTATED_EMAIL_SUBJECT,
  COMPANY_SUSPENDED_EMAIL_SUBJECT,
} from './constants/company.email.constants';
import { APP_USER_STATUS } from '../user/constants/app-user.constants';
import { COGNITO_GROUP_NAMES } from '../user/cognito-groups.constants';
import * as SystemAnalyticsUtil from '../common/system-analytics.util';

describe('CompanyService', () => {
  let service: CompanyService;
  let prisma: jest.Mocked<PrismaService>;
  let sendEmailMock: jest.Mock;
  let provisionCompanyAdminWhenCompanyCreated: jest.Mock;
  let s3Mock: {
    getCompanyBrandLogosPrefix: jest.Mock;
    buildCompanyBrandLogoKey: jest.Mock;
    getPublicUrl: jest.Mock;
    objectExists: jest.Mock;
    upload: jest.Mock;
    delete: jest.Mock;
  };

  const mockCreateDto: CreateCompanyDto = {
    legalName: 'Acme Company Inc.',
    companyType: 'Operating Company',
    officeType: 'Regional',
    industry: 'Technology',
    planId: '61fa4369-6fe6-4b35-8825-bcadcc8efac8',
    securityPosture: 'High',
    firstName: 'John',
    lastName: 'Doe',
    jobRole: 'Administrator',
    email: 'john.doe@example.com',
    workPhone: '+1-555-123-4567',
    phoneNo: '+1-555-999-0000',
    addressLine: '123 Main Street',
    state: 'California',
    city: 'San Francisco',
    country: 'United States',
    zip: '94105',
  };

  const mockCorporation = {
    id: 'corp-uuid-1',
    mode: 'quick',
    submittedSteps: 1,
  };

  const mockCompany = {
    id: 'company-uuid-1',
    corporationId: 'corp-uuid-1',
    legalName: mockCreateDto.legalName,
    companyType: mockCreateDto.companyType,
    officeType: mockCreateDto.officeType,
    industry: mockCreateDto.industry,
    planId: mockCreateDto.planId,
    securityPosture: mockCreateDto.securityPosture,
    addressLine: mockCreateDto.addressLine,
    state: mockCreateDto.state,
    city: mockCreateDto.city,
    country: mockCreateDto.country,
    zip: mockCreateDto.zip,
    sameAsCorpAdmin: false,
    firstName: null,
    lastName: null,
    nickname: null,
    jobRole: null,
    email: null,
    workPhone: null,
    cellPhone: null,
    submittedSteps: 1,
    status: COMPANY_STATUS.INCOMPLETE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    sendEmailMock = jest.fn().mockResolvedValue(true);
    provisionCompanyAdminWhenCompanyCreated = jest
      .fn()
      .mockResolvedValue(undefined);
    s3Mock = {
      getCompanyBrandLogosPrefix: jest.fn(() => 'company-brand-logos/'),
      buildCompanyBrandLogoKey: jest.fn(
        (f: string) => `company-brand-logos/${f}`,
      ),
      getPublicUrl: jest.fn((k: string) => `https://cdn.example/${k}`),
      objectExists: jest.fn().mockResolvedValue(false),
      upload: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const mockPrisma = {
      corporation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      corporationCompany: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn().mockResolvedValue(undefined),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
      userCompanyAccess: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      appUser: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      companyPlanSeat: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      companyConfiguration: {
        upsert: jest.fn(),
      },
      pricingPlan: {
        findUnique: jest.fn(),
      },
      planType: {
        findMany: jest.fn(),
      },
      appKeyContact: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: S3Service,
          useValue: s3Mock,
        },
        {
          provide: CompanyAdminOnboardingService,
          useValue: {
            onCompanyActivated: jest.fn().mockResolvedValue(undefined),
            provisionCompanyAdminWhenCompanyCreated,
          },
        },
        {
          provide: EmailService,
          useValue: { sendEmail: sendEmailMock },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'COGNITO_USER_POOL_ID') return 'us-east-1_testpool';
              if (key === 'AWS_REGION') return 'us-east-1';
              if (key === 'SUPPORT_CONTACT_EMAIL')
                return 'support@bspblueprint.com';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPaginated', () => {
    const mockDirectoryCompany = {
      id: 'company-uuid-1',
      companyCode: 1,
      legalName: 'New York HQ',
      city: 'New York',
      country: 'North America',
      status: 'ACTIVE',
      createdAt: new Date('2025-01-15'),
      updatedAt: new Date('2025-01-20'),
      corporation: {
        id: 'corp-uuid-1',
        legalName: 'Acme Corporation',
        corporationCode: 1,
      },
      plan: {
        id: 'plan-uuid-1',
        planTypeId: 'monthly',
        customerType: 'Monthly',
        planType: { name: 'BSPBlueprint' },
      },
    };

    it('should return paginated items with default sort (createdAt desc) and pagination meta', async () => {
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([
        mockDirectoryCompany,
      ]);
      (prisma.corporationCompany.count as jest.Mock).mockResolvedValue(14);

      const query: ListCompanyDirectoryQueryDto = { page: 1, limit: 10 };
      const result = await service.findAllPaginated(query);

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Company directory list fetched successfully',
      );
      expect(result.data).toHaveProperty('items');
      expect(result.data).toHaveProperty('pagination');
      const data = result.data as {
        items: unknown[];
        pagination: {
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        };
      };
      expect(data.items).toHaveLength(1);
      expect(data.items[0]).toMatchObject({
        id: mockDirectoryCompany.id,
        companyId: 'COMP-001',
        name: 'New York HQ',
        location: 'New York, North America',
        status: 'ACTIVE',
        assignedCorporation: {
          id: 'corp-uuid-1',
          name: 'Acme Corporation',
          corporationCode: 'CORP-001',
        },
        plan: {
          id: 'plan-uuid-1',
          planTypeId: 'monthly',
          name: 'BSPBlueprint',
          customerType: 'Monthly',
        },
      });
      expect(data.pagination).toEqual({
        total: 14,
        page: 1,
        pageSize: 10,
        totalPages: 2,
      });

      expect(prisma.corporationCompany.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(prisma.corporationCompany.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('should apply search with OR on company name and corporation name only (not company ID)', async () => {
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.corporationCompany.count as jest.Mock).mockResolvedValue(0);

      await service.findAllPaginated({
        search: 'Acme',
      });

      const findManyCalls = (prisma.corporationCompany.findMany as jest.Mock)
        .mock.calls as Array<[Prisma.CorporationCompanyFindManyArgs]>;
      const findManyCall = findManyCalls[0][0];
      expect(findManyCall.where).toHaveProperty('AND');
      const rawAnd = findManyCall.where?.AND;
      const andClauses = Array.isArray(rawAnd)
        ? rawAnd
        : rawAnd
          ? [rawAnd]
          : [];
      const orClause = andClauses.find(
        (
          c,
        ): c is Prisma.CorporationCompanyWhereInput & {
          OR: Prisma.CorporationCompanyWhereInput[];
        } =>
          typeof c === 'object' &&
          c !== null &&
          'OR' in c &&
          Array.isArray((c as { OR?: unknown }).OR),
      );
      expect(orClause?.OR).toHaveLength(2);
      expect(orClause?.OR).toContainEqual({
        legalName: { contains: 'Acme', mode: 'insensitive' },
      });
      expect(orClause?.OR).toContainEqual({
        corporation: {
          legalName: { contains: 'Acme', mode: 'insensitive' },
        },
      });
    });

    it('should apply search on company name and corporation name only', async () => {
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.corporationCompany.count as jest.Mock).mockResolvedValue(0);

      await service.findAllPaginated({ search: 'Acme Corp' });

      const findManyCalls = (prisma.corporationCompany.findMany as jest.Mock)
        .mock.calls as Array<[Prisma.CorporationCompanyFindManyArgs]>;
      const findManyCall = findManyCalls[0][0];
      const rawAnd = findManyCall.where?.AND;
      const andClauses = Array.isArray(rawAnd)
        ? rawAnd
        : rawAnd
          ? [rawAnd]
          : [];
      const orClause = andClauses.find(
        (
          c,
        ): c is Prisma.CorporationCompanyWhereInput & {
          OR: Prisma.CorporationCompanyWhereInput[];
        } =>
          typeof c === 'object' &&
          c !== null &&
          'OR' in c &&
          Array.isArray((c as { OR?: unknown }).OR),
      );
      expect(orClause?.OR).toHaveLength(2);
      const orConditions = orClause?.OR ?? [];
      for (const condition of orConditions) {
        expect(condition).not.toHaveProperty('companyCode');
      }
    });

    it('should apply filters: status, corporationId, planTypeId, createdFilter', async () => {
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.corporationCompany.count as jest.Mock).mockResolvedValue(0);

      await service.findAllPaginated({
        page: 2,
        limit: 5,
        sortBy: 'legalName',
        sortOrder: 'asc',
        status: 'active',
        corporationId: 'corp-uuid-1',
        planTypeId: 'annual',
        createdFilter: 'last30Days',
      });

      const expectedWhere = {
        deletedAt: null,
        corporationId: 'corp-uuid-1',
        corporation: { id: 'corp-uuid-1' },
        plan: { planTypeId: 'annual' },
        status: 'ACTIVE',
        createdAt: { gte: expect.any(Date) as unknown as Date },
      } as Record<string, unknown>;
      const expectedCallArgs = {
        where: expect.objectContaining(
          expectedWhere,
        ) as unknown as Prisma.CorporationCompanyWhereInput,
        skip: 5,
        take: 5,
        orderBy: { legalName: 'asc' },
      } as unknown as Prisma.CorporationCompanyFindManyArgs;
      expect(prisma.corporationCompany.findMany).toHaveBeenCalledWith(
        expect.objectContaining(expectedCallArgs),
      );
    });

    it('should apply closed status filter', async () => {
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.corporationCompany.count as jest.Mock).mockResolvedValue(0);

      await service.findAllPaginated({ status: 'closed' });

      const expectedWhere = {
        deletedAt: null,
        status: 'CLOSED',
      } satisfies Prisma.CorporationCompanyWhereInput;

      expect(prisma.corporationCompany.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expectedWhere,
        }),
      );
    });

    it('should throw InternalServerErrorException with message on unexpected error', async () => {
      (prisma.corporationCompany.findMany as jest.Mock).mockRejectedValue(
        new Error('DB connection lost'),
      );

      await expect(service.findAllPaginated({})).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findAllPaginated({})).rejects.toThrow(
        'Failed to fetch company directory list. Please try again later.',
      );
    });

    it('should rethrow NotFoundException from service', async () => {
      (prisma.corporationCompany.findMany as jest.Mock).mockRejectedValue(
        new NotFoundException('Not found'),
      );

      await expect(service.findAllPaginated({})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAllPaginatedForRequester', () => {
    it('should forbid callers who are not SuperAdmin or CorporationAdmin', async () => {
      await expect(
        service.findAllPaginatedForRequester({}, 'sub-1', ['User']),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findAllPaginatedForRequester({}, 'sub-1', ['User']),
      ).rejects.toThrow(COMPANY_DIRECTORY_LIST_FORBIDDEN_MSG);
    });

    it('should delegate to findAllPaginated for SuperAdmin', async () => {
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.corporationCompany.count as jest.Mock).mockResolvedValue(0);

      await service.findAllPaginatedForRequester(
        { page: 1, limit: 10 },
        'any',
        [COGNITO_GROUP_NAMES.SUPER_ADMIN],
      );

      expect(prisma.corporationCompany.findMany).toHaveBeenCalled();
    });

    it('should forbid CorporationAdmin with no linked corporation', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findAllPaginatedForRequester({}, 'sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG);
    });

    it('should forbid CorporationAdmin when corporationId filter is another corporation', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        corporationId: 'corp-mine',
      });

      await expect(
        service.findAllPaginatedForRequester(
          { corporationId: 'corp-other' },
          'sub-corp',
          [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
        ),
      ).rejects.toThrow(COMPANY_DETAIL_CORP_ADMIN_WRONG_CORP_MSG);
    });

    it('should scope directory to corporation for CorporationAdmin', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        corporationId: 'corp-mine',
      });
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.corporationCompany.count as jest.Mock).mockResolvedValue(0);

      await service.findAllPaginatedForRequester(
        { page: 1, limit: 10 },
        'sub-corp',
        [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
      );

      expect(prisma.corporationCompany.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            corporationId: 'corp-mine',
          }) as Record<string, unknown>,
        }),
      );
    });
  });

  describe('getDirectoryFilterOptions', () => {
    it('should return statuses, corporations, and plans (planTypeId) for filter dropdowns', async () => {
      (prisma.corporation.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'corp-uuid-1',
          legalName: 'Acme Corporation',
          corporationCode: 1,
        },
      ]);
      (prisma.planType.findMany as jest.Mock).mockResolvedValue([
        { id: 'monthly', name: 'BSPBlueprint' },
        { id: 'annual', name: 'BSP Assessment' },
      ]);

      const result = await service.getDirectoryFilterOptions();

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Company directory filter options fetched successfully',
      );
      const data = result.data as {
        statuses: { value: string; label: string }[];
        corporations: { id: string; label: string }[];
        plans: { value: string; label: string }[];
      };
      expect(data.statuses).toEqual(
        expect.arrayContaining([
          { value: 'active', label: 'Active' },
          { value: 'incomplete', label: 'Incomplete' },
          { value: 'suspended', label: 'Suspended' },
          { value: 'closed', label: 'Closed' },
        ]),
      );
      expect(data.statuses).toHaveLength(4);
      expect(data.corporations).toHaveLength(1);
      expect(data.corporations[0]).toEqual({
        id: 'corp-uuid-1',
        label: 'Acme Corporation (CORP-001)',
      });
      expect(data.plans).toHaveLength(2);
      expect(data.plans).toEqual(
        expect.arrayContaining([
          { value: 'monthly', label: 'BSPBlueprint' },
          { value: 'annual', label: 'BSP Assessment' },
        ]),
      );
      expect(prisma.corporation.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        orderBy: { legalName: 'asc' },
        select: { id: true, legalName: true, corporationCode: true },
      });
      expect(prisma.planType.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
    });

    it('should return empty corporations when includeCorporations is false', async () => {
      (prisma.planType.findMany as jest.Mock).mockResolvedValue([
        { id: 'monthly', name: 'BSPBlueprint' },
      ]);

      const result = await service.getDirectoryFilterOptions(false);
      const data = result.data as {
        corporations: { id: string; label: string }[];
      };

      expect(data.corporations).toEqual([]);
      expect(prisma.corporation.findMany).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      (prisma.corporation.findMany as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );

      await expect(service.getDirectoryFilterOptions()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getDirectoryFilterOptions()).rejects.toThrow(
        'Failed to fetch company directory filter options. Please try again later.',
      );
    });
  });

  describe('getDirectoryFilterOptionsForRequester', () => {
    beforeEach(() => {
      (prisma.corporation.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.planType.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('should forbid callers who are not SuperAdmin, CorporationAdmin, or CompanyAdmin', async () => {
      await expect(
        service.getDirectoryFilterOptionsForRequester(['User']),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.getDirectoryFilterOptionsForRequester(['User']),
      ).rejects.toThrow(COMPANY_DIRECTORY_FILTER_OPTIONS_FORBIDDEN_MSG);
    });

    it('should include corporations for SuperAdmin', async () => {
      await service.getDirectoryFilterOptionsForRequester([
        COGNITO_GROUP_NAMES.SUPER_ADMIN,
      ]);

      expect(prisma.corporation.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        orderBy: { legalName: 'asc' },
        select: { id: true, legalName: true, corporationCode: true },
      });
    });

    it.each([
      ['CorporationAdmin', [COGNITO_GROUP_NAMES.CORPORATION_ADMIN]],
      ['CompanyAdmin', [COGNITO_GROUP_NAMES.COMPANY_ADMIN]],
    ])(
      'should not fetch corporations for %s',
      async (_role: string, groups: string[]) => {
        await service.getDirectoryFilterOptionsForRequester(groups);
        expect(prisma.corporation.findMany).not.toHaveBeenCalled();
      },
    );
  });

  describe('findAll', () => {
    it('should throw BadRequestException when corporationId is empty', async () => {
      await expect(service.findAll('', {})).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAll('', {})).rejects.toThrow(
        'Corporation ID is required',
      );
    });

    it('should throw NotFoundException when corporation does not exist', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findAll('non-existent-corp', {})).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findAll('non-existent-corp', {})).rejects.toThrow(
        'Corporation with ID "non-existent-corp" not found',
      );
    });

    it('should return items with success when corporation exists and no filters', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
      });
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([
        {
          id: mockCompany.id,
          corporationId: mockCompany.corporationId,
          legalName: mockCompany.legalName,
          companyType: mockCompany.companyType,
          officeType: mockCompany.officeType,
          industry: mockCompany.industry,
          sameAsCorpAdmin: mockCompany.sameAsCorpAdmin,
          planId: mockCompany.planId,
          securityPosture: mockCompany.securityPosture,
          submittedSteps: mockCompany.submittedSteps,
          status: mockCompany.status,
          addressLine: mockCompany.addressLine,
          state: mockCompany.state,
          city: mockCompany.city,
          country: mockCompany.country,
          zip: mockCompany.zip,
          companyCode: 1,
          corporation: {
            dataResidencyRegion: 'US-East',
            industry: 'Technology',
          },
          plan: {
            id: 'plan-1',
            planTypeId: 'type-1',
            employeeRangeMin: 1,
            employeeRangeMax: 100,
            planType: { name: 'Standard' },
          },
        },
      ]);
      (prisma.userCompanyAccess.findMany as jest.Mock).mockResolvedValue([
        {
          companyId: mockCompany.id,
          user: {
            firstName: 'Admin',
            lastName: 'User',
            nickname: 'AU',
            jobRole: 'Director',
            email: 'admin@example.com',
            workPhone: '+1-555-000-0001',
            cellPhone: '+1-555-000-0002',
          },
        },
      ]);

      const result = await service.findAll('corp-uuid-1', {});

      expect(prisma.userCompanyAccess.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: { in: [mockCompany.id] },
            isAdmin: true,
          }) as Record<string, unknown>,
        }),
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe('Company list fetched successfully');
      expect(result.data).toHaveProperty('items');
      expect((result.data as { items: unknown[] }).items).toHaveLength(1);
      expect((result.data as { items: unknown[] }).items[0]).toMatchObject({
        id: mockCompany.id,
        companyCode: 1,
        legalName: mockCompany.legalName,
        region: 'US-East',
        industry: 'Technology',
        planName: 'Standard',
        firstName: 'Admin',
        lastName: 'User',
        nickname: 'AU',
        role: 'Director',
        email: 'admin@example.com',
        workPhone: '+1-555-000-0001',
        cellPhone: '+1-555-000-0002',
      });
    });
  });

  describe('findAllForRequester', () => {
    it('should forbid callers who are not SuperAdmin or CorporationAdmin', async () => {
      await expect(
        service.findAllForRequester('corp-uuid-1', {}, 'sub-1', ['User']),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findAllForRequester('corp-uuid-1', {}, 'sub-1', ['User']),
      ).rejects.toThrow(COMPANY_LIST_FORBIDDEN_MSG);
    });

    it('should delegate to findAll for SuperAdmin', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
      });
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.userCompanyAccess.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAllForRequester(
        'corp-uuid-1',
        {},
        'any-sub',
        [COGNITO_GROUP_NAMES.SUPER_ADMIN],
      );

      expect(result.success).toBe(true);
      expect(prisma.corporation.findUnique).toHaveBeenCalledWith({
        where: { id: 'corp-uuid-1' },
        select: { id: true },
      });
    });

    it('should forbid CorporationAdmin with no linked corporation', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findAllForRequester('corp-uuid-1', {}, 'sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findAllForRequester('corp-uuid-1', {}, 'sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG);
    });

    it('should forbid CorporationAdmin when path corporationId is not their own', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        corporationId: 'corp-uuid-1',
      });

      await expect(
        service.findAllForRequester('corp-other', {}, 'sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findAllForRequester('corp-other', {}, 'sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(COMPANY_DETAIL_CORP_ADMIN_WRONG_CORP_MSG);
    });

    it('should list companies for CorporationAdmin when path matches their corporation', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        corporationId: mockCompany.corporationId,
      });
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: mockCompany.corporationId,
      });
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([
        {
          id: mockCompany.id,
          corporationId: mockCompany.corporationId,
          legalName: mockCompany.legalName,
          companyType: mockCompany.companyType,
          officeType: mockCompany.officeType,
          industry: mockCompany.industry,
          sameAsCorpAdmin: mockCompany.sameAsCorpAdmin,
          planId: mockCompany.planId,
          securityPosture: mockCompany.securityPosture,
          submittedSteps: mockCompany.submittedSteps,
          status: mockCompany.status,
          addressLine: mockCompany.addressLine,
          state: mockCompany.state,
          city: mockCompany.city,
          country: mockCompany.country,
          zip: mockCompany.zip,
          companyCode: 1,
          corporation: { dataResidencyRegion: 'US-East' },
          plan: {
            id: 'plan-1',
            planTypeId: 'type-1',
            employeeRangeMin: 1,
            employeeRangeMax: 100,
            planType: { name: 'Standard' },
          },
        },
      ]);
      (prisma.userCompanyAccess.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.findAllForRequester(
        mockCompany.corporationId,
        {},
        'sub-corp',
        [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
      );

      expect(result.success).toBe(true);
      expect((result.data as { items: unknown[] }).items).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should throw BadRequestException when companyId is empty', async () => {
      await expect(service.findOne('')).rejects.toThrow(BadRequestException);
      await expect(service.findOne('')).rejects.toThrow(
        'Company ID is required',
      );
    });

    it('should throw NotFoundException when company not found', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findOne('company-uuid-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('company-uuid-1')).rejects.toThrow(
        'Company with ID "company-uuid-1" not found',
      );
    });

    it('should return company with plan when found (excluding createdAt, updatedAt, deletedAt)', async () => {
      const companyWithPlan = {
        id: mockCompany.id,
        corporationId: mockCompany.corporationId,
        legalName: mockCompany.legalName,
        companyType: mockCompany.companyType,
        officeType: mockCompany.officeType,
        industry: mockCompany.industry,
        sameAsCorpAdmin: mockCompany.sameAsCorpAdmin,
        planId: mockCompany.planId,
        securityPosture: mockCompany.securityPosture,
        subscriptionStatus: 'active',
        addressLine: mockCompany.addressLine,
        state: mockCompany.state,
        city: mockCompany.city,
        country: mockCompany.country,
        zip: mockCompany.zip,
        brandLogo: null,
        configuration: null,
        plan: {
          id: 'plan-uuid',
          planTypeId: 'type-1',
          price: 99.99,
          employeeRangeMin: 1,
          employeeRangeMax: 100,
          isCustomPricing: false,
        },
        corporation: {
          legalName: 'Parent Corp Inc.',
          ownershipType: 'Wholly Owned',
          dataResidencyRegion: 'North America',
        },
        appKeyContacts: [
          {
            id: 'key-contact-uuid',
            contactType: 'finance_billing_contact',
            firstName: 'Jane',
            lastName: 'Doe',
            nickname: null,
            jobRole: 'Billing lead',
            email: 'jane.doe@example.com',
            workPhone: '+1-555-123-4567',
            cellPhone: null,
          },
        ],
        userCompanyAccesses: [
          {
            user: {
              firstName: 'Admin',
              lastName: 'User',
              nickname: null,
              email: 'admin@acme.com',
              workPhone: '+1-555-000-0001',
              cellPhone: null,
              jobRole: null,
              role: { name: 'Company Admin' },
            },
          },
        ],
        planSeat: null,
      };
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        companyWithPlan,
      );
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        firstName: 'Jane',
        lastName: 'Admin',
        nickname: null,
        jobRole: 'Administrator',
        email: 'jane@corp.com',
        workPhone: '+1-555-000-0000',
        cellPhone: null,
      });

      const result = await service.findOne('company-uuid-1');

      const expectedSelect = {
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
      };
      expect(prisma.corporationCompany.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'company-uuid-1',
          deletedAt: null,
        },
        select: expectedSelect,
      });
      expect(prisma.appUser.findFirst).toHaveBeenCalledWith({
        where: {
          corporationId: mockCompany.corporationId,
          deletedAt: null,
          userType: { contains: 'corp_admin', mode: 'insensitive' },
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
      expect(result.success).toBe(true);
      expect(result.message).toBe('Company details fetched successfully');
      const {
        appKeyContacts,
        userCompanyAccesses,
        corporation,
        ...companyRest
      } = companyWithPlan;
      const adminUser = userCompanyAccesses[0]?.user;
      expect(result.data).toEqual({
        ...companyRest,
        corporation: {
          ...corporation,
          corporationAdmin: {
            firstName: 'Jane',
            lastName: 'Admin',
            nickname: null,
            jobRole: 'Administrator',
            email: 'jane@corp.com',
            workPhone: '+1-555-000-0000',
            cellPhone: null,
          },
        },
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
      });
      expect(result.data).not.toHaveProperty('createdAt');
      expect(result.data).not.toHaveProperty('updatedAt');
      expect(result.data).not.toHaveProperty('deletedAt');
    });
  });

  describe('findOneForRequester', () => {
    it('should forbid callers without SuperAdmin, CorporationAdmin, or CompanyAdmin', async () => {
      await expect(
        service.findOneForRequester('company-uuid-1', 'sub-1', ['User']),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findOneForRequester('company-uuid-1', 'sub-1', ['User']),
      ).rejects.toThrow(COMPANY_DETAIL_FORBIDDEN_MSG);
    });

    it('should delegate to findOne for SuperAdmin', async () => {
      const companyWithPlan = {
        id: mockCompany.id,
        corporationId: mockCompany.corporationId,
        legalName: mockCompany.legalName,
        companyType: mockCompany.companyType,
        officeType: mockCompany.officeType,
        industry: mockCompany.industry,
        sameAsCorpAdmin: mockCompany.sameAsCorpAdmin,
        planId: mockCompany.planId,
        securityPosture: mockCompany.securityPosture,
        addressLine: mockCompany.addressLine,
        state: mockCompany.state,
        city: mockCompany.city,
        country: mockCompany.country,
        zip: mockCompany.zip,
        brandLogo: null,
        configuration: null,
        plan: {
          id: 'plan-uuid',
          planTypeId: 'type-1',
          price: 99.99,
          employeeRangeMin: 1,
          employeeRangeMax: 100,
          isCustomPricing: false,
        },
        corporation: {
          legalName: 'Parent Corp Inc.',
          ownershipType: 'Wholly Owned',
          dataResidencyRegion: 'North America',
        },
        appKeyContacts: [] as unknown[],
        userCompanyAccesses: [] as unknown[],
        planSeat: null,
      };
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        companyWithPlan,
      );
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.findOneForRequester(
        'company-uuid-1',
        'any-sub',
        [COGNITO_GROUP_NAMES.SUPER_ADMIN],
      );

      expect(result.success).toBe(true);
      expect(prisma.appUser.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should forbid CorporationAdmin with no linked corporation', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOneForRequester('company-uuid-1', 'sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findOneForRequester('company-uuid-1', 'sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG);
    });

    it('should forbid CorporationAdmin when company is under another corporation', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        corporationId: 'corp-uuid-1',
      });
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        corporationId: 'corp-other',
      });

      await expect(
        service.findOneForRequester('company-uuid-1', 'sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findOneForRequester('company-uuid-1', 'sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(COMPANY_DETAIL_CORP_ADMIN_WRONG_CORP_MSG);
    });

    it('should allow CorporationAdmin when company belongs to their corporation', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        corporationId: mockCompany.corporationId,
      });
      const companyWithPlan = {
        id: mockCompany.id,
        corporationId: mockCompany.corporationId,
        legalName: mockCompany.legalName,
        companyType: mockCompany.companyType,
        officeType: mockCompany.officeType,
        industry: mockCompany.industry,
        sameAsCorpAdmin: mockCompany.sameAsCorpAdmin,
        planId: mockCompany.planId,
        securityPosture: mockCompany.securityPosture,
        addressLine: mockCompany.addressLine,
        state: mockCompany.state,
        city: mockCompany.city,
        country: mockCompany.country,
        zip: mockCompany.zip,
        brandLogo: null,
        configuration: null,
        plan: {
          id: 'plan-uuid',
          planTypeId: 'type-1',
          price: 99.99,
          employeeRangeMin: 1,
          employeeRangeMax: 100,
          isCustomPricing: false,
        },
        corporation: {
          legalName: 'Parent Corp Inc.',
          ownershipType: 'Wholly Owned',
          dataResidencyRegion: 'North America',
        },
        appKeyContacts: [] as unknown[],
        userCompanyAccesses: [] as unknown[],
        planSeat: null,
      };
      (prisma.corporationCompany.findFirst as jest.Mock)
        .mockResolvedValueOnce({ corporationId: mockCompany.corporationId })
        .mockResolvedValueOnce(companyWithPlan);
      (prisma.appUser.findFirst as jest.Mock)
        .mockResolvedValueOnce({ corporationId: mockCompany.corporationId })
        .mockResolvedValueOnce(null);

      const result = await service.findOneForRequester(
        'company-uuid-1',
        'sub-corp',
        [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
      );

      expect(result.success).toBe(true);
      expect(prisma.corporationCompany.findFirst).toHaveBeenCalledTimes(2);
    });

    it('should forbid CompanyAdmin without admin user_company_access', async () => {
      (prisma.userCompanyAccess.count as jest.Mock).mockResolvedValue(0);

      await expect(
        service.findOneForRequester('company-uuid-1', 'sub-co', [
          COGNITO_GROUP_NAMES.COMPANY_ADMIN,
        ]),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findOneForRequester('company-uuid-1', 'sub-co', [
          COGNITO_GROUP_NAMES.COMPANY_ADMIN,
        ]),
      ).rejects.toThrow(COMPANY_DETAIL_COMPANY_ADMIN_FORBIDDEN_MSG);
    });

    it('should allow CompanyAdmin with admin access to that company', async () => {
      (prisma.userCompanyAccess.count as jest.Mock).mockResolvedValue(1);
      const companyWithPlan = {
        id: mockCompany.id,
        corporationId: mockCompany.corporationId,
        legalName: mockCompany.legalName,
        companyType: mockCompany.companyType,
        officeType: mockCompany.officeType,
        industry: mockCompany.industry,
        sameAsCorpAdmin: mockCompany.sameAsCorpAdmin,
        planId: mockCompany.planId,
        securityPosture: mockCompany.securityPosture,
        addressLine: mockCompany.addressLine,
        state: mockCompany.state,
        city: mockCompany.city,
        country: mockCompany.country,
        zip: mockCompany.zip,
        brandLogo: null,
        configuration: null,
        plan: {
          id: 'plan-uuid',
          planTypeId: 'type-1',
          price: 99.99,
          employeeRangeMin: 1,
          employeeRangeMax: 100,
          isCustomPricing: false,
        },
        corporation: {
          legalName: 'Parent Corp Inc.',
          ownershipType: 'Wholly Owned',
          dataResidencyRegion: 'North America',
        },
        appKeyContacts: [] as unknown[],
        userCompanyAccesses: [] as unknown[],
        planSeat: null,
      };
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        companyWithPlan,
      );
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.findOneForRequester(
        'company-uuid-1',
        'sub-co',
        [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
      );

      expect(result.success).toBe(true);
      expect(prisma.userCompanyAccess.count).toHaveBeenCalledWith({
        where: {
          userId: 'sub-co',
          companyId: 'company-uuid-1',
          isAdmin: true,
        },
      });
    });

    it('should reject SuperAdmin when path is me', async () => {
      await expect(
        service.findOneForRequester('me', 'sub', [
          COGNITO_GROUP_NAMES.SUPER_ADMIN,
        ]),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.findOneForRequester('ME', 'sub', [
          COGNITO_GROUP_NAMES.SUPER_ADMIN,
        ]),
      ).rejects.toThrow(COMPANY_DETAIL_SUPER_ADMIN_ME_PATH_MSG);
    });

    it('should reject CorporationAdmin when path is me', async () => {
      await expect(
        service.findOneForRequester('me', 'sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.findOneForRequester('me', 'sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(COMPANY_DETAIL_CORP_ADMIN_ME_PATH_MSG);
    });

    it('should forbid me path for callers who are not CompanyAdmin', async () => {
      await expect(
        service.findOneForRequester('me', 'sub-1', ['User']),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findOneForRequester('me', 'sub-1', ['User']),
      ).rejects.toThrow(COMPANY_DETAIL_FORBIDDEN_MSG);
    });

    it('should forbid CompanyAdmin me when no admin company access', async () => {
      (prisma.userCompanyAccess.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOneForRequester('me', 'sub-co', [
          COGNITO_GROUP_NAMES.COMPANY_ADMIN,
        ]),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findOneForRequester('me', 'sub-co', [
          COGNITO_GROUP_NAMES.COMPANY_ADMIN,
        ]),
      ).rejects.toThrow(COMPANY_DETAIL_COMPANY_ADMIN_ME_UNASSIGNED_MSG);
    });

    it('should resolve me for CompanyAdmin to their admin company', async () => {
      (prisma.userCompanyAccess.findFirst as jest.Mock).mockResolvedValue({
        companyId: mockCompany.id,
      });
      const companyWithPlan = {
        id: mockCompany.id,
        corporationId: mockCompany.corporationId,
        legalName: mockCompany.legalName,
        companyType: mockCompany.companyType,
        officeType: mockCompany.officeType,
        industry: mockCompany.industry,
        sameAsCorpAdmin: mockCompany.sameAsCorpAdmin,
        planId: mockCompany.planId,
        securityPosture: mockCompany.securityPosture,
        addressLine: mockCompany.addressLine,
        state: mockCompany.state,
        city: mockCompany.city,
        country: mockCompany.country,
        zip: mockCompany.zip,
        brandLogo: null,
        configuration: null,
        plan: {
          id: 'plan-uuid',
          planTypeId: 'type-1',
          price: 99.99,
          employeeRangeMin: 1,
          employeeRangeMax: 100,
          isCustomPricing: false,
        },
        corporation: {
          legalName: 'Parent Corp Inc.',
          ownershipType: 'Wholly Owned',
          dataResidencyRegion: 'North America',
        },
        appKeyContacts: [] as unknown[],
        userCompanyAccesses: [] as unknown[],
        planSeat: null,
      };
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        companyWithPlan,
      );
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.findOneForRequester('me', 'sub-co', [
        COGNITO_GROUP_NAMES.COMPANY_ADMIN,
      ]);

      expect(result.success).toBe(true);
      expect(prisma.userCompanyAccess.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.userCompanyAccess.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'sub-co',
            isAdmin: true,
            company: { deletedAt: null },
          }) as Record<string, unknown>,
        }),
      );
    });

    it('should resolve me when user is both CorporationAdmin and CompanyAdmin', async () => {
      (prisma.userCompanyAccess.findFirst as jest.Mock).mockResolvedValue({
        companyId: mockCompany.id,
      });
      const companyWithPlan = {
        id: mockCompany.id,
        corporationId: mockCompany.corporationId,
        legalName: mockCompany.legalName,
        companyType: mockCompany.companyType,
        officeType: mockCompany.officeType,
        industry: mockCompany.industry,
        sameAsCorpAdmin: mockCompany.sameAsCorpAdmin,
        planId: mockCompany.planId,
        securityPosture: mockCompany.securityPosture,
        addressLine: mockCompany.addressLine,
        state: mockCompany.state,
        city: mockCompany.city,
        country: mockCompany.country,
        zip: mockCompany.zip,
        brandLogo: null,
        configuration: null,
        plan: {
          id: 'plan-uuid',
          planTypeId: 'type-1',
          price: 99.99,
          employeeRangeMin: 1,
          employeeRangeMax: 100,
          isCustomPricing: false,
        },
        corporation: {
          legalName: 'Parent Corp Inc.',
          ownershipType: 'Wholly Owned',
          dataResidencyRegion: 'North America',
        },
        appKeyContacts: [] as unknown[],
        userCompanyAccesses: [] as unknown[],
        planSeat: null,
      };
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        companyWithPlan,
      );
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.findOneForRequester('me', 'sub-dual', [
        COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        COGNITO_GROUP_NAMES.COMPANY_ADMIN,
      ]);

      expect(result.success).toBe(true);
      expect(prisma.userCompanyAccess.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should allow company via company admin when corporation admin corporation does not match', async () => {
      (prisma.appUser.findFirst as jest.Mock)
        .mockResolvedValueOnce({ corporationId: 'corp-uuid-1' })
        .mockResolvedValueOnce(null);
      (prisma.corporationCompany.findFirst as jest.Mock)
        .mockResolvedValueOnce({ corporationId: 'corp-other' })
        .mockResolvedValueOnce({
          id: mockCompany.id,
          corporationId: mockCompany.corporationId,
          legalName: mockCompany.legalName,
          companyType: mockCompany.companyType,
          officeType: mockCompany.officeType,
          industry: mockCompany.industry,
          sameAsCorpAdmin: mockCompany.sameAsCorpAdmin,
          planId: mockCompany.planId,
          securityPosture: mockCompany.securityPosture,
          addressLine: mockCompany.addressLine,
          state: mockCompany.state,
          city: mockCompany.city,
          country: mockCompany.country,
          zip: mockCompany.zip,
          brandLogo: null,
          configuration: null,
          plan: {
            id: 'plan-uuid',
            planTypeId: 'type-1',
            price: 99.99,
            employeeRangeMin: 1,
            employeeRangeMax: 100,
            isCustomPricing: false,
          },
          corporation: {
            legalName: 'Parent Corp Inc.',
            ownershipType: 'Wholly Owned',
            dataResidencyRegion: 'North America',
          },
          appKeyContacts: [] as unknown[],
          userCompanyAccesses: [] as unknown[],
          planSeat: null,
        });
      (prisma.userCompanyAccess.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findOneForRequester(
        'company-uuid-1',
        'sub-dual',
        [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
          COGNITO_GROUP_NAMES.COMPANY_ADMIN,
        ],
      );

      expect(result.success).toBe(true);
      expect(prisma.userCompanyAccess.count).toHaveBeenCalledWith({
        where: {
          userId: 'sub-dual',
          companyId: 'company-uuid-1',
          isAdmin: true,
        },
      });
    });

    it('should allow company via company admin when corporation admin is unassigned in app_users', async () => {
      (prisma.appUser.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (prisma.userCompanyAccess.count as jest.Mock).mockResolvedValue(1);
      const companyWithPlan = {
        id: mockCompany.id,
        corporationId: mockCompany.corporationId,
        legalName: mockCompany.legalName,
        companyType: mockCompany.companyType,
        officeType: mockCompany.officeType,
        industry: mockCompany.industry,
        sameAsCorpAdmin: mockCompany.sameAsCorpAdmin,
        planId: mockCompany.planId,
        securityPosture: mockCompany.securityPosture,
        addressLine: mockCompany.addressLine,
        state: mockCompany.state,
        city: mockCompany.city,
        country: mockCompany.country,
        zip: mockCompany.zip,
        brandLogo: null,
        configuration: null,
        plan: {
          id: 'plan-uuid',
          planTypeId: 'type-1',
          price: 99.99,
          employeeRangeMin: 1,
          employeeRangeMax: 100,
          isCustomPricing: false,
        },
        corporation: {
          legalName: 'Parent Corp Inc.',
          ownershipType: 'Wholly Owned',
          dataResidencyRegion: 'North America',
        },
        appKeyContacts: [] as unknown[],
        userCompanyAccesses: [] as unknown[],
        planSeat: null,
      };
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        companyWithPlan,
      );

      const result = await service.findOneForRequester(
        'company-uuid-1',
        'sub-dual',
        [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
          COGNITO_GROUP_NAMES.COMPANY_ADMIN,
        ],
      );

      expect(result.success).toBe(true);
    });
  });

  describe('upsertCompanyPlanSeat', () => {
    const planLevelUuid = '61fa4369-6fe6-4b35-8825-bcadcc8efac8';

    const baseDto: UpsertCompanyPlanSeatDto = {
      zeroTrial: false,
      planLevel: planLevelUuid,
      trialStartDate: '2025-01-01',
      trialEndDate: '2025-01-15',
      planPrice: 100,
      invoiceAmount: 100,
    };

    beforeEach(() => {
      (prisma.pricingPlan.findUnique as jest.Mock).mockResolvedValue({
        id: planLevelUuid,
      });
    });

    it('should throw BadRequestException when companyId is empty', async () => {
      await expect(service.upsertCompanyPlanSeat('', baseDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when company not found', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(
        service.upsertCompanyPlanSeat('missing-id', baseDto),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.pricingPlan.findUnique).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when pricing plan does not exist', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        submittedSteps: 2,
        subscriptionStatus: null,
        planSeat: null,
      });
      (prisma.pricingPlan.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.upsertCompanyPlanSeat('company-uuid-1', baseDto),
      ).rejects.toThrow(`Pricing plan with ID "${planLevelUuid}" not found`);
    });

    it('should return without upsert when subscription is active', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        submittedSteps: 2,
        subscriptionStatus: 'active',
      });

      const result = await service.upsertCompanyPlanSeat(
        'company-uuid-1',
        baseDto,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Plan seat cannot be changed while the company has an active subscription.',
      );
      expect(result.data).toBeUndefined();
      expect(prisma.pricingPlan.findUnique).not.toHaveBeenCalled();
      expect(prisma.companyPlanSeat.upsert).not.toHaveBeenCalled();
      expect(prisma.corporationCompany.update).not.toHaveBeenCalled();
    });

    it('should require trial dates when zeroTrial is false', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        submittedSteps: 2,
      });
      await expect(
        service.upsertCompanyPlanSeat('company-uuid-1', {
          zeroTrial: false,
          planLevel: planLevelUuid,
          planPrice: 100,
          invoiceAmount: 100,
        } as UpsertCompanyPlanSeatDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow omitting trial dates when zeroTrial is true', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        submittedSteps: 2,
      });
      const saved = { id: 'seat-1', companyId: 'company-uuid-1' };
      (prisma.companyPlanSeat.upsert as jest.Mock).mockResolvedValue(saved);

      (prisma.corporationCompany.update as jest.Mock).mockResolvedValue({});

      const result = await service.upsertCompanyPlanSeat('company-uuid-1', {
        zeroTrial: true,
        planLevel: planLevelUuid,
        planPrice: 100,
        invoiceAmount: 100,
      });

      expect(result.success).toBe(true);
      expect(prisma.companyPlanSeat.upsert).toHaveBeenCalled();
      type PlanSeatUpsertArg = {
        create: { trialStartDate: unknown; trialEndDate: unknown };
        update: { trialStartDate: unknown; trialEndDate: unknown };
      };
      const calls = (prisma.companyPlanSeat.upsert as jest.Mock).mock.calls as [
        PlanSeatUpsertArg,
      ][];
      const upsertPayload = calls[0][0];
      expect(upsertPayload.create.trialStartDate).toBeNull();
      expect(upsertPayload.create.trialEndDate).toBeNull();
      expect(upsertPayload.update.trialStartDate).toBeNull();
      expect(upsertPayload.update.trialEndDate).toBeNull();
      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
        data: { planId: planLevelUuid, submittedSteps: 3 },
      });
    });

    it('should reject when zeroTrial is true but only one trial date is sent', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        submittedSteps: 2,
      });
      await expect(
        service.upsertCompanyPlanSeat('company-uuid-1', {
          zeroTrial: true,
          planLevel: planLevelUuid,
          trialStartDate: '2025-01-01',
          planPrice: 100,
          invoiceAmount: 100,
        } as UpsertCompanyPlanSeatDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject discount greater than planPrice', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        submittedSteps: 2,
      });
      await expect(
        service.upsertCompanyPlanSeat('company-uuid-1', {
          ...baseDto,
          planPrice: 50,
          discount: 51,
          invoiceAmount: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upsert plan seat and set submittedSteps to 3 when below 3', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        submittedSteps: 2,
      });
      const saved = { id: 'seat-1', companyId: 'company-uuid-1' };
      (prisma.companyPlanSeat.upsert as jest.Mock).mockResolvedValue(saved);
      (prisma.corporationCompany.update as jest.Mock).mockResolvedValue({});

      const result = await service.upsertCompanyPlanSeat(
        'company-uuid-1',
        baseDto,
      );

      expect(prisma.companyPlanSeat.upsert).toHaveBeenCalled();
      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
        data: { planId: planLevelUuid, submittedSteps: 3 },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(saved);
    });

    it('should not increment submittedSteps when already 3', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        submittedSteps: 3,
      });
      (prisma.companyPlanSeat.upsert as jest.Mock).mockResolvedValue({
        id: 'seat-1',
      });
      (prisma.corporationCompany.update as jest.Mock).mockResolvedValue({});

      await service.upsertCompanyPlanSeat('company-uuid-1', baseDto);

      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
        data: { planId: planLevelUuid },
      });
    });
  });

  describe('upsertCompanyConfiguration', () => {
    const fullConfigurationDto: UpsertCompanyConfigurationDto = {
      authMethod: 'Email & Password',
      passwordPolicy: 'Standard (8+ Characters & Mixed case)',
      mfa: 'Required',
      sessionTimeout: '60 min',
      securityPosture: 'Standard',
      primaryLanguage: 'English (US)',
    };

    const savedConfig = {
      id: 'config-1',
      companyId: 'company-uuid-1',
      ...fullConfigurationDto,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should throw BadRequestException when companyId is empty', async () => {
      await expect(
        service.upsertCompanyConfiguration('', fullConfigurationDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when company does not exist', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.upsertCompanyConfiguration('missing', fullConfigurationDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should upsert configuration and set submittedSteps to 4 when below 4', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        submittedSteps: 2,
        brandLogo: null,
      });
      (prisma.companyConfiguration.upsert as jest.Mock).mockResolvedValue(
        savedConfig,
      );
      (prisma.corporationCompany.update as jest.Mock).mockResolvedValue({});

      const result = await service.upsertCompanyConfiguration(
        'company-uuid-1',
        fullConfigurationDto,
      );

      expect(prisma.companyConfiguration.upsert).toHaveBeenCalledWith({
        where: { companyId: 'company-uuid-1' },
        create: {
          companyId: 'company-uuid-1',
          ...fullConfigurationDto,
        },
        update: fullConfigurationDto,
      });
      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
        data: { submittedSteps: 4 },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ ...savedConfig, brandLogo: null });
    });

    it('should upsert full payload and set submittedSteps to 4 when currently 3', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        submittedSteps: 3,
        brandLogo: null,
      });
      const dto: UpsertCompanyConfigurationDto = {
        ...fullConfigurationDto,
        mfa: 'Optional',
      };
      (prisma.companyConfiguration.upsert as jest.Mock).mockResolvedValue({
        ...savedConfig,
        mfa: 'Optional',
      });
      (prisma.corporationCompany.update as jest.Mock).mockResolvedValue({});

      await service.upsertCompanyConfiguration('company-uuid-1', dto);

      expect(prisma.companyConfiguration.upsert).toHaveBeenCalledWith({
        where: { companyId: 'company-uuid-1' },
        create: {
          companyId: 'company-uuid-1',
          ...dto,
        },
        update: dto,
      });
      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
        data: { submittedSteps: 4 },
      });
    });

    it('should not update company submittedSteps when already 4 or greater', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        submittedSteps: 4,
        brandLogo: null,
      });
      const dto: UpsertCompanyConfigurationDto = {
        ...fullConfigurationDto,
        sessionTimeout: '120 min',
      };
      (prisma.companyConfiguration.upsert as jest.Mock).mockResolvedValue({
        ...savedConfig,
        sessionTimeout: '120 min',
      });

      const result = await service.upsertCompanyConfiguration(
        'company-uuid-1',
        dto,
      );

      expect(prisma.companyConfiguration.upsert).toHaveBeenCalled();
      expect(prisma.corporationCompany.update).not.toHaveBeenCalled();
      expect(result.data).toMatchObject({
        sessionTimeout: '120 min',
        brandLogo: null,
      });
    });

    it('should return brandLogo public URL when company already has stored filename', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        submittedSteps: 4,
        brandLogo: 'existing.png',
      });
      (prisma.companyConfiguration.upsert as jest.Mock).mockResolvedValue(
        savedConfig,
      );

      const result = await service.upsertCompanyConfiguration(
        'company-uuid-1',
        fullConfigurationDto,
      );

      expect(s3Mock.getPublicUrl).toHaveBeenCalledWith(
        'company-brand-logos/existing.png',
      );
      expect(result.data).toMatchObject({
        brandLogo: 'https://cdn.example/company-brand-logos/existing.png',
      });
      expect(prisma.corporationCompany.update).not.toHaveBeenCalled();
    });

    it('should reject when more than one logo file is sent', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        submittedSteps: 4,
        brandLogo: null,
      });

      await expect(
        service.upsertCompanyConfiguration(
          'company-uuid-1',
          fullConfigurationDto,
          [
            {
              buffer: Buffer.from('a'),
              mimetype: 'image/png',
              size: 1,
            } as Express.Multer.File,
            {
              buffer: Buffer.from('b'),
              mimetype: 'image/png',
              size: 1,
            } as Express.Multer.File,
          ],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upload optional logo and persist brandLogo filename', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        submittedSteps: 4,
        brandLogo: null,
      });
      (prisma.companyConfiguration.upsert as jest.Mock).mockResolvedValue(
        savedConfig,
      );
      (prisma.corporationCompany.update as jest.Mock).mockResolvedValue({});

      const logoFile = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/png',
        size: 12,
      } as Express.Multer.File;

      await service.upsertCompanyConfiguration(
        'company-uuid-1',
        fullConfigurationDto,
        [logoFile],
      );

      expect(s3Mock.upload).toHaveBeenCalled();
      expect(prisma.corporationCompany.update).toHaveBeenCalled();
      const updateCalls = (prisma.corporationCompany.update as jest.Mock).mock
        .calls as Array<
        [{ where: { id: string }; data: { brandLogo: string } }]
      >;
      expect(updateCalls[0][0].data.brandLogo).toMatch(/^[0-9a-f-]{36}\.png$/);
    });
  });

  describe('deleteCompanyBrandLogo', () => {
    it('should throw BadRequestException when companyId is empty', async () => {
      await expect(service.deleteCompanyBrandLogo('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when company does not exist', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.deleteCompanyBrandLogo('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete S3 object and clear brandLogo when stored', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        brandLogo: 'abc.png',
      });
      s3Mock.objectExists.mockResolvedValue(true);
      (prisma.corporationCompany.update as jest.Mock).mockResolvedValue({});

      const result = await service.deleteCompanyBrandLogo('company-uuid-1');

      expect(s3Mock.delete).toHaveBeenCalledWith('company-brand-logos/abc.png');
      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
        data: { brandLogo: null },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Company brand logo deleted successfully');
    });

    it('should clear brandLogo in DB when no file stored (idempotent)', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        brandLogo: null,
      });
      (prisma.corporationCompany.update as jest.Mock).mockResolvedValue({});

      await service.deleteCompanyBrandLogo('company-uuid-1');

      expect(s3Mock.delete).not.toHaveBeenCalled();
      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
        data: { brandLogo: null },
      });
    });
  });

  describe('confirmCompany', () => {
    it('should throw BadRequestException when companyId is empty', async () => {
      await expect(service.confirmCompany('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when company does not exist', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.confirmCompany('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set status ACTIVE and submittedSteps 5', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
      });
      const updated = {
        id: 'company-uuid-1',
        status: COMPANY_STATUS.ACTIVE,
        submittedSteps: 5,
      };
      (prisma.corporationCompany.update as jest.Mock).mockResolvedValue(
        updated,
      );

      const result = await service.confirmCompany('company-uuid-1');

      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
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
      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Company confirmation completed successfully',
      );
      expect(result.data).toEqual(updated);
    });
  });

  describe('syncEndUserAccessForSubscription', () => {
    let enableSpy: jest.SpiedFunction<
      CompanyService['enableLinkedEndUsersForCompany']
    >;
    let disableSpy: jest.SpiedFunction<
      CompanyService['disableLinkedEndUsersForCompany']
    >;

    beforeEach(() => {
      enableSpy = jest
        .spyOn(service, 'enableLinkedEndUsersForCompany')
        .mockResolvedValue(0);
      disableSpy = jest
        .spyOn(service, 'disableLinkedEndUsersForCompany')
        .mockResolvedValue(0);
    });

    afterEach(() => {
      enableSpy.mockRestore();
      disableSpy.mockRestore();
    });

    it('should skip when company is SUSPENDED', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        status: COMPANY_STATUS.SUSPENDED,
      });

      await service.syncEndUserAccessForSubscription(
        'company-uuid-1',
        'active',
      );

      expect(enableSpy).not.toHaveBeenCalled();
      expect(disableSpy).not.toHaveBeenCalled();
    });

    it('should skip when company is CLOSED', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        status: COMPANY_STATUS.CLOSED,
      });

      await service.syncEndUserAccessForSubscription(
        'company-uuid-1',
        'active',
      );

      expect(enableSpy).not.toHaveBeenCalled();
      expect(disableSpy).not.toHaveBeenCalled();
    });

    it('should enable linked users when company is ACTIVE and subscription is active', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        status: COMPANY_STATUS.ACTIVE,
      });
      enableSpy.mockResolvedValue(2);

      await service.syncEndUserAccessForSubscription(
        'company-uuid-1',
        'active',
      );

      expect(enableSpy).toHaveBeenCalledWith('company-uuid-1');
      expect(disableSpy).not.toHaveBeenCalled();
    });
  });

  describe('suspendCompany', () => {
    const suspendDto = {
      suspendReason: 'Policy violation',
      suspendAdditionalNotes: 'Customer requested suspension',
    };

    let signOutSpy: jest.SpiedFunction<
      typeof CognitoIdpUtil.adminUserGlobalSignOut
    >;
    let disableSpy: jest.SpiedFunction<
      typeof CognitoIdpUtil.setCognitoUserEnabled
    >;

    beforeEach(() => {
      signOutSpy = jest
        .spyOn(CognitoIdpUtil, 'adminUserGlobalSignOut')
        .mockResolvedValue(undefined);
      disableSpy = jest
        .spyOn(CognitoIdpUtil, 'setCognitoUserEnabled')
        .mockResolvedValue(undefined);
    });

    afterEach(() => {
      signOutSpy.mockRestore();
      disableSpy.mockRestore();
    });

    it('should throw BadRequestException when companyId is empty', async () => {
      await expect(service.suspendCompany('', suspendDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when company does not exist', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.suspendCompany('missing', suspendDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when already suspended', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'c1',
        status: COMPANY_STATUS.SUSPENDED,
      });

      await expect(service.suspendCompany('c1', suspendDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.suspendCompany('c1', suspendDto)).rejects.toThrow(
        COMPANY_ALREADY_SUSPENDED_MSG,
      );
    });

    it('should throw BadRequestException when not ACTIVE', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'c1',
        status: COMPANY_STATUS.INCOMPLETE,
      });

      await expect(service.suspendCompany('c1', suspendDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.suspendCompany('c1', suspendDto)).rejects.toThrow(
        COMPANY_SUSPEND_REQUIRES_ACTIVE_MSG,
      );
    });

    it('should suspend ACTIVE company with users', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        status: COMPANY_STATUS.ACTIVE,
        legalName: 'Acme Corp',
      });
      (prisma.userCompanyAccess.findMany as jest.Mock).mockResolvedValue([
        { userId: 'sub-1' },
      ]);
      (prisma.userCompanyAccess.findFirst as jest.Mock).mockResolvedValue({
        user: {
          email: 'admin@acme.com',
          firstName: 'Jane',
          lastName: 'Admin',
        },
      });
      (prisma.appUser.findMany as jest.Mock).mockResolvedValue([
        { cognitoSub: 'sub-1', email: 'a@x.com' },
      ]);
      (prisma.corporationCompany.update as jest.Mock).mockResolvedValue({});
      (prisma.appUser.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.suspendCompany('company-uuid-1', suspendDto);

      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
        data: {
          status: COMPANY_STATUS.SUSPENDED,
          suspendReason: suspendDto.suspendReason,
          suspendAdditionalNotes: suspendDto.suspendAdditionalNotes,
          suspendedClosedOn: expect.any(Date) as Date,
        },
      });
      expect(signOutSpy).toHaveBeenCalledWith(
        expect.anything(),
        'us-east-1_testpool',
        'a@x.com',
        expect.anything(),
      );
      expect(disableSpy).toHaveBeenCalledWith(
        expect.anything(),
        'us-east-1_testpool',
        'a@x.com',
        false,
        expect.anything(),
      );
      expect(prisma.appUser.updateMany).toHaveBeenCalledWith({
        where: { cognitoSub: { in: ['sub-1'] }, deletedAt: null },
        data: { status: APP_USER_STATUS.BLOCKED },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'company-uuid-1',
        status: COMPANY_STATUS.SUSPENDED,
      });
      expect(sendEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@acme.com',
          subject: COMPANY_SUSPENDED_EMAIL_SUBJECT,
          htmlBody: expect.stringContaining('Acme Corp') as string,
          textBody: expect.stringContaining('Policy violation') as string,
        }),
      );
    });

    it('should complete suspend when company admin email is missing', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        status: COMPANY_STATUS.ACTIVE,
        legalName: 'Acme Corp',
      });
      (prisma.userCompanyAccess.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.userCompanyAccess.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.suspendCompany('company-uuid-1', suspendDto);

      expect(result.success).toBe(true);
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it('should complete suspend when suspension email send fails', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        status: COMPANY_STATUS.ACTIVE,
        legalName: 'Acme Corp',
      });
      (prisma.userCompanyAccess.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.userCompanyAccess.findFirst as jest.Mock).mockResolvedValue({
        user: {
          email: 'admin@acme.com',
          firstName: 'Jane',
          lastName: 'Admin',
        },
      });
      sendEmailMock.mockResolvedValue(false);

      const result = await service.suspendCompany('company-uuid-1', suspendDto);

      expect(result.success).toBe(true);
      expect(sendEmailMock).toHaveBeenCalled();
    });
  });

  describe('reinstateCompany', () => {
    let enableSpy: jest.SpiedFunction<
      typeof CognitoIdpUtil.setCognitoUserEnabled
    >;

    beforeEach(() => {
      enableSpy = jest
        .spyOn(CognitoIdpUtil, 'setCognitoUserEnabled')
        .mockResolvedValue(undefined);
    });

    afterEach(() => {
      enableSpy.mockRestore();
    });

    it('should throw BadRequestException when companyId is empty', async () => {
      await expect(service.reinstateCompany('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when company does not exist', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.reinstateCompany('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when already ACTIVE', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'c1',
        status: COMPANY_STATUS.ACTIVE,
      });

      await expect(service.reinstateCompany('c1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reinstateCompany('c1')).rejects.toThrow(
        COMPANY_ALREADY_ACTIVE_REINSTATE_MSG,
      );
    });

    it('should throw BadRequestException when not SUSPENDED', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'c1',
        status: COMPANY_STATUS.INCOMPLETE,
        corporation: { status: CORPORATION_STATUS.ACTIVE },
      });

      await expect(service.reinstateCompany('c1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reinstateCompany('c1')).rejects.toThrow(
        COMPANY_REINSTATE_NOT_SUSPENDED_MSG,
      );
    });

    it('should throw BadRequestException when parent corporation is suspended', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'c1',
        status: COMPANY_STATUS.SUSPENDED,
        corporation: { status: CORPORATION_STATUS.SUSPENDED },
      });

      await expect(service.reinstateCompany('c1')).rejects.toMatchObject({
        constructor: BadRequestException,
        message: COMPANY_REINSTATE_CORPORATION_SUSPENDED_MSG,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should reinstate SUSPENDED company with users', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        status: COMPANY_STATUS.SUSPENDED,
        legalName: 'Acme Corp',
        corporation: { status: CORPORATION_STATUS.ACTIVE },
      });
      (prisma.userCompanyAccess.findMany as jest.Mock).mockResolvedValue([
        { userId: 'sub-1' },
      ]);
      (prisma.userCompanyAccess.findFirst as jest.Mock).mockResolvedValue({
        user: {
          email: 'admin@acme.com',
          firstName: 'Jane',
          lastName: 'Admin',
        },
      });
      (prisma.appUser.findMany as jest.Mock).mockResolvedValue([
        { cognitoSub: 'sub-1', email: 'a@x.com' },
      ]);
      (prisma.corporationCompany.update as jest.Mock).mockResolvedValue({});
      (prisma.appUser.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.reinstateCompany('company-uuid-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
        data: { status: COMPANY_STATUS.ACTIVE },
      });
      expect(prisma.appUser.updateMany).toHaveBeenCalledWith({
        where: { cognitoSub: { in: ['sub-1'] }, deletedAt: null },
        data: { status: APP_USER_STATUS.ACTIVE },
      });
      expect(enableSpy).toHaveBeenCalledWith(
        expect.anything(),
        'us-east-1_testpool',
        'a@x.com',
        true,
        expect.anything(),
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        id: 'company-uuid-1',
        status: COMPANY_STATUS.ACTIVE,
      });
      expect(sendEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@acme.com',
          subject: COMPANY_REINSTATED_EMAIL_SUBJECT,
          htmlBody: expect.stringContaining('Acme Corp') as string,
          textBody: expect.stringContaining('reinstated') as string,
        }),
      );
    });

    it('should complete reinstate when company admin email is missing', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        status: COMPANY_STATUS.SUSPENDED,
        legalName: 'Acme Corp',
        corporation: { status: CORPORATION_STATUS.ACTIVE },
      });
      (prisma.userCompanyAccess.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.userCompanyAccess.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.reinstateCompany('company-uuid-1');

      expect(result.success).toBe(true);
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it('should complete reinstate when reinstatement email send fails', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        status: COMPANY_STATUS.SUSPENDED,
        legalName: 'Acme Corp',
        corporation: { status: CORPORATION_STATUS.ACTIVE },
      });
      (prisma.userCompanyAccess.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.userCompanyAccess.findFirst as jest.Mock).mockResolvedValue({
        user: {
          email: 'admin@acme.com',
          firstName: 'Jane',
          lastName: 'Admin',
        },
      });
      sendEmailMock.mockResolvedValue(false);

      const result = await service.reinstateCompany('company-uuid-1');

      expect(result.success).toBe(true);
      expect(sendEmailMock).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should throw BadRequestException when corporationId is empty', async () => {
      await expect(service.create('', mockCreateDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create('', mockCreateDto)).rejects.toThrow(
        'Corporation ID is required',
      );
    });

    it('should throw NotFoundException when corporation does not exist', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create('non-existent-corp', mockCreateDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.create('non-existent-corp', mockCreateDto),
      ).rejects.toThrow('Corporation with ID "non-existent-corp" not found');
    });

    it('should throw ConflictException when legal name already exists in corporation', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(
        mockCorporation,
      );
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-company-id',
      });

      await expect(
        service.create('corp-uuid-1', mockCreateDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should create company and return success response', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(
        mockCorporation,
      );
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prisma.corporationCompany.create as jest.Mock).mockResolvedValue(
        mockCompany,
      );
      (prisma.pricingPlan.findUnique as jest.Mock).mockResolvedValue({
        id: mockCreateDto.planId,
        price: new Prisma.Decimal(120),
      });
      (prisma.companyPlanSeat.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.companyPlanSeat.create as jest.Mock).mockResolvedValue({
        id: 'plan-seat-1',
        companyId: mockCompany.id,
      });
      (prisma.corporation.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.create('corp-uuid-1', mockCreateDto);

      expect(prisma.corporationCompany.create).toHaveBeenCalledWith({
        data: {
          legalName: mockCreateDto.legalName,
          companyType: mockCreateDto.companyType,
          officeType: mockCreateDto.officeType,
          industry: mockCreateDto.industry,
          planId: mockCreateDto.planId,
          securityPosture: mockCreateDto.securityPosture,
          addressLine: mockCreateDto.addressLine,
          state: mockCreateDto.state,
          city: mockCreateDto.city,
          country: mockCreateDto.country,
          zip: mockCreateDto.zip,
          phoneNo: mockCreateDto.phoneNo,
          corporationId: 'corp-uuid-1',
          submittedSteps: 1,
          status: COMPANY_STATUS.INCOMPLETE,
          sameAsCorpAdmin: false,
        },
      });
      expect(prisma.companyPlanSeat.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: mockCompany.id,
          zeroTrial: false,
          trialLengthDuration: 14,
          planPrice: new Prisma.Decimal(120),
          invoiceAmount: new Prisma.Decimal(120),
        }) as Record<string, unknown>,
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Company created successfully');
      expect(result.data).toEqual(mockCompany);
    });

    it('should create stub plan seat for advanced corporation setup company create', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        ...mockCorporation,
        mode: 'advanced',
      });
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prisma.corporationCompany.create as jest.Mock).mockResolvedValue(
        mockCompany,
      );
      (prisma.pricingPlan.findUnique as jest.Mock).mockResolvedValue({
        id: mockCreateDto.planId,
        price: new Prisma.Decimal(150),
      });
      (prisma.companyPlanSeat.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.companyPlanSeat.create as jest.Mock).mockResolvedValue({
        id: 'plan-seat-advanced',
      });

      await service.create('corp-uuid-1', mockCreateDto);

      expect(prisma.companyPlanSeat.create).toHaveBeenCalled();
      expect(prisma.corporation.update).not.toHaveBeenCalled();
    });

    it('should increment submittedSteps when corporation mode is quick', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(
        mockCorporation,
      );
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prisma.corporationCompany.create as jest.Mock).mockResolvedValue(
        mockCompany,
      );
      (prisma.pricingPlan.findUnique as jest.Mock).mockResolvedValue({
        id: mockCreateDto.planId,
        price: new Prisma.Decimal(120),
      });
      (prisma.companyPlanSeat.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.companyPlanSeat.create as jest.Mock).mockResolvedValue({
        id: 'plan-seat-1',
      });
      (prisma.corporation.update as jest.Mock).mockResolvedValue(undefined);

      await service.create('corp-uuid-1', mockCreateDto);

      expect(prisma.corporation.update).toHaveBeenCalledWith({
        where: { id: 'corp-uuid-1' },
        data: { submittedSteps: 2 },
      });
    });
  });

  describe('createNew', () => {
    const newCompanyDto: CreateNewCompanyDto = {
      legalName: 'Directory Co.',
      companyType: 'Operating Company',
      officeType: 'Regional',
      industry: 'Technology',
      securityPosture: 'High',
      sameAsCorpAdmin: false,
      firstName: 'Sam',
      lastName: 'Admin',
      jobRole: 'Director',
      email: 'sam@directory.example',
      workPhone: '+1-555-0100',
      addressLine: '1 Main St',
      state: 'CA',
      city: 'SF',
      country: 'US',
      zip: '94102',
    };

    const corpForNew = {
      id: 'corp-uuid-1',
      status: 'ACTIVE',
      appUsers: false as const,
    };

    it('should create company and call provisionCompanyAdminWhenCompanyCreated', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(
        corpForNew,
      );
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      const created = {
        ...mockCompany,
        id: 'new-company-id',
        legalName: newCompanyDto.legalName,
        firstName: newCompanyDto.firstName,
        lastName: newCompanyDto.lastName,
      };
      (prisma.corporationCompany.create as jest.Mock).mockResolvedValue(
        created,
      );

      const result = await service.createNew('corp-uuid-1', newCompanyDto);

      expect(provisionCompanyAdminWhenCompanyCreated).toHaveBeenCalledWith({
        corporationId: 'corp-uuid-1',
        companyId: 'new-company-id',
        sameAsCorpAdmin: false,
        firstName: newCompanyDto.firstName,
        lastName: newCompanyDto.lastName,
        nickname: null,
        jobRole: newCompanyDto.jobRole,
        email: newCompanyDto.email,
        workPhone: newCompanyDto.workPhone,
        cellPhone: null,
        isAdmin: true,
      });
      expect(result.success).toBe(true);
      expect(prisma.corporationCompany.delete).not.toHaveBeenCalled();
    });

    it('should delete company when provisionCompanyAdminWhenCompanyCreated fails', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(
        corpForNew,
      );
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prisma.corporationCompany.create as jest.Mock).mockResolvedValue({
        ...mockCompany,
        id: 'rollback-company-id',
      });
      provisionCompanyAdminWhenCompanyCreated.mockRejectedValueOnce(
        new Error('provision failed'),
      );

      await expect(
        service.createNew('corp-uuid-1', newCompanyDto),
      ).rejects.toThrow('provision failed');

      expect(prisma.corporationCompany.delete).toHaveBeenCalledWith({
        where: { id: 'rollback-company-id' },
      });
    });
  });

  describe('update', () => {
    const buildUpdateDto = (
      overrides: Omit<UpdateCompanyDto, 'phoneNo'> &
        Partial<Pick<UpdateCompanyDto, 'phoneNo'>>,
    ): UpdateCompanyDto => ({
      phoneNo: mockCreateDto.phoneNo,
      ...overrides,
    });

    const companyUpdateData = (
      overrides: Partial<{
        id: string;
        corporationId: string;
        companyCode: number;
        legalName: string;
        dbaName: string | null;
      }> = {},
    ) => ({
      id: mockCompany.id,
      corporationId: mockCompany.corporationId,
      companyCode: 1,
      legalName: mockCompany.legalName,
      dbaName: null as string | null,
      ...overrides,
    });

    it('should throw BadRequestException when corporationId is empty', async () => {
      await expect(
        service.update(
          '',
          'company-1',
          buildUpdateDto({ legalName: 'New Name' }),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when companyId is empty', async () => {
      await expect(
        service.update('corp-1', '', buildUpdateDto({ legalName: 'New Name' })),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when company not found for corporation', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: 'ACTIVE',
      });
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.update(
          'corp-uuid-1',
          'company-uuid-1',
          buildUpdateDto({ legalName: 'Updated Name' }),
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(
          'corp-uuid-1',
          'company-uuid-1',
          buildUpdateDto({ legalName: 'Updated Name' }),
        ),
      ).rejects.toThrow(
        'Company with ID "company-uuid-1" not found for corporation "corp-uuid-1"',
      );
    });

    it('should throw ConflictException when legalName duplicate on update', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: 'ACTIVE',
      });
      (prisma.corporationCompany.findFirst as jest.Mock).mockImplementation(
        (args: { where: { legalName?: string } }) => {
          if (args?.where?.legalName !== undefined) {
            return Promise.resolve({ id: 'other-company-id' });
          }
          return Promise.resolve({
            id: 'company-uuid-1',
            sameAsCorpAdmin: false,
          });
        },
      );

      await expect(
        service.update(
          'corp-uuid-1',
          'company-uuid-1',
          buildUpdateDto({ legalName: 'Duplicate Legal Name Inc.' }),
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should update company and return success response', async () => {
      const findUniqueRow = companyUpdateData({
        legalName: 'Updated Acme Inc.',
      });
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: 'ACTIVE',
      });
      (prisma.corporationCompany.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'company-uuid-1',
          sameAsCorpAdmin: true,
        })
        .mockResolvedValueOnce(null);
      (prisma.corporationCompany.update as jest.Mock).mockResolvedValue(
        findUniqueRow,
      );
      (prisma.corporationCompany.findUnique as jest.Mock).mockResolvedValue(
        findUniqueRow,
      );

      const updateDto: UpdateCompanyDto = buildUpdateDto({
        legalName: 'Updated Acme Inc.',
      });
      const result = await service.update(
        'corp-uuid-1',
        'company-uuid-1',
        updateDto,
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
        data: {
          legalName: 'Updated Acme Inc.',
          phoneNo: mockCreateDto.phoneNo,
        },
      });
      expect(prisma.userCompanyAccess.findFirst).not.toHaveBeenCalled();
      expect(prisma.appUser.update).not.toHaveBeenCalled();
      expect(prisma.corporationCompany.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'company-uuid-1' },
        }),
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe('Company updated successfully');
      expect(result.data).toEqual(findUniqueRow);
    });

    it('should create stub plan seat when planId is updated and none exists', async () => {
      const newPlanId = 'new-plan-uuid';
      const findUniqueRow = companyUpdateData();
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: 'ACTIVE',
      });
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        sameAsCorpAdmin: true,
        submittedSteps: 1,
      });
      (prisma.pricingPlan.findUnique as jest.Mock).mockResolvedValue({
        id: newPlanId,
        price: new Prisma.Decimal(99),
      });
      (prisma.companyPlanSeat.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.companyPlanSeat.create as jest.Mock).mockResolvedValue({
        id: 'plan-seat-1',
      });
      (prisma.corporationCompany.findUnique as jest.Mock).mockResolvedValue(
        findUniqueRow,
      );

      const result = await service.update('corp-uuid-1', 'company-uuid-1', {
        phoneNo: mockCreateDto.phoneNo,
        planId: newPlanId,
      });

      expect(prisma.companyPlanSeat.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'company-uuid-1',
          planPrice: new Prisma.Decimal(99),
          invoiceAmount: new Prisma.Decimal(99),
        }) as Record<string, unknown>,
      });
      expect(result.success).toBe(true);
    });

    it('should sync stub plan seat pricing when planId changes before plan seats step', async () => {
      const newPlanId = 'new-plan-uuid';
      const findUniqueRow = companyUpdateData();
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: 'ACTIVE',
      });
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        sameAsCorpAdmin: true,
        submittedSteps: 1,
      });
      (prisma.pricingPlan.findUnique as jest.Mock).mockResolvedValue({
        id: newPlanId,
        price: new Prisma.Decimal(199),
      });
      (prisma.companyPlanSeat.findUnique as jest.Mock).mockResolvedValue({
        id: 'plan-seat-1',
      });
      (prisma.companyPlanSeat.update as jest.Mock).mockResolvedValue({
        id: 'plan-seat-1',
      });
      (prisma.corporationCompany.findUnique as jest.Mock).mockResolvedValue(
        findUniqueRow,
      );

      const result = await service.update('corp-uuid-1', 'company-uuid-1', {
        phoneNo: mockCreateDto.phoneNo,
        planId: newPlanId,
      });

      expect(prisma.companyPlanSeat.create).not.toHaveBeenCalled();
      expect(prisma.companyPlanSeat.update).toHaveBeenCalledWith({
        where: { companyId: 'company-uuid-1' },
        data: {
          planPrice: new Prisma.Decimal(199),
          invoiceAmount: new Prisma.Decimal(199),
        },
      });
      expect(result.success).toBe(true);
    });

    it('should update company admin app user when sameAsCorpAdmin is false and profile fields are sent', async () => {
      const findUniqueRow = companyUpdateData({
        legalName: 'Updated Acme Inc.',
      });
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: 'ACTIVE',
      });
      (prisma.corporationCompany.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'company-uuid-1',
          sameAsCorpAdmin: false,
        })
        .mockResolvedValueOnce(null);
      (prisma.userCompanyAccess.findFirst as jest.Mock).mockResolvedValue({
        userId: 'admin-cognito-sub',
      });
      (prisma.corporationCompany.findUnique as jest.Mock).mockResolvedValue(
        findUniqueRow,
      );

      const updateDto: UpdateCompanyDto = buildUpdateDto({
        legalName: 'Updated Acme Inc.',
        firstName: 'Jane',
        lastName: 'Smith',
        jobRole: 'Director',
        nickname: 'J',
        workPhone: '+1-555-000-0000',
        cellPhone: '+1-555-000-0001',
      });
      const result = await service.update(
        'corp-uuid-1',
        'company-uuid-1',
        updateDto,
      );

      expect(prisma.appUser.update).toHaveBeenCalledWith({
        where: { cognitoSub: 'admin-cognito-sub' },
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          jobRole: 'Director',
          nickname: 'J',
          workPhone: '+1-555-000-0000',
          cellPhone: '+1-555-000-0001',
        },
      });
      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
        data: {
          legalName: 'Updated Acme Inc.',
          phoneNo: mockCreateDto.phoneNo,
        },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(findUniqueRow);
    });

    it('should not update app user when sameAsCorpAdmin is true even if profile fields are sent', async () => {
      const findUniqueRow = companyUpdateData({
        legalName: 'Updated Acme Inc.',
      });
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: 'ACTIVE',
      });
      (prisma.corporationCompany.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'company-uuid-1',
          sameAsCorpAdmin: true,
        })
        .mockResolvedValueOnce(null);
      (prisma.corporationCompany.findUnique as jest.Mock).mockResolvedValue(
        findUniqueRow,
      );

      const result = await service.update(
        'corp-uuid-1',
        'company-uuid-1',
        buildUpdateDto({
          legalName: 'Updated Acme Inc.',
          firstName: 'Ignored',
        }),
      );

      expect(prisma.userCompanyAccess.findFirst).not.toHaveBeenCalled();
      expect(prisma.appUser.update).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should succeed with no DB updates when sameAsCorpAdmin is true and body has no corp fields', async () => {
      const findUniqueRow = companyUpdateData();
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: 'ACTIVE',
      });
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        sameAsCorpAdmin: true,
      });
      (prisma.corporationCompany.findUnique as jest.Mock).mockResolvedValue(
        findUniqueRow,
      );

      const result = await service.update('corp-uuid-1', 'company-uuid-1', {
        firstName: 'Only',
      } as UpdateCompanyDto);

      expect(prisma.corporationCompany.update).not.toHaveBeenCalled();
      expect(prisma.userCompanyAccess.findFirst).not.toHaveBeenCalled();
      expect(prisma.appUser.update).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(findUniqueRow);
    });

    it('should throw BadRequestException when company admin access is missing for profile update', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: 'ACTIVE',
      });
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
        sameAsCorpAdmin: false,
      });
      (prisma.userCompanyAccess.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update(
          'corp-uuid-1',
          'company-uuid-1',
          buildUpdateDto({ firstName: 'Jane' }),
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(
          'corp-uuid-1',
          'company-uuid-1',
          buildUpdateDto({ firstName: 'Jane' }),
        ),
      ).rejects.toThrow(COMPANY_ADMIN_ACCESS_NOT_FOUND_FOR_UPDATE_MSG);
    });
  });

  describe('findActiveCompanies', () => {
    it('should return active company id, corporationId, and legalName summaries ordered by legal name', async () => {
      const rows = [
        { id: 'b-id', corporationId: 'corp-2', legalName: 'Beta LLC' },
        { id: 'a-id', corporationId: 'corp-1', legalName: 'Alpha Inc' },
      ];
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue(rows);

      const result = await service.findActiveCompanies();

      expect(prisma.corporationCompany.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          status: COMPANY_STATUS.ACTIVE,
        },
        orderBy: { legalName: 'asc' },
        select: { id: true, corporationId: true, legalName: true },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe(COMPANY_ACTIVE_SUMMARIES_FETCHED_SUCCESS_MSG);
      expect(result.data).toEqual({ items: rows });
    });

    it('should scope to corporation when corporationId is provided', async () => {
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([]);

      await service.findActiveCompanies('corp-uuid-1');

      expect(prisma.corporationCompany.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          status: COMPANY_STATUS.ACTIVE,
          corporationId: 'corp-uuid-1',
        },
        orderBy: { legalName: 'asc' },
        select: { id: true, corporationId: true, legalName: true },
      });
    });

    it('should propagate errors from findMany', async () => {
      const err = new Error('db failure');
      (prisma.corporationCompany.findMany as jest.Mock).mockRejectedValue(err);

      await expect(service.findActiveCompanies()).rejects.toThrow('db failure');
    });
  });

  describe('findActiveCompaniesForRequester', () => {
    it('should forbid callers who are not SuperAdmin or CorporationAdmin', async () => {
      await expect(
        service.findActiveCompaniesForRequester('sub-1', ['User']),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findActiveCompaniesForRequester('sub-1', ['User']),
      ).rejects.toThrow(COMPANY_ACTIVE_SUMMARIES_FORBIDDEN_MSG);
    });

    it('should return all active companies for SuperAdmin', async () => {
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([]);

      await service.findActiveCompaniesForRequester('sub-1', [
        COGNITO_GROUP_NAMES.SUPER_ADMIN,
      ]);

      expect(prisma.corporationCompany.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          status: COMPANY_STATUS.ACTIVE,
        },
        orderBy: { legalName: 'asc' },
        select: { id: true, corporationId: true, legalName: true },
      });
    });

    it('should forbid CorporationAdmin with no linked corporation', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findActiveCompaniesForRequester('sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findActiveCompaniesForRequester('sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG);
    });

    it('should scope active companies to corporation for CorporationAdmin', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        corporationId: 'corp-uuid-1',
      });
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([]);

      await service.findActiveCompaniesForRequester('sub-corp', [
        COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
      ]);

      expect(prisma.corporationCompany.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          status: COMPANY_STATUS.ACTIVE,
          corporationId: 'corp-uuid-1',
        },
        orderBy: { legalName: 'asc' },
        select: { id: true, corporationId: true, legalName: true },
      });
    });
  });

  describe('findAllCompanies', () => {
    it('should return all non-deleted companies ordered by legalName', async () => {
      const prismaRows = [
        { id: 'b-id', legalName: 'Beta LLC' },
        { id: 'a-id', legalName: 'Alpha Inc' },
      ];
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue(
        prismaRows,
      );

      const result = await service.findAllCompanies();

      expect(prisma.corporationCompany.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { legalName: 'asc' },
        select: { id: true, legalName: true },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe(COMPANY_ALL_FETCHED_SUCCESS_MSG);
      expect(result.data).toEqual(prismaRows);
    });

    it('should scope to corporation when corporationId is provided', async () => {
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAllCompanies('corp-uuid-1');

      expect(prisma.corporationCompany.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, corporationId: 'corp-uuid-1' },
        orderBy: { legalName: 'asc' },
        select: { id: true, legalName: true },
      });
    });

    it('should propagate errors from findMany', async () => {
      (prisma.corporationCompany.findMany as jest.Mock).mockRejectedValue(
        new Error('db failure'),
      );

      await expect(service.findAllCompanies()).rejects.toThrow('db failure');
    });
  });

  describe('findAllCompaniesForRequester', () => {
    const corporationId = 'corp-uuid-1';

    it('should forbid callers who are not SuperAdmin or CorporationAdmin', async () => {
      await expect(
        service.findAllCompaniesForRequester(corporationId, 'sub-1', ['User']),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findAllCompaniesForRequester(corporationId, 'sub-1', ['User']),
      ).rejects.toThrow(COMPANY_ALL_FORBIDDEN_MSG);
    });

    it('should return companies for SuperAdmin scoped to corporationId', async () => {
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAllCompaniesForRequester(corporationId, 'sub-1', [
        COGNITO_GROUP_NAMES.SUPER_ADMIN,
      ]);

      expect(prisma.corporationCompany.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, corporationId },
        orderBy: { legalName: 'asc' },
        select: { id: true, legalName: true },
      });
    });

    it('should forbid CorporationAdmin with no linked corporation', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findAllCompaniesForRequester(corporationId, 'sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findAllCompaniesForRequester(corporationId, 'sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(COMPANY_DETAIL_CORP_ADMIN_UNASSIGNED_MSG);
    });

    it('should forbid CorporationAdmin when corporationId does not match', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        corporationId: 'other-corp',
      });

      await expect(
        service.findAllCompaniesForRequester(corporationId, 'sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(COMPANY_DETAIL_CORP_ADMIN_WRONG_CORP_MSG);
    });

    it('should scope companies to corporation for CorporationAdmin', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        corporationId,
      });
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([]);

      await service.findAllCompaniesForRequester(corporationId, 'sub-corp', [
        COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
      ]);

      expect(prisma.corporationCompany.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          corporationId,
        },
        orderBy: { legalName: 'asc' },
        select: { id: true, legalName: true },
      });
    });
  });

  describe('upsertKeyContacts', () => {
    const validItem = {
      contactType: 'finance_billing_contact' as const,
      available: true,
      firstName: 'Pat',
      lastName: 'Lee',
      email: 'Pat.Lee@Example.com',
      workPhone: '+1-555-0100',
      jobRole: ' Controller ',
    };

    const companyRow = {
      id: 'company-uuid-1',
      corporationId: 'corp-uuid-1',
      submittedSteps: 2,
    };

    beforeEach(() => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockReset();
      (prisma.appKeyContact.findFirst as jest.Mock).mockReset();
      (prisma.appKeyContact.updateMany as jest.Mock).mockReset();
      (prisma.appKeyContact.update as jest.Mock).mockReset();
      (prisma.appKeyContact.create as jest.Mock).mockReset();
      (prisma.appUser.update as jest.Mock).mockReset();
      (prisma.corporationCompany.update as jest.Mock).mockReset();
    });

    it('should throw BadRequestException when companyId is empty', async () => {
      await expect(service.upsertKeyContacts('', [validItem])).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.upsertKeyContacts('', [validItem])).rejects.toThrow(
        COMPANY_ID_REQUIRED_MSG,
      );
    });

    it('should throw NotFoundException when company does not exist', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.upsertKeyContacts('missing-id', [validItem]),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.upsertKeyContacts('missing-id', [validItem]),
      ).rejects.toThrow('Company with ID "missing-id" not found');
    });

    it('should throw BadRequestException for invalid contactType', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        companyRow,
      );

      await expect(
        service.upsertKeyContacts('company-uuid-1', [
          { ...validItem, contactType: 'invalid_type' } as Parameters<
            CompanyService['upsertKeyContacts']
          >[1][number],
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when available is true but required fields are missing', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        companyRow,
      );

      await expect(
        service.upsertKeyContacts('company-uuid-1', [
          { ...validItem, email: null as unknown as string },
        ]),
      ).rejects.toThrow(BadRequestException);
    });

    it('should soft-delete key contacts when available is false', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        companyRow,
      );

      const result = await service.upsertKeyContacts('company-uuid-1', [
        {
          contactType: 'technical_it_lead',
          available: false,
        },
      ]);

      expect(prisma.appKeyContact.updateMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-uuid-1',
          contactType: 'technical_it_lead',
          deletedAt: null,
        },
        data: { deletedAt: expect.any(Date) as Date },
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe(COMPANY_KEY_CONTACTS_UPDATED_SUCCESS_MSG);
    });

    it('should create a new key contact when none exists and normalize email', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        companyRow,
      );
      (prisma.appKeyContact.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.appKeyContact.create as jest.Mock).mockResolvedValue({
        id: 'kc-new',
      });

      await service.upsertKeyContacts('company-uuid-1', [validItem]);

      expect(prisma.appKeyContact.create).toHaveBeenCalled();
      const createCalls = (prisma.appKeyContact.create as jest.Mock).mock
        .calls as Array<[{ data: Record<string, unknown> }]>;
      const createArg = createCalls[0][0];
      expect(createArg.data).toMatchObject({
        firstName: 'Pat',
        lastName: 'Lee',
        email: 'pat.lee@example.com',
        workPhone: '+1-555-0100',
        jobRole: 'Controller',
        corporationId: 'corp-uuid-1',
        companyId: 'company-uuid-1',
        contactType: 'finance_billing_contact',
        deletedAt: null,
      });
      expect(prisma.appUser.update).not.toHaveBeenCalled();
    });

    it('should update existing key contact and mirror app user when appUserId is set', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        companyRow,
      );
      (prisma.appKeyContact.findFirst as jest.Mock).mockResolvedValue({
        id: 'kc-1',
        appUserId: 'cognito-sub-99',
      });

      await service.upsertKeyContacts('company-uuid-1', [validItem]);

      expect(prisma.appKeyContact.update).toHaveBeenCalled();
      const updateCalls = (prisma.appKeyContact.update as jest.Mock).mock
        .calls as Array<
        [{ where: { id: string }; data: Record<string, unknown> }]
      >;
      const updateArg = updateCalls[0][0];
      expect(updateArg.where).toEqual({ id: 'kc-1' });
      expect(updateArg.data).toMatchObject({
        firstName: 'Pat',
        lastName: 'Lee',
        jobRole: 'Controller',
      });
      expect(prisma.appUser.update).toHaveBeenCalledWith({
        where: { cognitoSub: 'cognito-sub-99' },
        data: {
          firstName: 'Pat',
          lastName: 'Lee',
          nickname: null,
          jobRole: 'Controller',
          workPhone: '+1-555-0100',
          cellPhone: null,
        },
      });
    });

    it('should bump submittedSteps from 1 to 2 after successful upsert', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        ...companyRow,
        submittedSteps: 1,
      });
      (prisma.appKeyContact.findFirst as jest.Mock).mockResolvedValue(null);

      await service.upsertKeyContacts('company-uuid-1', [validItem]);

      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
        data: { submittedSteps: 2 },
      });
    });

    it('should not bump submittedSteps when company is already past step 1', async () => {
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        companyRow,
      );
      (prisma.appKeyContact.findFirst as jest.Mock).mockResolvedValue(null);

      await service.upsertKeyContacts('company-uuid-1', [validItem]);

      expect(prisma.corporationCompany.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException when corporationId is empty', async () => {
      await expect(service.remove('', 'company-uuid-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove('', 'company-uuid-1')).rejects.toThrow(
        'Corporation ID is required',
      );
    });

    it('should throw BadRequestException when companyId is empty', async () => {
      await expect(service.remove('corp-uuid-1', '')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove('corp-uuid-1', '')).rejects.toThrow(
        'Company ID is required',
      );
    });

    it('should throw NotFoundException when company not found for corporation', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: 'ACTIVE',
      });
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.remove('corp-uuid-1', 'company-uuid-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.remove('corp-uuid-1', 'company-uuid-1'),
      ).rejects.toThrow(
        'Company with ID "company-uuid-1" not found for corporation "corp-uuid-1"',
      );
    });

    it('should throw BadRequestException when deleting the last company', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: 'ACTIVE',
      });
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
      });
      (prisma.corporationCompany.count as jest.Mock).mockResolvedValue(1);

      await expect(
        service.remove('corp-uuid-1', 'company-uuid-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.remove('corp-uuid-1', 'company-uuid-1'),
      ).rejects.toThrow(
        'Cannot delete the only remaining company in the corporation',
      );
    });

    it('should soft-delete company and return success when more than one company exists', async () => {
      const deletedCompany = {
        ...mockCompany,
        deletedAt: new Date(),
      };
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: 'ACTIVE',
      });
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: 'company-uuid-1',
      });
      (prisma.corporationCompany.count as jest.Mock).mockResolvedValue(2);
      (prisma.corporationCompany.update as jest.Mock).mockResolvedValue(
        deletedCompany,
      );

      const result = await service.remove('corp-uuid-1', 'company-uuid-1');

      expect(prisma.corporationCompany.update).toHaveBeenCalledWith({
        where: { id: 'company-uuid-1' },
        data: { deletedAt: expect.any(Date) as Date },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Company deleted successfully');
      expect(result.data).toEqual(deletedCompany);
    });
  });

  describe('getDashboardAnalyticsForCompanyAdmin', () => {
    const companyId = 'company-uuid-1';
    const analyticsData = {
      corporations: {
        total: 0,
        active: 0,
        incomplete: 0,
        suspended: 0,
        closed: 0,
      },
      companies: {
        total: 0,
        active: 0,
        incomplete: 0,
        suspended: 0,
        closed: 0,
      },
      users: {
        total: 8,
        active: 4,
        pending: 2,
        blocked: 1,
        cancelled: 0,
        expired: 1,
        deleted: 0,
      },
      assessments: {
        completed: 3,
        inprogress: 1,
        avgTimeToComplete: 2.25,
      },
    };

    it('should forbid callers who are not CompanyAdmin', async () => {
      await expect(
        service.getDashboardAnalyticsForCompanyAdmin('sub-1', ['User'], {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid CompanyAdmin with no linked admin company', async () => {
      (prisma.userCompanyAccess.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getDashboardAnalyticsForCompanyAdmin(
          'sub-co',
          [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
          {},
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return user and assessment analytics scoped to admin company', async () => {
      (prisma.userCompanyAccess.findFirst as jest.Mock).mockResolvedValue({
        companyId,
      });
      const countSpy = jest
        .spyOn(SystemAnalyticsUtil, 'countSystemAnalytics')
        .mockResolvedValue(analyticsData);

      const result = await service.getDashboardAnalyticsForCompanyAdmin(
        'sub-co',
        [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
        { timeFilter: 'last30Days' },
      );

      expect(countSpy).toHaveBeenCalledWith(prisma, {
        companyId,
        timeFilter: 'last30Days',
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        users: analyticsData.users,
        assessments: analyticsData.assessments,
      });

      countSpy.mockRestore();
    });
  });
});
