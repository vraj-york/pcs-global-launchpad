/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CorporationService } from './corporation.service';
import { PrismaService } from '../prisma';
import { S3Service } from '../s3';
import { BRAND_LOGO_MAX_SIZE_BYTES } from './constants';
import { UserSyncService } from '../user';
import { CorporationCognitoProvisioningService } from './corporation-cognito-provisioning.service';
import { CorporationAdminOnboardingService } from './corporation-admin-onboarding.service';
import { EmailService } from '../email';
import { CompanyService } from '../company/company.service';
import { StripeService } from '../stripe';
import {
  CreateCorporationDto,
  UpdateCorporationDto,
  UpsertKeyContactDto,
} from './dto';
import {
  APP_KEY_CONTACT_TYPE_EXEC_SPONSOR,
  CORPORATION_ADMIN_APP_USER_TYPE,
  CORPORATION_ADMIN_ROLE_NOT_CONFIGURED_MSG,
  CORPORATION_DETAIL_SUPER_ADMIN_ME_PATH_MSG,
  CORPORATION_STATUS,
} from './constants';
import { COGNITO_GROUP_NAMES } from '../user/cognito-groups.constants';
import { ConfigService } from '@nestjs/config';
import { COMPANY_STATUS } from '../company/constants/company.status';
import { APP_USER_STATUS } from '../user/constants/app-user.constants';
import * as CognitoIdpUtil from '../common/cognito-idp.util';
import * as SystemAnalyticsUtil from '../common/system-analytics.util';

