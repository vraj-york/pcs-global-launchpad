/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { ListRoleQueryDto } from './dto';
import { AuthorizationGuard, CognitoAuthGuard, SuperAdminGuard } from '../auth';

describe('RoleController', () => {
  let controller: RoleController;
  let roleService: jest.Mocked<RoleService>;

  const mockListResponse = {
    success: true,
    message: 'Role list fetched successfully',
    data: {
      items: [
        {
          id: 'role-uuid-1',
          name: 'Admin',
          category: 'Corporation Directory',
          categoryId: 'cat-uuid-1',
          isPrivate: true,
          isExternal: false,
          description: 'Administrator role',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  const mockCategoriesResponse = {
    success: true,
    message: 'Role categories fetched successfully',
    data: [
      { id: 'cat-uuid-1', name: 'Corporation Directory' },
      { id: 'cat-uuid-2', name: 'Company' },
    ],
  };

  const mockRoleOneResponse = {
    success: true,
    message: 'Role fetched successfully',
    data: {
      id: 'role-uuid-1',
      name: 'Admin',
      categoryId: 'cat-uuid-1',
      category: 'Corporation Directory',
      description: 'Administrator role',
      isPrivate: true,
      isExternal: false,
      submoduleIds: ['sub-uuid-1', 'sub-uuid-2'],
    },
  };

  const mockCreateResponse = {
    success: true,
    message: 'Role created successfully',
    data: {
      id: 'role-uuid-new',
      name: 'New Role',
      categoryId: 'cat-uuid-1',
      category: 'Corporation Directory',
      isPrivate: false,
      isExternal: false,
      description: 'New role description',
      submoduleIds: ['sub-uuid-1'],
    },
  };

  const mockUpdateResponse = {
    success: true,
    message: 'Role updated successfully',
    data: {
      id: 'role-uuid-1',
      name: 'Updated Role',
      categoryId: 'cat-uuid-1',
      category: 'Corporation Directory',
      isPrivate: true,
      isExternal: true,
      description: 'Updated description',
      submoduleIds: ['sub-uuid-1', 'sub-uuid-2'],
    },
  };

  const mockDeleteResponse = {
    success: true,
    message: 'Role deleted successfully',
    data: { id: 'role-uuid-1' },
  };

  const mockCategoriesWithRolesResponse = {
    success: true,
    message: 'Role categories with roles fetched successfully',
    data: [
      {
        id: 'cat-uuid-1',
        name: 'Corporation Directory',
        description: 'Corp category',
        roles: [
          {
            id: 'role-uuid-1',
            name: 'Admin',
            description: 'Administrator role',
            isPrivate: true,
            isExternal: false,
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    const mockRoleService = {
      findAll: jest.fn(),
      findCategories: jest.fn(),
      findCategoriesWithRoles: jest.fn(),
      getCategoryEnabledSubmodules: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        {
          provide: RoleService,
          useValue: mockRoleService,
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

    controller = module.get<RoleController>(RoleController);
    roleService = module.get(RoleService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should return paginated role list', async () => {
      const query: ListRoleQueryDto = { page: 1, limit: 10 };
      roleService.findAll.mockResolvedValue(
        mockListResponse as Awaited<ReturnType<RoleService['findAll']>>,
      );

      const result = await controller.list(query);

      expect(roleService.findAll).toHaveBeenCalledWith(query);
      expect(result).toMatchObject(mockListResponse);
    });

    it('should pass search and filter params to service', async () => {
      const query: ListRoleQueryDto = {
        page: 2,
        limit: 20,
        search: 'Admin',
        categoryId: 'cat-uuid-1',
        sortBy: 'name',
        sortOrder: 'desc',
      };
      roleService.findAll.mockResolvedValue(
        mockListResponse as Awaited<ReturnType<RoleService['findAll']>>,
      );

      await controller.list(query);

      expect(roleService.findAll).toHaveBeenCalledWith(query);
    });

    it('should rethrow error from service', async () => {
      roleService.findAll.mockRejectedValue(new Error('DB error'));

      await expect(controller.list({})).rejects.toThrow('DB error');
    });
  });

  describe('listCategories', () => {
    it('should return role categories', async () => {
      roleService.findCategories.mockResolvedValue(
        mockCategoriesResponse as Awaited<
          ReturnType<RoleService['findCategories']>
        >,
      );

      const result = await controller.listCategories();

      expect(roleService.findCategories).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject(mockCategoriesResponse);
    });

    it('should rethrow error from service', async () => {
      roleService.findCategories.mockRejectedValue(new Error('Fetch failed'));

      await expect(controller.listCategories()).rejects.toThrow('Fetch failed');
    });
  });

  describe('listCategoriesWithRoles', () => {
    it('should return role categories with associated roles', async () => {
      roleService.findCategoriesWithRoles.mockResolvedValue(
        mockCategoriesWithRolesResponse as Awaited<
          ReturnType<RoleService['findCategoriesWithRoles']>
        >,
      );

      const result = await controller.listCategoriesWithRoles();

      expect(roleService.findCategoriesWithRoles).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject(mockCategoriesWithRolesResponse);
    });

    it('should rethrow error from service', async () => {
      roleService.findCategoriesWithRoles.mockRejectedValue(
        new Error('Fetch failed'),
      );

      await expect(controller.listCategoriesWithRoles()).rejects.toThrow(
        'Fetch failed',
      );
    });
  });

  describe('getCategoryEnabledSubmodules', () => {
    it('should return enabled submodule IDs for a category', async () => {
      const mockResponse = {
        success: true,
        message: 'Role category submodule permissions fetched successfully',
        data: { submoduleIds: ['sub-uuid-1', 'sub-uuid-2'] },
      };
      roleService.getCategoryEnabledSubmodules.mockResolvedValue(
        mockResponse as Awaited<
          ReturnType<RoleService['getCategoryEnabledSubmodules']>
        >,
      );

      const result =
        await controller.getCategoryEnabledSubmodules('cat-uuid-1');

      expect(roleService.getCategoryEnabledSubmodules).toHaveBeenCalledWith(
        'cat-uuid-1',
      );
      expect(result).toMatchObject(mockResponse);
    });
  });

  describe('getOne', () => {
    it('should return a single role by id', async () => {
      roleService.findOne.mockResolvedValue(
        mockRoleOneResponse as Awaited<ReturnType<RoleService['findOne']>>,
      );

      const result = await controller.getOne('role-uuid-1');

      expect(roleService.findOne).toHaveBeenCalledWith('role-uuid-1');
      expect(result).toMatchObject(mockRoleOneResponse);
    });

    it('should rethrow error from service', async () => {
      roleService.findOne.mockRejectedValue(new Error('Not found'));

      await expect(controller.getOne('role-uuid-1')).rejects.toThrow(
        'Not found',
      );
    });
  });

  describe('create', () => {
    it('should create a role and return success', async () => {
      roleService.create.mockResolvedValue(
        mockCreateResponse as Awaited<ReturnType<RoleService['create']>>,
      );

      const dto = {
        name: 'New Role',
        categoryId: 'cat-uuid-1',
        description: 'New role description',
        isPrivate: false,
        isExternal: false,
        submoduleIds: ['sub-uuid-1'],
      };

      const result = await controller.create(dto);

      expect(roleService.create).toHaveBeenCalledWith(dto);
      expect(result).toMatchObject(mockCreateResponse);
    });

    it('should rethrow error from service', async () => {
      roleService.create.mockRejectedValue(
        new Error('Duplicate name in category'),
      );

      await expect(
        controller.create({
          name: 'Admin',
          categoryId: 'cat-uuid-1',
          description: 'Desc',
          submoduleIds: ['sub-uuid-1'],
        }),
      ).rejects.toThrow('Duplicate name in category');
    });
  });

  describe('update', () => {
    it('should update a role and return success', async () => {
      roleService.update.mockResolvedValue(
        mockUpdateResponse as Awaited<ReturnType<RoleService['update']>>,
      );

      const dto = {
        name: 'Updated Role',
        categoryId: 'cat-uuid-1',
        description: 'Updated description',
        isPrivate: true,
        isExternal: true,
        submoduleIds: ['sub-uuid-1', 'sub-uuid-2'],
      };

      const result = await controller.update('role-uuid-1', dto);

      expect(roleService.update).toHaveBeenCalledWith('role-uuid-1', dto);
      expect(result).toMatchObject(mockUpdateResponse);
    });

    it('should rethrow error from service', async () => {
      roleService.update.mockRejectedValue(new Error('Role not found'));

      await expect(
        controller.update('role-uuid-1', {
          name: 'Role',
          categoryId: 'cat-uuid-1',
          description: 'Desc',
          submoduleIds: ['sub-uuid-1'],
        }),
      ).rejects.toThrow('Role not found');
    });
  });

  describe('delete', () => {
    it('should delete a role and return success', async () => {
      roleService.remove.mockResolvedValue(
        mockDeleteResponse as Awaited<ReturnType<RoleService['remove']>>,
      );

      const result = await controller.delete('role-uuid-1');

      expect(roleService.remove).toHaveBeenCalledWith('role-uuid-1');
      expect(result).toMatchObject(mockDeleteResponse);
    });

    it('should rethrow NotFoundException from service', async () => {
      roleService.remove.mockRejectedValue(
        new NotFoundException('Role not found'),
      );

      await expect(controller.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.delete('non-existent')).rejects.toThrow(
        'Role not found',
      );
    });

    it('should rethrow BadRequestException when role is Super Admin', async () => {
      roleService.remove.mockRejectedValue(
        new BadRequestException('Super Admin role cannot be deleted'),
      );

      await expect(controller.delete('super-admin-role-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.delete('super-admin-role-id')).rejects.toThrow(
        'Super Admin role cannot be deleted',
      );
    });
  });
});
