import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiUnprocessableEntityResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CorporationService } from './corporation.service';
import {
  BRAND_LOGO_FILE_REQUIRED_MSG,
  BRAND_LOGO_SINGLE_FILE_ONLY_MSG,
  CORPORATION_DASHBOARD_ANALYTICS_FETCH_FAILED_LOG,
} from './constants';
import {
  CreateCorporationDto,
  ListCorporationQueryDto,
  UpdateCorporationDto,
  UpdateStepsDto,
  SuspendCloseCorporationDto,
  UpsertKeyContactDto,
  CorporationDashboardAnalyticsQueryDto,
} from './dto';
import { ApiResponse } from '../common';
import { CognitoAuthGuard, SuperAdminGuard } from '../auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Auditable } from '../audit';

@ApiTags('Corporations')
@Controller('corporations')
export class CorporationController {
  private readonly logger = new Logger(CorporationController.name);

  constructor(private readonly corporationService: CorporationService) {}

  @Get()
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List corporations',
    description:
      'Returns a paginated list of corporations with id, corporationCode, legalName, dataResidencyRegion, corporation admin name/email, no of companies, and created date. Optional search by corporation legal name or corporation admin name (partial, case-insensitive). Supports sorting by corporationCode, legalName, status, adminName (corporation admin name), companyCount, createdAt (default: descending by createdAt). Optional filter by created date: last24Hours, last7Days, last30Days, last3Months, last6Months, lastYear. Optional filter by status: all (default), active, or incomplete (API lowercase; DB uppercase). Default 10 records per page. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Corporation list fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Corporation list fetched successfully',
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
                  corporationCode: { type: 'number', example: 1 },
                  legalName: {
                    type: 'string',
                    example: 'Acme Corporation Inc.',
                  },
                  dataResidencyRegion: { type: 'string', example: 'US-East' },
                  ownershipType: { type: 'string', example: 'Private' },
                  corporationAdminName: {
                    type: 'string',
                    example: 'Jane Smith',
                    nullable: true,
                  },
                  corporationAdminEmail: {
                    type: 'string',
                    example: 'jane.smith@example.com',
                    nullable: true,
                  },
                  noOfCompanies: { type: 'number', example: 3 },
                  submittedSteps: { type: 'number', example: 1 },
                  mode: { type: 'string', example: 'quick' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'number', example: 25 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 3 },
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
  async list(@Query() query: ListCorporationQueryDto): Promise<ApiResponse> {
    try {
      return await this.corporationService.findAll(query);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in corporation list endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('list')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List active corporations (minimal)',
    description:
      'Returns active corporations with id, corporation legal name, ownership type, region (dataResidencyRegion), and corporation admin from `app_users` (user_type contains corp_admin, not deleted; earliest row per corporation). `corporationAdmin.id` is the user Cognito sub. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Active corporation list fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Active corporation list fetched successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              legalName: { type: 'string', example: 'Acme Corporation Inc.' },
              ownershipType: { type: 'string', example: 'Private' },
              dataResidencyRegion: { type: 'string', example: 'US-East' },
              corporationAdmin: {
                type: 'object',
                nullable: true,
                description:
                  'From app_users (corp_admin, not deleted); id is cognito_sub',
                properties: {
                  id: { type: 'string', example: 'uuid' },
                  corporationId: { type: 'string', example: 'uuid' },
                  firstName: { type: 'string', example: 'Jane' },
                  lastName: { type: 'string', example: 'Smith' },
                  nickname: { type: 'string', nullable: true },
                  jobRole: { type: 'string', example: 'Corporation Admin' },
                  email: { type: 'string', example: 'jane.smith@example.com' },
                  workPhone: { type: 'string', example: '+1-555-000-0000' },
                  cellPhone: { type: 'string', nullable: true },
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
    description: 'Forbidden - SuperAdmin role required',
  })
  async listActive(): Promise<ApiResponse> {
    try {
      return await this.corporationService.findActiveList();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in active corporation list endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('all')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all corporations (id and name only)',
    description:
      'Returns every corporation with id and name (legal name) only, ordered by name ascending. Includes all statuses. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'All corporations fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'All corporations fetched successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              legalName: { type: 'string', example: 'Acme Corporation Inc.' },
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
  async listAll(): Promise<ApiResponse> {
    try {
      return await this.corporationService.findAllIdAndName();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in corporation all endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('dashboard/system-analytics')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Corporation Admin dashboard system analytics',
    description:
      'Donut-chart aggregates for the caller corporation companies and users by lifecycle status, plus assessment completed/in-progress counts and average completion time (days). Assessments: report_generated counts as completed (time window on completed_at); other statuses count as in progress (time window on started_at); avgTimeToComplete uses started_at and completed_at for rows with both timestamps (time window on completed_at). Optional query: companyId, timeFilter (last24Hours, last7Days, last30Days, last3Months, last6Months, lastYear). Without timeFilter, all matching rows are counted. Requires CorporationAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Corporation dashboard analytics returned successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiForbiddenResponse({
    description:
      'Forbidden - CorporationAdmin role required, no linked corporation, or companyId is outside the caller corporation',
  })
  async getDashboardAnalytics(
    @Query() query: CorporationDashboardAnalyticsQueryDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.corporationService.getDashboardAnalyticsForRequester(
        query,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `${CORPORATION_DASHBOARD_ANALYTICS_FETCH_FAILED_LOG}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get(':id')
  @UseGuards(CognitoAuthGuard)
  @Auditable({
    domain: 'corporation',
    eventType: 'VIEW',
    entityIdParam: 'id',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description:
      'Corporation UUID, or the literal `me` for CorporationAdmin (resolves to `app_users.corporation_id` for that Cognito user). SuperAdmin must pass the corporation UUID (not `me`).',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Fetch corporation details',
    description:
      'Fetches a corporation by ID with its single address, corporation-level app key contacts (`app_key_contacts` with no company, not deleted), the corporation admin app user (`app_users` with user_type containing corp_admin, not deleted), and nested companies. For each company, admin profile fields (firstName, lastName, nickname, jobRole, email, workPhone, cellPhone) come from `user_company_access` (is_admin) and `app_users` (not deleted), using the earliest access row per company. **SuperAdmin:** any corporation UUID. **CorporationAdmin:** only their own corporation — pass that UUID or `me`.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Corporation details fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Corporation details fetched successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            corporationCode: { type: 'number', example: 1 },
            legalName: { type: 'string', example: 'Acme Corporation Inc.' },
            dbaName: { type: 'string', example: 'Acme Corp', nullable: true },
            website: {
              type: 'string',
              example: 'https://www.acme.com',
              nullable: true,
            },
            dataResidencyRegion: { type: 'string', example: 'US-East' },
            ownershipType: { type: 'string', example: 'Private' },
            industry: { type: 'string', example: 'Technology' },
            phoneNo: { type: 'string', example: '+1-555-123-4567' },
            status: { type: 'string', example: 'INCOMPLETE' },
            mode: { type: 'string', example: 'quick' },
            submittedSteps: { type: 'number', example: 1 },
            address: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                addressLine: { type: 'string' },
                state: { type: 'string' },
                city: { type: 'string' },
                country: { type: 'string' },
                zip: { type: 'string' },
                timezone: { type: 'string' },
              },
            },
            appKeyContacts: {
              type: 'array',
              description:
                'Corporation-scoped rows from app_key_contacts (company_id null, not soft-deleted)',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  corporationId: { type: 'string', nullable: true },
                  contactType: { type: 'string', nullable: true },
                  firstName: { type: 'string', nullable: true },
                  lastName: { type: 'string', nullable: true },
                  nickname: { type: 'string', nullable: true },
                  email: { type: 'string', nullable: true },
                  jobRole: { type: 'string', nullable: true },
                  workPhone: { type: 'string', nullable: true },
                  cellPhone: { type: 'string', nullable: true },
                  sameAsCorpAdmin: { type: 'boolean' },
                },
              },
            },
            corporationAdminAppUser: {
              type: 'object',
              nullable: true,
              description:
                'Single app_users row for this corporation with user_type containing corp_admin (not deleted), if any',
              properties: {
                cognitoSub: { type: 'string' },
                corporationId: { type: 'string', nullable: true },
                email: { type: 'string', nullable: true },
                firstName: { type: 'string', nullable: true },
                lastName: { type: 'string', nullable: true },
                nickname: { type: 'string', nullable: true },
                jobRole: { type: 'string', nullable: true },
                workPhone: { type: 'string', nullable: true },
                cellPhone: { type: 'string', nullable: true },
              },
            },
            companies: {
              type: 'array',
              description:
                'Non-deleted companies; company admin fields from user_company_access (is_admin) + app_users',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  legalName: { type: 'string' },
                  phoneNo: { type: 'string', nullable: true },
                  firstName: { type: 'string', nullable: true },
                  lastName: { type: 'string', nullable: true },
                  nickname: { type: 'string', nullable: true },
                  jobRole: {
                    type: 'string',
                    nullable: true,
                    description: 'From app_users.job_role for company admin',
                  },
                  email: { type: 'string', nullable: true },
                  workPhone: { type: 'string', nullable: true },
                  cellPhone: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Corporation not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Corporation with ID "uuid" not found',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description:
      'Caller is not SuperAdmin or CorporationAdmin, corporation admin has no linked corporation, or corporation admin requested another corporation’s id',
  })
  @ApiBadRequestResponse({
    description:
      'SuperAdmin used path segment `me` instead of a corporation UUID',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.corporationService.findOneForRequester(
        id,
        user.sub,
        user.groups,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in fetch corporation details endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post()
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @Auditable({
    domain: 'corporation',
    eventType: 'ADD',
    entityIdPath: 'data.id',
  })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new corporation first step',
    description:
      'Creates a new corporation with one address and one executive sponsor. Company code is auto-generated. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 201,
    description: 'Corporation created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Corporation created successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            legalName: { type: 'string', example: 'Acme Corporation Inc.' },
            dbaName: { type: 'string', example: 'Acme Corp', nullable: true },
            website: {
              type: 'string',
              example: 'https://www.acme.com',
              nullable: true,
            },
            dataResidencyRegion: { type: 'string', example: 'US-East' },
            ownershipType: { type: 'string', example: 'Private' },
            industry: { type: 'string', example: 'Technology' },
            phoneNo: { type: 'string', example: '+1-555-123-4567' },
            address: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                addressLine: { type: 'string' },
                state: { type: 'string' },
                city: { type: 'string' },
                country: { type: 'string' },
                zip: { type: 'string' },
                timezone: { type: 'string' },
              },
            },
            executiveSponsor: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                nickname: { type: 'string', nullable: true },
                jobRole: { type: 'string' },
                email: { type: 'string' },
                workPhone: { type: 'string' },
                cellPhone: { type: 'string', nullable: true },
              },
            },
            corporationAdmin: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                corporationId: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                nickname: { type: 'string', nullable: true },
                jobRole: { type: 'string' },
                email: { type: 'string' },
                workPhone: { type: 'string' },
                cellPhone: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    description: 'Validation failed - Invalid input data',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          oneOf: [
            { type: 'string', example: 'Validation failed' },
            {
              type: 'array',
              items: { type: 'string' },
              example: [
                'legalName: legalName must be a string',
                'address.addressLine: addressLine should not be empty',
              ],
            },
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
  @ApiConflictResponse({
    description:
      'Conflict - Corporation with the same legal name already exists',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example:
            'A corporation with the legal name "Acme Corporation Inc." already exists',
        },
      },
    },
  })
  async create(
    @Body() createCorporationDto: CreateCorporationDto,
  ): Promise<ApiResponse> {
    try {
      return await this.corporationService.create(createCorporationDto);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in create corporation endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @Auditable({
    domain: 'corporation',
    eventType: 'EDIT',
    entityIdParam: 'id',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Corporation ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Update a corporation first step',
    description:
      'Updates an existing corporation with address and executive sponsor. Legal name must remain unique. Nested executiveSponsor and corporationAdmin use jobRole for the job title (same as POST /corporations). Requires SuperAdmin role.',
  })
  @ApiBody({ type: UpdateCorporationDto })
  @SwaggerApiResponse({
    status: 200,
    description: 'Corporation updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Corporation updated successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            legalName: { type: 'string', example: 'Acme Corporation Inc.' },
            dbaName: { type: 'string', example: 'Acme Corp', nullable: true },
            website: {
              type: 'string',
              example: 'https://www.acme.com',
              nullable: true,
            },
            dataResidencyRegion: { type: 'string', example: 'US-East' },
            ownershipType: { type: 'string', example: 'Private' },
            industry: { type: 'string', example: 'Technology' },
            phoneNo: { type: 'string', example: '+1-555-123-4567' },
            address: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                addressLine: { type: 'string' },
                state: { type: 'string' },
                city: { type: 'string' },
                country: { type: 'string' },
                zip: { type: 'string' },
                timezone: { type: 'string' },
              },
            },
            executiveSponsor: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                nickname: { type: 'string', nullable: true },
                jobRole: { type: 'string' },
                email: { type: 'string' },
                workPhone: { type: 'string' },
                cellPhone: { type: 'string', nullable: true },
              },
            },
            corporationAdmin: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                corporationId: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                nickname: { type: 'string', nullable: true },
                jobRole: { type: 'string' },
                email: { type: 'string' },
                workPhone: { type: 'string' },
                cellPhone: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    description: 'Validation failed - Invalid input data',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          oneOf: [
            { type: 'string', example: 'Validation failed' },
            {
              type: 'array',
              items: { type: 'string' },
              example: [
                'legalName: legalName must be a string',
                'address.addressLine: addressLine should not be empty',
              ],
            },
          ],
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Corporation not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Corporation with ID "uuid" not found',
        },
      },
    },
  })
  @ApiConflictResponse({
    description:
      'Conflict - Corporation with the same legal name already exists',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example:
            'A corporation with the legal name "Acme Corporation Inc." already exists',
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
  async update(
    @Param('id') id: string,
    @Body() updateCorporationDto: UpdateCorporationDto,
  ): Promise<ApiResponse> {
    try {
      return await this.corporationService.update(id, updateCorporationDto);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in update corporation endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Patch(':id/key-contact')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @Auditable({
    domain: 'key_contact',
    eventType: 'EDIT', // Could be ADD or EDIT based on complianceContact
    entityIdParam: 'id',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Corporation ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Add, update, or remove key contact',
    description:
      'When complianceContact is true: add or update the legal/compliance row in app_key_contacts (contact_type legal_compliance_contact). firstName, lastName, email, workPhone required; jobRole, nickname, cellPhone optional. When complianceContact is false: soft-delete that row (deleted_at set). Requires SuperAdmin role.',
  })
  @ApiBody({ type: UpsertKeyContactDto })
  @SwaggerApiResponse({
    status: 200,
    description: 'Key contact updated or removed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Key contact updated successfully',
        },
        data: {
          oneOf: [
            {
              type: 'object',
              nullable: true,
              description: 'Key contact when upserted',
            },
            { type: 'null', description: 'When key contact was removed' },
          ],
          properties: {
            id: { type: 'string' },
            contactType: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            nickname: { type: 'string', nullable: true },
            jobRole: { type: 'string', nullable: true },
            email: { type: 'string' },
            workPhone: { type: 'string' },
            cellPhone: { type: 'string', nullable: true },
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    description:
      'Validation failed - when complianceContact is true, firstName, lastName, email, workPhone are required',
  })
  @ApiNotFoundResponse({
    description: 'Corporation not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  async upsertKeyContact(
    @Param('id') id: string,
    @Body() dto: UpsertKeyContactDto,
  ): Promise<ApiResponse> {
    try {
      return await this.corporationService.upsertKeyContact(id, dto);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in upsert key contact endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Patch(':id/steps')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @Auditable({
    domain: 'corporation',
    eventType: 'EDIT',
    entityIdParam: 'id',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Corporation ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Update corporation submitted steps',
    description:
      'Updates submitted steps for a corporation. Type is mandatory. When type is "company", sets submitted steps to 2. When type is "branding", sets submitted steps to 3 (e.g. when user skips logo). When type is "confirmation" and mode is "quick", sets submitted steps to 3; otherwise sets to 5. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Corporation steps updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Corporation steps updated successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            submittedSteps: { type: 'number', example: 3 },
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    description: 'Validation failed - type is required',
  })
  @ApiNotFoundResponse({
    description: 'Corporation not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Corporation with ID "uuid" not found',
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
  async updateSteps(
    @Param('id') id: string,
    @Body() updateStepsDto: UpdateStepsDto,
  ): Promise<ApiResponse> {
    try {
      return await this.corporationService.updateSteps(id, updateStepsDto);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in update steps endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Patch(':id/status')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Corporation ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Suspend or close corporation',
    description:
      'Updates corporation status to SUSPENDED or CLOSED. Request body: status (SUSPENDED | CLOSED), suspendCloseReason (required), optional suspendCloseAdditionalNotes. When status is SUSPENDED, every non-deleted company under the corporation is set to SUSPENDED with the same reason/notes on `corporation_companies`, and users linked via `user_company_access` or `app_users.corporation_id` are signed out, disabled in Cognito, and set to Blocked (same as POST `/corporations/companies/:id/suspend`). When status is CLOSED, every non-deleted company is set to CLOSED with the same reason/notes, the same user sign-out, Cognito disable, and Blocked status apply, and each related company Stripe subscription is scheduled for cancellation at period end (same as POST `/finance/billing/companies/:companyId/cancel-subscription`). Blocked: suspend when already suspended (action disabled); suspend when corporation is closed; close when already closed. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Corporation status updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Corporation status updated successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            status: { type: 'string', example: 'CLOSED' },
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    description:
      'Validation failed - status must be SUSPENDED or CLOSED; suspendCloseReason is required',
  })
  @SwaggerApiResponse({
    status: 400,
    description:
      'Bad request - Already suspended (action disabled), cannot suspend closed corporation, or already closed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Corporation is already suspended; action disabled',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Corporation not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Corporation with ID "uuid" not found',
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
  async suspendOrClose(
    @Param('id') id: string,
    @Body() dto: SuspendCloseCorporationDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.corporationService.suspendOrClose(id, dto, {
        cognitoSub: user.sub,
        groups: user.groups,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in suspend/close corporation endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Patch(':id/brand-logo')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @Auditable({
    domain: 'branding_logo',
    eventType: 'EDIT',
    entityIdParam: 'id',
  })
  @UseInterceptors(
    FilesInterceptor('logo', 10, { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['logo'],
      properties: {
        logo: {
          type: 'string',
          format: 'binary',
          description: 'Brand logo file (PNG or JPG, max 10 MB)',
        },
      },
    },
  })
  @ApiParam({
    name: 'id',
    description: 'Corporation ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Upload corporation brand logo - add/update',
    description:
      'Uploads a brand logo for the corporation. Allowed: PNG or JPG. Max size: 10 MB. Stored in S3 under brand-logos/. If a logo already exists, it is replaced. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Brand logo uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Brand logo uploaded successfully',
        },
        data: {
          type: 'object',
          properties: {
            brandLogo: {
              type: 'string',
              example:
                'https://bsp-blueprint-dev-frontend.s3.us-east-1.amazonaws.com/corporation-brand-logos/550e8400-e29b-41d4-a716-446655440000.png',
              description: 'Full public URL of the uploaded logo',
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Corporation not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  async uploadBrandLogo(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<ApiResponse> {
    if (!files?.length) {
      throw new BadRequestException(BRAND_LOGO_FILE_REQUIRED_MSG);
    }
    if (files.length > 1) {
      throw new BadRequestException(BRAND_LOGO_SINGLE_FILE_ONLY_MSG);
    }
    try {
      return await this.corporationService.uploadBrandLogo(id, files[0]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in upload brand logo endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Delete(':id/brand-logo')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @Auditable({
    domain: 'branding_logo',
    eventType: 'REMOVE',
    entityIdParam: 'id',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Corporation ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Delete corporation brand logo in advanced flow',
    description:
      'Deletes the brand logo for the corporation. Removes the file from S3 and clears the logo reference. Idempotent if no logo exists. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Brand logo deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Brand logo deleted successfully',
        },
        data: { type: 'object', nullable: true },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Corporation not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  async deleteBrandLogo(@Param('id') id: string): Promise<ApiResponse> {
    try {
      return await this.corporationService.deleteBrandLogo(id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in delete brand logo endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post(':id/reinstate')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @Auditable({
    domain: 'corporation',
    eventType: 'REINSTATED',
    entityIdParam: 'id',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Corporation ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Reinstate corporation',
    description:
      'Reinstates a suspended corporation by setting its status to ACTIVE. Only corporations with status SUSPENDED can be reinstated. Also sets every non-deleted SUSPENDED company under the corporation to ACTIVE and, for users linked via `user_company_access` or `app_users.corporation_id`, sets `app_users.status` to Active and enables them in Cognito (same as POST `/corporations/companies/:id/reinstate`). No request body. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Corporation reinstated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Corporation reinstated successfully',
        },
        data: {
          type: 'object',
          properties: { id: { type: 'string', example: 'uuid' } },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Corporation not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  @SwaggerApiResponse({
    status: 400,
    description:
      'Bad request - Corporation can only be reinstated when status is suspended',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example:
            'Corporation can only be reinstated when status is suspended',
        },
      },
    },
  })
  async reinstate(@Param('id') id: string): Promise<ApiResponse> {
    try {
      return await this.corporationService.reinstate(id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in reinstate corporation endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
