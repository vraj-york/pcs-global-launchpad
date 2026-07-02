import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { S3Service } from '../s3';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { setCognitoUserEnabled } from '../common';
import { AppUserService } from './app-user.service';
import { SubscriptionAccessService } from './subscription-access.service';
import { RbacAccessService } from '../auth/rbac/rbac-access.service';
import { PrismaService } from '../prisma';
import { EmailService } from '../email';
import {
  APP_USER_NOT_FOUND_MSG,
  APP_USER_ONBOARDING_CONSENT_EMAIL_SUBJECT,
  APP_USER_ONBOARDING_STEP_UPDATED_MSG,
  APP_USER_SELF_PROFILE_FETCHED_SUCCESS_MSG,
  APP_USER_SELF_PROFILE_UPDATED_MSG,
  APP_USER_STATUS,
  APP_USER_UPDATE_EMPTY_BODY_MSG,
  APP_USER_UPDATE_ACTIVE_ORG_SUSPENDED_MSG,
  APP_USER_UPDATE_SUPER_ADMIN_NOT_ALLOWED_MSG,
  APP_USER_UPDATE_FORBIDDEN_MSG,
  APP_USER_VIEW_FETCHED_SUCCESS_MSG,
  APP_USER_VIEW_FORBIDDEN_MSG,
  APP_USER_BLOCK_FORBIDDEN_MSG,
  APP_USER_BLOCK_ORG_SUSPENDED_MSG,
  APP_USER_BLOCK_SUPER_ADMIN_NOT_ALLOWED_MSG,
  APP_USER_SOFT_DELETE_CORP_COMPANY_ADMIN_NOT_ALLOWED_MSG,
  APP_USER_SOFT_DELETE_SUPER_ADMIN_NOT_ALLOWED_MSG,
  APP_USER_SOFT_DELETE_FORBIDDEN_MSG,
  APP_USER_INVITATION_CANCEL_FORBIDDEN_MSG,
  APP_USER_INVITATION_RESEND_FORBIDDEN_MSG,
  APP_USERS_LIST_FORBIDDEN_MSG,
  APP_USERS_LIST_COMPANY_ADMIN_WRONG_COMPANY_MSG,
  APP_USERS_LIST_CORP_ADMIN_WRONG_CORP_MSG,
  APP_USER_AVATAR_FILE_REQUIRED_MSG,
  APP_USER_AVATAR_INVALID_TYPE_MSG,
  APP_USER_AVATAR_UPLOADED_SUCCESS_MSG,
  APP_USER_AVATAR_DELETED_SUCCESS_MSG,
  APP_USER_INVITE_FORBIDDEN_MSG,
  APP_USER_INVITE_CORP_ADMIN_WRONG_CORP_MSG,
  APP_USER_INVITE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
  APP_USER_INVITE_TYPE,
  SUPER_ADMIN_APP_USER_TYPE,
  INDIVIDUAL_APP_USER_TYPE,
} from './constants/app-user.constants';
import { APP_USER_AVATAR_MAX_SIZE_BYTES } from './constants/app-user-avatar.constants';
import { APP_USER_BULK_INVITE_JOB_FORBIDDEN_MSG } from './constants/app-user-bulk-job.constants';
import { UpdateAppUserDto, UpdateMyProfileDto } from './dto';
import { COGNITO_GROUP_NAMES } from './cognito-groups.constants';
import { COMPANY_STATUS } from '../company/constants/company.status';
import { CORPORATION_STATUS } from '../corporation/constants/corporation.status';

jest.mock('../common', () => {
  const actual = jest.requireActual<typeof import('../common')>('../common');
  return {
    ...actual,
    setCognitoUserEnabled: jest.fn().mockResolvedValue(undefined),
  };
});

type AppUserCountCallArgs = {
  where: { AND?: Array<{ OR?: unknown[] }> };
};

function getAppUserCountWhere(
  countMock: jest.Mock,
): AppUserCountCallArgs['where'] {
  const calls = countMock.mock.calls as Array<[AppUserCountCallArgs]>;
  const call = calls.at(-1)?.[0];
  if (!call?.where) {
    throw new Error('Expected appUser.count to be called with where');
  }
  return call.where;
}

function findScopeOrClause(
  where: AppUserCountCallArgs['where'],
): unknown[] | undefined {
  return where.AND?.find((clause) => Array.isArray(clause.OR))?.OR;
}

function findCompanyIdsInScopeOr(
  orClauses: unknown[] | undefined,
): string[] | undefined {
  for (const entry of orClauses ?? []) {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !('companyAccess' in entry)
    ) {
      continue;
    }
    const companyAccess = (
      entry as {
        companyAccess?: { some?: { companyId?: { in?: string[] } } };
      }
    ).companyAccess;
    return companyAccess?.some?.companyId?.in;
  }
  return undefined;
}

