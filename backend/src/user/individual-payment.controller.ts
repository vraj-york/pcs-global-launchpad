import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiResponse as SwaggerApiResponse,
} from '@nestjs/swagger';
import { ApiResponse } from '../common';
import { AuthorizationGuard, CognitoAuthGuard } from '../auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IndividualPaymentService } from './individual-payment.service';

@Controller('users/me/individual-payment')
export class IndividualPaymentController {
  private readonly logger = new Logger(IndividualPaymentController.name);

  constructor(
    private readonly individualPaymentService: IndividualPaymentService,
  ) {}

  @Get('review')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @ApiOperation({
    summary: 'Individual assessment payment review',
    description:
      'Returns plan and price breakdown for B2C individual users before Stripe Checkout.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Payment review loaded' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Not an individual user' })
  @ApiInternalServerErrorResponse({
    description: 'Failed to load individual payment review',
  })
  async getIndividualPaymentReview(
    @CurrentUser() user: { sub: string },
  ): Promise<ApiResponse> {
    try {
      return await this.individualPaymentService.getPaymentReview(user.sub);
    } catch (error) {
      this.logEndpointError('getIndividualPaymentReview', error);
      throw error;
    }
  }

  @Post('checkout-session')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(CognitoAuthGuard, AuthorizationGuard)
  @ApiOperation({
    summary: 'Create individual assessment checkout session',
    description:
      'Creates a Stripe Checkout session for individual users. Zero-amount promos activate the account without Checkout.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Checkout URL returned' })
  @ApiBadRequestResponse({
    description: 'Already paid, invalid promo, or plan not configured',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Not an individual user' })
  @ApiInternalServerErrorResponse({
    description: 'Failed to create individual payment checkout session',
  })
  async createIndividualPaymentCheckoutSession(
    @CurrentUser() user: { sub: string },
  ): Promise<ApiResponse> {
    try {
      return await this.individualPaymentService.createCheckoutSession(
        user.sub,
      );
    } catch (error) {
      this.logEndpointError('createIndividualPaymentCheckoutSession', error);
      throw error;
    }
  }

  private logEndpointError(endpoint: string, error: unknown): void {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    this.logger.error(`Error in ${endpoint}: ${errorMessage}`, errorStack);
  }
}
