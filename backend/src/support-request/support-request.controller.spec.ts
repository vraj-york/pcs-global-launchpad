import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupportRequestController } from './support-request.controller';
import { SupportRequestService } from './support-request.service';
import { SUPPORT_REQUEST_TOO_MANY_ATTACHMENTS_MSG } from './constants';

describe('SupportRequestController', () => {
  let controller: SupportRequestController;

  const supportRequestService = {
    submit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    supportRequestService.submit.mockResolvedValue({
      success: true,
      message: 'ok',
      data: { id: 'req-1' },
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupportRequestController],
      providers: [
        { provide: SupportRequestService, useValue: supportRequestService },
      ],
    }).compile();

    controller = module.get(SupportRequestController);
  });

  it('delegates to service', async () => {
    const body = { email: 'user@example.com', subject: 'Help' };
    const result = await controller.submit(body, []);
    expect(result.data).toEqual({ id: 'req-1' });
    expect(supportRequestService.submit).toHaveBeenCalledWith(body, []);
  });

  it('rejects when more than 3 files are uploaded', async () => {
    const files = Array.from(
      { length: 4 },
      () => ({}),
    ) as Express.Multer.File[];
    await expect(
      controller.submit({ email: 'user@example.com', subject: 'Help' }, files),
    ).rejects.toThrow(BadRequestException);
    await expect(
      controller.submit({ email: 'user@example.com', subject: 'Help' }, files),
    ).rejects.toThrow(SUPPORT_REQUEST_TOO_MANY_ATTACHMENTS_MSG);
  });
});
