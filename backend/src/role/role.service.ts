import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  Inject,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { ResponseHelper } from '../common';
import {
  ListRoleQueryDto,
  RoleSortBy,
  RoleSortOrder,
  CreateRoleDto,
  UpdateRoleDto,
} from './dto';
import {
  ROLE_LIST_FETCHED_SUCCESS_MSG,
  ROLE_CATEGORIES_FETCHED_SUCCESS_MSG,
  ROLE_CATEGORIES_WITH_ROLES_FETCHED_SUCCESS_MSG,
  ROLE_CATEGORIES_WITH_ROLES_FETCH_ERROR_MSG,
  ROLE_CREATED_SUCCESS_MSG,
  ROLE_UPDATED_SUCCESS_MSG,
  ROLE_FETCHED_SUCCESS_MSG,
  ROLE_CATEGORY_NOT_FOUND_MSG,
  ROLE_CATEGORY_SUBMODULES_FETCHED_SUCCESS_MSG,
  ROLE_DUPLICATE_NAME_CATEGORY_MSG,
  ROLE_NOT_FOUND_MSG,
  ROLE_SUBMODULE_MODULE_UNAVAILABLE_MSG,
  ROLE_INVALID_SUBMODULES_MSG,
  ROLE_HIDDEN_SUBMODULES_NOT_ALLOWED_MSG,
  ROLE_DELETED_SUCCESS_MSG,
  ROLE_CANNOT_DELETE_SUPER_ADMIN_MSG,
  SUPER_ADMIN_ROLE_CATEGORY_NAME,
} from './constants/role.messages';
import { setAuditBefore } from '../audit/context/audit.context';

