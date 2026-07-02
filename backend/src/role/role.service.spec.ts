import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { RoleService } from './role.service';
import { PrismaService } from '../prisma';
import { ListRoleQueryDto, CreateRoleDto, UpdateRoleDto } from './dto';
import { SUPER_ADMIN_ROLE_CATEGORY_NAME } from './constants/role.messages';

describe('RoleService', () => {
  let service: RoleService;
  let prisma: {
    role: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    roleCategory: { findMany: jest.Mock; findUnique: jest.Mock };
    submodule: { findMany: jest.Mock };
    roleCategorySubmodule: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const mockRoleRows = [
    {
      id: 'role-uuid-1',
      name: 'Admin',
      description: 'Administrator role',
      isPrivate: true,
      isExternal: false,
      category: { id: 'cat-uuid-1', name: 'Corporation Directory' },
    },
  ];

  const mockCategories = [
    { id: 'cat-uuid-1', name: 'Corporation Directory' },
    { id: 'cat-uuid-2', name: 'Company' },
  ];

  const mockCategoriesWithRoles = [
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
  ];

  const mockRequest = {};

  const mockValidSubmodules = (ids: string[]) =>
    ids.map((id) => ({ id, module: { hidden: false } }));

  const mockSubmoduleValidation = (
    categoryName = 'Corporation Directory',
    submoduleIds: string[] = ['sub-uuid-1', 'sub-uuid-2'],
  ) => {
    prisma.roleCategory.findUnique.mockResolvedValue({ name: categoryName });
    prisma.submodule.findMany.mockResolvedValue(
      mockValidSubmodules(submoduleIds),
    );
  };

  beforeEach(async () => {
    const mockPrisma = {
      role: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      roleCategory: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      submodule: {
        findMany: jest.fn(),
      },
      roleCategorySubmodule: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockPrisma.$transaction.mockImplementation(
      (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: REQUEST,
          useValue: mockRequest as Request,
        },
      ],
    }).compile();

    service = await module.resolve<RoleService>(RoleService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated role list with default page and limit', async () => {
      prisma.role.findMany.mockResolvedValue(mockRoleRows);
      prisma.role.count.mockResolvedValue(1);

      const query: ListRoleQueryDto = {};
      const result = await service.findAll(query);

      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          where: undefined,
          orderBy: [{ name: 'asc' }],
          include: {
            category: { select: { id: true, name: true } },
          },
        }),
      );
      expect(prisma.role.count).toHaveBeenCalledWith({ where: undefined });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Role list fetched successfully');
      expect(result.data).toMatchObject({
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
      });
    });

    it('should apply custom page and limit', async () => {
      prisma.role.findMany.mockResolvedValue([]);
      prisma.role.count.mockResolvedValue(0);

      const query: ListRoleQueryDto = { page: 2, limit: 20 };
      await service.findAll(query);

      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        }),
      );
      expect(prisma.role.count).toHaveBeenCalled();
    });

    it('should filter by categoryId when provided', async () => {
      prisma.role.findMany.mockResolvedValue([]);
      prisma.role.count.mockResolvedValue(0);

      const query: ListRoleQueryDto = { categoryId: 'cat-uuid-1' };
      await service.findAll(query);

      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { categoryId: 'cat-uuid-1' },
        }),
      );
      expect(prisma.role.count).toHaveBeenCalledWith({
        where: { categoryId: 'cat-uuid-1' },
      });
    });

    it('should search by role name (case insensitive) when search provided', async () => {
      prisma.role.findMany.mockResolvedValue([]);
      prisma.role.count.mockResolvedValue(0);

      const query: ListRoleQueryDto = { search: 'admin' };
      await service.findAll(query);

      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: { contains: 'admin', mode: 'insensitive' },
          },
        }),
      );
    });

    it('should trim categoryId and search before applying', async () => {
      prisma.role.findMany.mockResolvedValue([]);
      prisma.role.count.mockResolvedValue(0);

      await service.findAll({
        categoryId: '  cat-1  ',
        search: '  query  ',
      });

      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            categoryId: 'cat-1',
            name: { contains: 'query', mode: 'insensitive' },
          },
        }),
      );
    });

    it('should order by name asc by default', async () => {
      prisma.role.findMany.mockResolvedValue([]);
      prisma.role.count.mockResolvedValue(0);

      await service.findAll({});

      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ name: 'asc' }],
        }),
      );
    });

    it('should order by category name when sortBy is category', async () => {
      prisma.role.findMany.mockResolvedValue([]);
      prisma.role.count.mockResolvedValue(0);

      await service.findAll({ sortBy: 'category', sortOrder: 'desc' });

      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ category: { name: 'desc' } }],
        }),
      );
    });

    it('should order by roleType (isPrivate, isExternal) when sortBy is roleType', async () => {
      prisma.role.findMany.mockResolvedValue([]);
      prisma.role.count.mockResolvedValue(0);

      await service.findAll({ sortBy: 'roleType', sortOrder: 'asc' });

      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ isPrivate: 'asc' }, { isExternal: 'asc' }],
        }),
      );
    });

    it('should order by description when sortBy is description', async () => {
      prisma.role.findMany.mockResolvedValue([]);
      prisma.role.count.mockResolvedValue(0);

      await service.findAll({ sortBy: 'description', sortOrder: 'desc' });

      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ description: 'desc' }],
        }),
      );
    });

    it('should map description null to null in response', async () => {
      const rowsWithNullDesc = [
        {
          ...mockRoleRows[0],
          description: null,
          category: { id: 'cat-uuid-1', name: 'Corporation Directory' },
        },
      ];
      prisma.role.findMany.mockResolvedValue(rowsWithNullDesc);
      prisma.role.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data).toBeDefined();
      expect(result.data!.items[0].description).toBeNull();
    });

    it('should rethrow error from prisma', async () => {
      prisma.role.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.findAll({})).rejects.toThrow('DB error');
    });
  });

  describe('findCategories', () => {
    it('should return role categories ordered by name', async () => {
      prisma.roleCategory.findMany.mockResolvedValue(mockCategories);

      const result = await service.findCategories();

      expect(prisma.roleCategory.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Role categories fetched successfully');
      expect(result.data).toEqual(mockCategories);
    });

    it('should rethrow error from prisma', async () => {
      prisma.roleCategory.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.findCategories()).rejects.toThrow('DB error');
    });
  });

  describe('findCategoriesWithRoles', () => {
    it('should return role categories with associated roles ordered by category and role name', async () => {
      prisma.roleCategory.findMany.mockResolvedValue(mockCategoriesWithRoles);

      const result = await service.findCategoriesWithRoles();

      expect(prisma.roleCategory.findMany).toHaveBeenCalledWith({
        where: { name: { not: SUPER_ADMIN_ROLE_CATEGORY_NAME } },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          roles: {
            orderBy: { name: 'asc' },
            select: {
              id: true,
              name: true,
              description: true,
              isPrivate: true,
              isExternal: true,
            },
          },
        },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Role categories with roles fetched successfully',
      );
      expect(result.data).toEqual(mockCategoriesWithRoles);
    });

    it('should rethrow error from prisma', async () => {
      prisma.roleCategory.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.findCategoriesWithRoles()).rejects.toThrow(
        'DB error',
      );
    });
  });

  describe('findOne', () => {
    it('should return role when found', async () => {
      const roleRow = {
        id: 'role-uuid-1',
        name: 'Admin',
        categoryId: 'cat-uuid-1',
        description: 'Administrator role',
        isPrivate: true,
        isExternal: false,
        category: { id: 'cat-uuid-1', name: 'Corporation Directory' },
      };
      prisma.role.findUnique.mockResolvedValue(roleRow);
      prisma.roleCategorySubmodule.findMany.mockResolvedValue([
        { submoduleId: 'sub-uuid-1' },
        { submoduleId: 'sub-uuid-2' },
      ]);

      const result = await service.findOne('role-uuid-1');

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: 'role-uuid-1' },
        include: {
          category: { select: { id: true, name: true } },
        },
      });
      expect(prisma.roleCategorySubmodule.findMany).toHaveBeenCalledWith({
        where: { roleCategoryId: 'cat-uuid-1', enabled: true },
        select: { submoduleId: true },
        orderBy: { submodule: { sortOrder: 'asc' } },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Role fetched successfully');
      expect(result.data).toMatchObject({
        id: 'role-uuid-1',
        name: 'Admin',
        categoryId: 'cat-uuid-1',
        category: 'Corporation Directory',
        description: 'Administrator role',
        isPrivate: true,
        isExternal: false,
        submoduleIds: ['sub-uuid-1', 'sub-uuid-2'],
      });
    });

    it('should throw NotFoundException when role does not exist', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent')).rejects.toThrow(
        'Role not found',
      );
    });

    it('should map null description to null in response', async () => {
      const roleRow = {
        id: 'role-uuid-1',
        name: 'Admin',
        categoryId: 'cat-uuid-1',
        description: null,
        isPrivate: false,
        isExternal: false,
        category: { id: 'cat-uuid-1', name: 'Corporation Directory' },
      };
      prisma.role.findUnique.mockResolvedValue(roleRow);
      prisma.roleCategorySubmodule.findMany.mockResolvedValue([]);

      const result = await service.findOne('role-uuid-1');

      expect(result.data!.description).toBeNull();
      expect(result.data!.submoduleIds).toEqual([]);
    });
  });

  describe('getCategoryEnabledSubmodules', () => {
    it('should return enabled submodule IDs for a category', async () => {
      prisma.roleCategory.findUnique.mockResolvedValue({ id: 'cat-uuid-1' });
      prisma.roleCategorySubmodule.findMany.mockResolvedValue([
        { submoduleId: 'sub-uuid-1' },
        { submoduleId: 'sub-uuid-2' },
      ]);

      const result = await service.getCategoryEnabledSubmodules('cat-uuid-1');

      expect(prisma.roleCategory.findUnique).toHaveBeenCalledWith({
        where: { id: 'cat-uuid-1' },
        select: { id: true },
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        submoduleIds: ['sub-uuid-1', 'sub-uuid-2'],
      });
    });

    it('should throw NotFoundException when category does not exist', async () => {
      prisma.roleCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.getCategoryEnabledSubmodules('missing-cat'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getCategoryEnabledSubmodules('missing-cat'),
      ).rejects.toThrow('Role category not found');
    });
  });

  describe('create', () => {
    const validDto: CreateRoleDto = {
      name: 'New Role',
      categoryId: 'cat-uuid-1',
      description: 'Description',
      isPrivate: false,
      isExternal: false,
      submoduleIds: ['sub-uuid-1', 'sub-uuid-2'],
    };

    it('should create role and sync category submodules', async () => {
      prisma.role.findFirst.mockResolvedValue(null);
      mockSubmoduleValidation();
      prisma.role.create.mockResolvedValue({
        id: 'role-new-id',
        name: 'New Role',
        categoryId: 'cat-uuid-1',
        description: 'Description',
        isPrivate: false,
        isExternal: false,
      });
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-new-id',
        name: 'New Role',
        categoryId: 'cat-uuid-1',
        description: 'Description',
        isPrivate: false,
        isExternal: false,
        category: { id: 'cat-uuid-1', name: 'Corporation Directory' },
      });

      const result = await service.create(validDto);

      expect(prisma.roleCategory.findUnique).toHaveBeenCalledWith({
        where: { id: 'cat-uuid-1' },
        select: { name: true },
      });
      expect(prisma.submodule.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['sub-uuid-1', 'sub-uuid-2'] } },
        select: {
          id: true,
          module: { select: { hidden: true } },
        },
      });
      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: {
          name: { equals: 'New Role', mode: 'insensitive' },
          categoryId: 'cat-uuid-1',
        },
      });
      expect(prisma.role.create).toHaveBeenCalled();
      expect(prisma.roleCategorySubmodule.deleteMany).toHaveBeenCalledWith({
        where: { roleCategoryId: 'cat-uuid-1' },
      });
      expect(prisma.roleCategorySubmodule.createMany).toHaveBeenCalledWith({
        data: [
          {
            roleCategoryId: 'cat-uuid-1',
            submoduleId: 'sub-uuid-1',
            enabled: true,
          },
          {
            roleCategoryId: 'cat-uuid-1',
            submoduleId: 'sub-uuid-2',
            enabled: true,
          },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Role created successfully');
      expect(result.data).toMatchObject({
        id: 'role-new-id',
        name: 'New Role',
        categoryId: 'cat-uuid-1',
        category: 'Corporation Directory',
        isPrivate: false,
        isExternal: false,
        description: 'Description',
        submoduleIds: ['sub-uuid-1', 'sub-uuid-2'],
      });
    });

    it('should throw BadRequestException when submodule IDs are invalid', async () => {
      prisma.role.findFirst.mockResolvedValue(null);
      prisma.roleCategory.findUnique.mockResolvedValue({
        name: 'Corporation Directory',
      });
      prisma.submodule.findMany.mockResolvedValue(
        mockValidSubmodules(['sub-uuid-1']),
      );

      await expect(service.create(validDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(validDto)).rejects.toThrow(
        'One or more submodule IDs are invalid',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when duplicate name in category', async () => {
      prisma.role.findFirst.mockResolvedValue({ id: 'existing-id' });

      await expect(service.create(validDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(validDto)).rejects.toThrow(
        'A role with this name already exists in the selected category',
      );
    });

    it('should trim name and description when creating', async () => {
      prisma.role.findFirst.mockResolvedValue(null);
      mockSubmoduleValidation('Corporation Directory', ['sub-uuid-1']);
      prisma.role.create.mockImplementation((args: { data: CreateRoleDto }) => {
        expect(args.data.name).toBe('Trimmed Name');
        expect(args.data.description).toBe('Trimmed desc');
        return Promise.resolve({
          id: 'role-new-id',
          name: 'Trimmed Name',
          categoryId: 'cat-uuid-1',
          description: 'Trimmed desc',
          isPrivate: false,
          isExternal: false,
        });
      });
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-new-id',
        name: 'Trimmed Name',
        categoryId: 'cat-uuid-1',
        description: 'Trimmed desc',
        isPrivate: false,
        isExternal: false,
        category: { id: 'cat-uuid-1', name: 'Corporation Directory' },
      });

      await service.create({
        ...validDto,
        name: '  Trimmed Name  ',
        description: '  Trimmed desc  ',
        submoduleIds: ['sub-uuid-1'],
      });

      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: {
          name: { equals: 'Trimmed Name', mode: 'insensitive' },
          categoryId: 'cat-uuid-1',
        },
      });
    });

    it('should throw BadRequestException when duplicate name differs only by case', async () => {
      prisma.role.findFirst.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.create({
          ...validDto,
          name: 'new role',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({
          ...validDto,
          name: 'new role',
        }),
      ).rejects.toThrow(
        'A role with this name already exists in the selected category',
      );
      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: {
          name: { equals: 'new role', mode: 'insensitive' },
          categoryId: 'cat-uuid-1',
        },
      });
    });
  });

  describe('update', () => {
    const validDto: UpdateRoleDto = {
      name: 'Updated Role',
      categoryId: 'cat-uuid-1',
      description: 'Updated description',
      isPrivate: true,
      isExternal: true,
      submoduleIds: ['sub-uuid-1', 'sub-uuid-2'],
    };

    it('should update role and sync category submodules', async () => {
      prisma.role.findUnique
        .mockResolvedValueOnce({
          id: 'role-uuid-1',
          name: 'Admin',
          categoryId: 'cat-uuid-1',
          description: 'Old',
          isPrivate: false,
          isExternal: false,
          category: { name: 'Corporation Directory' },
        })
        .mockResolvedValueOnce({
          id: 'role-uuid-1',
          name: 'Updated Role',
          categoryId: 'cat-uuid-1',
          description: 'Updated description',
          isPrivate: true,
          isExternal: true,
          category: { id: 'cat-uuid-1', name: 'Corporation Directory' },
        });
      prisma.roleCategorySubmodule.findMany.mockResolvedValue([
        { submoduleId: 'sub-uuid-old' },
      ]);
      mockSubmoduleValidation();
      prisma.role.findFirst.mockResolvedValue(null);
      prisma.role.update.mockResolvedValue(undefined);

      const result = await service.update('role-uuid-1', validDto);

      expect(prisma.submodule.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['sub-uuid-1', 'sub-uuid-2'] } },
        select: {
          id: true,
          module: { select: { hidden: true } },
        },
      });
      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: 'role-uuid-1' },
        include: {
          category: { select: { name: true } },
        },
      });
      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: {
          name: { equals: 'Updated Role', mode: 'insensitive' },
          categoryId: 'cat-uuid-1',
          id: { not: 'role-uuid-1' },
        },
      });
      expect(prisma.roleCategorySubmodule.deleteMany).toHaveBeenCalledWith({
        where: { roleCategoryId: 'cat-uuid-1' },
      });
      expect(prisma.roleCategorySubmodule.createMany).toHaveBeenCalledWith({
        data: [
          {
            roleCategoryId: 'cat-uuid-1',
            submoduleId: 'sub-uuid-1',
            enabled: true,
          },
          {
            roleCategoryId: 'cat-uuid-1',
            submoduleId: 'sub-uuid-2',
            enabled: true,
          },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Role updated successfully');
      expect(result.data).toMatchObject({
        id: 'role-uuid-1',
        name: 'Updated Role',
        categoryId: 'cat-uuid-1',
        category: 'Corporation Directory',
        isPrivate: true,
        isExternal: true,
        description: 'Updated description',
        submoduleIds: ['sub-uuid-1', 'sub-uuid-2'],
      });
    });

    it('should throw NotFoundException when role does not exist', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', validDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update('non-existent', validDto)).rejects.toThrow(
        'Role not found',
      );
    });

    it('should throw BadRequestException when duplicate name in category', async () => {
      prisma.role.findUnique.mockResolvedValue({
        id: 'role-uuid-1',
        name: 'Admin',
        categoryId: 'cat-uuid-1',
        description: null,
        isPrivate: false,
        isExternal: false,
        category: { name: 'Corporation Directory' },
      });
      prisma.roleCategorySubmodule.findMany.mockResolvedValue([]);
      prisma.role.findFirst.mockResolvedValue({ id: 'other-role-id' });

      await expect(service.update('role-uuid-1', validDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('role-uuid-1', validDto)).rejects.toThrow(
        'A role with this name already exists in the selected category',
      );
    });
  });

  describe('remove', () => {
    it('should delete role and return success when role exists and is not Super Admin', async () => {
      const roleWithCategory = {
        id: 'role-uuid-1',
        name: 'Corporation Admin',
        categoryId: 'cat-uuid-1',
        description: null,
        isPrivate: false,
        isExternal: false,
        category: { name: 'Corporation Directory' },
      };
      prisma.role.findUnique.mockResolvedValue(roleWithCategory);
      prisma.roleCategorySubmodule.findMany.mockResolvedValue([
        { submoduleId: 'sub-uuid-1' },
      ]);
      prisma.role.delete.mockResolvedValue({ id: 'role-uuid-1' });

      const result = await service.remove('role-uuid-1');

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: 'role-uuid-1' },
        include: {
          category: { select: { name: true } },
        },
      });
      expect(prisma.role.delete).toHaveBeenCalledWith({
        where: { id: 'role-uuid-1' },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Role deleted successfully');
      expect(result.data).toEqual({ id: 'role-uuid-1' });
    });

    it('should throw NotFoundException when role does not exist', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove('non-existent')).rejects.toThrow(
        'Role not found',
      );
      expect(prisma.role.delete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when role category is Super Admin', async () => {
      const superAdminRole = {
        id: 'super-admin-role-id',
        name: 'Super Admin',
        categoryId: 'cat-super-admin',
        category: { name: 'Super Admin' },
      };
      prisma.role.findUnique.mockResolvedValue(superAdminRole);

      await expect(service.remove('super-admin-role-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove('super-admin-role-id')).rejects.toThrow(
        'Super Admin role cannot be deleted',
      );
      expect(prisma.role.delete).not.toHaveBeenCalled();
    });
  });
});
