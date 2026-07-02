import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnprocessableEntityResponse,
  ApiConflictResponse,
  ApiConsumes,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { ApiResponse } from '../common';
import { CognitoAuthGuard, CurrentUser, SuperAdminGuard } from '../auth';
import { Auditable } from '../audit';
import {
  UpsertCompanyKeyContactsDto,
  UpsertCompanyPlanSeatDto,
  UpdateCompanyStep1Dto,
  UpsertCompanyConfigurationDto,
  SuspendCompanyDto,
  ListAllCompaniesQueryDto,
  CompanyDashboardAnalyticsQueryDto,
} from './dto';
import { COMPANY_DASHBOARD_ANALYTICS_FETCH_FAILED_LOG } from './constants';

@ApiTags('Companies')
@Controller('corporations/companies')
export class GetCompanyController {
  private readonly logger = new Logger(GetCompanyController.name);

  constructor(private readonly companyService: CompanyService) {}

  @Post(':companyId/key-contacts')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @Auditable({
    domain: 'company',
    eventType: 'EDIT',
    entityIdParam: 'companyId',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'companyId',
    description: 'Company ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiBody({
    type: UpsertCompanyKeyContactsDto,
    description:
      'Array of company app key contacts. For each: available=false soft-deletes by contactType; available=true upserts in app_key_contacts (firstName, lastName, email, workPhone required). Email is not updated when the contact row already exists.',
    examples: {
      single: {
        value: {
          keyContacts: [
            {
              contactType: 'finance_billing_contact',
              available: true,
              firstName: 'Jane',
              lastName: 'Doe',
              nickname: null,
              jobRole: 'Billing lead',
              email: 'jane.doe@example.com',
              workPhone: '+1-555-123-4567',
              cellPhone: '+1-555-987-6543',
            },
          ],
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Add or update company key contacts',
    description:
      'Persists to app_key_contacts with company_id. For each item: available=false sets deleted_at (soft delete); available=true updates the active row for that contactType or creates one. jobRole maps to job_role; email is only set on create, not on update. If app_user_id is set, app_users is updated with name, job role, and phones. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Company key contacts updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Company key contacts updated successfully',
        },
        data: { type: 'object' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - companyId missing or validation failed',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  @ApiNotFoundResponse({
    description: 'Not Found - Company does not exist',
  })
  async upsertKeyContacts(
    @Param('companyId') companyId: string,
    @Body() body: UpsertCompanyKeyContactsDto,
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.upsertKeyContacts(
        companyId,
        body.keyContacts,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in upsert company key contacts endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Put(':companyId/plan-seats')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @Auditable({
    domain: 'company',
    eventType: 'EDIT',
    entityIdParam: 'companyId',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'companyId',
    description: 'Company ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiBody({ type: UpsertCompanyPlanSeatDto })
  @ApiOperation({
    summary: 'Add or update company plan seat',
    description:
      'Upserts the single plan seat for the company. planLevel (UUID) must match an existing pricing_plans.id and updates corporation_companies.plan_id. When zeroTrial is false, trialStartDate and trialEndDate are required. When zeroTrial is true, trial dates are optional (provide both or omit both to clear). planPrice, discount, and invoiceAmount must be non-negative; discount cannot exceed planPrice. If company submittedSteps is less than 3, it is set to 3. When subscription_status is active, returns success without updating. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Plan seat saved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Company plan seat saved successfully',
        },
        data: { type: 'object' },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Validation failed, negative amounts, discount greater than plan price, inconsistent trial dates when zeroTrial is true, or missing trial dates when zeroTrial is false',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  @ApiNotFoundResponse({
    description: 'Not Found - Company does not exist',
  })
  async upsertPlanSeat(
    @Param('companyId') companyId: string,
    @Body() body: UpsertCompanyPlanSeatDto,
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.upsertCompanyPlanSeat(companyId, body);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in upsert company plan seat endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Put(':companyId/configuration')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor('logo', 10, { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @Auditable({
    domain: 'company',
    eventType: 'EDIT',
    entityIdParam: 'companyId',
  })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'companyId',
    description: 'Company ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiBody({
    description:
      'All configuration text fields are required. Optional binary field `logo` (PNG or JPG, max 10 MB) is stored in S3 under company-brand-logos/ and updates company `brand_logo`.',
    type: UpsertCompanyConfigurationDto,
  })
  @ApiOperation({
    summary: 'Add or update company configuration',
    description:
      'Creates or updates the single company_configuration row. All text fields are required on every request. If company submittedSteps is less than 4, it is set to 4. Optional `logo` (PNG or JPG, same rules as corporation brand logo) uploads to S3 and updates the company brand logo URL returned as `brandLogo` on the response. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Company configuration saved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Company configuration saved successfully',
        },
        data: {
          type: 'object',
          description:
            'company_configuration fields plus brandLogo (public URL or null)',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - companyId missing or validation failed',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  @ApiNotFoundResponse({
    description: 'Not Found - Company does not exist',
  })
  async upsertConfiguration(
    @Param('companyId') companyId: string,
    @Body() body: UpsertCompanyConfigurationDto,
    @UploadedFiles() logo?: Express.Multer.File[],
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.upsertCompanyConfiguration(
        companyId,
        body,
        logo,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in upsert company configuration endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Delete(':companyId/brand-logo')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @Auditable({
    domain: 'branding_logo',
    eventType: 'REMOVE',
    entityIdParam: 'companyId',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'companyId',
    description: 'Company ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Delete company brand logo',
    description:
      'Deletes the brand logo for the company. Removes the file from S3 (if present) and clears `brand_logo`. Idempotent if no logo exists. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Company brand logo deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Company brand logo deleted successfully',
        },
        data: { type: 'object', nullable: true },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Company does not exist',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  async deleteBrandLogo(
    @Param('companyId') companyId: string,
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.deleteCompanyBrandLogo(companyId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in delete company brand logo endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post(':companyId/confirmation')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @Auditable({
    domain: 'company',
    eventType: 'EDIT',
    entityIdParam: 'companyId',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'companyId',
    description: 'Company ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Complete company setup — confirmation',
    description:
      'Marks the add-company flow as finished: sets company `status` to ACTIVE and `submittedSteps` to 5. No request body. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Company confirmation completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Company confirmation completed successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            status: { type: 'string', example: 'ACTIVE' },
            submittedSteps: { type: 'integer', example: 5 },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - companyId missing',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  @ApiNotFoundResponse({
    description: 'Not Found - Company does not exist',
  })
  async confirmCompany(
    @Param('companyId') companyId: string,
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.confirmCompany(companyId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in company confirmation endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post(':companyId/suspend')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @Auditable({
    domain: 'company',
    eventType: 'EDIT',
    entityIdParam: 'companyId',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'companyId',
    description: 'Company ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiBody({ type: SuspendCompanyDto })
  @ApiOperation({
    summary: 'Suspend company',
    description:
      'Sets company status to SUSPENDED and stores suspendReason (required) and optional suspendAdditionalNotes. Only ACTIVE companies may be suspended; suspending an already SUSPENDED company is rejected. ' +
      'For every user with a `user_company_access` row for this company: Cognito AdminUserGlobalSignOut (revokes refresh tokens), disables the Cognito user, and sets `app_users.status` to Blocked. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Company suspended',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Company suspended successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            status: { type: 'string', example: 'SUSPENDED' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Validation failed (suspendReason required), company is not ACTIVE, or is already SUSPENDED',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  @ApiNotFoundResponse({
    description: 'Not Found - Company does not exist',
  })
  @ApiInternalServerErrorResponse({
    description: 'Cognito or database error while suspending',
  })
  async suspendCompany(
    @Param('companyId') companyId: string,
    @Body() body: SuspendCompanyDto,
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.suspendCompany(companyId, body);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in suspend company endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post(':companyId/reinstate')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @Auditable({
    domain: 'company',
    eventType: 'REINSTATED',
    entityIdParam: 'companyId',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'companyId',
    description: 'Company ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Reinstate company',
    description:
      'Sets company status to ACTIVE. Only SUSPENDED companies may be reinstated; reinstating an already ACTIVE company is rejected. Rejected when the parent corporation is SUSPENDED (reinstate the corporation first). ' +
      'For every user with a `user_company_access` row for this company: sets `app_users.status` to Active and enables the user in Cognito. No request body. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Company reinstated',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Company reinstated successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            status: { type: 'string', example: 'ACTIVE' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Company is already ACTIVE, is not SUSPENDED (e.g. INCOMPLETE), or parent corporation is SUSPENDED',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  @ApiNotFoundResponse({
    description: 'Not Found - Company does not exist',
  })
  @ApiInternalServerErrorResponse({
    description: 'Cognito or database error while reinstating',
  })
  async reinstateCompany(
    @Param('companyId') companyId: string,
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.reinstateCompany(companyId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in reinstate company endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Path: PATCH /corporations/companies/:companyId
   */
  @Patch(':companyId')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @Auditable({
    domain: 'company',
    eventType: 'EDIT',
    entityIdParam: 'companyId',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'companyId',
    description: 'Company ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Update company — Add Company Step 1',
    description:
      'Partially updates fields collected in Add Company wizard Step 1 (legal profile, admin contact, address, setup progress). Corporation is inferred from the company record. ' +
      'Optional `sameAsCorpAdmin` must match the stored company value (it is not updated here); when true, admin profile fields must be omitted. ' +
      'When the company has its own admin (`sameAsCorpAdmin` false), firstName, lastName, jobRole, nickname, workPhone, and cellPhone update the company admin `app_users` row. ' +
      'Company admin email is not in the body. Unknown JSON properties are rejected (400). Requires SuperAdmin role.',
  })
  @ApiBadRequestResponse({
    description:
      'Bad Request — validation failed, mismatching sameAsCorpAdmin, admin fields when same as corporation admin, or unknown body properties (e.g. email).',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Company updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Company updated successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            corporationId: { type: 'string', example: 'uuid' },
            legalName: { type: 'string', example: 'Acme Company Inc.' },
            companyType: { type: 'string', example: 'LLC' },
            officeType: { type: 'string', example: 'Headquarters' },
            industry: { type: 'string', example: 'Technology' },
            sameAsCorpAdmin: { type: 'boolean', example: false },
            planId: {
              type: 'string',
              example: '4b7497a7-fe14-4774-99f9-38b633c10f50',
            },
            securityPosture: { type: 'string', example: 'High' },
            addressLine: { type: 'string', example: '123 Main Street' },
            state: { type: 'string', example: 'California' },
            city: { type: 'string', example: 'San Francisco' },
            country: { type: 'string', example: 'United States' },
            zip: { type: 'string', example: '94105' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            deletedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
    },
  })
  @ApiUnprocessableEntityResponse({
    description: 'Validation failed - Invalid input data',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - SuperAdmin role required',
  })
  @ApiNotFoundResponse({
    description: 'Not Found - Company does not exist',
  })
  @ApiConflictResponse({
    description:
      'Conflict - Company admin email or legal name must be unique within the corporation',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Company admin email must be unique within the corporation',
        },
      },
    },
  })
  @ApiBody({ type: UpdateCompanyStep1Dto })
  async updateCompanyStep1(
    @Param('companyId') companyId: string,
    @Body() updateCompanyStep1Dto: UpdateCompanyStep1Dto,
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.updateCompanyStep1(
        companyId,
        updateCompanyStep1Dto,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in update company Step 1 endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('active')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all active companies (id, corporation id, legal name)',
    description:
      'Returns non-deleted companies with status Active, ordered by legal name. Each item includes id, corporationId, and legalName. **SuperAdmin:** all corporations. **CorporationAdmin:** only companies under their linked corporation.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Active companies fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Active companies fetched successfully',
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
                  corporationId: { type: 'string', example: 'uuid' },
                  legalName: { type: 'string', example: 'Acme Company Inc.' },
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
      'Forbidden - caller is not SuperAdmin or CorporationAdmin, or CorporationAdmin has no linked corporation',
  })
  async listActiveCompanies(
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.findActiveCompaniesForRequester(
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in active companies list endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('all')
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all companies for a corporation (id and legal name)',
    description:
      'Returns non-deleted companies with id and legalName for the given corporationId, ordered by legal name. Includes all statuses. **SuperAdmin:** any corporation. **CorporationAdmin:** only when corporationId matches their linked corporation.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'All companies fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'All companies fetched successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              legalName: { type: 'string', example: 'Acme Company Inc.' },
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
      'Forbidden - caller is not SuperAdmin or CorporationAdmin, or CorporationAdmin has no linked corporation',
  })
  async listAll(
    @Query() query: ListAllCompaniesQueryDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.findAllCompaniesForRequester(
        query.corporationId,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in all companies list endpoint: ${errorMessage}`,
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
    summary: 'Company Admin dashboard system analytics',
    description:
      'Donut-chart aggregates for users and assessments linked to the caller admin company via user_company_access. Users: active, pending, blocked, cancelled, expired, deleted. Assessments: report_generated counts as completed (time window on completed_at); other statuses count as in progress (time window on started_at); avgTimeToComplete uses started_at and completed_at (time window on completed_at). Optional query: timeFilter (last24Hours, last7Days, last30Days, last3Months, last6Months, lastYear). Without timeFilter, all matching rows are counted. Requires CompanyAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Company dashboard analytics returned successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiForbiddenResponse({
    description:
      'CompanyAdmin role required or no admin company linked to this account',
  })
  async getDashboardAnalytics(
    @Query() query: CompanyDashboardAnalyticsQueryDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.getDashboardAnalyticsForCompanyAdmin(
        user.sub,
        user.groups ?? [],
        query,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `${COMPANY_DASHBOARD_ANALYTICS_FETCH_FAILED_LOG}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get(':companyId')
  @UseGuards(CognitoAuthGuard)
  @Auditable({
    domain: 'company',
    eventType: 'VIEW',
    entityIdParam: 'companyId',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'companyId',
    description:
      'Company UUID, or the literal `me` when the caller has the CompanyAdmin group (resolves to earliest admin `user_company_access.company_id` on a non-deleted company). Users with both CorporationAdmin and CompanyAdmin may use `me`. SuperAdmin must pass a company UUID (not `me`). CorporationAdmin alone must pass a company UUID (not `me`).',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Fetch company details',
    description:
      'Fetches a company by ID (corporations/companies/:companyId), including plan, corporation summary, Stripe subscription status (from `corporation_companies.subscription_status`), all app key contacts (non-deleted), and the company admin from user company access (isAdmin) resolved via app users. Soft-deleted companies are not returned. **SuperAdmin:** any company UUID (not `me`). **CorporationAdmin and/or CompanyAdmin:** access is allowed if **either** applies — corporation admin for a company under their linked corporation, or company admin with an admin `user_company_access` row for that company (same user may hold both Cognito groups). **`me`:** only if the caller has the CompanyAdmin group; resolves to their admin company as above.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Company details fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Company details fetched successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            corporationId: { type: 'string', example: 'uuid' },
            legalName: { type: 'string', example: 'Acme Company Inc.' },
            companyType: { type: 'string', example: 'LLC' },
            officeType: { type: 'string', example: 'Headquarters' },
            industry: { type: 'string', example: 'Technology' },
            sameAsCorpAdmin: { type: 'boolean', example: false },
            planId: {
              type: 'string',
              example: '4b7497a7-fe14-4774-99f9-38b633c10f50',
            },
            securityPosture: { type: 'string', example: 'High' },
            subscriptionStatus: {
              type: 'string',
              nullable: true,
              description:
                'Stripe subscription status synced to corporation_companies (e.g. active, trialing, past_due, canceled); null when no subscription',
              example: 'active',
            },
            addressLine: { type: 'string', example: '123 Main Street' },
            state: { type: 'string', example: 'California' },
            city: { type: 'string', example: 'San Francisco' },
            country: { type: 'string', example: 'United States' },
            zip: { type: 'string', example: '94105' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            deletedAt: { type: 'string', format: 'date-time', nullable: true },
            plan: {
              type: 'object',
              description: 'Pricing plan details',
              properties: {
                id: { type: 'string' },
                planTypeId: { type: 'string' },
                price: { type: 'number' },
                employeeRangeMin: { type: 'number', nullable: true },
                employeeRangeMax: { type: 'number', nullable: true },
              },
            },
            corporation: {
              type: 'object',
              description: 'Parent corporation summary',
              properties: {
                legalName: { type: 'string' },
                ownershipType: { type: 'string' },
                dataResidencyRegion: { type: 'string' },
                corporationAdmin: {
                  type: 'object',
                  nullable: true,
                  description:
                    'Corporation admin profile from app_users (user_type contains corp_admin, deleted_at null, matching corporation_id)',
                  properties: {
                    firstName: { type: 'string', nullable: true },
                    lastName: { type: 'string', nullable: true },
                    nickname: { type: 'string', nullable: true },
                    jobRole: { type: 'string' },
                    email: { type: 'string' },
                    workPhone: { type: 'string' },
                    cellPhone: { type: 'string', nullable: true },
                  },
                },
              },
            },
            companyAdmin: {
              type: 'object',
              nullable: true,
              description:
                'Company admin from user_company_access (is_admin) with profile from app_users (non-deleted); earliest access row when multiple',
              properties: {
                firstName: { type: 'string', nullable: true },
                lastName: { type: 'string', nullable: true },
                nickname: { type: 'string', nullable: true },
                role: { type: 'string', nullable: true },
                email: { type: 'string', nullable: true },
                workPhone: { type: 'string', nullable: true },
                cellPhone: { type: 'string', nullable: true },
              },
            },
            keyContacts: {
              type: 'array',
              description:
                'All app_key_contacts for this company with deleted_at null',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  contactType: {
                    type: 'string',
                    example: 'finance_billing_contact',
                  },
                  firstName: { type: 'string', nullable: true },
                  lastName: { type: 'string', nullable: true },
                  nickname: { type: 'string', nullable: true },
                  jobRole: { type: 'string', nullable: true },
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
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiBadRequestResponse({
    description:
      'SuperAdmin used path segment `me`, or CorporationAdmin without the CompanyAdmin group used `me`',
  })
  @ApiForbiddenResponse({
    description:
      'Forbidden - caller is not authorized for this company (neither corporation scope nor company-admin access applies)',
  })
  @ApiNotFoundResponse({
    description: 'Not Found - Company does not exist',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Company with ID "uuid" not found',
        },
      },
    },
  })
  async findOne(
    @Param('companyId') companyId: string,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.findOneForRequester(
        companyId,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in fetch company details endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
