import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma';
import { COGNITO_GROUP_NAMES } from '../../user/cognito-groups.constants';
import { RbacAccessService } from './rbac-access.service';
import { SUBMODULE_KEYS } from './submodule.registry';

type RoleCategorySubmoduleFindManyArgs = {
  where: {
    roleCategoryId: { in: string[] };
    enabled: boolean;
  };
  select?: { submodule: { select: { key: boolean } } };
};

describe('RbacAccessService', () => {
  let service: RbacAccessService;
  let roleCategorySubmoduleFindMany: jest.Mock<
    Promise<Array<{ submodule: { key: string } }>>,
    [RoleCategorySubmoduleFindManyArgs]
  >;
  let prisma: {
    submodule: { findMany: jest.Mock };
    appUser: { findFirst: jest.Mock };
    cognitoUserGroup: { findMany: jest.Mock };
    roleCategorySubmodule: {
      findMany: jest.Mock<
        Promise<Array<{ submodule: { key: string } }>>,
        [RoleCategorySubmoduleFindManyArgs]
      >;
    };
  };

  const corpCategoryId = 'cat-corp';
  const userCategoryId = 'cat-user';

  beforeEach(async () => {
    prisma = {
      submodule: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { key: SUBMODULE_KEYS.ASSESSMENT_TAKE },
            { key: SUBMODULE_KEYS.CORPORATION_DIRECTORY_VIEW },
          ]),
      },
      appUser: {
        findFirst: jest.fn().mockResolvedValue({
          roleId: 'role-1',
          groupMemberships: [
            {
              group: {
                name: COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
                roleCategoryId: corpCategoryId,
              },
            },
            {
              group: {
                name: COGNITO_GROUP_NAMES.USER,
                roleCategoryId: userCategoryId,
              },
            },
          ],
        }),
      },
      cognitoUserGroup: {
        findMany: jest.fn().mockResolvedValue([
          {
            name: COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
            roleCategoryId: corpCategoryId,
          },
          {
            name: COGNITO_GROUP_NAMES.COMPANY_ADMIN,
            roleCategoryId: 'cat-company',
          },
          { name: COGNITO_GROUP_NAMES.USER, roleCategoryId: userCategoryId },
          {
            name: COGNITO_GROUP_NAMES.SUPER_ADMIN,
            roleCategoryId: 'cat-super',
          },
        ]),
      },
      roleCategorySubmodule: {
        findMany: jest
          .fn<
            Promise<Array<{ submodule: { key: string } }>>,
            [RoleCategorySubmoduleFindManyArgs]
          >()
          .mockResolvedValue([
            { submodule: { key: SUBMODULE_KEYS.CORPORATION_DIRECTORY_VIEW } },
            { submodule: { key: SUBMODULE_KEYS.ASSESSMENT_TAKE } },
          ]),
      },
    };
    roleCategorySubmoduleFindMany = prisma.roleCategorySubmodule.findMany;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(RbacAccessService);
  });

  it('unions enabled submodules across all mapped Cognito groups', async () => {
    const result = await service.resolveForUser('sub-1', [
      COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
      COGNITO_GROUP_NAMES.USER,
    ]);

    expect(roleCategorySubmoduleFindMany).toHaveBeenCalledTimes(1);
    const firstCallArgs = roleCategorySubmoduleFindMany.mock.calls.at(0);
    expect(firstCallArgs).toBeDefined();
    const callArg = firstCallArgs?.[0];
    expect(callArg?.where.enabled).toBe(true);
    expect(callArg?.where.roleCategoryId.in).toEqual(
      expect.arrayContaining([corpCategoryId, userCategoryId]),
    );
    expect(result.effectiveGroups).toEqual([
      COGNITO_GROUP_NAMES.USER,
      COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
    ]);
    expect(result.roleCategoryIds).toEqual(
      expect.arrayContaining([corpCategoryId, userCategoryId]),
    );
    expect(
      result.enabledSubmoduleKeys.has(SUBMODULE_KEYS.ASSESSMENT_TAKE),
    ).toBe(true);
    expect(
      result.enabledSubmoduleKeys.has(
        SUBMODULE_KEYS.CORPORATION_DIRECTORY_VIEW,
      ),
    ).toBe(true);
    expect(result.submodules).toEqual([
      { key: SUBMODULE_KEYS.ASSESSMENT_TAKE, enabled: true },
      { key: SUBMODULE_KEYS.CORPORATION_DIRECTORY_VIEW, enabled: true },
    ]);
  });

  it('assertAnySubmoduleEnabled allows when any key matches', () => {
    const context = {
      isSuperAdmin: false,
      effectiveGroups: [],
      roleCategoryIds: [corpCategoryId],
      roleId: null,
      enabledSubmoduleKeys: new Set([SUBMODULE_KEYS.CORPORATION_OVERVIEW_VIEW]),
      submodules: [],
    };

    expect(() =>
      service.assertAnySubmoduleEnabled(context, [
        SUBMODULE_KEYS.CORPORATION_OVERVIEW_VIEW,
        SUBMODULE_KEYS.CORPORATION_DIRECTORY_VIEW,
      ]),
    ).not.toThrow();
  });

  it('assertAnySubmoduleEnabled denies when no keys match', () => {
    const context = {
      isSuperAdmin: false,
      effectiveGroups: [],
      roleCategoryIds: [corpCategoryId],
      roleId: null,
      enabledSubmoduleKeys: new Set([SUBMODULE_KEYS.ASSESSMENT_TAKE]),
      submodules: [],
    };

    expect(() =>
      service.assertAnySubmoduleEnabled(context, [
        SUBMODULE_KEYS.CORPORATION_OVERVIEW_VIEW,
        SUBMODULE_KEYS.CORPORATION_DIRECTORY_VIEW,
      ]),
    ).toThrow();
  });

  it('grants all submodules for SuperAdmin', async () => {
    const result = await service.resolveForUser('sub-1', [
      COGNITO_GROUP_NAMES.SUPER_ADMIN,
    ]);

    expect(prisma.roleCategorySubmodule.findMany).not.toHaveBeenCalled();
    expect(result.isSuperAdmin).toBe(true);
    expect(result.enabledSubmoduleKeys.size).toBe(2);
  });
});
