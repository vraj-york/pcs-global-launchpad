/* eslint-disable @typescript-eslint/unbound-method */
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppUserController } from './app-user.controller';
import { AppUserService } from './app-user.service';
import { GrowthSparkService } from './growth-spark.service';
import {
  InviteAppUserDto,
  ListAppUsersQueryDto,
  SetAppUserBlockDto,
  UpdateAppUserDto,
  UpdateMyProfileDto,
} from './dto';
import {
  APP_USER_AVATAR_FILE_REQUIRED_MSG,
  APP_USER_AVATAR_SINGLE_FILE_ONLY_MSG,
  APP_USER_INVITE_TYPE,
} from './constants/app-user.constants';
import { USER_DASHBOARD_SUCCESS_MSG } from './constants/user-dashboard.constants';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  MonthlyPlanGuard,
  SubscriptionGuard,
} from '../auth';
import { COGNITO_GROUP_NAMES } from './cognito-groups.constants';

describe('AppUserController', () => {
  let controller: AppUserController;
  let appUserService: jest.Mocked<AppUserService>;
  let growthSparkService: jest.Mocked<GrowthSparkService>;

  const mockApiResponse = {
    success: true,
    message: 'ok',
    data: {},
  };

  beforeEach(async () => {
    const mockService = {
      inviteAppUserForRequester: jest.fn(),
      enqueueBulkInviteCsvJob: jest.fn(),
      getBulkInviteJobForRequester: jest.fn(),
      setBlockedStatus: jest.fn(),
      setBlockedStatusForRequester: jest.fn(),
      cancelInvitation: jest.fn(),
      cancelInvitationForRequester: jest.fn(),
      resendInvitation: jest.fn(),
      resendInvitationForRequester: jest.fn(),
      updateForRequester: jest.fn(),
      softDelete: jest.fn(),
      softDeleteForRequester: jest.fn(),
      findAllPaginated: jest.fn(),
      findAllPaginatedForRequester: jest.fn(),
      listPeerMentions: jest.fn(),
      resolvePeerMentions: jest.fn(),
      getMyPeerSnapshot: jest.fn(),
      getMyChatbotPersonalizationContext: jest.fn(),
      getMyProfile: jest.fn(),
      updateMyProfile: jest.fn(),
      uploadMyAvatar: jest.fn(),
      deleteMyAvatar: jest.fn(),
      updateMyOnboardingStep: jest.fn(),
      findByCognitoSub: jest.fn(),
      findByCognitoSubForRequester: jest.fn(),
    };
    const mockGrowthSparkService = {
      getMyGrowthSpark: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppUserController],
      providers: [
        {
          provide: AppUserService,
          useValue: mockService,
        },
        {
          provide: GrowthSparkService,
          useValue: mockGrowthSparkService,
        },
      ],
    })
      .overrideGuard(CognitoAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(MonthlyPlanGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AppUserController>(AppUserController);
    appUserService = module.get(AppUserService);
    growthSparkService = module.get(GrowthSparkService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('invite', () => {
    it('should call inviteAppUserForRequester and return result', async () => {
      const dto: InviteAppUserDto = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        workPhone: '+1 555-0100',
        timezone: 'America/New_York',
        inviteType: APP_USER_INVITE_TYPE.ASSESSMENT_ONLY,
      };
      appUserService.inviteAppUserForRequester.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppUserService['inviteAppUserForRequester']>
        >,
      );

      const result = await controller.invite(dto, {
        sub: 'user-1',
        groups: [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
      });

      expect(appUserService.inviteAppUserForRequester).toHaveBeenCalledWith(
        dto,
        'user-1',
        [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
      );
      expect(result).toMatchObject(mockApiResponse);
    });

    it('should rethrow error from service', async () => {
      appUserService.inviteAppUserForRequester.mockRejectedValue(
        new Error('Invite failed'),
      );

      const dto: InviteAppUserDto = {
        firstName: 'J',
        lastName: 'D',
        email: 'x@y.com',
        workPhone: '1',
        timezone: 'UTC',
        inviteType: APP_USER_INVITE_TYPE.ASSESSMENT_ONLY,
      };

      await expect(
        controller.invite(dto, {
          sub: 'user-1',
          groups: [COGNITO_GROUP_NAMES.SUPER_ADMIN],
        }),
      ).rejects.toThrow('Invite failed');
    });
  });

  describe('bulkInviteFromCsv', () => {
    it('should call enqueueBulkInviteCsvJob and return result', async () => {
      const file = {
        buffer: Buffer.from('x'),
        size: 1,
      } as Express.Multer.File;
      const user = {
        sub: 'admin-sub',
        email: 'admin@example.com',
        groups: ['SuperAdmin'],
      };
      appUserService.enqueueBulkInviteCsvJob.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppUserService['enqueueBulkInviteCsvJob']>
        >,
      );

      const result = await controller.bulkInviteFromCsv(file, user);

      expect(appUserService.enqueueBulkInviteCsvJob).toHaveBeenCalledWith(
        file,
        user.sub,
        user.email,
        user.groups,
      );
      expect(result).toMatchObject(mockApiResponse);
    });

    it('should rethrow error from CSV bulk enqueue', async () => {
      const file = {
        buffer: Buffer.from('x'),
        size: 1,
      } as Express.Multer.File;
      appUserService.enqueueBulkInviteCsvJob.mockRejectedValue(
        new Error('CSV bulk failed'),
      );

      await expect(
        controller.bulkInviteFromCsv(file, {
          sub: 's',
          groups: ['SuperAdmin'],
        }),
      ).rejects.toThrow('CSV bulk failed');
    });
  });

  describe('getBulkInviteJob', () => {
    it('should call getBulkInviteJobForRequester', async () => {
      appUserService.getBulkInviteJobForRequester.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppUserService['getBulkInviteJobForRequester']>
        >,
      );

      const result = await controller.getBulkInviteJob(
        '550e8400-e29b-41d4-a716-446655440000',
        { sub: 'admin-sub', groups: ['SuperAdmin'] },
      );

      expect(appUserService.getBulkInviteJobForRequester).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        ['SuperAdmin'],
      );
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('setBlockStatus', () => {
    const blockUser = { sub: 'cognito-sub-1', groups: ['SuperAdmin'] };

    it('should call setBlockedStatusForRequester with cognito sub, body, and user', async () => {
      const body: SetAppUserBlockDto = { blocked: true };
      appUserService.setBlockedStatusForRequester.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppUserService['setBlockedStatusForRequester']>
        >,
      );

      const result = await controller.setBlockStatus(
        'sub-123',
        body,
        blockUser,
      );

      expect(appUserService.setBlockedStatusForRequester).toHaveBeenCalledWith(
        'sub-123',
        body,
        blockUser.sub,
        blockUser.groups,
      );
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('cancelInvitation', () => {
    const cancelUser = { sub: 'cognito-sub-1', groups: ['SuperAdmin'] };

    it('should call cancelInvitationForRequester with cognito sub and user', async () => {
      appUserService.cancelInvitationForRequester.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppUserService['cancelInvitationForRequester']>
        >,
      );

      const result = await controller.cancelInvitation('sub-1', cancelUser);

      expect(appUserService.cancelInvitationForRequester).toHaveBeenCalledWith(
        'sub-1',
        cancelUser.sub,
        cancelUser.groups,
      );
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('resendInvitation', () => {
    const resendUser = { sub: 'cognito-sub-1', groups: ['SuperAdmin'] };

    it('should call resendInvitationForRequester with cognito sub and user', async () => {
      appUserService.resendInvitationForRequester.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppUserService['resendInvitationForRequester']>
        >,
      );

      const result = await controller.resendInvitation('sub-1', resendUser);

      expect(appUserService.resendInvitationForRequester).toHaveBeenCalledWith(
        'sub-1',
        resendUser.sub,
        resendUser.groups,
      );
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('update', () => {
    it('should call updateForRequester with cognito sub, DTO, and user', async () => {
      const dto: UpdateAppUserDto = { firstName: 'Updated' };
      const user = {
        sub: 'requester-sub',
        groups: [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
      };
      appUserService.updateForRequester.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppUserService['updateForRequester']>
        >,
      );

      const result = await controller.update('sub-1', dto, user);

      expect(appUserService.updateForRequester).toHaveBeenCalledWith(
        'sub-1',
        dto,
        user.sub,
        user.groups,
      );
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('softDelete', () => {
    const deleteUser = { sub: 'cognito-sub-1', groups: ['SuperAdmin'] };

    it('should call softDeleteForRequester with cognito sub and user', async () => {
      appUserService.softDeleteForRequester.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppUserService['softDeleteForRequester']>
        >,
      );

      const result = await controller.softDelete('sub-1', deleteUser);

      expect(appUserService.softDeleteForRequester).toHaveBeenCalledWith(
        'sub-1',
        deleteUser.sub,
        deleteUser.groups,
      );
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('list', () => {
    const listUser = { sub: 'cognito-sub-1', groups: ['SuperAdmin'] };

    it('should call findAllPaginatedForRequester with query and user', async () => {
      const query: ListAppUsersQueryDto = { page: 1, limit: 10 };
      appUserService.findAllPaginatedForRequester.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppUserService['findAllPaginatedForRequester']>
        >,
      );

      const result = await controller.list(query, listUser);

      expect(appUserService.findAllPaginatedForRequester).toHaveBeenCalledWith(
        query,
        listUser.sub,
        listUser.groups,
      );
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('getDashboard', () => {
    it('returns success with message and no data', () => {
      const r = controller.getDashboard();
      expect(r).toEqual({
        success: true,
        message: USER_DASHBOARD_SUCCESS_MSG,
      });
      expect('data' in r).toBe(false);
    });
  });

  describe('updateMyOnboardingStep', () => {
    it('should call updateMyOnboardingStep with current user sub and body', async () => {
      const body = { type: 'consent' } as const;
      appUserService.updateMyOnboardingStep.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppUserService['updateMyOnboardingStep']>
        >,
      );

      const result = await controller.updateMyOnboardingStep(
        { sub: 'sub-1' },
        body,
      );

      expect(appUserService.updateMyOnboardingStep).toHaveBeenCalledWith(
        'sub-1',
        body,
      );
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('getMyProfile', () => {
    it('should call getMyProfile with current user sub', async () => {
      appUserService.getMyProfile.mockResolvedValue(
        mockApiResponse as Awaited<ReturnType<AppUserService['getMyProfile']>>,
      );

      const result = await controller.getMyProfile({ sub: 'sub-1' });

      expect(appUserService.getMyProfile).toHaveBeenCalledWith('sub-1', []);
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('uploadMyAvatar', () => {
    const mockMulterFile = {
      fieldname: 'avatar',
      originalname: 'avatar.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from('png'),
      size: 4,
    } as Express.Multer.File;

    it('should call uploadMyAvatar with current user sub and file', async () => {
      appUserService.uploadMyAvatar.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppUserService['uploadMyAvatar']>
        >,
      );

      const result = await controller.uploadMyAvatar({ sub: 'sub-1' }, [
        mockMulterFile,
      ]);

      expect(appUserService.uploadMyAvatar).toHaveBeenCalledWith(
        'sub-1',
        mockMulterFile,
      );
      expect(result).toMatchObject(mockApiResponse);
    });

    it('should reject when no file is uploaded', async () => {
      await expect(
        controller.uploadMyAvatar({ sub: 'sub-1' }, []),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.uploadMyAvatar({ sub: 'sub-1' }, []),
      ).rejects.toThrow(APP_USER_AVATAR_FILE_REQUIRED_MSG);
      expect(appUserService.uploadMyAvatar).not.toHaveBeenCalled();
    });

    it('should reject when more than one file is uploaded', async () => {
      await expect(
        controller.uploadMyAvatar({ sub: 'sub-1' }, [
          mockMulterFile,
          mockMulterFile,
        ]),
      ).rejects.toThrow(APP_USER_AVATAR_SINGLE_FILE_ONLY_MSG);
      expect(appUserService.uploadMyAvatar).not.toHaveBeenCalled();
    });
  });

  describe('deleteMyAvatar', () => {
    it('should call deleteMyAvatar with current user sub', async () => {
      appUserService.deleteMyAvatar.mockResolvedValue(
        mockApiResponse as unknown as Awaited<
          ReturnType<AppUserService['deleteMyAvatar']>
        >,
      );

      const result = await controller.deleteMyAvatar({ sub: 'sub-1' });

      expect(appUserService.deleteMyAvatar).toHaveBeenCalledWith('sub-1');
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('updateMyProfile', () => {
    it('should call updateMyProfile with current user sub and body', async () => {
      const body: UpdateMyProfileDto = { nickname: 'JD' };
      appUserService.updateMyProfile.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppUserService['updateMyProfile']>
        >,
      );

      const result = await controller.updateMyProfile({ sub: 'sub-1' }, body);

      expect(appUserService.updateMyProfile).toHaveBeenCalledWith(
        'sub-1',
        body,
      );
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('peer mentions', () => {
    it('should list peer mention suggestions for current user', async () => {
      appUserService.listPeerMentions.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppUserService['listPeerMentions']>
        >,
      );

      const query = { query: 'Jane' };
      const result = await controller.listPeerMentions({ sub: 'sub-1' }, query);

      expect(appUserService.listPeerMentions).toHaveBeenCalledWith(
        'sub-1',
        query,
      );
      expect(result).toMatchObject(mockApiResponse);
    });

    it('should resolve selected peer mention ids for current user', async () => {
      appUserService.resolvePeerMentions.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppUserService['resolvePeerMentions']>
        >,
      );

      const body = { peerIds: ['peer-1'] };
      const result = await controller.resolvePeerMentions(
        { sub: 'sub-1' },
        body,
      );

      expect(appUserService.resolvePeerMentions).toHaveBeenCalledWith(
        'sub-1',
        body,
      );
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('peer snapshot', () => {
    it('should return peer snapshot for current user', async () => {
      appUserService.getMyPeerSnapshot.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppUserService['getMyPeerSnapshot']>
        >,
      );

      const query = { query: 'Gustavo' };
      const result = await controller.getMyPeerSnapshot(
        { sub: 'sub-1' },
        query,
      );

      expect(appUserService.getMyPeerSnapshot).toHaveBeenCalledWith(
        'sub-1',
        query,
      );
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('chatbot personalization context', () => {
    it('should return personalization context for the current user', async () => {
      appUserService.getMyChatbotPersonalizationContext.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<AppUserService['getMyChatbotPersonalizationContext']>
        >,
      );

      const result = await controller.getMyChatbotPersonalizationContext({
        sub: 'sub-1',
      });

      expect(
        appUserService.getMyChatbotPersonalizationContext,
      ).toHaveBeenCalledWith('sub-1');
      expect(result).toMatchObject(mockApiResponse);
    });
  });

  describe('getMyGrowthSpark', () => {
    it('should forward bearer token and return Growth Spark payload', async () => {
      growthSparkService.getMyGrowthSpark.mockResolvedValue(
        mockApiResponse as Awaited<
          ReturnType<GrowthSparkService['getMyGrowthSpark']>
        >,
      );

      const result = await controller.getMyGrowthSpark({ sub: 'sub-1' }, {
        headers: { authorization: 'Bearer access-token' },
      } as never);

      expect(growthSparkService.getMyGrowthSpark).toHaveBeenCalledWith(
        'sub-1',
        'access-token',
      );
      expect(result).toMatchObject(mockApiResponse);
    });

    it('should reject when Authorization header is missing', async () => {
      await expect(
        controller.getMyGrowthSpark({ sub: 'sub-1' }, { headers: {} } as never),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getByCognitoSub', () => {
    const viewUser = { sub: 'cognito-sub-1', groups: ['SuperAdmin'] };

    it('should call findByCognitoSubForRequester with cognito sub and user', async () => {
      const detail = { success: true, message: 'm', data: { cognitoSub: 's' } };
      appUserService.findByCognitoSubForRequester.mockResolvedValue(
        detail as Awaited<
          ReturnType<AppUserService['findByCognitoSubForRequester']>
        >,
      );

      const result = await controller.getByCognitoSub('sub-1', viewUser);

      expect(appUserService.findByCognitoSubForRequester).toHaveBeenCalledWith(
        'sub-1',
        viewUser.sub,
        viewUser.groups,
      );
      expect(result).toEqual(detail);
    });

    it('should rethrow NotFoundException from service', async () => {
      appUserService.findByCognitoSubForRequester.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        controller.getByCognitoSub('missing', viewUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