@Injectable({ scope: Scope.REQUEST })
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  /**
   * Validates the submodule IDs.
   * @param submoduleIds - The submodule IDs to validate.
   * @throws BadRequestException if the submodule IDs are invalid.
   * @throws ServiceUnavailableException if the submodule IDs are not available.
   */
  private async validateSubmoduleIds(
    submoduleIds: string[],
    categoryId: string,
  ): Promise<void> {
    try {
      const category = await this.prisma.roleCategory.findUnique({
        where: { id: categoryId },
        select: { name: true },
      });
      if (!category) {
        throw new BadRequestException(ROLE_INVALID_SUBMODULES_MSG);
      }

      const submodules = await this.prisma.submodule.findMany({
        where: { id: { in: submoduleIds } },
        select: {
          id: true,
          module: { select: { hidden: true } },
        },
      });
      if (submodules.length !== submoduleIds.length) {
        throw new BadRequestException(ROLE_INVALID_SUBMODULES_MSG);
      }

      if (category.name !== SUPER_ADMIN_ROLE_CATEGORY_NAME) {
        const hasHiddenModule = submodules.some((row) => row.module.hidden);
        if (hasHiddenModule) {
          throw new BadRequestException(ROLE_HIDDEN_SUBMODULES_NOT_ALLOWED_MSG);
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.warn('Submodule validation failed', error);
      throw new ServiceUnavailableException(
        ROLE_SUBMODULE_MODULE_UNAVAILABLE_MSG,
      );
    }
  }

  /**
   * Syncs the category submodules.
   * @param tx - The transaction client.
   * @param categoryId - The category ID to sync.
   * @param submoduleIds - The submodule IDs to sync.
   * @returns The void.
   */
  private async syncCategorySubmodules(
    tx: Prisma.TransactionClient,
    categoryId: string,
    submoduleIds: string[],
  ): Promise<void> {
    await tx.roleCategorySubmodule.deleteMany({
      where: { roleCategoryId: categoryId },
    });
    await tx.roleCategorySubmodule.createMany({
      data: submoduleIds.map((submoduleId) => ({
        roleCategoryId: categoryId,
        submoduleId,
        enabled: true,
      })),
    });
  }

  /**
   * Builds the order by clause.
   * @param sortBy - The sort by.
   * @param sortOrder - The sort order.
   * @returns The order by clause.
   */
  private buildOrderBy(sortBy: RoleSortBy, sortOrder: RoleSortOrder) {
    const dir = sortOrder;
    switch (sortBy) {
      case 'name':
        return { name: dir };
      case 'category':
        return { category: { name: dir } };
      case 'roleType':
        return [{ isPrivate: dir }, { isExternal: dir }];
      case 'description':
        return { description: dir };
      default:
        return { name: dir };
    }
  }

  /**
   * Finds all roles.
   * @param query - The query.
   * @returns The roles.
   */
  async findAll(query: ListRoleQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'name';
    const sortOrder = query.sortOrder ?? 'asc';
    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const where: {
      categoryId?: string;
      name?: { contains: string; mode: 'insensitive' };
    } = {};

    if (query.categoryId?.trim()) {
      where.categoryId = query.categoryId.trim();
    }

    if (query.search?.trim()) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    try {
      const [items, total] = await Promise.all([
        this.prisma.role.findMany({
          skip,
          take: limit,
          where: Object.keys(where).length > 0 ? where : undefined,
          orderBy: Array.isArray(orderBy) ? orderBy : [orderBy],
          include: {
            category: { select: { id: true, name: true } },
          },
        }),
        this.prisma.role.count({
          where: Object.keys(where).length > 0 ? where : undefined,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      const listItems = items.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category.name,
        categoryId: r.category.id,
        isPrivate: r.isPrivate,
        isExternal: r.isExternal,
        description: r.description ?? null,
      }));

      return ResponseHelper.success(ROLE_LIST_FETCHED_SUCCESS_MSG, {
        items: listItems,
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      this.logger.error('Error fetching role list', error);
      throw error;
    }
  }

  /**
   * Finds all role categories.
   * @returns The role categories.
   */
  async findCategories() {
    try {
      const categories = await this.prisma.roleCategory.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
      return ResponseHelper.success(
        ROLE_CATEGORIES_FETCHED_SUCCESS_MSG,
        categories,
      );
    } catch (error) {
      this.logger.error('Error fetching role categories', error);
      throw error;
    }
  }

  /**
   * Returns every role category (ordered by name) with nested roles for each category
   * (ordered by name), including role id, name, description, and visibility flags.
   * Excludes the seeded Super Admin category.
   */
  async findCategoriesWithRoles() {
    try {
      const categories = await this.prisma.roleCategory.findMany({
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
      return ResponseHelper.success(
        ROLE_CATEGORIES_WITH_ROLES_FETCHED_SUCCESS_MSG,
        categories,
      );
    } catch (error) {
      this.logger.error(ROLE_CATEGORIES_WITH_ROLES_FETCH_ERROR_MSG, error);
      throw error;
    }
  }

  /**
   * Finds a role by ID.
   * @param id - The ID of the role to find.
   * @returns The role.
   */
  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
      },
    });
    if (!role) {
      throw new NotFoundException(ROLE_NOT_FOUND_MSG);
    }

    const submoduleIds = await this.getEnabledSubmoduleIdsForCategory(
      role.categoryId,
    );

    return ResponseHelper.success(ROLE_FETCHED_SUCCESS_MSG, {
      id: role.id,
      name: role.name,
      categoryId: role.categoryId,
      category: role.category.name,
      description: role.description ?? null,
      isPrivate: role.isPrivate,
      isExternal: role.isExternal,
      submoduleIds,
    });
  }

  /**
   * Returns enabled submodule IDs configured for a role category.
   */
  async getCategoryEnabledSubmodules(categoryId: string) {
    const category = await this.prisma.roleCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException(ROLE_CATEGORY_NOT_FOUND_MSG);
    }

    const submoduleIds =
      await this.getEnabledSubmoduleIdsForCategory(categoryId);

    return ResponseHelper.success(
      ROLE_CATEGORY_SUBMODULES_FETCHED_SUCCESS_MSG,
      {
        submoduleIds,
      },
    );
  }

  /**
   * Gets the enabled submodule IDs for a category.
   * @param categoryId - The ID of the category.
   * @returns The enabled submodule IDs.
   */
  private async getEnabledSubmoduleIdsForCategory(
    categoryId: string,
  ): Promise<string[]> {
    const rows = await this.prisma.roleCategorySubmodule.findMany({
      where: { roleCategoryId: categoryId, enabled: true },
      select: { submoduleId: true },
      orderBy: { submodule: { sortOrder: 'asc' } },
    });
    return rows.map((row) => row.submoduleId);
  }

  /**
   * Creates a role.
   * @param dto - The data transfer object.
   * @returns The created role.
   */
  async create(dto: CreateRoleDto) {
    const duplicate = await this.prisma.role.findFirst({
      where: {
        name: { equals: dto.name.trim(), mode: 'insensitive' },
        categoryId: dto.categoryId,
      },
    });
    if (duplicate) {
      throw new BadRequestException(ROLE_DUPLICATE_NAME_CATEGORY_MSG);
    }

    await this.validateSubmoduleIds(dto.submoduleIds, dto.categoryId);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const role = await tx.role.create({
          data: {
            name: dto.name.trim(),
            categoryId: dto.categoryId,
            description: dto.description.trim(),
            isPrivate: dto.isPrivate ?? false,
            isExternal: dto.isExternal ?? false,
          },
        });
        await this.syncCategorySubmodules(tx, dto.categoryId, dto.submoduleIds);
        return role;
      });

      const withCategory = await this.prisma.role.findUnique({
        where: { id: created.id },
        include: { category: { select: { id: true, name: true } } },
      });
      if (!withCategory) {
        return ResponseHelper.success(ROLE_CREATED_SUCCESS_MSG, {
          id: created.id,
          name: created.name,
          categoryId: created.categoryId,
          category: '',
          isPrivate: created.isPrivate,
          isExternal: created.isExternal,
          description: created.description ?? null,
          submoduleIds: dto.submoduleIds,
        });
      }
      return ResponseHelper.success(ROLE_CREATED_SUCCESS_MSG, {
        id: withCategory.id,
        name: withCategory.name,
        categoryId: withCategory.categoryId,
        category: withCategory.category.name,
        isPrivate: withCategory.isPrivate,
        isExternal: withCategory.isExternal,
        description: withCategory.description ?? null,
        submoduleIds: dto.submoduleIds,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(ROLE_DUPLICATE_NAME_CATEGORY_MSG);
        }
      }
      throw error;
    }
  }

  /**
   * Updates a role.
   * @param id - The ID of the role to update.
   * @param dto - The data transfer object.
   * @returns The updated role.
   */
  async update(id: string, dto: UpdateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { id },
      include: { category: { select: { name: true } } },
    });
    if (!existing) {
      throw new NotFoundException(ROLE_NOT_FOUND_MSG);
    }

    const existingSubmoduleIds = await this.getEnabledSubmoduleIdsForCategory(
      existing.categoryId,
    );

    setAuditBefore(this.request, {
      id: existing.id,
      name: existing.name,
      categoryId: existing.categoryId,
      category: existing.category.name,
      description: existing.description ?? null,
      isPrivate: existing.isPrivate,
      isExternal: existing.isExternal,
      submoduleIds: existingSubmoduleIds,
    });

    const duplicate = await this.prisma.role.findFirst({
      where: {
        name: { equals: dto.name.trim(), mode: 'insensitive' },
        categoryId: dto.categoryId,
        id: { not: id },
      },
    });
    if (duplicate) {
      throw new BadRequestException(ROLE_DUPLICATE_NAME_CATEGORY_MSG);
    }

    await this.validateSubmoduleIds(dto.submoduleIds, dto.categoryId);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.role.update({
          where: { id },
          data: {
            name: dto.name.trim(),
            categoryId: dto.categoryId,
            description: dto.description.trim(),
            isPrivate: dto.isPrivate ?? false,
            isExternal: dto.isExternal ?? false,
          },
        });
        await this.syncCategorySubmodules(tx, dto.categoryId, dto.submoduleIds);
      });

      const updated = await this.prisma.role.findUnique({
        where: { id },
        include: { category: { select: { id: true, name: true } } },
      });
      if (!updated) {
        throw new NotFoundException(ROLE_NOT_FOUND_MSG);
      }
      return ResponseHelper.success(ROLE_UPDATED_SUCCESS_MSG, {
        id: updated.id,
        name: updated.name,
        categoryId: updated.categoryId,
        category: updated.category.name,
        isPrivate: updated.isPrivate,
        isExternal: updated.isExternal,
        description: updated.description ?? null,
        submoduleIds: dto.submoduleIds,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(ROLE_DUPLICATE_NAME_CATEGORY_MSG);
        }
      }
      throw error;
    }
  }

  /**
   * Removes a role.
   * @param id - The ID of the role to remove.
   * @returns The removed role.
   */
  async remove(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        category: { select: { name: true } },
      },
    });
    if (!role) {
      throw new NotFoundException(ROLE_NOT_FOUND_MSG);
    }
    if (role.category.name === SUPER_ADMIN_ROLE_CATEGORY_NAME) {
      throw new BadRequestException(ROLE_CANNOT_DELETE_SUPER_ADMIN_MSG);
    }

    const submoduleIds = await this.getEnabledSubmoduleIdsForCategory(
      role.categoryId,
    );

    setAuditBefore(this.request, {
      id: role.id,
      name: role.name,
      categoryId: role.categoryId,
      category: role.category.name,
      description: role.description ?? null,
      isPrivate: role.isPrivate,
      isExternal: role.isExternal,
      submoduleIds,
    });

    await this.prisma.role.delete({ where: { id } });
    return ResponseHelper.success(ROLE_DELETED_SUCCESS_MSG, { id: role.id });
  }
}
