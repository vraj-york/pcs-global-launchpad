/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { AuthorizationGuard, CognitoAuthGuard, SuperAdminGuard } from '../auth';

describe('PermissionController', () => {
  let controller: PermissionController;
  let permissionService: jest.Mocked<PermissionService>;

  const mockModulesResponse = {
    success: true,
    message: 'Modules (categories) fetched successfully',
    data: [
      { id: 'mod-uuid-1', name: 'Corporation Directory' },
      { id: 'mod-uuid-2', name: 'Company' },
    ],
  };

  const mockModulesWithSubmodulesResponse = {
    success: true,
    message: 'Modules with submodules fetched successfully',
    data: [
      {
        id: 'mod-uuid-1',
        name: 'Corporation Directory',
        submodules: [
          {
            id: 'sub-1',
            key: 'corporation_directory.view_corporation',
            name: 'View Corporation',
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    const mockPermissionService = {
      findModules: jest.fn(),
      findModulesWithSubmodules: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionController],
      providers: [
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
      ],
    })
      .overrideGuard(CognitoAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SuperAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PermissionController>(PermissionController);
    permissionService = module.get(PermissionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listModules', () => {
    it('should return modules list', async () => {
      permissionService.findModules.mockResolvedValue(
        mockModulesResponse as Awaited<
          ReturnType<PermissionService['findModules']>
        >,
      );

      const result = await controller.listModules();

      expect(permissionService.findModules).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject(mockModulesResponse);
    });

    it('should rethrow error from service', async () => {
      permissionService.findModules.mockRejectedValue(new Error('DB error'));

      await expect(controller.listModules()).rejects.toThrow('DB error');
    });
  });

  describe('listModulesWithSubmodules', () => {
    it('should return modules with submodules', async () => {
      permissionService.findModulesWithSubmodules.mockResolvedValue(
        mockModulesWithSubmodulesResponse as Awaited<
          ReturnType<PermissionService['findModulesWithSubmodules']>
        >,
      );

      const result = await controller.listModulesWithSubmodules('cat-uuid-1');

      expect(permissionService.findModulesWithSubmodules).toHaveBeenCalledWith(
        'cat-uuid-1',
      );
      expect(result).toMatchObject(mockModulesWithSubmodulesResponse);
    });

    it('should rethrow error from service', async () => {
      permissionService.findModulesWithSubmodules.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(controller.listModulesWithSubmodules()).rejects.toThrow(
        'DB error',
      );
    });
  });
});
