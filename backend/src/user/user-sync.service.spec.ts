import { Test, TestingModule } from '@nestjs/testing';
import { UserSyncService } from './user-sync.service';
import { PrismaService } from '../prisma';
import { COGNITO_GROUP_NAMES } from './cognito-groups.constants';
import { APP_USER_STATUS } from './constants/app-user.constants';

describe('UserSyncService', () => {
  let service: UserSyncService;
  let prisma: {
    $transaction: jest.Mock;
    appUser: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      updateMany: jest.Mock;
    };
    cognitoUserGroup: { findMany: jest.Mock };
    appUserGroupMembership: { deleteMany: jest.Mock; createMany: jest.Mock };
  };

  beforeEach(async () => {
    const mockAppUser = {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    };
    const mockCognitoUserGroup = {
      findMany: jest.fn().mockResolvedValue([]),
    };
    const mockMembership = {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    };

    prisma = {
      $transaction: jest.fn(async (fn: (tx: typeof prisma) => Promise<void>) =>
        fn({
          appUser: mockAppUser,
          cognitoUserGroup: mockCognitoUserGroup,
          appUserGroupMembership: mockMembership,
        }),
      ),
      appUser: mockAppUser,
      cognitoUserGroup: mockCognitoUserGroup,
      appUserGroupMembership: mockMembership,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSyncService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UserSyncService);
  });

  describe('syncFromCognito', () => {
    it('should not upsert when user is unknown and email is missing from token', async () => {
      prisma.appUser.findUnique.mockResolvedValue(null);

      await service.syncFromCognito('sub-1', undefined, []);

      expect(prisma.appUser.findUnique).toHaveBeenCalledWith({
        where: { cognitoSub: 'sub-1' },
        select: { cognitoSub: true },
      });
      expect(prisma.appUser.upsert).not.toHaveBeenCalled();
    });

    it('should upsert when user is unknown but email is present', async () => {
      prisma.appUser.findUnique.mockResolvedValue(null);
      prisma.cognitoUserGroup.findMany.mockResolvedValue([]);

      await service.syncFromCognito('sub-2', 'A@B.COM', []);

      expect(prisma.appUser.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { cognitoSub: 'sub-2' },
          create: expect.objectContaining({
            cognitoSub: 'sub-2',
            email: 'a@b.com',
          }) as Record<string, unknown>,
        }),
      );
    });

    it('should upsert update path when user exists and email is missing', async () => {
      prisma.appUser.findUnique.mockResolvedValue({ cognitoSub: 'sub-3' });
      prisma.cognitoUserGroup.findMany.mockResolvedValue([]);

      await service.syncFromCognito('sub-3', undefined, []);

      expect(prisma.appUser.upsert).toHaveBeenCalled();
      expect(prisma.appUser.updateMany).not.toHaveBeenCalled();
    });

    it.each([
      ['CompanyAdmin', COGNITO_GROUP_NAMES.COMPANY_ADMIN],
      ['CorporationAdmin', COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
    ] as const)(
      'should set Pending invited admins to Active when JWT includes %s group',
      async (_label, groupName) => {
        prisma.appUser.findUnique.mockResolvedValue({ cognitoSub: 'sub-ca' });
        prisma.cognitoUserGroup.findMany.mockResolvedValue([]);

        await service.syncFromCognito('sub-ca', 'x@y.com', [groupName]);

        expect(prisma.appUser.updateMany).toHaveBeenCalledWith({
          where: {
            cognitoSub: 'sub-ca',
            status: APP_USER_STATUS.PENDING,
          },
          data: { status: APP_USER_STATUS.ACTIVE },
        });
      },
    );
  });
});