describe('AppUserService', () => {
  let service: AppUserService;
  let s3: {
    getUserAvatarsPrefix: jest.Mock;
    buildUserAvatarKey: jest.Mock;
    getPublicUrl: jest.Mock;
    objectExists: jest.Mock;
    upload: jest.Mock;
    delete: jest.Mock;
  };
  let emailService: {
    sendEmail: jest.Mock;
  };
  let prisma: {
    appUser: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    appKeyContact: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    corporationCompany: { findFirst: jest.Mock; findMany: jest.Mock };
    userCompanyAccess: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
    assessment: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  const configMock = {
    get: jest.fn((key: string) => {
      if (key === 'COGNITO_USER_POOL_ID') {
        return 'us-east-1_testPoolId';
      }
      if (key === 'AWS_REGION') {
        return 'us-east-1';
      }
      if (key === 'SUPPORT_CONTACT_EMAIL') {
        return 'support@bspblueprint.com';
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    (setCognitoUserEnabled as jest.Mock).mockClear();

    const appKeyContact = {
      findFirst: jest.fn(),
      update: jest.fn(),
    };
    const appUser = {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    };

    prisma = {
      appUser,
      appKeyContact,
      corporationCompany: { findFirst: jest.fn(), findMany: jest.fn() },
      userCompanyAccess: { findMany: jest.fn() },
      $queryRaw: jest.fn(),
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          appUser,
          appKeyContact,
        }),
      ),
      assessment: {
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    s3 = {
      getUserAvatarsPrefix: jest.fn(() => 'app-user-avatars/'),
      buildUserAvatarKey: jest.fn(
        (filename: string) => `app-user-avatars/${filename}`,
      ),
      getPublicUrl: jest.fn((key: string) => `https://cdn.example.com/${key}`),
      objectExists: jest.fn().mockResolvedValue(false),
      upload: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    emailService = {
      sendEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppUserService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configMock },
        { provide: EmailService, useValue: emailService },
        { provide: S3Service, useValue: s3 },
        {
          provide: SubscriptionAccessService,
          useValue: { resolveForUser: jest.fn() },
        },
        {
          provide: RbacAccessService,
          useValue: {
            resolveForUser: jest.fn().mockResolvedValue({
              isSuperAdmin: false,
              effectiveGroups: [],
              roleCategoryIds: [],
              roleId: null,
              enabledSubmoduleKeys: new Set<string>(),
              submodules: [],
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AppUserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByCognitoSubForRequester', () => {
    it('should forbid callers who are not admin roles', async () => {
      await expect(
        service.findByCognitoSubForRequester('sub-target', 'sub-1', ['User']),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_USER_VIEW_FORBIDDEN_MSG,
      });
    });
  });

  describe('findByCognitoSub', () => {
    it('should throw NotFound when cognito sub is empty', async () => {
      await expect(service.findByCognitoSub('  ')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findByCognitoSub('  ')).rejects.toThrow(
        APP_USER_NOT_FOUND_MSG,
      );
    });

    it('should throw NotFound when user does not exist', async () => {
      prisma.appUser.findFirst.mockResolvedValue(null);

      await expect(service.findByCognitoSub('sub-x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return user detail when found', async () => {
      const createdAt = new Date('2025-01-15T12:00:00.000Z');
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        userCode: 1001,
        roleId: null,
        inviteType: null,
        status: APP_USER_STATUS.ACTIVE,
        firstName: 'A',
        lastName: 'B',
        nickname: null,
        email: 'a@b.com',
        workPhone: null,
        cellPhone: null,
        timezone: 'UTC',
        createdAt,
        invitationSentAt: null,
        corporation: null,
        role: null,
        companyAccess: [],
      });

      const result = await service.findByCognitoSub('sub-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe(APP_USER_VIEW_FETCHED_SUCCESS_MSG);
      expect(result.data).toMatchObject({
        cognitoSub: 'sub-1',
        userCode: 1001,
        email: 'a@b.com',
      });
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated list', async () => {
      prisma.appUser.count.mockResolvedValue(0);
      prisma.appUser.findMany.mockResolvedValue([]);

      const result = await service.findAllPaginated({ page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(prisma.appUser.count).toHaveBeenCalled();
      expect(prisma.appUser.findMany).toHaveBeenCalled();
    });

    it('should exclude super_admin and individual users from list queries', async () => {
      prisma.appUser.count.mockResolvedValue(0);
      prisma.appUser.findMany.mockResolvedValue([]);

      await service.findAllPaginated({ page: 1, limit: 10 });

      expect(prisma.appUser.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          email: { not: null },
          AND: [
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
          ],
        },
      });
    });

    it('should exclude requester cognitoSub from list queries', async () => {
      prisma.appUser.count.mockResolvedValue(0);
      prisma.appUser.findMany.mockResolvedValue([]);

      await service.findAllPaginated(
        { page: 1, limit: 10 },
        undefined,
        'sub-me',
      );

      /* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are typed loosely */
      expect(prisma.appUser.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          cognitoSub: { not: 'sub-me' },
        }),
      });
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });

    it('should map InternalServerError when count fails', async () => {
      prisma.appUser.count.mockRejectedValue(new Error('db'));

      await expect(
        service.findAllPaginated({ page: 1, limit: 10 }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should sort by companyName via raw SQL for corporation admin scope', async () => {
      prisma.appUser.count.mockResolvedValue(1);
      prisma.$queryRaw.mockResolvedValue([{ cognito_sub: 'sub-1' }]);
      prisma.appUser.findMany.mockResolvedValue([]);

      const result = await service.findAllPaginated(
        { page: 1, limit: 10, sortBy: 'companyName', sortOrder: 'asc' },
        {
          corporationId: '2f19cbd9-e904-4f2d-b393-447a110ce791',
          includeAssessmentOnlyUsers: true,
        },
      );

      expect(result.success).toBe(true);
      expect(prisma.$queryRaw).toHaveBeenCalled();
      const rawSql = JSON.stringify(prisma.$queryRaw.mock.calls[0]);
      expect(rawSql).not.toContain('::uuid');
    });
  });

  describe('findAllPaginatedForRequester', () => {
    it('should forbid callers who are not admin roles', async () => {
      await expect(
        service.findAllPaginatedForRequester({}, 'sub-1', ['User']),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findAllPaginatedForRequester({}, 'sub-1', ['User']),
      ).rejects.toThrow(APP_USERS_LIST_FORBIDDEN_MSG);
    });

    it('should delegate to findAllPaginated for SuperAdmin', async () => {
      prisma.appUser.count.mockResolvedValue(0);
      prisma.appUser.findMany.mockResolvedValue([]);

      await service.findAllPaginatedForRequester(
        { page: 1, limit: 10 },
        'sub-sa',
        [COGNITO_GROUP_NAMES.SUPER_ADMIN],
      );

      /* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are typed loosely */
      expect(prisma.appUser.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          cognitoSub: { not: 'sub-sa' },
        }),
      });
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });

    it('should scope list to corporation for CorporationAdmin and include Assessment Only users', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        corporationId: 'corp-1',
      });
      prisma.appUser.count.mockResolvedValue(0);
      prisma.appUser.findMany.mockResolvedValue([]);

      await service.findAllPaginatedForRequester(
        { page: 1, limit: 10 },
        'sub-corp',
        [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
      );

      expect(prisma.appUser.count).toHaveBeenCalledTimes(1);
      const corpAdminScopeOr = findScopeOrClause(
        getAppUserCountWhere(prisma.appUser.count),
      );

      expect(corpAdminScopeOr).toContainEqual({
        inviteType: APP_USER_INVITE_TYPE.ASSESSMENT_ONLY,
      });
      expect(corpAdminScopeOr).toContainEqual({ corporationId: 'corp-1' });
      expect(getAppUserCountWhere(prisma.appUser.count)).toMatchObject({
        cognitoSub: { not: 'sub-corp' },
      });
    });

    it('should scope list to admin companies for CompanyAdmin and include Assessment Only users', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([
        { companyId: 'co-1' },
        { companyId: 'co-2' },
      ]);
      prisma.appUser.count.mockResolvedValue(0);
      prisma.appUser.findMany.mockResolvedValue([]);

      await service.findAllPaginatedForRequester(
        { page: 1, limit: 10 },
        'sub-co',
        [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
      );

      expect(prisma.appUser.count).toHaveBeenCalledTimes(1);
      const companyAdminScopeOr = findScopeOrClause(
        getAppUserCountWhere(prisma.appUser.count),
      );

      expect(companyAdminScopeOr).toContainEqual({
        inviteType: APP_USER_INVITE_TYPE.ASSESSMENT_ONLY,
      });
      expect(findCompanyIdsInScopeOr(companyAdminScopeOr)).toEqual([
        'co-1',
        'co-2',
      ]);
      expect(getAppUserCountWhere(prisma.appUser.count)).toMatchObject({
        cognitoSub: { not: 'sub-co' },
      });
    });
  });

  describe('getMyProfile', () => {
    it('should throw NotFound when user does not exist', async () => {
      prisma.appUser.findFirst.mockResolvedValue(null);

      await expect(service.getMyProfile('sub-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getMyProfile('sub-1')).rejects.toThrow(
        APP_USER_NOT_FOUND_MSG,
      );
    });

    it('should return the current user profile payload', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        corporationId: 'corp-uuid-1',
        email: 'jane.doe@example.com',
        userCode: 1001,
        status: APP_USER_STATUS.ACTIVE,
        firstName: 'Jane',
        lastName: 'Doe',
        nickname: 'JD',
        jobRole: 'Engineer',
        workPhone: '+1 555-1000',
        cellPhone: '+1 555-2000',
        timezone: 'UTC',
        userType: 'end_user',
        inviteType: 'BSPBlueprint',
        invitationSentAt: null,
        completedOnboardingSteps: 2,
        corporation: { legalName: 'Acme Corp' },
        role: { name: 'Reviewer', category: { name: 'Team' } },
        companyAccess: [
          {
            companyId: 'company-uuid-1',
            company: { legalName: 'Acme Company' },
          },
        ],
      });
      prisma.assessment.count.mockResolvedValue(1);

      const result = await service.getMyProfile('sub-1');

      expect(prisma.assessment.count).toHaveBeenCalledWith({
        where: {
          userId: 'sub-1',
          status: 'report_generated',
        },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe(APP_USER_SELF_PROFILE_FETCHED_SUCCESS_MSG);
      expect(result.data).toMatchObject({
        cognitoSub: 'sub-1',
        corporationId: 'corp-uuid-1',
        companyId: 'company-uuid-1',
        email: 'jane.doe@example.com',
        userCode: 1001,
        firstName: 'Jane',
        lastName: 'Doe',
        workPhone: '+1 555-1000',
        status: APP_USER_STATUS.ACTIVE,
        completedOnboardingSteps: 2,
        assessmentCompletionCount: 1,
        corporation: 'Acme Corp',
        companyName: 'Acme Company',
        roleName: 'Reviewer',
        userType: 'end_user',
        inviteType: 'BSPBlueprint',
        nickname: 'JD',
        jobRole: 'Engineer',
        cellPhone: '+1 555-2000',
        category: 'Team',
        timezone: 'UTC',
      });
    });
  });

  describe('uploadMyAvatar', () => {
    const pngFile = {
      buffer: Buffer.from('png'),
      mimetype: 'image/png',
      size: 100,
    } as Express.Multer.File;

    it('should reject when file buffer is missing', async () => {
      await expect(
        service.uploadMyAvatar('sub-1', {} as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadMyAvatar('sub-1', {} as Express.Multer.File),
      ).rejects.toThrow(APP_USER_AVATAR_FILE_REQUIRED_MSG);
    });

    it('should reject invalid mime type', async () => {
      await expect(
        service.uploadMyAvatar('sub-1', {
          ...pngFile,
          mimetype: 'image/gif',
        } as Express.Multer.File),
      ).rejects.toThrow(APP_USER_AVATAR_INVALID_TYPE_MSG);
    });

    it('should reject when file exceeds max size', async () => {
      await expect(
        service.uploadMyAvatar('sub-1', {
          ...pngFile,
          size: APP_USER_AVATAR_MAX_SIZE_BYTES + 1,
        } as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFound when user does not exist', async () => {
      prisma.appUser.findFirst.mockResolvedValue(null);

      await expect(service.uploadMyAvatar('sub-1', pngFile)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should upload avatar and return public URL', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        avatar: null,
      });
      prisma.appUser.update.mockResolvedValue({});

      const randomSpy = jest
        .spyOn(crypto, 'randomUUID')
        .mockReturnValue('11111111-1111-4111-8111-111111111111');

      const result = await service.uploadMyAvatar('sub-1', pngFile);

      randomSpy.mockRestore();

      expect(s3.upload).toHaveBeenCalled();
      expect(prisma.appUser.update).toHaveBeenCalledWith({
        where: { cognitoSub: 'sub-1' },
        data: { avatar: '11111111-1111-4111-8111-111111111111.png' },
      });
      expect(result.message).toBe(APP_USER_AVATAR_UPLOADED_SUCCESS_MSG);
      expect(result.data?.avatar).toBe(
        'https://cdn.example.com/app-user-avatars/11111111-1111-4111-8111-111111111111.png',
      );
    });
  });

  describe('deleteMyAvatar', () => {
    it('should throw NotFound when user does not exist', async () => {
      prisma.appUser.findFirst.mockResolvedValue(null);

      await expect(service.deleteMyAvatar('sub-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete avatar from S3 and clear DB field', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        avatar: 'old.png',
      });
      s3.objectExists.mockResolvedValue(true);
      prisma.appUser.update.mockResolvedValue({});

      const result = await service.deleteMyAvatar('sub-1');

      expect(s3.buildUserAvatarKey).toHaveBeenCalledWith('old.png');
      expect(s3.delete).toHaveBeenCalled();
      expect(prisma.appUser.update).toHaveBeenCalledWith({
        where: { cognitoSub: 'sub-1' },
        data: { avatar: null },
      });
      expect(result.message).toBe(APP_USER_AVATAR_DELETED_SUCCESS_MSG);
    });

    it('should succeed idempotently when user has no avatar', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        avatar: null,
      });
      prisma.appUser.update.mockResolvedValue({});

      const result = await service.deleteMyAvatar('sub-1');

      expect(s3.delete).not.toHaveBeenCalled();
      expect(prisma.appUser.update).toHaveBeenCalledWith({
        where: { cognitoSub: 'sub-1' },
        data: { avatar: null },
      });
      expect(result.message).toBe(APP_USER_AVATAR_DELETED_SUCCESS_MSG);
    });
  });

  describe('updateMyProfile', () => {
    it('should throw BadRequest when body has no defined fields', async () => {
      const dto = {} as UpdateMyProfileDto;

      await expect(service.updateMyProfile('sub-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateMyProfile('sub-1', dto)).rejects.toThrow(
        APP_USER_UPDATE_EMPTY_BODY_MSG,
      );
    });

    it('should throw NotFound when user does not exist', async () => {
      prisma.appUser.findFirst.mockResolvedValue(null);

      await expect(
        service.updateMyProfile('sub-1', { nickname: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update app user and skip key contact when none linked', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ cognitoSub: 'sub-1' });
      prisma.appUser.update.mockResolvedValue({
        cognitoSub: 'sub-1',
        nickname: 'JD',
        workPhone: '+1',
        cellPhone: null,
        timezone: 'America/New_York',
      });
      prisma.appKeyContact.findFirst.mockResolvedValue(null);

      const result = await service.updateMyProfile('sub-1', {
        nickname: 'JD',
        workPhone: '+1',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.appKeyContact.update).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe(APP_USER_SELF_PROFILE_UPDATED_MSG);
      expect(result.data).toMatchObject({
        cognitoSub: 'sub-1',
        nickname: 'JD',
        workPhone: '+1',
        cellPhone: null,
        timezone: 'America/New_York',
      });
    });

    it('should mirror nickname, workPhone, cellPhone, and timezone to app key contact when linked', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ cognitoSub: 'sub-1' });
      prisma.appUser.update.mockResolvedValue({
        cognitoSub: 'sub-1',
        nickname: 'N',
        workPhone: 'w',
        cellPhone: 'c',
        timezone: 'UTC',
      });
      prisma.appKeyContact.findFirst.mockResolvedValue({ id: 'kc-1' });
      prisma.appKeyContact.update.mockResolvedValue({});

      await service.updateMyProfile('sub-1', { cellPhone: 'c' });

      expect(prisma.appKeyContact.update).toHaveBeenCalledWith({
        where: { id: 'kc-1' },
        data: {
          nickname: 'N',
          workPhone: 'w',
          cellPhone: 'c',
          timezone: 'UTC',
        },
      });
    });
  });

  describe('peer mentions', () => {
    it('lists active non-admin peers from requester companies', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        companyAccess: [{ companyId: 'company-1' }],
      });
      prisma.appUser.findMany.mockResolvedValue([
        {
          cognitoSub: 'peer-1',
          firstName: 'Jane',
          lastName: 'Peer',
          nickname: null,
          email: 'jane.peer@example.com',
          jobRole: 'Designer',
          role: { name: 'Employee' },
          companyAccess: [{ companyId: 'company-1', isAdmin: false }],
        },
      ]);

      const result = await service.listPeerMentions('sub-1', { query: 'Ja' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        peers: [
          {
            id: 'peer-1',
            type: 'person',
            displayName: 'Jane Peer',
            email: 'jane.peer@example.com',
            jobRole: 'Designer',
          },
        ],
      });
      /* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are typed loosely */
      expect(prisma.appUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          where: expect.objectContaining({
            cognitoSub: { not: 'sub-1' },
            NOT: expect.arrayContaining([
              expect.objectContaining({
                companyAccess: expect.objectContaining({
                  some: expect.objectContaining({ isAdmin: true }),
                }),
              }),
            ]),
          }),
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    });

    it('resolves peer mentions with compact BSP summaries', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        companyAccess: [{ companyId: 'company-1' }],
      });
      prisma.appUser.findMany.mockResolvedValue([
        {
          cognitoSub: 'peer-1',
          firstName: 'Jane',
          lastName: 'Peer',
          nickname: null,
          jobRole: 'Designer',
          role: { name: 'Employee' },
          companyAccess: [{ companyId: 'company-1', isAdmin: false }],
        },
      ]);
      prisma.assessment.findMany.mockResolvedValue([
        {
          userId: 'peer-1',
          completedAt: new Date('2026-01-01T00:00:00Z'),
          assessmentScore: {
            styles: [
              {
                context: 'overall',
                type: 'basic',
                bspStyle: {
                  title: 'Pioneer',
                  description: 'Moves quickly and values autonomy.',
                  environmentalPreferences: ['space to explore'],
                  interactionPreferences: ['direct updates'],
                  characterStrengths: ['initiative'],
                  psychologicalNeeds: ['autonomy'],
                  workPreferences: ['clear outcomes'],
                  warningSigns: ['impatience'],
                  whenFeelingStressed: 'May push harder for control.',
                },
              },
            ],
          },
        },
      ]);

      const result = await service.resolvePeerMentions('sub-1', {
        peerIds: ['peer-1', 'peer-1', 'hidden-peer'],
      });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        degradedCount: 1,
        peers: [
          {
            id: 'peer-1',
            displayName: 'Jane Peer',
            profileAvailable: true,
            overallStyle: {
              title: 'Pioneer',
              interactionPreferences: ['direct updates'],
            },
          },
        ],
      });
    });

    it('silently returns general-use peer records when assessment data is unavailable', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        companyAccess: [{ companyId: 'company-1' }],
      });
      prisma.appUser.findMany.mockResolvedValue([
        {
          cognitoSub: 'peer-2',
          firstName: 'Alex',
          lastName: 'NoScore',
          nickname: null,
          jobRole: null,
          role: { name: 'Employee' },
          companyAccess: [{ companyId: 'company-1', isAdmin: false }],
        },
      ]);
      prisma.assessment.findMany.mockResolvedValue([]);

      const result = await service.resolvePeerMentions('sub-1', {
        peerIds: ['peer-2'],
      });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        degradedCount: 0,
        peers: [
          {
            id: 'peer-2',
            displayName: 'Alex NoScore',
            profileAvailable: false,
            overallStyle: null,
          },
        ],
      });
    });
  });

  describe('getMyPeerSnapshot', () => {
    it('returns peers with avatar and overall style metadata', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ cognitoSub: 'sub-1' });
      prisma.appUser.findMany.mockResolvedValue([
        {
          cognitoSub: 'peer-1',
          firstName: 'Gustavo',
          lastName: 'Torff',
          nickname: null,
          email: 'gustavo@example.com',
          jobRole: 'Engineer',
          avatar: 'avatar.png',
          role: { name: 'Employee' },
        },
      ]);
      prisma.assessment.findMany.mockResolvedValue([
        {
          userId: 'peer-1',
          completedAt: new Date('2026-01-01T00:00:00Z'),
          assessmentScore: {
            styles: [
              {
                context: 'overall',
                bspStyle: {
                  styleNumber: 6,
                  title: 'Humanitarian',
                  description:
                    'You are a Humanitarian — someone who leads with heart. You also value connection.',
                  environmentalPreferences: [],
                  interactionPreferences: [],
                  characterStrengths: [],
                  psychologicalNeeds: [],
                  workPreferences: [],
                  warningSigns: [],
                  whenFeelingStressed: '',
                },
              },
            ],
          },
        },
      ]);

      const result = await service.getMyPeerSnapshot('sub-1', {});

      expect(result.success).toBe(true);
      /* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are typed loosely */
      expect(prisma.assessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'report_generated',
          }),
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      expect(result.data).toEqual({
        totalCount: 1,
        peers: [
          {
            id: 'peer-1',
            email: 'gustavo@example.com',
            firstName: 'Gustavo',
            lastName: 'Torff',
            avatar: 'https://cdn.example.com/app-user-avatars/avatar.png',
            styleNumber: 6,
            styleTitle: 'Humanitarian',
            styleDescription:
              'You are a Humanitarian — someone who leads with heart.',
          },
        ],
      });
    });

    it('excludes peers without a report_generated assessment', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ cognitoSub: 'sub-1' });
      prisma.appUser.findMany.mockResolvedValue([
        {
          cognitoSub: 'peer-2',
          firstName: 'Emily',
          lastName: 'Clark',
          nickname: null,
          email: 'emily@example.com',
          jobRole: null,
          avatar: null,
          role: { name: 'Employee' },
        },
      ]);
      prisma.assessment.findMany.mockResolvedValue([]);

      const result = await service.getMyPeerSnapshot('sub-1', {});

      expect(result.data).toEqual({
        totalCount: 0,
        peers: [],
      });
    });

    it('uses only the latest report_generated assessment per peer', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ cognitoSub: 'sub-1' });
      prisma.appUser.findMany.mockResolvedValue([
        {
          cognitoSub: 'peer-1',
          firstName: 'Gustavo',
          lastName: 'Torff',
          nickname: null,
          email: 'gustavo@example.com',
          jobRole: 'Engineer',
          avatar: null,
          role: { name: 'Employee' },
        },
      ]);
      prisma.assessment.findMany.mockResolvedValue([
        {
          userId: 'peer-1',
          completedAt: new Date('2026-02-01T00:00:00Z'),
          assessmentScore: {
            styles: [
              {
                context: 'overall',
                bspStyle: {
                  styleNumber: 8,
                  title: 'Collaborator',
                  description: 'You are a Collaborator.',
                },
              },
            ],
          },
        },
        {
          userId: 'peer-1',
          completedAt: new Date('2026-01-01T00:00:00Z'),
          assessmentScore: {
            styles: [
              {
                context: 'overall',
                bspStyle: {
                  styleNumber: 6,
                  title: 'Humanitarian',
                  description: 'You are a Humanitarian.',
                },
              },
            ],
          },
        },
      ]);

      const result = await service.getMyPeerSnapshot('sub-1', {});

      expect(result.data).toEqual({
        totalCount: 1,
        peers: [
          expect.objectContaining({
            id: 'peer-1',
            styleNumber: 8,
            styleTitle: 'Collaborator',
            styleDescription: 'You are a Collaborator.',
          }),
        ],
      });
    });
  });

  describe('getMyChatbotPersonalizationContext', () => {
    it('returns compact BSP summary and role metadata for the current user', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        firstName: 'Jamie',
        lastName: 'Lee',
        nickname: null,
        jobRole: 'Product Manager',
        userType: 'employee',
        role: { name: 'Individual Contributor' },
      });
      prisma.assessment.findMany.mockResolvedValue([
        {
          userId: 'sub-1',
          completedAt: new Date('2026-01-01T00:00:00Z'),
          assessmentScore: {
            styles: [
              {
                context: 'overall',
                type: 'basic',
                bspStyle: {
                  title: 'Pioneer',
                  description: 'Moves quickly and values autonomy.',
                  environmentalPreferences: ['space to explore'],
                  interactionPreferences: ['direct updates'],
                  characterStrengths: ['initiative'],
                  psychologicalNeeds: ['autonomy'],
                  workPreferences: ['clear outcomes'],
                  warningSigns: ['impatience'],
                  whenFeelingStressed: 'May push harder for control.',
                },
              },
            ],
          },
        },
      ]);

      const result = await service.getMyChatbotPersonalizationContext('sub-1');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: 'sub-1',
        displayName: 'Jamie Lee',
        jobRole: 'Product Manager',
        roleName: 'Individual Contributor',
        userType: 'employee',
        profileAvailable: true,
        overallStyle: {
          title: 'Pioneer',
        },
      });
    });

    it('returns role metadata with profileAvailable false when assessment is missing', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        firstName: 'Jamie',
        lastName: 'Lee',
        nickname: null,
        jobRole: null,
        userType: 'employee',
        role: { name: 'Employee' },
      });
      prisma.assessment.findMany.mockResolvedValue([]);

      const result = await service.getMyChatbotPersonalizationContext('sub-1');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: 'sub-1',
        profileAvailable: false,
        overallStyle: null,
        roleName: 'Employee',
        userType: 'employee',
      });
    });
  });

  describe('updateForRequester', () => {
    it('should forbid callers who are not admin roles', async () => {
      await expect(
        service.updateForRequester(
          'sub-target',
          { firstName: 'Updated' },
          'sub-1',
          ['User'],
        ),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_USER_UPDATE_FORBIDDEN_MSG,
      });
    });
  });

  describe('update', () => {
    it('should throw BadRequest when body has no defined fields', async () => {
      const dto = {} as UpdateAppUserDto;

      await expect(service.update('sub-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('sub-1', dto)).rejects.toThrow(
        APP_USER_UPDATE_EMPTY_BODY_MSG,
      );
    });

    it('should reject when target user_type is super_admin', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-sa',
        status: APP_USER_STATUS.ACTIVE,
        email: 'admin@example.com',
        roleId: null,
        userType: SUPER_ADMIN_APP_USER_TYPE,
        inviteType: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
        role: null,
        corporation: { status: CORPORATION_STATUS.ACTIVE },
        companyAccess: [],
      });

      await expect(
        service.update('sub-sa', { firstName: 'Updated' }),
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: APP_USER_UPDATE_SUPER_ADMIN_NOT_ALLOWED_MSG,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should reject setting status to Active when corporation is suspended', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        status: APP_USER_STATUS.BLOCKED,
        email: 'user@example.com',
        roleId: null,
        inviteType: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
        role: null,
        corporation: { status: CORPORATION_STATUS.SUSPENDED },
        companyAccess: [{ company: { status: COMPANY_STATUS.ACTIVE } }],
      });

      await expect(
        service.update('sub-1', { status: APP_USER_STATUS.ACTIVE }),
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: APP_USER_UPDATE_ACTIVE_ORG_SUSPENDED_MSG,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should reject setting status to Active when a linked company is suspended', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        status: APP_USER_STATUS.BLOCKED,
        email: 'user@example.com',
        roleId: null,
        inviteType: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
        role: null,
        corporation: { status: CORPORATION_STATUS.ACTIVE },
        companyAccess: [{ company: { status: COMPANY_STATUS.SUSPENDED } }],
      });

      await expect(
        service.update('sub-1', { status: APP_USER_STATUS.ACTIVE }),
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: APP_USER_UPDATE_ACTIVE_ORG_SUSPENDED_MSG,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should allow Assessment Only users to be set Active regardless of org suspension', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        status: APP_USER_STATUS.BLOCKED,
        email: 'user@example.com',
        roleId: null,
        inviteType: APP_USER_INVITE_TYPE.ASSESSMENT_ONLY,
        role: null,
        corporation: { status: CORPORATION_STATUS.SUSPENDED },
        companyAccess: [{ company: { status: COMPANY_STATUS.SUSPENDED } }],
      });
      prisma.appUser.update.mockResolvedValue({
        cognitoSub: 'sub-1',
        userCode: 1,
        roleId: null,
        status: APP_USER_STATUS.ACTIVE,
        firstName: null,
        lastName: null,
        nickname: null,
        email: 'user@example.com',
        workPhone: null,
        cellPhone: null,
        timezone: null,
        createdAt: new Date(),
        corporation: null,
        role: null,
        companyAccess: [],
      });
      prisma.appKeyContact.findFirst.mockResolvedValue(null);

      const result = await service.update('sub-1', {
        status: APP_USER_STATUS.ACTIVE,
      });

      expect(result.success).toBe(true);
      expect(setCognitoUserEnabled as jest.Mock).toHaveBeenCalled();
    });
  });

  describe('softDeleteForRequester', () => {
    it('should forbid callers who are not admin roles', async () => {
      await expect(
        service.softDeleteForRequester('sub-target', 'sub-1', ['User']),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_USER_SOFT_DELETE_FORBIDDEN_MSG,
      });
    });
  });

  describe('softDelete', () => {
    it('should reject when target user_type is super_admin', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-sa',
        email: 'admin@example.com',
        userType: SUPER_ADMIN_APP_USER_TYPE,
        role: null,
        groupMemberships: [],
      });

      await expect(service.softDelete('sub-sa')).rejects.toMatchObject({
        constructor: BadRequestException,
        message: APP_USER_SOFT_DELETE_SUPER_ADMIN_NOT_ALLOWED_MSG,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should reject Corporation Admin users', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-corp-admin',
        email: 'corp@example.com',
        role: { name: 'Corporation Admin' },
        groupMemberships: [],
      });

      await expect(service.softDelete('sub-corp-admin')).rejects.toMatchObject({
        constructor: BadRequestException,
        message: APP_USER_SOFT_DELETE_CORP_COMPANY_ADMIN_NOT_ALLOWED_MSG,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should reject Company Admin users', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-co-admin',
        email: 'co@example.com',
        role: { name: 'Company Admin' },
        groupMemberships: [],
      });

      await expect(service.softDelete('sub-co-admin')).rejects.toMatchObject({
        constructor: BadRequestException,
        message: APP_USER_SOFT_DELETE_CORP_COMPANY_ADMIN_NOT_ALLOWED_MSG,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('setBlockedStatusForRequester', () => {
    it('should forbid callers who are not admin roles', async () => {
      await expect(
        service.setBlockedStatusForRequester(
          'sub-target',
          { blocked: true },
          'sub-1',
          ['User'],
        ),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_USER_BLOCK_FORBIDDEN_MSG,
      });
    });

    it('should delegate to setBlockedStatus for SuperAdmin', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-target',
        email: 'user@example.com',
        inviteType: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
        corporation: { status: CORPORATION_STATUS.ACTIVE },
        companyAccess: [{ company: { status: COMPANY_STATUS.ACTIVE } }],
      });
      prisma.appUser.update.mockResolvedValue({
        cognitoSub: 'sub-target',
        status: APP_USER_STATUS.BLOCKED,
      });

      await service.setBlockedStatusForRequester(
        'sub-target',
        { blocked: true },
        'sub-sa',
        [COGNITO_GROUP_NAMES.SUPER_ADMIN],
      );

      expect(prisma.appUser.update).toHaveBeenCalled();
    });

    it('should forbid CorporationAdmin when BSPBlueprint target is outside their corporation', async () => {
      prisma.appUser.findFirst
        .mockResolvedValueOnce({
          corporationId: 'corp-other',
          inviteType: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
        })
        .mockResolvedValueOnce({ corporationId: 'corp-1' });

      await expect(
        service.setBlockedStatusForRequester(
          'sub-target',
          { blocked: true },
          'sub-corp',
          [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
        ),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_USERS_LIST_CORP_ADMIN_WRONG_CORP_MSG,
      });
    });

    it('should allow CorporationAdmin to block Assessment Only targets without corporation scope', async () => {
      prisma.appUser.findFirst
        .mockResolvedValueOnce({
          corporationId: null,
          inviteType: APP_USER_INVITE_TYPE.ASSESSMENT_ONLY,
        })
        .mockResolvedValueOnce({
          cognitoSub: 'sub-target',
          email: 'user@example.com',
          inviteType: APP_USER_INVITE_TYPE.ASSESSMENT_ONLY,
          corporation: null,
          companyAccess: [],
        });
      prisma.appUser.update.mockResolvedValue({
        cognitoSub: 'sub-target',
        status: APP_USER_STATUS.BLOCKED,
      });

      await service.setBlockedStatusForRequester(
        'sub-target',
        { blocked: true },
        'sub-corp',
        [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
      );

      expect(prisma.appUser.update).toHaveBeenCalled();
    });

    it('should forbid CompanyAdmin when BSPBlueprint target has no access on admin companies', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([
        { companyId: 'co-1' },
      ]);
      prisma.appUser.findFirst
        .mockResolvedValueOnce({
          cognitoSub: 'sub-target',
          inviteType: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
        })
        .mockResolvedValueOnce(null);

      await expect(
        service.setBlockedStatusForRequester(
          'sub-target',
          { blocked: true },
          'sub-co',
          [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
        ),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_USERS_LIST_COMPANY_ADMIN_WRONG_COMPANY_MSG,
      });
    });

    it('should allow CompanyAdmin to block Assessment Only targets without company scope', async () => {
      prisma.appUser.findFirst
        .mockResolvedValueOnce({
          cognitoSub: 'sub-target',
          inviteType: APP_USER_INVITE_TYPE.ASSESSMENT_ONLY,
        })
        .mockResolvedValueOnce({
          cognitoSub: 'sub-target',
          email: 'user@example.com',
          inviteType: APP_USER_INVITE_TYPE.ASSESSMENT_ONLY,
          corporation: null,
          companyAccess: [],
        });
      prisma.appUser.update.mockResolvedValue({
        cognitoSub: 'sub-target',
        status: APP_USER_STATUS.BLOCKED,
      });

      await service.setBlockedStatusForRequester(
        'sub-target',
        { blocked: true },
        'sub-co',
        [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
      );

      expect(prisma.appUser.update).toHaveBeenCalled();
    });
  });

  describe('setBlockedStatus', () => {
    it('should update status and call Cognito when user exists', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        email: 'user@example.com',
        inviteType: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
        corporation: { status: CORPORATION_STATUS.ACTIVE },
        companyAccess: [{ company: { status: COMPANY_STATUS.ACTIVE } }],
      });
      prisma.appUser.update.mockResolvedValue({
        cognitoSub: 'sub-1',
        status: APP_USER_STATUS.BLOCKED,
      });

      const result = await service.setBlockedStatus('sub-1', { blocked: true });

      expect(setCognitoUserEnabled as jest.Mock).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(prisma.appUser.update).toHaveBeenCalledWith({
        where: { cognitoSub: 'sub-1' },
        data: {
          status: APP_USER_STATUS.BLOCKED,
          blockedCancelledOn: expect.any(Date) as Date,
        },
        select: { cognitoSub: true, status: true },
      });
    });

    it('should reject when target user_type is super_admin', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-sa',
        email: 'admin@example.com',
        userType: SUPER_ADMIN_APP_USER_TYPE,
        inviteType: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
        corporation: { status: CORPORATION_STATUS.ACTIVE },
        companyAccess: [],
      });

      await expect(
        service.setBlockedStatus('sub-sa', { blocked: true }),
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: APP_USER_BLOCK_SUPER_ADMIN_NOT_ALLOWED_MSG,
      });
      expect(prisma.appUser.update).not.toHaveBeenCalled();
      expect(setCognitoUserEnabled as jest.Mock).not.toHaveBeenCalled();
    });

    it('should reject when target corporation is suspended', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        email: 'user@example.com',
        inviteType: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
        corporation: { status: CORPORATION_STATUS.SUSPENDED },
        companyAccess: [{ company: { status: COMPANY_STATUS.ACTIVE } }],
      });

      await expect(
        service.setBlockedStatus('sub-1', { blocked: false }),
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: APP_USER_BLOCK_ORG_SUSPENDED_MSG,
      });
      expect(prisma.appUser.update).not.toHaveBeenCalled();
    });

    it('should reject when a linked company is suspended', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        email: 'user@example.com',
        inviteType: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
        corporation: { status: CORPORATION_STATUS.ACTIVE },
        companyAccess: [{ company: { status: COMPANY_STATUS.SUSPENDED } }],
      });

      await expect(
        service.setBlockedStatus('sub-1', { blocked: true }),
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: APP_USER_BLOCK_ORG_SUSPENDED_MSG,
      });
      expect(prisma.appUser.update).not.toHaveBeenCalled();
    });

    it('should reject when target corporation is closed', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        email: 'user@example.com',
        inviteType: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
        corporation: { status: CORPORATION_STATUS.CLOSED },
        companyAccess: [{ company: { status: COMPANY_STATUS.ACTIVE } }],
      });

      await expect(
        service.setBlockedStatus('sub-1', { blocked: false }),
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: APP_USER_BLOCK_ORG_SUSPENDED_MSG,
      });
      expect(prisma.appUser.update).not.toHaveBeenCalled();
    });

    it('should reject when a linked company is closed', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        email: 'user@example.com',
        inviteType: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
        corporation: { status: CORPORATION_STATUS.ACTIVE },
        companyAccess: [{ company: { status: COMPANY_STATUS.CLOSED } }],
      });

      await expect(
        service.setBlockedStatus('sub-1', { blocked: true }),
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: APP_USER_BLOCK_ORG_SUSPENDED_MSG,
      });
      expect(prisma.appUser.update).not.toHaveBeenCalled();
    });

    it('should allow Assessment Only users regardless of org suspension', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        email: 'user@example.com',
        inviteType: APP_USER_INVITE_TYPE.ASSESSMENT_ONLY,
        corporation: { status: CORPORATION_STATUS.SUSPENDED },
        companyAccess: [{ company: { status: COMPANY_STATUS.SUSPENDED } }],
      });
      prisma.appUser.update.mockResolvedValue({
        cognitoSub: 'sub-1',
        status: APP_USER_STATUS.ACTIVE,
      });

      const result = await service.setBlockedStatus('sub-1', {
        blocked: false,
      });

      expect(result.success).toBe(true);
      expect(prisma.appUser.update).toHaveBeenCalled();
    });
  });

  describe('updateMyOnboardingStep', () => {
    it('should throw NotFound when user does not exist', async () => {
      prisma.appUser.findFirst.mockResolvedValue(null);

      await expect(
        service.updateMyOnboardingStep('sub-1', { type: 'consent' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateMyOnboardingStep('sub-1', { type: 'consent' }),
      ).rejects.toThrow(APP_USER_NOT_FOUND_MSG);
    });

    it('should set completedOnboardingSteps=1 when type=consent', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        email: 'user@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });
      prisma.appUser.update.mockResolvedValue({
        cognitoSub: 'sub-1',
      });

      const result = await service.updateMyOnboardingStep('sub-1', {
        type: 'consent',
      });

      expect(prisma.appUser.update).toHaveBeenCalledWith({
        where: { cognitoSub: 'sub-1' },
        data: { completedOnboardingSteps: 1 },
        select: { cognitoSub: true },
      });
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: APP_USER_ONBOARDING_CONSENT_EMAIL_SUBJECT,
        }),
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe(APP_USER_ONBOARDING_STEP_UPDATED_MSG);
    });

    it('should set completedOnboardingSteps=2 when type=intro_video', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        email: 'user@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });
      prisma.appUser.update.mockResolvedValue({
        cognitoSub: 'sub-1',
      });

      const result = await service.updateMyOnboardingStep('sub-1', {
        type: 'intro_video',
      });

      expect(prisma.appUser.update).toHaveBeenCalledWith({
        where: { cognitoSub: 'sub-1' },
        data: { completedOnboardingSteps: 2 },
        select: { cognitoSub: true },
      });
      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        cognitoSub: 'sub-1',
        completedOnboardingSteps: 2,
      });
    });
  });

  describe('cancelInvitationForRequester', () => {
    it('should forbid callers who are not admin roles', async () => {
      await expect(
        service.cancelInvitationForRequester('sub-target', 'sub-1', ['User']),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_USER_INVITATION_CANCEL_FORBIDDEN_MSG,
      });
    });

    it('should delegate to cancelInvitation for SuperAdmin', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-target',
        status: APP_USER_STATUS.CANCELLED,
        email: 'user@example.com',
      });

      await service.cancelInvitationForRequester('sub-target', 'sub-sa', [
        COGNITO_GROUP_NAMES.SUPER_ADMIN,
      ]);

      expect(prisma.appUser.update).not.toHaveBeenCalled();
    });
  });

  describe('resendInvitationForRequester', () => {
    it('should forbid callers who are not admin roles', async () => {
      await expect(
        service.resendInvitationForRequester('sub-target', 'sub-1', ['User']),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_USER_INVITATION_RESEND_FORBIDDEN_MSG,
      });
    });
  });

  describe('inviteAppUserForRequester', () => {
    const assessmentOnlyDto = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      workPhone: '+1 555-0100',
      timezone: 'America/New_York',
      inviteType: APP_USER_INVITE_TYPE.ASSESSMENT_ONLY,
    };

    it('should forbid callers who are not SuperAdmin, CorporationAdmin, or CompanyAdmin', async () => {
      await expect(
        service.inviteAppUserForRequester(assessmentOnlyDto, 'sub-1', ['User']),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_USER_INVITE_FORBIDDEN_MSG,
      });
    });

    it('should forbid CorporationAdmin when BSPBlueprint corporationId is outside their corporation', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ corporationId: 'corp-1' });

      await expect(
        service.inviteAppUserForRequester(
          {
            ...assessmentOnlyDto,
            inviteType: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
            corporationId: 'corp-other',
            companyId: 'company-1',
            roleId: '8f7e6d5c-4b3a-2918-7f6e-5d4c3b2a1908',
          },
          'sub-corp-admin',
          [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
        ),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_USER_INVITE_CORP_ADMIN_WRONG_CORP_MSG,
      });
    });

    it('should forbid CompanyAdmin when BSPBlueprint companyId is outside their admin companies', async () => {
      prisma.userCompanyAccess.findMany.mockResolvedValue([
        { companyId: 'company-1' },
      ]);

      await expect(
        service.inviteAppUserForRequester(
          {
            ...assessmentOnlyDto,
            inviteType: APP_USER_INVITE_TYPE.BSP_BLUEPRINT,
            corporationId: 'corp-1',
            companyId: 'company-other',
            roleId: '8f7e6d5c-4b3a-2918-7f6e-5d4c3b2a1908',
          },
          'sub-comp-admin',
          [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
        ),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_USER_INVITE_COMPANY_ADMIN_WRONG_COMPANY_MSG,
      });
    });
  });

  describe('enqueueBulkInviteCsvJob', () => {
    it('should forbid callers who are not SuperAdmin, CorporationAdmin, or CompanyAdmin', async () => {
      const file = {
        buffer: Buffer.from('firstName,lastName\n'),
        size: 20,
      } as Express.Multer.File;

      await expect(
        service.enqueueBulkInviteCsvJob(file, 'sub-1', 'a@b.com', ['User']),
      ).rejects.toMatchObject({
        constructor: ForbiddenException,
        message: APP_USER_BULK_INVITE_JOB_FORBIDDEN_MSG,
      });
    });
  });

  describe('cancelInvitation', () => {
    it('should return success without Cognito when already cancelled', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        status: APP_USER_STATUS.CANCELLED,
        email: 'a@b.com',
      });

      const result = await service.cancelInvitation('sub-1');

      expect(result.success).toBe(true);
      expect(setCognitoUserEnabled as jest.Mock).not.toHaveBeenCalled();
      expect(prisma.appUser.update).not.toHaveBeenCalled();
    });

    it('should cancel pending invitation and set blockedCancelledOn', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'sub-1',
        status: APP_USER_STATUS.PENDING,
        email: 'user@example.com',
      });
      prisma.appUser.update.mockResolvedValue({
        cognitoSub: 'sub-1',
        status: APP_USER_STATUS.CANCELLED,
      });

      const result = await service.cancelInvitation('sub-1');

      expect(setCognitoUserEnabled as jest.Mock).toHaveBeenCalled();
      expect(prisma.appUser.update).toHaveBeenCalledWith({
        where: { cognitoSub: 'sub-1' },
        data: {
          status: APP_USER_STATUS.CANCELLED,
          blockedCancelledOn: expect.any(Date) as Date,
        },
        select: { cognitoSub: true, status: true },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        cognitoSub: 'sub-1',
        status: APP_USER_STATUS.CANCELLED,
      });
    });
  });
});
