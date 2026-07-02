import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from './permission.service';
import { PrismaService } from '../prisma';
import { SUPER_ADMIN_ROLE_CATEGORY_NAME } from '../role/constants/role.messages';

describe('PermissionService', () => {
  let service: PermissionService;
  let prisma: {
    module: { findMany: jest.Mock };
    roleCategory: { findUnique: jest.Mock };
  };

  const mockModules = [
    { id: 'mod-uuid-1', name: 'Corporation Directory' },
    { id: 'mod-uuid-2', name: 'Company' },
  ];

  const mockModulesWithSubmodules = [
    {
      id: 'mod-uuid-1',
      name: 'Corporation Directory',
      submodules: [
        {
          id: 'sub-view-1',
          key: 'corporation_directory.view_corporation',
          name: 'View Corporation',
        },
        {
          id: 'sub-add-1',
          key: 'corporation_directory.add_new_corporation',
          name: 'Add New Corporation',
        },
      ],
    },
  ];

  beforeEach(async () => {
    const mockPrisma = {
      module: {
        findMany: jest.fn(),
      },
      roleCategory: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findModules', () => {
    it('should return modules ordered by sortOrder', async () => {
      prisma.module.findMany.mockResolvedValue(mockModules);

      const result = await service.findModules();

      expect(prisma.module.findMany).toHaveBeenCalledWith({
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Modules (categories) fetched successfully');
      expect(result.data).toEqual(mockModules);
    });

    it('should rethrow error from prisma', async () => {
      prisma.module.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.findModules()).rejects.toThrow('DB error');
    });
  });

  describe('findModulesWithSubmodules', () => {
    it('should exclude hidden modules when roleCategoryId is omitted', async () => {
      prisma.module.findMany.mockResolvedValue(mockModulesWithSubmodules);

      const result = await service.findModulesWithSubmodules();

      expect(prisma.roleCategory.findUnique).not.toHaveBeenCalled();
      expect(prisma.module.findMany).toHaveBeenCalledWith({
        where: { hidden: false },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          submodules: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, key: true, name: true },
          },
        },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Modules with submodules fetched successfully',
      );
      expect(result.data).toEqual([
        {
          id: 'mod-uuid-1',
          name: 'Corporation Directory',
          submodules: mockModulesWithSubmodules[0].submodules,
        },
      ]);
    });

    it('should include hidden modules for Super Admin role category', async () => {
      prisma.roleCategory.findUnique.mockResolvedValue({
        name: SUPER_ADMIN_ROLE_CATEGORY_NAME,
      });
      prisma.module.findMany.mockResolvedValue(mockModulesWithSubmodules);

      await service.findModulesWithSubmodules('super-admin-cat-id');

      expect(prisma.roleCategory.findUnique).toHaveBeenCalledWith({
        where: { id: 'super-admin-cat-id' },
        select: { name: true },
      });
      expect(prisma.module.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          submodules: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, key: true, name: true },
          },
        },
      });
    });

    it('should rethrow error from prisma', async () => {
      prisma.module.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.findModulesWithSubmodules()).rejects.toThrow(
        'DB error',
      );
    });
  });
});
