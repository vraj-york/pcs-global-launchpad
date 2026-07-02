import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { ApiResponse } from '../common';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  CurrentUser,
  RequireSubmodule,
  SUBMODULE_KEYS,
} from '../auth';

@ApiTags('Pricing')
@Controller('pricing')
export class PricingController {
  private readonly logger = new Logger(PricingController.name);

  constructor(private readonly pricingService: PricingService) {}

  @Get('plans')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @RequireSubmodule(SUBMODULE_KEYS.PLANS_PRICING_VIEW)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all plan types with related pricing plans',
    description:
      'Returns all plan types, each with its related pricing plans (no pagination, no filters). **SuperAdmin**, **CorporationAdmin**, and **CompanyAdmin** only.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Plan types with pricing plans fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Pricing plans list fetched successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'monthly' },
              name: { type: 'string', example: 'Monthly' },
              plans: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      example: '4b7497a7-fe14-4774-99f9-38b633c10f50',
                    },
                    planTypeId: { type: 'string', example: 'monthly' },
                    customerType: { type: 'string', example: 'company' },
                    employeeRangeMin: {
                      type: 'number',
                      nullable: true,
                      example: 501,
                    },
                    employeeRangeMax: {
                      type: 'number',
                      nullable: true,
                      example: null,
                    },
                    price: { type: 'number', example: 0 },
                    isCustomPricing: { type: 'boolean', example: true },
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
      'Forbidden — caller is not SuperAdmin, CorporationAdmin, or CompanyAdmin',
  })
  async listPlans(
    @CurrentUser() user: { sub: string; groups: string[] },
  ): Promise<ApiResponse> {
    try {
      return await this.pricingService.listAllPlanTypesWithPlansForRequester(
        user.groups ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in pricing plans list endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('onboarding-fees')
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Resolve onboarding fees from configured Stripe Price IDs',
    description:
      'Returns the implementation fee and onsite training fees (1 day / 2 days) by retrieving each configured Stripe Price ID. The SPA renders these amounts in the Plan & Seats price breakdown (Super Admin) and the Company Admin onboarding review so values stay in sync with Stripe (no hardcoded fallbacks). Available to any authenticated user — the same Stripe Prices are shown on the hosted Checkout page they are about to pay.',
  })
  @SwaggerApiResponse({
    status: 200,
    description: 'Onboarding fees fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Onboarding fees fetched successfully',
        },
        data: {
          type: 'object',
          properties: {
            implementationFee: {
              type: 'object',
              properties: {
                stripePriceId: { type: 'string', example: 'price_123' },
                amount: { type: 'number', nullable: true, example: 2499 },
                currency: { type: 'string', example: 'usd' },
              },
            },
            onsiteTraining: {
              type: 'object',
              description:
                "Both '1_day' and '2_days' share the same Stripe Price ID (cost per day). The '2_days' amount is the unit amount × 2.",
              properties: {
                '1_day': {
                  type: 'object',
                  properties: {
                    stripePriceId: { type: 'string', example: 'price_456' },
                    amount: { type: 'number', nullable: true, example: 8000 },
                    currency: { type: 'string', example: 'usd' },
                  },
                },
                '2_days': {
                  type: 'object',
                  properties: {
                    stripePriceId: { type: 'string', example: 'price_456' },
                    amount: { type: 'number', nullable: true, example: 16000 },
                    currency: { type: 'string', example: 'usd' },
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
  async listOnboardingFees(): Promise<ApiResponse> {
    try {
      return await this.pricingService.getOnboardingFees();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in pricing onboarding-fees endpoint: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
