import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeService } from './stripe.service';

describe('StripeWebhookController', () => {
  let controller: StripeWebhookController;
  let stripeService: { handleWebhookEvent: jest.Mock };

  beforeEach(async () => {
    stripeService = {
      handleWebhookEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeWebhookController],
      providers: [{ provide: StripeService, useValue: stripeService }],
    }).compile();

    controller = module.get<StripeWebhookController>(StripeWebhookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('throws when raw body is missing', async () => {
    const req = { rawBody: undefined } as RawBodyRequest<Request>;

    await expect(controller.handle(req, 'sig')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(stripeService.handleWebhookEvent).not.toHaveBeenCalled();
  });

  it('delegates to StripeService when raw body is a Buffer', async () => {
    const buf = Buffer.from('{}');
    const req = { rawBody: buf } as RawBodyRequest<Request>;
    stripeService.handleWebhookEvent.mockResolvedValue({ received: true });

    const result = await controller.handle(req, 'sig_header');

    expect(stripeService.handleWebhookEvent).toHaveBeenCalledWith(
      buf,
      'sig_header',
    );
    expect(result).toEqual({ received: true });
  });
});
