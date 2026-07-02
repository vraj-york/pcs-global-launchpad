import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { ResponseHelper } from '../common';
import { SUPER_ADMIN_ROLE_CATEGORY_NAME } from '../role/constants/role.messages';
import {
  MODULES_LIST_FETCHED_SUCCESS_MSG,
  MODULES_WITH_SUBMODULES_FETCHED_SUCCESS_MSG,
} from './constants/permission.messages';

export type SubmoduleDto = {
  id: string;
  key: string;
  name: string;
};

export type ModuleWithSubmodulesDto = {
  id: string;
  name: string;
  submodules: SubmoduleDto[];
};

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetches all modules (categories).
   */
  async findModules() {
    try {
      const modules = await this.prisma.module.findMany({
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true },
      });
      return ResponseHelper.success(MODULES_LIST_FETCHED_SUCCESS_MSG, modules);
    } catch (error) {
      this.logger.error('Error fetching modules', error);
      throw error;
    }
  }

  /**
   * Fetches all modules with submodules for the role create/edit permissions grid.
   * Hidden modules are included only when roleCategoryId refers to Super Admin.
   */
  async findModulesWithSubmodules(
    roleCategoryId?: string,
  ): Promise<
    ReturnType<typeof ResponseHelper.success<ModuleWithSubmodulesDto[]>>
  > {
    try {
      const includeHidden =
        await this.shouldIncludeHiddenModules(roleCategoryId);
      const modules = await this.prisma.module.findMany({
        where: includeHidden ? undefined : { hidden: false },
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

      const data: ModuleWithSubmodulesDto[] = modules.map((m) => ({
        id: m.id,
        name: m.name,
        submodules: m.submodules,
      }));

      return ResponseHelper.success(
        MODULES_WITH_SUBMODULES_FETCHED_SUCCESS_MSG,
        data,
      );
    } catch (error) {
      this.logger.error('Error fetching modules with submodules', error);
      throw error;
    }
  }

  /**
   * Determines if hidden modules should be included in the modules with submodules response.
   * Hidden modules are included only when roleCategoryId refers to Super Admin.
   */
  private async shouldIncludeHiddenModules(
    roleCategoryId?: string,
  ): Promise<boolean> {
    const trimmed = roleCategoryId?.trim();
    if (!trimmed) return false;
    const category = await this.prisma.roleCategory.findUnique({
      where: { id: trimmed },
      select: { name: true },
    });
    return category?.name === SUPER_ADMIN_ROLE_CATEGORY_NAME;
  }
}
