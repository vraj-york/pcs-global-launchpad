import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { PermissionService } from './permission.service';
import { ApiResponse } from '../common';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  RequireSubmodule,
  SUBMODULE_KEYS,
  SuperAdminGuard,
} from '../auth';

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionController {
  private readonly logger = new Logger(PermissionController.name);

  constructor(private readonly permissionService: PermissionService) {}

  @Get('modules')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.ROLES_PERMISSIONS_VIEW)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List modules (categories)',
    description:
      'Returns all modules for permission category filter dropdown. Requires roles & permissions view access.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Modules fetched successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - insufficient submodule access',
  })
  async listModules(): Promise<ApiResponse> {
    try {
      return await this.permissionService.findModules();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in modules list endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('modules-with-submodules')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.ROLES_PERMISSIONS_VIEW)
  @ApiBearerAuth()
  @ApiQuery({
    name: 'roleCategoryId',
    required: false,
    description:
      'When set to the Super Admin role category id, hidden modules are included in the grid.',
  })
  @ApiOperation({
    summary: 'List modules with submodules',
    description:
      'Returns modules with submodule IDs for the role permissions grid. Hidden modules are omitted unless roleCategoryId is Super Admin.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Modules with submodules fetched successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - insufficient submodule access',
  })
  async listModulesWithSubmodules(
    @Query('roleCategoryId') roleCategoryId?: string,
  ): Promise<ApiResponse> {
    try {
      return await this.permissionService.findModulesWithSubmodules(
        roleCategoryId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in modules-with-submodules endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /** @deprecated Use GET /permissions/modules-with-submodules */
  @Get('modules-with-permissions')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.ROLES_PERMISSIONS_VIEW)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List modules with submodules (legacy path)',
    deprecated: true,
  })
  async listModulesWithPermissions(
    @Query('roleCategoryId') roleCategoryId?: string,
  ): Promise<ApiResponse> {
    return this.listModulesWithSubmodules(roleCategoryId);
  }
}