describe('CorporationService', () => {
  let service: CorporationService;
  let prisma: jest.Mocked<PrismaService>;
  let s3: jest.Mocked<S3Service>;
  let mockEmailService: { sendEmail: jest.Mock };
  let mockCompanyService: {
    sendCompanySuspendedEmailToAdmin: jest.Mock;
    sendCompanyClosedEmailToAdmin: jest.Mock;
    sendCompanyReinstatedEmailToAdmin: jest.Mock;
  };
  let mockStripeService: {
    resolveBillingSubscriptionActor: jest.Mock;
    cancelCompanySubscriptionForAdmin: jest.Mock;
  };
  const billingActorUser = {
    cognitoSub: 'super-admin-sub',
    groups: [COGNITO_GROUP_NAMES.SUPER_ADMIN],
  };
  /** Passed into `$transaction` callback as `tx.appKeyContact.create` */
  let txAppKeyContactCreate: jest.Mock;
  let txAppKeyContactFindFirst: jest.Mock;
  let txAppKeyContactUpdate: jest.Mock;

  const mockAddress = {
    addressLine: '123 Main St',
    state: 'CA',
    city: 'San Francisco',
    country: 'US',
    zip: '94105',
    timezone: 'America/Los_Angeles',
  };

  const mockExecutiveSponsor = {
    firstName: 'Jane',
    lastName: 'Doe',
    jobRole: 'CEO',
    email: 'jane@acme.com',
    workPhone: '+1-555-111-2222',
  };

  const mockCreateDto: CreateCorporationDto = {
    legalName: 'Acme Corporation Inc.',
    website: 'https://www.acme.com',
    dataResidencyRegion: 'US-East',
    ownershipType: 'Private',
    industry: 'Technology',
    phoneNo: '+1-555-123-4567',
    mode: 'quick',
    address: mockAddress,
    executiveSponsor: mockExecutiveSponsor,
    corporationAdmin: {
      firstName: 'Jane',
      lastName: 'Smith',
      jobRole: 'Administrator',
      email: 'jane.smith@example.com',
      workPhone: '+1-555-123-4567',
    },
  };

  const mockCorporation = {
    id: 'corp-uuid-1',
    corporationCode: 1,
    legalName: 'Acme Corporation Inc.',
    mode: 'quick',
    submittedSteps: 0,
    status: CORPORATION_STATUS.INCOMPLETE,
    createdAt: new Date('2025-01-15'),
    corporationAdmin: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
    },
    appUsers: [
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
      },
    ],
    _count: { companies: 2 },
  };

  beforeEach(async () => {
    const mockCognitoUserGroup = {
      findUnique: jest.fn().mockResolvedValue({ id: 'cognito-group-id' }),
    };
    const mockAppUser = {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockResolvedValue({}),
    };
    const mockAppUserGroupMembership = {
      upsert: jest.fn().mockResolvedValue({}),
    };

    txAppKeyContactCreate = jest
      .fn()
      .mockResolvedValue({ id: 'app-key-contact-id' });
    txAppKeyContactFindFirst = jest.fn().mockResolvedValue(null);
    txAppKeyContactUpdate = jest.fn().mockResolvedValue({ id: 'exec-key-id' });

    const mockCorporation = {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const mockRole = {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'corporation-admin-role-id' }),
    };

    const mockUserCompanyAccess = {
      findMany: jest.fn().mockResolvedValue([]),
    };

    const mockCorporationCompany = {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    };

    const mockAppKeyContact = {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirst: jest.fn().mockResolvedValue(null),
    };

    mockAppUser.findMany = jest.fn().mockResolvedValue([]);

    const mockPrisma = {
      corporation: mockCorporation,
      corporationCompany: mockCorporationCompany,
      role: mockRole,
      cognitoUserGroup: mockCognitoUserGroup,
      appUser: mockAppUser,
      appUserGroupMembership: mockAppUserGroupMembership,
      userCompanyAccess: mockUserCompanyAccess,
      appKeyContact: mockAppKeyContact,
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          corporation: mockCorporation,
          corporationCompany: mockCorporationCompany,
          cognitoUserGroup: mockCognitoUserGroup,
          appUser: mockAppUser,
          appUserGroupMembership: mockAppUserGroupMembership,
          appKeyContact: {
            create: txAppKeyContactCreate,
            findFirst: txAppKeyContactFindFirst,
            update: txAppKeyContactUpdate,
          },
        }),
      ),
    };

    const mockS3Service = {
      objectExists: jest.fn(),
      delete: jest.fn(),
      upload: jest.fn(),
      buildBrandLogoKey: jest.fn(
        (filename: string) => `corporation-brand-logos/${filename}`,
      ),
      getBrandLogosPrefix: jest
        .fn()
        .mockReturnValue('corporation-brand-logos/'),
      getPublicUrl: jest.fn(
        (key: string) => `https://bucket.s3.region.amazonaws.com/${key}`,
      ),
    };

    const mockUserSync = {
      recordCorporationAdminProvisioned: jest.fn().mockResolvedValue(undefined),
      syncFromCognito: jest.fn(),
      recordCompanyAdminProvisioned: jest.fn(),
      hasCompanyAccess: jest.fn(),
    };

    const mockCorporationCognito = {
      provisionCorporationAdminUser: jest
        .fn()
        .mockResolvedValue({ cognitoSub: 'cognito-sub-test' }),
    };

    const mockCorporationAdminOnboarding = {
      sendPendingCorporationAdminInvite: jest.fn().mockResolvedValue(undefined),
    };

    mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue(true),
    };

    mockCompanyService = {
      sendCompanySuspendedEmailToAdmin: jest.fn().mockResolvedValue(undefined),
      sendCompanyClosedEmailToAdmin: jest.fn().mockResolvedValue(undefined),
      sendCompanyReinstatedEmailToAdmin: jest.fn().mockResolvedValue(undefined),
    };

    mockStripeService = {
      resolveBillingSubscriptionActor: jest.fn().mockResolvedValue({
        actorKind: 'super_admin',
        actorCognitoSub: billingActorUser.cognitoSub,
        actorName: 'Super Admin',
        actorRole: 'Super Admin',
      }),
      cancelCompanySubscriptionForAdmin: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporationService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: UserSyncService,
          useValue: mockUserSync,
        },
        {
          provide: CorporationCognitoProvisioningService,
          useValue: mockCorporationCognito,
        },
        {
          provide: CorporationAdminOnboardingService,
          useValue: mockCorporationAdminOnboarding,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: CompanyService,
          useValue: mockCompanyService,
        },
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'COGNITO_USER_POOL_ID') {
                return 'us-east-1_testpool';
              }
              if (key === 'AWS_REGION') {
                return 'us-east-1';
              }
              if (key === 'SUPPORT_CONTACT_EMAIL') {
                return 'support@bspblueprint.com';
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CorporationService>(CorporationService);
    prisma = module.get(PrismaService);
    s3 = module.get(S3Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated list with items and metadata', async () => {
      (prisma.corporation.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockCorporation,
          dataResidencyRegion: 'US-East',
          createdAt: new Date('2025-01-15'),
          companies: [{ id: '1' }, { id: '2' }],
        },
      ]);
      (prisma.corporation.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Corporation list fetched successfully');
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.total).toBe(1);
      expect(result.data?.page).toBe(1);
      expect(result.data?.limit).toBe(10);
      expect(result.data?.totalPages).toBe(1);
    });

    it('should use default page 1 and limit 10 when not provided', async () => {
      (prisma.corporation.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.corporation.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({});

      expect(prisma.corporation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should apply sortBy and sortOrder when provided', async () => {
      (prisma.corporation.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.corporation.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({
        page: 1,
        limit: 10,
        sortBy: 'legalName',
        sortOrder: 'asc',
      });

      expect(prisma.corporation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { legalName: 'asc' },
        }),
      );
    });

    it('should apply companyCount sort when sortBy is companyCount', async () => {
      const corpA = {
        id: 'a',
        companies: [{ id: '1' }, { id: '2' }, { id: '3' }],
        createdAt: new Date(),
        corporationCode: 1,
        legalName: 'A',
        dataResidencyRegion: 'US',
        status: 'ACTIVE',
        submittedSteps: 1,
        mode: 'quick',
        appUsers: [{ firstName: 'N', lastName: '', email: 'e@e.com' }],
      };
      const corpB = {
        id: 'b',
        companies: [{ id: '4' }],
        createdAt: new Date(),
        corporationCode: 2,
        legalName: 'B',
        dataResidencyRegion: 'US',
        status: 'ACTIVE',
        submittedSteps: 1,
        mode: 'quick',
        appUsers: [{ firstName: 'N', lastName: '', email: 'e@e.com' }],
      };
      (prisma.corporation.findMany as jest.Mock).mockResolvedValue([
        corpA,
        corpB,
      ]);
      (prisma.corporation.count as jest.Mock).mockResolvedValue(2);

      const result = await service.findAll({
        page: 1,
        limit: 5,
        sortBy: 'companyCount',
        sortOrder: 'desc',
      });

      expect(prisma.corporation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
          select: expect.objectContaining({
            companies: { where: { deletedAt: null }, select: { id: true } },
          }),
        }),
      );
      expect(prisma.corporation.findMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          skip: expect.any(Number),
          take: expect.any(Number),
        }),
      );
      expect(result.data?.items).toHaveLength(2);
      expect(result.data?.items?.[0].noOfCompanies).toBe(3);
      expect(result.data?.items?.[1].noOfCompanies).toBe(1);
    });

    it('should filter by createdAt when createdFilter is provided', async () => {
      (prisma.corporation.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.corporation.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({
        page: 1,
        limit: 10,
        createdFilter: 'last7Days',
      });

      expect(prisma.corporation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: { gte: expect.any(Date) },
          },
        }),
      );
      expect(prisma.corporation.count).toHaveBeenCalledWith({
        where: {
          createdAt: { gte: expect.any(Date) },
        },
      });
    });

    it('should filter by status when status is not all', async () => {
      (prisma.corporation.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.corporation.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({
        page: 1,
        limit: 10,
        status: 'active',
      });

      expect(prisma.corporation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE' },
        }),
      );
      expect(prisma.corporation.count).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
      });
    });

    it('should not filter by status when status is all', async () => {
      (prisma.corporation.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.corporation.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({
        page: 1,
        limit: 10,
        status: 'all',
      });

      expect(prisma.corporation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: undefined,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return corporation when found', async () => {
      const corpFromDb = {
        ...mockCorporation,
        address: {},
        companies: [],
        appKeyContacts: [],
        appUsers: [],
      };
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(
        corpFromDb,
      );

      const result = await service.findOne('corp-uuid-1');

      expect(result.success).toBe(true);
      const { appUsers, ...expectedData } = corpFromDb;
      void appUsers;
      expect(result.data).toEqual({
        ...expectedData,
        corporationAdminAppUser: null,
      });
      expect(prisma.userCompanyAccess.findMany).not.toHaveBeenCalled();
    });

    it('should merge company admin from user_company_access into nested companies', async () => {
      const companyRow = {
        id: 'comp-1',
        corporationId: 'corp-uuid-1',
        legalName: 'Subsidiary LLC',
        companyType: 'Subsidiary',
        officeType: 'HQ',
        industry: 'Tech',
        sameAsCorpAdmin: false,
        planId: 'plan-1',
        securityPosture: 'Standard',
        addressLine: '1 Main',
        state: 'CA',
        city: 'SF',
        country: 'US',
        zip: '94105',
        plan: {
          id: 'plan-1',
          planTypeId: 'pt-1',
          customerType: null,
          employeeRangeMin: 1,
          employeeRangeMax: 100,
          price: new Prisma.Decimal(99),
          isCustomPricing: false,
          planType: { id: 'pt-1', name: 'Standard' },
        },
      };
      const corpFromDb = {
        ...mockCorporation,
        address: {},
        companies: [companyRow],
        appKeyContacts: [],
        appUsers: [],
      };
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(
        corpFromDb,
      );
      (prisma.userCompanyAccess.findMany as jest.Mock).mockResolvedValue([
        {
          companyId: 'comp-1',
          user: {
            firstName: 'Co',
            lastName: 'Admin',
            nickname: null,
            jobRole: 'Director',
            email: 'co@example.com',
            workPhone: '+1-555-111-1111',
            cellPhone: null,
          },
        },
      ]);

      const result = await service.findOne('corp-uuid-1');

      expect(prisma.userCompanyAccess.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: { in: ['comp-1'] },
            isAdmin: true,
            user: { deletedAt: null },
          },
          orderBy: { createdAt: 'asc' },
        }),
      );
      expect(result.success).toBe(true);
      const companies = (result.data as { companies: unknown[] }).companies;
      expect(companies).toHaveLength(1);
      expect(companies[0]).toMatchObject({
        id: 'comp-1',
        legalName: 'Subsidiary LLC',
        firstName: 'Co',
        lastName: 'Admin',
        nickname: null,
        jobRole: 'Director',
        email: 'co@example.com',
        workPhone: '+1-555-111-1111',
        cellPhone: null,
      });
    });

    it('should throw NotFoundException when corporation does not exist', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('bad-id')).rejects.toThrow(
        'Corporation with ID "bad-id" not found',
      );
    });
  });

  describe('findOneForRequester', () => {
    it('should reject SuperAdmin when path id is me', async () => {
      await expect(
        service.findOneForRequester('me', 'sub-1', [
          COGNITO_GROUP_NAMES.SUPER_ADMIN,
        ]),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.findOneForRequester('me', 'sub-1', [
          COGNITO_GROUP_NAMES.SUPER_ADMIN,
        ]),
      ).rejects.toThrow(CORPORATION_DETAIL_SUPER_ADMIN_ME_PATH_MSG);
    });

    it('should delegate to findOne for SuperAdmin with corporation uuid', async () => {
      const corpFromDb = {
        ...mockCorporation,
        address: {},
        companies: [],
        appKeyContacts: [],
        appUsers: [],
      };
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(
        corpFromDb,
      );

      await service.findOneForRequester('corp-uuid-1', 'any', [
        COGNITO_GROUP_NAMES.SUPER_ADMIN,
      ]);

      expect(prisma.corporation.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'corp-uuid-1' } }),
      );
    });

    it('should forbid caller who is not SuperAdmin or CorporationAdmin', async () => {
      await expect(
        service.findOneForRequester('corp-uuid-1', 'sub-1', [
          COGNITO_GROUP_NAMES.USER,
        ]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid CorporationAdmin when app_users has no corporation_id', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOneForRequester('me', 'corp-admin-sub', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid CorporationAdmin when id is another corporation', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        corporationId: 'my-corp',
      });

      await expect(
        service.findOneForRequester('other-corp', 'corp-admin-sub', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should resolve me and return corporation for CorporationAdmin', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        corporationId: 'corp-uuid-1',
      });
      const corpFromDb = {
        ...mockCorporation,
        address: {},
        companies: [],
        appKeyContacts: [],
        appUsers: [],
      };
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(
        corpFromDb,
      );

      const result = await service.findOneForRequester('me', 'corp-admin-sub', [
        COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
      ]);

      expect(prisma.appUser.findFirst).toHaveBeenCalled();
      expect(prisma.corporation.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'corp-uuid-1' } }),
      );
      expect(result.success).toBe(true);
    });
  });

  describe('create', () => {
    it('should throw ConflictException when legal name already exists', async () => {
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-id',
        legalName: 'Acme Corporation Inc.',
      });

      await expect(service.create(mockCreateDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(mockCreateDto)).rejects.toThrow(
        'A corporation with the legal name "Acme Corporation Inc." already exists',
      );
    });

    it('should throw ConflictException when corporation admin email is already an app user', async () => {
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        cognitoSub: 'existing-sub',
        corporationId: 'other-corp',
      });

      await expect(service.create(mockCreateDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(mockCreateDto)).rejects.toThrow(
        'A user with email "jane.smith@example.com" already exists',
      );
    });

    it('should throw InternalServerErrorException when Corporation Admin role is missing', async () => {
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.role.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(mockCreateDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(mockCreateDto)).rejects.toThrow(
        CORPORATION_ADMIN_ROLE_NOT_CONFIGURED_MSG,
      );
    });

    it('should create corporation with corporationCode 1 when no corporations exist', async () => {
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.corporation.create as jest.Mock).mockResolvedValue({
        ...mockCorporation,
        address: {},
        executiveSponsor: {},
      });

      const result = await service.create(mockCreateDto);

      expect(prisma.corporation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            corporationAdmin: expect.anything(),
            executiveSponsor: expect.anything(),
          }),
        }),
      );
      expect(prisma.corporation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            corporationCode: 1,
            legalName: mockCreateDto.legalName,
            status: CORPORATION_STATUS.INCOMPLETE,
          }),
          include: { address: true },
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should increment corporationCode from latest corporation', async () => {
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue({
        corporationCode: 5,
      });
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.corporation.create as jest.Mock).mockResolvedValue(
        mockCorporation,
      );

      await service.create(mockCreateDto);

      expect(prisma.corporation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            corporationCode: 6,
          }),
        }),
      );
    });

    it('should create app_key_contacts row when executiveSponsor.sameAsCorpAdmin is true', async () => {
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.corporation.create as jest.Mock).mockResolvedValue({
        ...mockCorporation,
        address: {},
        executiveSponsor: {},
      });

      const dto: CreateCorporationDto = {
        ...mockCreateDto,
        executiveSponsor: {
          ...mockExecutiveSponsor,
          sameAsCorpAdmin: true,
        },
      };

      await service.create(dto);

      expect(txAppKeyContactCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          corporationId: mockCorporation.id,
          contactType: APP_KEY_CONTACT_TYPE_EXEC_SPONSOR,
          sameAsCorpAdmin: true,
          appUserId: 'cognito-sub-test',
          firstName: dto.corporationAdmin.firstName,
          lastName: dto.corporationAdmin.lastName,
          email: dto.corporationAdmin.email.trim().toLowerCase(),
          jobRole: dto.corporationAdmin.jobRole,
          workPhone: dto.corporationAdmin.workPhone,
        }),
      });
    });

    it('should not create app key contact when executiveSponsor.sameAsCorpAdmin is undefined', async () => {
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.corporation.create as jest.Mock).mockResolvedValue({
        ...mockCorporation,
        address: {},
        executiveSponsor: {},
      });

      await service.create(mockCreateDto);

      expect(txAppKeyContactCreate).not.toHaveBeenCalled();
    });

    it('should create app_key_contacts from executiveSponsor when sameAsCorpAdmin is false', async () => {
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.corporation.create as jest.Mock).mockResolvedValue({
        ...mockCorporation,
        address: {},
        executiveSponsor: {},
      });

      const dto: CreateCorporationDto = {
        ...mockCreateDto,
        executiveSponsor: {
          ...mockExecutiveSponsor,
          sameAsCorpAdmin: false,
        },
      };

      await service.create(dto);

      expect(txAppKeyContactCreate).toHaveBeenCalledTimes(1);
      expect(txAppKeyContactCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          corporationId: mockCorporation.id,
          contactType: APP_KEY_CONTACT_TYPE_EXEC_SPONSOR,
          sameAsCorpAdmin: false,
          firstName: mockExecutiveSponsor.firstName,
          lastName: mockExecutiveSponsor.lastName,
          email: mockExecutiveSponsor.email.trim().toLowerCase(),
          jobRole: mockExecutiveSponsor.jobRole,
          workPhone: mockExecutiveSponsor.workPhone,
        }),
      });
      const calls = txAppKeyContactCreate.mock.calls as unknown as Array<
        [{ data: Record<string, unknown> }]
      >;
      const firstArg = calls[0]?.[0];
      expect(firstArg).toBeDefined();
      if (firstArg === undefined) {
        throw new Error('expected appKeyContact.create to be called');
      }
      expect(firstArg.data).not.toHaveProperty('appUserId');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when corporation does not exist', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);

      const updateDto: UpdateCorporationDto = {
        ...mockCreateDto,
        legalName: 'Updated Name',
      };

      await expect(service.update('bad-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when another corporation has same legal name', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
      });
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue({
        id: 'other-corp-id',
        legalName: 'Updated Name',
      });

      const updateDto: UpdateCorporationDto = {
        ...mockCreateDto,
        legalName: 'Updated Name',
      };

      await expect(service.update('corp-uuid-1', updateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should update corporation and return success', async () => {
      const updatedCorp = {
        ...mockCorporation,
        legalName: 'Updated Acme Inc.',
      };
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: CORPORATION_STATUS.INCOMPLETE,
      });
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.corporation.update as jest.Mock).mockResolvedValue(updatedCorp);

      const updateDto: UpdateCorporationDto = {
        ...mockCreateDto,
        legalName: 'Updated Acme Inc.',
      };
      const result = await service.update('corp-uuid-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Corporation updated successfully');
      expect(result.data).toEqual(updatedCorp);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.appUser.updateMany).toHaveBeenCalledWith({
        where: {
          corporationId: 'corp-uuid-1',
          deletedAt: null,
          userType: {
            contains: CORPORATION_ADMIN_APP_USER_TYPE,
            mode: 'insensitive',
          },
        },
        data: {
          firstName: updateDto.corporationAdmin.firstName,
          lastName: updateDto.corporationAdmin.lastName,
          nickname: updateDto.corporationAdmin.nickname ?? null,
          jobRole: updateDto.corporationAdmin.jobRole,
          workPhone: updateDto.corporationAdmin.workPhone,
          cellPhone: updateDto.corporationAdmin.cellPhone ?? null,
        },
      });
      expect(txAppKeyContactFindFirst).toHaveBeenCalledWith({
        where: {
          corporationId: 'corp-uuid-1',
          companyId: null,
          contactType: APP_KEY_CONTACT_TYPE_EXEC_SPONSOR,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, appUserId: true, sameAsCorpAdmin: true },
      });
      expect(txAppKeyContactUpdate).not.toHaveBeenCalled();
    });

    it('should update exec_sponsor app_key_contact without email or sameAsCorpAdmin', async () => {
      const updatedCorp = { ...mockCorporation, legalName: 'Updated' };
      txAppKeyContactFindFirst.mockResolvedValueOnce({
        id: 'exec-kc-id',
        appUserId: null,
        sameAsCorpAdmin: false,
      });
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: CORPORATION_STATUS.INCOMPLETE,
      });
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.corporation.update as jest.Mock).mockResolvedValue(updatedCorp);

      const updateDto: UpdateCorporationDto = {
        ...mockCreateDto,
        legalName: 'Updated',
        executiveSponsor: {
          ...mockExecutiveSponsor,
          sameAsCorpAdmin: false,
          nickname: 'ExecNick',
          cellPhone: '+1-999',
        },
      };

      await service.update('corp-uuid-1', updateDto);

      expect(txAppKeyContactUpdate).toHaveBeenCalledWith({
        where: { id: 'exec-kc-id' },
        data: {
          firstName: updateDto.executiveSponsor.firstName,
          lastName: updateDto.executiveSponsor.lastName,
          nickname: 'ExecNick',
          jobRole: updateDto.executiveSponsor.jobRole,
          workPhone: updateDto.executiveSponsor.workPhone,
          cellPhone: '+1-999',
        },
      });
      expect(prisma.appUser.updateMany).toHaveBeenCalledTimes(1);
    });

    it('should mirror exec sponsor fields to linked app user when appUserId set and not sameAsCorpAdmin', async () => {
      const updatedCorp = { ...mockCorporation, legalName: 'Updated' };
      txAppKeyContactFindFirst.mockResolvedValueOnce({
        id: 'exec-kc-id',
        appUserId: 'sponsor-cognito-sub',
        sameAsCorpAdmin: false,
      });
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: CORPORATION_STATUS.INCOMPLETE,
      });
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.corporation.update as jest.Mock).mockResolvedValue(updatedCorp);

      const updateDto: UpdateCorporationDto = {
        ...mockCreateDto,
        legalName: 'Updated',
        executiveSponsor: {
          ...mockExecutiveSponsor,
          sameAsCorpAdmin: false,
          firstName: 'SponsorFirst',
        },
      };

      await service.update('corp-uuid-1', updateDto);

      expect(prisma.appUser.updateMany).toHaveBeenCalledTimes(2);
      expect(prisma.appUser.updateMany).toHaveBeenNthCalledWith(2, {
        where: {
          cognitoSub: 'sponsor-cognito-sub',
          corporationId: 'corp-uuid-1',
          deletedAt: null,
        },
        data: {
          firstName: 'SponsorFirst',
          lastName: updateDto.executiveSponsor.lastName,
          nickname: updateDto.executiveSponsor.nickname ?? null,
          jobRole: updateDto.executiveSponsor.jobRole,
          workPhone: updateDto.executiveSponsor.workPhone,
          cellPhone: updateDto.executiveSponsor.cellPhone ?? null,
        },
      });
    });

    it('should not mirror exec sponsor to app user when sameAsCorpAdmin key contact', async () => {
      const updatedCorp = { ...mockCorporation, legalName: 'Updated' };
      txAppKeyContactFindFirst.mockResolvedValueOnce({
        id: 'exec-kc-id',
        appUserId: 'admin-cognito-sub',
        sameAsCorpAdmin: true,
      });
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: CORPORATION_STATUS.INCOMPLETE,
      });
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.corporation.update as jest.Mock).mockResolvedValue(updatedCorp);

      await service.update('corp-uuid-1', {
        ...mockCreateDto,
        legalName: 'Updated',
      });

      expect(prisma.appUser.updateMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateSteps', () => {
    it('should throw NotFoundException when corporation does not exist', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateSteps('bad-id', { type: 'confirmation' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set submittedSteps to 3 when type is confirmation and mode is quick', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        mode: 'quick',
        status: CORPORATION_STATUS.INCOMPLETE,
        submittedSteps: 2,
      });
      (prisma.corporation.update as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        submittedSteps: 3,
        status: CORPORATION_STATUS.ACTIVE,
      });

      const result = await service.updateSteps('corp-uuid-1', {
        type: 'confirmation',
      });

      expect(prisma.corporation.update).toHaveBeenCalledWith({
        where: { id: 'corp-uuid-1' },
        data: { submittedSteps: 3, status: CORPORATION_STATUS.ACTIVE },
      });
      expect(result.success).toBe(true);
    });

    it('should set submittedSteps to 5 when type is confirmation and mode is not quick', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        mode: 'standard',
        status: CORPORATION_STATUS.INCOMPLETE,
        submittedSteps: 4,
      });
      (prisma.corporation.update as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        submittedSteps: 5,
        status: CORPORATION_STATUS.ACTIVE,
      });

      await service.updateSteps('corp-uuid-1', { type: 'confirmation' });

      expect(prisma.corporation.update).toHaveBeenCalledWith({
        where: { id: 'corp-uuid-1' },
        data: { submittedSteps: 5, status: CORPORATION_STATUS.ACTIVE },
      });
    });

    it('should set submittedSteps to 2 when type is company and current submittedSteps is 1', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        mode: 'quick',
        submittedSteps: 1,
      });
      (prisma.corporation.update as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        submittedSteps: 2,
      });

      const result = await service.updateSteps('corp-uuid-1', {
        type: 'company',
      });

      expect(prisma.corporation.update).toHaveBeenCalledWith({
        where: { id: 'corp-uuid-1' },
        data: { submittedSteps: 2 },
      });
      expect(result.success).toBe(true);
    });

    it('should set submittedSteps to 3 when type is branding and current submittedSteps is 2', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        status: CORPORATION_STATUS.INCOMPLETE,
        mode: 'advanced',
        submittedSteps: 2,
      });
      (prisma.corporation.update as jest.Mock).mockResolvedValue({
        id: 'corp-uuid-1',
        submittedSteps: 3,
      });

      const result = await service.updateSteps('corp-uuid-1', {
        type: 'branding',
      });

      expect(prisma.corporation.update).toHaveBeenCalledWith({
        where: { id: 'corp-uuid-1' },
        data: { submittedSteps: 3 },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('findActiveList', () => {
    it('should return active corporations ordered by legalName', async () => {
      const prismaRows = [
        {
          id: 'a',
          legalName: 'Alpha Corp',
          ownershipType: 'Private',
          dataResidencyRegion: 'US-East',
          appUsers: [
            {
              cognitoSub: 'sub-a',
              corporationId: 'a',
              firstName: 'A',
              lastName: 'Admin',
              nickname: null,
              jobRole: 'Corporation Admin',
              email: 'a@example.com',
              workPhone: '+1',
              cellPhone: null,
            },
          ],
        },
      ];
      (prisma.corporation.findMany as jest.Mock).mockResolvedValue(prismaRows);

      const result = await service.findActiveList();

      expect(prisma.corporation.findMany).toHaveBeenCalledWith({
        where: { status: CORPORATION_STATUS.ACTIVE },
        select: {
          id: true,
          legalName: true,
          ownershipType: true,
          dataResidencyRegion: true,
          appUsers: {
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
      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Active corporation list fetched successfully',
      );
      expect(result.data).toEqual([
        {
          id: 'a',
          legalName: 'Alpha Corp',
          ownershipType: 'Private',
          dataResidencyRegion: 'US-East',
          corporationAdmin: {
            id: 'sub-a',
            corporationId: 'a',
            firstName: 'A',
            lastName: 'Admin',
            nickname: null,
            jobRole: 'Corporation Admin',
            email: 'a@example.com',
            workPhone: '+1',
            cellPhone: null,
          },
        },
      ]);
    });
  });

  describe('findAllIdAndName', () => {
    it('should return all corporations with id and name ordered by legalName', async () => {
      const prismaRows = [
        { id: 'b-id', legalName: 'Beta Corp' },
        { id: 'a-id', legalName: 'Alpha Corp' },
      ];
      (prisma.corporation.findMany as jest.Mock).mockResolvedValue(prismaRows);

      const result = await service.findAllIdAndName();

      expect(prisma.corporation.findMany).toHaveBeenCalledWith({
        select: { id: true, legalName: true },
        orderBy: { legalName: 'asc' },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('All corporations fetched successfully');
      expect(result.data).toEqual([
        { id: 'b-id', legalName: 'Beta Corp' },
        { id: 'a-id', legalName: 'Alpha Corp' },
      ]);
    });

    it('should rethrow when prisma findMany fails', async () => {
      (prisma.corporation.findMany as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );

      await expect(service.findAllIdAndName()).rejects.toThrow('DB error');
    });
  });

  describe('upsertKeyContact', () => {
    const complianceDto: UpsertKeyContactDto = {
      complianceContact: true,
      firstName: 'Legal',
      lastName: 'Contact',
      jobRole: ' Counsel ',
      email: 'Legal@Example.COM',
      workPhone: '+1-555-0000',
    };

    const savedRow = {
      id: 'kc-1',
      appUserId: null as string | null,
      contactType: 'legal_compliance_contact',
      firstName: 'Legal',
      lastName: 'Contact',
      nickname: null,
      jobRole: 'Counsel',
      email: 'legal@example.com',
      workPhone: '+1-555-0000',
      cellPhone: null,
    };

    it('should throw NotFoundException when corporation does not exist', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.upsertKeyContact('missing', {
          complianceContact: false,
        } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when corporation is closed', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-1',
        status: CORPORATION_STATUS.CLOSED,
        submittedSteps: 4,
      });

      await expect(
        service.upsertKeyContact('corp-1', complianceDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should soft-delete legal compliance rows when complianceContact is false', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-1',
        status: CORPORATION_STATUS.INCOMPLETE,
        submittedSteps: 4,
      });

      const result = await service.upsertKeyContact('corp-1', {
        complianceContact: false,
      } as never);

      expect(prisma.appKeyContact.updateMany).toHaveBeenCalledWith({
        where: {
          corporationId: 'corp-1',
          contactType: 'legal_compliance_contact',
          deletedAt: null,
        },
        data: { deletedAt: expect.any(Date) },
      });
      expect(prisma.corporation.update).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Key contact removed successfully');
      expect(result.data).toBeNull();
    });

    it('should set submittedSteps to 4 when removing key contact and steps were below 4', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-1',
        status: CORPORATION_STATUS.INCOMPLETE,
        submittedSteps: 2,
      });

      await service.upsertKeyContact('corp-1', {
        complianceContact: false,
      } as never);

      expect(prisma.corporation.update).toHaveBeenCalledWith({
        where: { id: 'corp-1' },
        data: { submittedSteps: 4 },
      });
    });

    it('should create legal compliance contact when none exists', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-1',
        status: CORPORATION_STATUS.INCOMPLETE,
        submittedSteps: 3,
      });
      (prisma.appKeyContact.findFirst as jest.Mock).mockResolvedValue(null);
      txAppKeyContactCreate.mockResolvedValueOnce(savedRow);

      const result = await service.upsertKeyContact('corp-1', complianceDto);

      expect(txAppKeyContactCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            corporationId: 'corp-1',
            contactType: 'legal_compliance_contact',
            email: 'legal@example.com',
            firstName: 'Legal',
            lastName: 'Contact',
            jobRole: 'Counsel',
            deletedAt: null,
          }),
        }),
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe('Key contact updated successfully');
      expect(result.data).toEqual({
        id: 'kc-1',
        contactType: 'legal_compliance_contact',
        firstName: 'Legal',
        lastName: 'Contact',
        nickname: null,
        jobRole: 'Counsel',
        email: 'legal@example.com',
        workPhone: '+1-555-0000',
        cellPhone: null,
      });
      expect(prisma.corporation.update).toHaveBeenCalledWith({
        where: { id: 'corp-1' },
        data: { submittedSteps: 4 },
      });
    });

    it('should update existing legal compliance contact and mirror app user when linked', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-1',
        status: CORPORATION_STATUS.ACTIVE,
        submittedSteps: 4,
      });
      (prisma.appKeyContact.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-kc',
      });
      const rowWithAppUser = { ...savedRow, appUserId: 'cognito-sub-1' };
      txAppKeyContactUpdate.mockResolvedValueOnce(rowWithAppUser);

      await service.upsertKeyContact('corp-1', complianceDto);

      expect(txAppKeyContactUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'existing-kc' },
          data: expect.objectContaining({
            firstName: 'Legal',
            lastName: 'Contact',
            jobRole: 'Counsel',
          }),
        }),
      );
      expect(prisma.appUser.update).toHaveBeenCalledWith({
        where: { cognitoSub: 'cognito-sub-1' },
        data: {
          firstName: 'Legal',
          lastName: 'Contact',
          nickname: null,
          jobRole: 'Counsel',
          workPhone: '+1-555-0000',
          cellPhone: null,
        },
      });
    });
  });

  describe('suspendOrClose', () => {
    it('should throw NotFoundException when corporation does not exist', async () => {
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.suspendOrClose(
          'bad-id',
          {
            status: 'SUSPENDED',
          } as never,
          billingActorUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when already suspended and suspend again', async () => {
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue({
        id: 'corp-1',
        status: CORPORATION_STATUS.SUSPENDED,
      });

      await expect(
        service.suspendOrClose(
          'corp-1',
          { status: 'suspended' } as never,
          billingActorUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when closed and suspend requested', async () => {
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue({
        id: 'corp-1',
        status: CORPORATION_STATUS.CLOSED,
      });

      await expect(
        service.suspendOrClose(
          'corp-1',
          { status: 'SUSPENDED' } as never,
          billingActorUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when already closed and close again', async () => {
      (prisma.corporation.findFirst as jest.Mock).mockResolvedValue({
        id: 'corp-1',
        status: CORPORATION_STATUS.CLOSED,
      });

      await expect(
        service.suspendOrClose(
          'corp-1',
          { status: 'closed' } as never,
          billingActorUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should suspend an active corporation and cascade to companies and users', async () => {
      const signOutSpy = jest
        .spyOn(CognitoIdpUtil, 'adminUserGlobalSignOut')
        .mockResolvedValue(undefined);
      const disableSpy = jest
        .spyOn(CognitoIdpUtil, 'setCognitoUserEnabled')
        .mockResolvedValue(undefined);

      mockCompanyService.sendCompanySuspendedEmailToAdmin.mockClear();
      mockEmailService.sendEmail.mockClear();

      (prisma.corporation.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'corp-1',
          status: CORPORATION_STATUS.ACTIVE,
        })
        .mockResolvedValueOnce({ legalName: 'Acme Corp' });
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([
        { id: 'co-1', legalName: 'Acme Co One' },
        { id: 'co-2', legalName: 'Acme Co Two' },
      ]);
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        email: 'corp-admin@example.com',
        firstName: 'Corp',
        lastName: 'Admin',
      });
      (prisma.userCompanyAccess.findMany as jest.Mock).mockResolvedValue([
        { userId: 'sub-1' },
      ]);
      (prisma.appUser.findMany as jest.Mock).mockResolvedValue([
        { cognitoSub: 'sub-1', email: 'user@example.com' },
        { cognitoSub: 'sub-corp-admin', email: 'admin@example.com' },
      ]);
      (prisma.corporation.update as jest.Mock).mockResolvedValue({});
      (prisma.corporationCompany.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      (prisma.appUser.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await service.suspendOrClose(
        'corp-1',
        {
          status: 'SUSPENDED',
          suspendCloseReason: 'billing',
          suspendCloseAdditionalNotes: 'note',
        },
        billingActorUser,
      );

      expect(signOutSpy).toHaveBeenCalled();
      expect(disableSpy).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.corporation.update).toHaveBeenCalledWith({
        where: { id: 'corp-1' },
        data: {
          status: CORPORATION_STATUS.SUSPENDED,
          suspendCloseReason: 'billing',
          suspendCloseAdditionalNotes: 'note',
          suspendedClosedOn: expect.any(Date) as Date,
        },
      });
      expect(prisma.corporationCompany.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['co-1', 'co-2'] } },
        data: {
          status: COMPANY_STATUS.SUSPENDED,
          suspendReason: 'billing',
          suspendAdditionalNotes: 'note',
          suspendedClosedOn: expect.any(Date) as Date,
        },
      });
      expect(prisma.appUser.updateMany).toHaveBeenCalledWith({
        where: {
          cognitoSub: { in: ['sub-1', 'sub-corp-admin'] },
          deletedAt: null,
        },
        data: { status: APP_USER_STATUS.BLOCKED },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Corporation suspended successfully');
      expect(result.data).toEqual({
        id: 'corp-1',
        status: CORPORATION_STATUS.SUSPENDED,
      });
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'corp-admin@example.com',
          subject: 'Corporation Access Suspended on BSP Platform',
        }),
      );
      expect(
        mockCompanyService.sendCompanySuspendedEmailToAdmin,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockCompanyService.sendCompanySuspendedEmailToAdmin,
      ).toHaveBeenCalledWith('co-1', 'Acme Co One', 'billing');
      expect(
        mockCompanyService.sendCompanySuspendedEmailToAdmin,
      ).toHaveBeenCalledWith('co-2', 'Acme Co Two', 'billing');
      expect(
        mockStripeService.cancelCompanySubscriptionForAdmin,
      ).not.toHaveBeenCalled();

      signOutSpy.mockRestore();
      disableSpy.mockRestore();
    });

    it('should close a corporation and cascade to companies and users', async () => {
      const signOutSpy = jest
        .spyOn(CognitoIdpUtil, 'adminUserGlobalSignOut')
        .mockResolvedValue(undefined);
      const disableSpy = jest
        .spyOn(CognitoIdpUtil, 'setCognitoUserEnabled')
        .mockResolvedValue(undefined);

      mockEmailService.sendEmail.mockClear();
      mockCompanyService.sendCompanyClosedEmailToAdmin.mockClear();
      mockStripeService.resolveBillingSubscriptionActor.mockClear();
      mockStripeService.cancelCompanySubscriptionForAdmin.mockClear();

      (prisma.corporation.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'corp-1',
          status: CORPORATION_STATUS.SUSPENDED,
        })
        .mockResolvedValueOnce({ legalName: 'Acme Corp' });
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([
        { id: 'co-1', legalName: 'Acme Co One', stripeSubscriptionId: 'sub_1' },
        { id: 'co-2', legalName: 'Acme Co Two', stripeSubscriptionId: null },
      ]);
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        email: 'corp-admin@example.com',
        firstName: 'Corp',
        lastName: 'Admin',
      });
      (prisma.userCompanyAccess.findMany as jest.Mock).mockResolvedValue([
        { userId: 'sub-1' },
      ]);
      (prisma.appUser.findMany as jest.Mock).mockResolvedValue([
        { cognitoSub: 'sub-1', email: 'user@example.com' },
        { cognitoSub: 'sub-corp-admin', email: 'admin@example.com' },
      ]);
      (prisma.corporation.update as jest.Mock).mockResolvedValue({});
      (prisma.corporationCompany.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      (prisma.appUser.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await service.suspendOrClose(
        'corp-1',
        {
          status: 'CLOSED',
          suspendCloseReason: 'requested',
          suspendCloseAdditionalNotes: 'note',
        },
        billingActorUser,
      );

      expect(signOutSpy).toHaveBeenCalled();
      expect(disableSpy).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.corporation.update).toHaveBeenCalledWith({
        where: { id: 'corp-1' },
        data: {
          status: CORPORATION_STATUS.CLOSED,
          suspendCloseReason: 'requested',
          suspendCloseAdditionalNotes: 'note',
          suspendedClosedOn: expect.any(Date) as Date,
        },
      });
      expect(prisma.corporationCompany.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['co-1', 'co-2'] } },
        data: {
          status: COMPANY_STATUS.CLOSED,
          suspendReason: 'requested',
          suspendAdditionalNotes: 'note',
          suspendedClosedOn: expect.any(Date) as Date,
        },
      });
      expect(prisma.appUser.updateMany).toHaveBeenCalledWith({
        where: {
          cognitoSub: { in: ['sub-1', 'sub-corp-admin'] },
          deletedAt: null,
        },
        data: { status: APP_USER_STATUS.BLOCKED },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Corporation closed successfully');
      expect(result.data?.status).toBe(CORPORATION_STATUS.CLOSED);
      expect(
        mockStripeService.resolveBillingSubscriptionActor,
      ).toHaveBeenCalledWith(
        billingActorUser.cognitoSub,
        billingActorUser.groups,
      );
      expect(
        mockStripeService.cancelCompanySubscriptionForAdmin,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockStripeService.cancelCompanySubscriptionForAdmin,
      ).toHaveBeenCalledWith(
        'co-1',
        {
          reason: 'requested',
          additionalNotes: 'note',
        },
        {
          actorKind: 'super_admin',
          actorCognitoSub: billingActorUser.cognitoSub,
          actorName: 'Super Admin',
          actorRole: 'Super Admin',
        },
      );
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'corp-admin@example.com',
          subject: 'Notice: Your corporation has been closed',
        }),
      );
      expect(
        mockCompanyService.sendCompanyClosedEmailToAdmin,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockCompanyService.sendCompanyClosedEmailToAdmin,
      ).toHaveBeenCalledWith('co-1', 'Acme Co One', 'Acme Corp', 'requested');
      expect(
        mockCompanyService.sendCompanyClosedEmailToAdmin,
      ).toHaveBeenCalledWith('co-2', 'Acme Co Two', 'Acme Corp', 'requested');

      signOutSpy.mockRestore();
      disableSpy.mockRestore();
    });
  });

  describe('reinstate', () => {
    it('should throw NotFoundException when corporation does not exist', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.reinstate('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when corporation is not suspended', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-1',
        status: CORPORATION_STATUS.ACTIVE,
      });

      await expect(service.reinstate('corp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reinstate corporation and cascade to suspended companies and users', async () => {
      const enableSpy = jest
        .spyOn(CognitoIdpUtil, 'setCognitoUserEnabled')
        .mockResolvedValue(undefined);

      mockCompanyService.sendCompanyReinstatedEmailToAdmin.mockClear();
      mockEmailService.sendEmail.mockClear();

      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-1',
        status: CORPORATION_STATUS.SUSPENDED,
        legalName: 'Acme Corp',
      });
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([
        { id: 'co-1', legalName: 'Acme Co One' },
        { id: 'co-2', legalName: 'Acme Co Two' },
      ]);
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        email: 'corp-admin@example.com',
        firstName: 'Corp',
        lastName: 'Admin',
      });
      (prisma.userCompanyAccess.findMany as jest.Mock).mockResolvedValue([
        { userId: 'sub-1' },
      ]);
      (prisma.appUser.findMany as jest.Mock).mockResolvedValue([
        { cognitoSub: 'sub-1', email: 'user@example.com' },
        { cognitoSub: 'sub-corp-admin', email: 'admin@example.com' },
      ]);
      (prisma.corporation.update as jest.Mock).mockResolvedValue({});
      (prisma.corporationCompany.updateMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
      (prisma.appUser.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await service.reinstate('corp-1');

      expect(enableSpy).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.corporation.update).toHaveBeenCalledWith({
        where: { id: 'corp-1' },
        data: { status: CORPORATION_STATUS.ACTIVE },
      });
      expect(prisma.corporationCompany.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['co-1', 'co-2'] } },
        data: { status: COMPANY_STATUS.ACTIVE },
      });
      expect(prisma.appUser.updateMany).toHaveBeenCalledWith({
        where: {
          cognitoSub: { in: ['sub-1', 'sub-corp-admin'] },
          deletedAt: null,
        },
        data: { status: APP_USER_STATUS.ACTIVE },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Corporation reinstated successfully');
      expect(result.data).toEqual({ id: 'corp-1' });
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'corp-admin@example.com',
          subject: 'Corporation Access Reinstated on BSP Platform',
        }),
      );
      expect(
        mockCompanyService.sendCompanyReinstatedEmailToAdmin,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockCompanyService.sendCompanyReinstatedEmailToAdmin,
      ).toHaveBeenCalledWith('co-1', 'Acme Co One');
      expect(
        mockCompanyService.sendCompanyReinstatedEmailToAdmin,
      ).toHaveBeenCalledWith('co-2', 'Acme Co Two');

      enableSpy.mockRestore();
    });
  });

  describe('uploadBrandLogo', () => {
    const pngFile = {
      buffer: Buffer.from('x'),
      mimetype: 'image/png',
      size: 100,
    } as Express.Multer.File;

    it('should throw BadRequestException when file buffer is missing', async () => {
      await expect(
        service.uploadBrandLogo('corp-1', {} as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid mime type', async () => {
      await expect(
        service.uploadBrandLogo('corp-1', {
          ...pngFile,
          mimetype: 'image/gif',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when file exceeds max size', async () => {
      await expect(
        service.uploadBrandLogo('corp-1', {
          ...pngFile,
          size: BRAND_LOGO_MAX_SIZE_BYTES + 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when corporation does not exist', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.uploadBrandLogo('bad-id', pngFile)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when corporation is closed', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-1',
        status: CORPORATION_STATUS.CLOSED,
        brandLogo: null,
        submittedSteps: 4,
      });

      await expect(service.uploadBrandLogo('corp-1', pngFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should upload logo, delete existing object when present, and bump submittedSteps from 2 to 3', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-1',
        status: CORPORATION_STATUS.INCOMPLETE,
        brandLogo: 'old-logo.png',
        submittedSteps: 2,
      });
      s3.objectExists.mockResolvedValue(true);
      s3.upload.mockResolvedValue(undefined);
      (prisma.corporation.update as jest.Mock).mockResolvedValue({});

      const randomSpy = jest
        .spyOn(crypto, 'randomUUID')
        .mockReturnValue('11111111-1111-4111-8111-111111111111');

      const result = await service.uploadBrandLogo('corp-1', pngFile);

      randomSpy.mockRestore();

      expect(s3.buildBrandLogoKey).toHaveBeenCalledWith('old-logo.png');
      expect(s3.delete).toHaveBeenCalled();
      expect(s3.upload).toHaveBeenCalled();
      expect(prisma.corporation.update).toHaveBeenCalledWith({
        where: { id: 'corp-1' },
        data: {
          brandLogo: '11111111-1111-4111-8111-111111111111.png',
          submittedSteps: 3,
        },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Brand logo uploaded successfully');
      expect(result.data?.brandLogo).toBe(
        'https://bucket.s3.region.amazonaws.com/corporation-brand-logos/11111111-1111-4111-8111-111111111111.png',
      );
    });

    it('should use existing key as-is when brandLogo already includes prefix', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-1',
        status: CORPORATION_STATUS.ACTIVE,
        brandLogo: 'corporation-brand-logos/prefixed.png',
        submittedSteps: 5,
      });
      s3.objectExists.mockResolvedValue(false);
      s3.upload.mockResolvedValue(undefined);
      (prisma.corporation.update as jest.Mock).mockResolvedValue({});

      const randomSpy = jest
        .spyOn(crypto, 'randomUUID')
        .mockReturnValue('22222222-2222-4222-8222-222222222222');

      await service.uploadBrandLogo('corp-1', pngFile);

      randomSpy.mockRestore();

      expect(s3.objectExists).toHaveBeenCalledWith(
        'corporation-brand-logos/prefixed.png',
      );
      expect(s3.delete).not.toHaveBeenCalled();
    });
  });

  describe('deleteBrandLogo', () => {
    it('should throw NotFoundException when corporation does not exist', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteBrandLogo('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when corporation is closed', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-1',
        status: CORPORATION_STATUS.CLOSED,
        brandLogo: 'x.png',
      });

      await expect(service.deleteBrandLogo('corp-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should clear brandLogo when none stored', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-1',
        status: CORPORATION_STATUS.ACTIVE,
        brandLogo: null,
      });
      (prisma.corporation.update as jest.Mock).mockResolvedValue({});

      const result = await service.deleteBrandLogo('corp-1');

      expect(s3.objectExists).not.toHaveBeenCalled();
      expect(prisma.corporation.update).toHaveBeenCalledWith({
        where: { id: 'corp-1' },
        data: { brandLogo: null },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Brand logo deleted successfully');
    });

    it('should delete S3 object when present then clear brandLogo', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: 'corp-1',
        status: CORPORATION_STATUS.ACTIVE,
        brandLogo: 'logo.png',
      });
      s3.objectExists.mockResolvedValue(true);
      (prisma.corporation.update as jest.Mock).mockResolvedValue({});

      await service.deleteBrandLogo('corp-1');

      expect(s3.delete).toHaveBeenCalled();
      expect(prisma.corporation.update).toHaveBeenCalledWith({
        where: { id: 'corp-1' },
        data: { brandLogo: null },
      });
    });
  });

  describe('getDashboardAnalyticsForRequester', () => {
    const corporationId = 'corp-uuid-1';
    const analyticsData = {
      corporations: {
        total: 1,
        active: 1,
        incomplete: 0,
        suspended: 0,
        closed: 0,
      },
      companies: {
        total: 2,
        active: 1,
        incomplete: 1,
        suspended: 0,
        closed: 0,
      },
      users: {
        total: 5,
        active: 3,
        pending: 1,
        blocked: 0,
        cancelled: 0,
        expired: 0,
        deleted: 1,
      },
      assessments: {
        completed: 4,
        inprogress: 2,
        avgTimeToComplete: 1.5,
      },
    };

    it('should forbid callers who are not CorporationAdmin', async () => {
      await expect(
        service.getDashboardAnalyticsForRequester({}, 'sub-1', ['User']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid CorporationAdmin with no linked corporation', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getDashboardAnalyticsForRequester({}, 'sub-corp', [
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        ]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should forbid CorporationAdmin when companyId is outside their corporation', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        corporationId,
      });
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.getDashboardAnalyticsForRequester(
          { companyId: 'other-company' },
          'sub-corp',
          [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return analytics scoped to caller corporation', async () => {
      (prisma.appUser.findFirst as jest.Mock).mockResolvedValue({
        corporationId,
      });
      const countSpy = jest
        .spyOn(SystemAnalyticsUtil, 'countSystemAnalytics')
        .mockResolvedValue(analyticsData);

      const result = await service.getDashboardAnalyticsForRequester(
        { timeFilter: 'last7Days' },
        'sub-corp',
        [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
      );

      expect(countSpy).toHaveBeenCalledWith(prisma, {
        corporationId,
        companyId: undefined,
        timeFilter: 'last7Days',
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        companies: analyticsData.companies,
        users: analyticsData.users,
        assessments: analyticsData.assessments,
      });

      countSpy.mockRestore();
    });
  });
});
