import {
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiUnprocessableEntityResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiBody,
} from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CreateCompanyDto, ListCompanyQueryDto, UpdateCompanyDto } from './dto';
import { ApiResponse } from '../common';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  CurrentUser,
  RequireSubmodule,
  SUBMODULE_KEYS,
  SuperAdminGuard,
} from '../auth';
import { Auditable } from '../audit';
import { CreateNewCompanyDto } from './dto/create-new-company.dto';
import { StripeService, CreateCheckoutSessionDto } from '../stripe';

@ApiTags('Companies')
@Controller('corporations/:corporationId/companies')
export class CompanyController {
  private readonly logger = new Logger(CompanyController.name);

  constructor(
    private readonly companyService: CompanyService,
    private readonly stripeService: StripeService,
  ) {}

  @Post()
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.COMPANY_DIRECTORY_ADD)
  @HttpCode(HttpStatus.CREATED)
  @Auditable({
    domain: 'company',
    eventType: 'ADD',
    entityIdPath: 'data.id',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'corporationId',
    description: 'Corporation ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Create a new company for a corporation',
    description:
      'Creates a new company record associated with an existing corporation. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 201,
    description: 'Company created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Company created successfully',
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
            phoneNo: { type: 'string', example: '+1-555-123-4567' },
            sameAsCorpAdmin: { type: 'boolean', example: false },
            planId: {
              type: 'string',
              example: '61fa4369-6fe6-4b35-8825-bcadcc8efac8',
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
              example: ['legalName: legalName must be a string'],
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
  @ApiNotFoundResponse({
    description: 'Not Found - Corporation does not exist',
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
      'Conflict - Company legal name must be unique within the corporation',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Company legal name must be unique within the corporation',
        },
      },
    },
  })
  async create(
    @Param('corporationId') corporationId: string,
    @Body() createCompanyDto: CreateCompanyDto,
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.create(corporationId, createCompanyDto);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in create company endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post('companynew')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.COMPANY_DIRECTORY_ADD)
  @HttpCode(HttpStatus.CREATED)
  @Auditable({
    domain: 'company',
    eventType: 'ADD',
    entityIdPath: 'data.id',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'corporationId',
    description: 'Corporation ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Add company new - company directory',
    description:
      'Creates a new company record associated with an existing corporation. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 201,
    description: 'Company created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Company created successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            corporationId: { type: 'string', example: 'uuid' },
            legalName: { type: 'string', example: 'Acme Inc.' },
            dbaName: { type: 'string', nullable: true },
            website: { type: 'string', nullable: true },
            companyType: { type: 'string', example: 'Operating Company' },
            officeType: { type: 'string', example: 'Regional' },
            industry: { type: 'string', example: 'Technology' },
            primaryLanguage: { type: 'string', nullable: true },
            phoneNo: { type: 'string', example: '+1 (555) 123-4567' },
            sameAsCorpAdmin: { type: 'boolean', example: false },
            planId: {
              type: 'string',
              example: '4b7497a7-fe14-4774-99f9-38b633c10f50',
            },
            submittedSteps: { type: 'integer', example: 1 },
            status: { type: 'string', example: 'INCOMPLETE' },
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
              example: ['legalName: legalName must be a string'],
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
  @ApiNotFoundResponse({
    description: 'Not Found - Corporation does not exist',
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
      'Conflict - Company legal name must be unique within the corporation',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Company legal name must be unique within the corporation',
        },
      },
    },
  })
  async createNew(
    @Param('corporationId') corporationId: string,
    @Body() createCompanyDto: CreateNewCompanyDto,
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.createNew(
        corporationId,
        createCompanyDto,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in create company endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get()
  @UseGuards(CognitoAuthGuard)
  @ApiBearerAuth()
  @ApiParam({
    name: 'corporationId',
    description: 'Corporation ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'List companies for a corporation',
    description:
      'Returns a list of companies for the given corporation (no pagination, no sorting). Default: all companies. Optional search on company name (partial, case-insensitive). Optional filters: company type, corporation region (dataResidencyRegion), plan type (plan_types.id). Contact fields (firstName, lastName, nickname, role, email, workPhone, cellPhone) come from the non-deleted app user tied to the earliest isAdmin user_company_access row for that company, not from corporation_companies. **SuperAdmin:** any corporation id. **CorporationAdmin:** only companies for their own corporation id (path must match `app_users.corporation_id`).',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Company list fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Company list fetched successfully',
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
                  companyType: { type: 'string', example: 'LLC' },
                  officeType: { type: 'string', example: 'Headquarters' },
                  industry: { type: 'string', example: 'Technology' },
                  sameAsCorpAdmin: { type: 'boolean', example: false },
                  planId: { type: 'string', example: 'uuid' },
                  securityPosture: { type: 'string', example: 'High' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  nickname: { type: 'string', nullable: true },
                  role: {
                    type: 'string',
                    nullable: true,
                    description:
                      'Company admin job role from app_users.job_role (isAdmin user_company_access)',
                  },
                  email: { type: 'string' },
                  workPhone: { type: 'string' },
                  cellPhone: { type: 'string', nullable: true },
                  addressLine: { type: 'string' },
                  state: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string' },
                  zip: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  region: {
                    type: 'string',
                    nullable: true,
                    description: 'Corporation dataResidencyRegion',
                  },
                  planName: { type: 'string', nullable: true },
                  plan: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      id: { type: 'string' },
                      planTypeId: { type: 'string' },
                      employeeRangeMin: { type: 'number', nullable: true },
                      employeeRangeMax: { type: 'number', nullable: true },
                    },
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
  @ApiForbiddenResponse({
    description:
      'Forbidden - caller is not SuperAdmin or CorporationAdmin for this corporation',
  })
  @ApiNotFoundResponse({
    description: 'Not Found - Corporation does not exist',
  })
  async list(
    @Param('corporationId') corporationId: string,
    @Query() query: ListCompanyQueryDto,
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.findAllForRequester(
        corporationId,
        query,
        user.sub,
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in company list endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post(':companyId/checkout-session')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.BILLING_MANAGEMENT_EDIT)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiParam({
    name: 'corporationId',
    description: 'Corporation ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiParam({
    name: 'companyId',
    description: 'Company ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiBody({ type: CreateCheckoutSessionDto })
  @ApiOperation({
    summary: 'Create Stripe Checkout session for a company subscription',
    description:
      'Creates a Stripe Customer for the company on first use, then returns a Checkout URL for the selected recurring Price (monthly/annual). Requires SuperAdmin. Set stripe_price_id on the pricing plan and STRIPE_* env vars. Optional `promoCode` applies only that code after validation. When omitted, the best eligible promo for this plan is applied automatically in order: company-scoped → corporation-scoped → unrestricted (first active, non-expired, within redemption limits).',
  })
  @SwaggerApiResponse({
    status: 201,
    description: 'Checkout session URL returned',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              example: 'https://checkout.stripe.com/c/pay/cs_test_...',
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  async createCheckoutSession(
    @Param('corporationId') corporationId: string,
    @Param('companyId') companyId: string,
    @Body() body: CreateCheckoutSessionDto,
  ): Promise<ApiResponse> {
    try {
      return await this.stripeService.createCheckoutSession({
        corporationId,
        companyId,
        pricingPlanId: body.pricingPlanId,
        promoCode: body.promoCode,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error creating Stripe checkout session: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

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
    name: 'corporationId',
    description: 'Corporation ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiParam({
    name: 'companyId',
    description: 'Company ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Update a company',
    description:
      'Partial update for company business/address/plan fields on corporation_companies. ' +
      'Admin contact fields (firstName, lastName, nickname, jobRole, workPhone, cellPhone) are not stored on the company row; ' +
      'when the company is not "same as corporate admin", they update the company admin app user (user_company_access.isAdmin). ' +
      'Request body schema excludes company admin email and sameAsCorpAdmin (fixed at company creation). ' +
      'Unknown JSON properties are rejected (400). Requires SuperAdmin role.',
  })
  @ApiBody({ type: UpdateCompanyDto })
  @ApiBadRequestResponse({
    description:
      'Bad Request — validation failed, including unknown or non-whitelisted body properties (e.g. email, sameAsCorpAdmin).',
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
            companyCode: { type: 'number', example: 1 },
            legalName: { type: 'string', example: 'Acme Company Inc.' },
            dbaName: { type: 'string', example: 'Acme DBA', nullable: true },
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
    description: 'Not Found - Company does not exist for the corporation',
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
  async update(
    @Param('corporationId') corporationId: string,
    @Param('companyId') companyId: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.update(
        corporationId,
        companyId,
        updateCompanyDto,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in update company endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Delete(':companyId')
  @UseGuards(CognitoAuthGuard, SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  @Auditable({
    domain: 'company',
    eventType: 'REMOVE',
    entityIdParam: 'companyId',
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'corporationId',
    description: 'Corporation ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiParam({
    name: 'companyId',
    description: 'Company ID',
    type: 'string',
    example: 'uuid',
  })
  @ApiOperation({
    summary: 'Delete a company (soft delete)',
    description:
      'Soft-deletes a company by setting deletedAt. The company is excluded from list APIs. Fails if this is the only remaining company in the corporation. Requires SuperAdmin role.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Company deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Company deleted successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            deletedAt: { type: 'string', format: 'date-time' },
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
  @ApiNotFoundResponse({
    description: 'Not Found - Company does not exist for the corporation',
  })
  @ApiBadRequestResponse({
    description:
      'Bad Request - Cannot delete the only remaining company in the corporation',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example:
            'Cannot delete the only remaining company in the corporation',
        },
      },
    },
  })
  async remove(
    @Param('corporationId') corporationId: string,
    @Param('companyId') companyId: string,
  ): Promise<ApiResponse> {
    try {
      return await this.companyService.remove(corporationId, companyId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in delete company endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
