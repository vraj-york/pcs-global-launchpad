import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { ListCompanyDirectoryQueryDto } from './dto';
import { ResponseHelper, type ApiResponse } from '../common';
import { CognitoAuthGuard, CurrentUser } from '../auth';
import {
  OWNERSHIP_TYPES,
  COMPANY_TYPES,
  OFFICE_TYPES,
} from './constants/company.enums';

@ApiTags('Company Directory')
@Controller('companies')
export class CompanyDirectoryController {
  private readonly logger = new Logger(CompanyDirectoryController.name);

  constructor(private readonly companyService: CompanyService) {}

  @Get('form-options')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get company form dropdown options',
    description:
      'Returns ownership types, company types, and office types for the Add Company Step 1 form dropdowns. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Form options fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Form options fetched successfully',
        },
        data: {
          type: 'object',
          properties: {
            ownershipTypes: {
              type: 'array',
              items: { type: 'string' },
              example: ['Wholly Owned', 'Majority', 'Affiliate', 'Franchise'],
            },
            companyTypes: {
              type: 'array',
              items: { type: 'string' },
              example: [
                'Operating Company',
                'Subsidiary',
                'Franchise',
                'Division',
              ],
            },
            officeTypes: {
              type: 'array',
              items: { type: 'string' },
              example: ['HQ', 'Regional', 'Field', 'Virtual'],
            },
          },
        },
      },
    },
  })
  getFormOptions(): ApiResponse {
    return ResponseHelper.success('Form options fetched successfully', {
      ownershipTypes: [...OWNERSHIP_TYPES],
      companyTypes: [...COMPANY_TYPES],
      officeTypes: [...OFFICE_TYPES],
    });
  }

  @Get('filter-options')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get Company Directory filter dropdown options',
    description:
      'Returns options for Status, Corporation, and Plan filter dropdowns on the Company Directory page. Status values match company status (Active, Incomplete, Suspended, Closed); plans are plan types (value = planTypeId, label = plan type name). Corporation options are returned only for SuperAdmin; other allowed roles receive an empty corporations array.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Filter options fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Company directory filter options fetched successfully',
        },
        data: {
          type: 'object',
          properties: {
            statuses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: { type: 'string', example: 'ACTIVE' },
                  label: { type: 'string', example: 'Active' },
                },
              },
            },
            corporations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid' },
                  label: {
                    type: 'string',
                    example: 'Acme Corporation (CORP-001)',
                  },
                },
              },
            },
            plans: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: {
                    type: 'string',
                    example: 'monthly',
                    description: 'planTypeId',
                  },
                  label: { type: 'string', example: 'BSPBlueprint' },
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
  @ApiForbiddenResponse({
    description:
      'Forbidden - caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin',
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal Server Error - Failed to fetch filter options',
  })
  async getFilterOptions(
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.getDirectoryFilterOptionsForRequester(
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in company directory filter-options endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get()
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List companies (Company Directory)',
    description:
      'Returns a paginated list of all companies with optional search and filters. Search matches company name or assigned corporation name (partial, case-insensitive). Default order: Created On (descending). Supports filtering by status (company status: active, incomplete, suspended, closed, or all), corporation, plan, and created date range. **SuperAdmin:** full directory. **CorporationAdmin:** only companies under their linked corporation (`query.corporationId` is ignored unless it matches that id).',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Company directory list fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Company directory list fetched successfully',
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
                  companyId: { type: 'string', example: 'COMP-001' },
                  name: { type: 'string', example: 'New York HQ' },
                  location: { type: 'string', nullable: true },
                  status: { type: 'string', example: 'ACTIVE' },
                  assignedCorporation: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      corporationCode: {
                        type: 'string',
                        example: 'CORP-001',
                        description: 'Display corporation code',
                      },
                    },
                  },
                  plan: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      id: { type: 'string' },
                      planTypeId: { type: 'string' },
                      name: { type: 'string', nullable: true },
                      customerType: { type: 'string', nullable: true },
                    },
                  },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 14 },
                page: { type: 'integer', example: 1 },
                pageSize: { type: 'integer', example: 10 },
                totalPages: { type: 'integer', example: 2 },
              },
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Invalid query parameters',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
          ],
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
        message: { type: 'string', example: 'Invalid or expired token' },
      },
    },
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - caller is not SuperAdmin or CorporationAdmin, or CorporationAdmin requested another corporation filter',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'You do not have permission to view the company directory.',
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description:
      'Internal Server Error - Failed to fetch company directory list',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example:
            'Failed to fetch company directory list. Please try again later.',
        },
      },
    },
  })
  async list(
    @Query() query: ListCompanyDirectoryQueryDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.findAllPaginatedForRequester(
        query,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in company directory list endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
