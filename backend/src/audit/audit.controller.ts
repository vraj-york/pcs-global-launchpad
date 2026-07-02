import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dto';
import { ApiResponse } from '../common';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  RequireSubmodule,
  SUBMODULE_KEYS,
  SuperAdminGuard,
} from '../auth';

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  private readonly logger = new Logger(AuditController.name);

  constructor(private readonly auditService: AuditService) {}

  @Get()
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.ROLES_PERMISSIONS_VIEW)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fetch audit logs',
    description:
      'Fetches audit logs across all domains for security and compliance. Filter by domain (e.g., password_reset, corporation), event type, or user ID. No passwords or tokens are stored. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Audit logs fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Audit logs fetched successfully',
        },
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid' },
                  domain: {
                    type: 'string',
                    example: 'corporation',
                    description: 'Domain (e.g., password_reset, corporation)',
                  },
                  eventType: {
                    type: 'string',
                    example: 'VIEW',
                  },
                  entityId: {
                    type: 'string',
                    nullable: true,
                    example: 'corp-uuid-1',
                  },
                  userId: {
                    type: 'string',
                    nullable: true,
                    example: 'user-123',
                  },
                  ipAddress: {
                    type: 'string',
                    nullable: true,
                    example: '192.168.1.1',
                  },
                  createdAt: {
                    type: 'string',
                    format: 'date-time',
                  },
                },
              },
            },
            total: { type: 'number', example: 150 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 50 },
            totalPages: { type: 'number', example: 3 },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Invalid or expired token',
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Access denied. SuperAdmin role required.',
        },
      },
    },
  })
  async findAuditLogs(@Query() query: QueryAuditLogsDto): Promise<ApiResponse> {
    try {
      return await this.auditService.findAuditLogs(query);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in fetch audit logs endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
