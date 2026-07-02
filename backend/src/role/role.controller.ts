import {
  Controller,
  Delete,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { RoleService } from './role.service';
import { ListRoleQueryDto, CreateRoleDto, UpdateRoleDto } from './dto';
import { ApiResponse } from '../common';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  RequireSubmodule,
  SUBMODULE_KEYS,
  SuperAdminGuard,
} from '../auth';
import { Auditable } from '../audit/decorators/auditable.decorator';
import { AUDIT_DOMAINS } from '../audit/constants';

@ApiTags('Roles')
@Controller('roles')
export class RoleController {
  private readonly logger = new Logger(RoleController.name);

  constructor(private readonly roleService: RoleService) {}

  @Get()
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.ROLES_PERMISSIONS_VIEW)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List roles',
    description:
      'Returns a paginated list of roles with name, category, role type (Private/Public, Internal/External), and description. Supports search by role name, filter by categoryId, and sorting. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Role list fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Role list fetched successfully' },
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  category: { type: 'string' },
                  categoryId: { type: 'string' },
                  isPrivate: { type: 'boolean' },
                  isExternal: { type: 'boolean' },
                  description: { type: 'string', nullable: true },
                },
              },
            },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  async list(@Query() query: ListRoleQueryDto): Promise<ApiResponse> {
    try {
      return await this.roleService.findAll(query);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in role list endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('categories')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List role categories',
    description:
      'Returns all role categories for the filter dropdown. Requires a valid authentication token.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Role categories fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Role categories fetched successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  async listCategories(): Promise<ApiResponse> {
    try {
      return await this.roleService.findCategories();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in role categories endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('categories/with-roles')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List role categories with roles',
    description:
      'Returns all role categories with their associated roles (excluding the Super Admin category). No pagination. Requires a valid authentication token.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Role categories with roles fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Role categories with roles fetched successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string', nullable: true },
              roles: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    isPrivate: { type: 'boolean' },
                    isExternal: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  async listCategoriesWithRoles(): Promise<ApiResponse> {
    try {
      return await this.roleService.findCategoriesWithRoles();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in role categories with roles endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('categories/:categoryId/enabled-submodules')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.ROLES_PERMISSIONS_VIEW)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get enabled submodules for a role category',
    description:
      'Returns submodule IDs currently enabled for the given role category. Used when switching category on the role form.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Role category submodule permissions fetched successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - insufficient submodule access',
  })
  async getCategoryEnabledSubmodules(
    @Param('categoryId') categoryId: string,
  ): Promise<ApiResponse> {
    try {
      return await this.roleService.getCategoryEnabledSubmodules(categoryId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in role category enabled submodules endpoint (categoryId=${categoryId}): ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get(':id')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.ROLES_PERMISSIONS_VIEW)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get role by ID',
    description:
      'Returns a single role with category and enabled submodule IDs for the role permissions grid.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Role fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            categoryId: { type: 'string' },
            category: { type: 'string' },
            description: { type: 'string', nullable: true },
            isPrivate: { type: 'boolean' },
            isExternal: { type: 'boolean' },
            submoduleIds: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Enabled submodule IDs for this role’s category (for permissions grid checkboxes)',
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  async getOne(@Param('id') id: string): Promise<ApiResponse> {
    try {
      return await this.roleService.findOne(id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in get role endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post()
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.ROLES_PERMISSIONS_MANAGE)
  @Auditable({
    domain: AUDIT_DOMAINS.ROLE,
    eventType: 'ADD',
    entityIdPath: 'data.id',
    target: 'Role',
  })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create role',
    description:
      'Creates a new role and syncs enabled submodules for its category. At least one submodule required. Duplicate name within same category is rejected.',
  })
  @SwaggerApiResponse({
    status: 201,
    description: 'Role created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Role created successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            categoryId: { type: 'string' },
            category: { type: 'string' },
            isPrivate: { type: 'boolean' },
            isExternal: { type: 'boolean' },
            description: { type: 'string', nullable: true },
            submoduleIds: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - insufficient submodule access',
  })
  async create(@Body() dto: CreateRoleDto): Promise<ApiResponse> {
    try {
      return await this.roleService.create(dto);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in create role endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.ROLES_PERMISSIONS_MANAGE)
  @Auditable({
    domain: AUDIT_DOMAINS.ROLE,
    eventType: 'EDIT',
    entityIdParam: 'id',
    target: 'Role',
  })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update role',
    description:
      'Updates an existing role and replaces enabled submodules for its category. Full submodule set required. Duplicate name within same category is rejected.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Role updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Role updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            categoryId: { type: 'string' },
            category: { type: 'string' },
            isPrivate: { type: 'boolean' },
            isExternal: { type: 'boolean' },
            description: { type: 'string', nullable: true },
            submoduleIds: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - insufficient submodule access',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<ApiResponse> {
    try {
      return await this.roleService.update(id, dto);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in update role endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.ROLES_PERMISSIONS_MANAGE)
  @Auditable({
    domain: AUDIT_DOMAINS.ROLE,
    eventType: 'REMOVE',
    entityIdParam: 'id',
    target: 'Role',
  })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete role',
    description:
      'Deletes a role by ID. Super Admin role cannot be deleted. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Role deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Role deleted successfully' },
        data: {
          type: 'object',
          properties: { id: { type: 'string' } },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  async delete(@Param('id') id: string): Promise<ApiResponse> {
    try {
      return await this.roleService.remove(id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in delete role endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
