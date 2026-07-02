import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { STRIPE_WEBHOOK_MISSING_RAW_BODY_MSG } from './stripe.constants';
import { StripeService } from './stripe.service';

/**
 * Stripe webhooks must receive the raw request body for signature verification.
 * {@link main.ts} enables `rawBody: true` on the Nest app.
 */
@ApiExcludeController()
@Controller('stripe')
export class StripeWebhookController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody;
    if (!rawBody || !Buffer.isBuffer(rawBody)) {
      throw new BadRequestException(STRIPE_WEBHOOK_MISSING_RAW_BODY_MSG);
    }
    return this.stripeService.handleWebhookEvent(rawBody, signature);
  }
}
