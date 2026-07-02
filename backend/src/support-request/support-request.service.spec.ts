import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupportRequestService } from './support-request.service';
import { PrismaService } from '../prisma';
import { S3Service } from '../s3';
import { EmailService, type SendEmailParams } from '../email/email.service';
import {
  PLAN_CHANGE_REQUEST_EMAIL_SUBJECT,
  PLAN_CHANGE_REQUEST_SUBMITTED_SUCCESS_MSG,
  SUPPORT_REQUEST_ATTACHMENTS_TOTAL_MAX_BYTES,
  SUPPORT_REQUEST_ATTACHMENTS_TOTAL_MAX_SIZE_MSG,
  SUPPORT_REQUEST_EMAIL_SUBJECT,
  SUPPORT_REQUEST_INVALID_ATTACHMENT_TYPE_MSG,
  SUPPORT_REQUEST_SUBMITTED_SUCCESS_MSG,
  SUPPORT_REQUEST_TOO_MANY_ATTACHMENTS_MSG,
} from './constants';

describe('SupportRequestService', () => {
  let service: SupportRequestService;

  const prisma = {
    supportRequest: {
      create: jest.fn(),
    },
    supportRequestAttachment: {
      createMany: jest.fn(),
    },
    appUser: {
      findFirst: jest.fn(),
    },
  };

  const s3Service = {
    buildSupportRequestAttachmentKey: jest.fn(
      (name: string) => `support-request-attachments/${name}`,
    ),
    getPublicUrl: jest.fn((key: string) => `https://cdn.example.com/${key}`),
    upload: jest.fn(),
  };

  const emailService = {
    sendEmail: jest
      .fn<Promise<boolean>, [SendEmailParams]>()
      .mockResolvedValue(true),
  };

  const supportContactEmail = 'support@example.com';

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'EMAIL_LOGO_URL') {
        return 'https://cdn.example.com/logo.png';
      }
      if (key === 'SUPPORT_CONTACT_EMAIL') {
        return supportContactEmail;
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.supportRequest.create.mockResolvedValue({
      id: 'req-1',
      createdAt: new Date('2026-05-18T10:30:00.000Z'),
    });
    prisma.supportRequestAttachment.createMany.mockResolvedValue({ count: 0 });
    prisma.appUser.findFirst.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportRequestService,
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: s3Service },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(SupportRequestService);
  });

  it('persists request and sends notification email without attachments', async () => {
    const result = await service.submit({
      email: 'user@example.com',
      subject: 'Help',
      message: 'Need assistance',
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe(SUPPORT_REQUEST_SUBMITTED_SUCCESS_MSG);
    expect(result.data).toEqual({ id: 'req-1' });
    expect(prisma.supportRequest.create).toHaveBeenCalled();
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: supportContactEmail,
        subject: SUPPORT_REQUEST_EMAIL_SUBJECT,
      }),
    );
  });

  it('rejects more than 3 attachments', async () => {
    const files = Array.from({ length: 4 }, (_, i) => ({
      originalname: `file${i}.png`,
      mimetype: 'image/png',
      size: 100,
      buffer: Buffer.from('x'),
    })) as Express.Multer.File[];

    await expect(
      service.submit({ email: 'user@example.com', subject: 'Help' }, files),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.submit({ email: 'user@example.com', subject: 'Help' }, files),
    ).rejects.toThrow(SUPPORT_REQUEST_TOO_MANY_ATTACHMENTS_MSG);
  });

  it('rejects invalid attachment mime type', async () => {
    const files = [
      {
        originalname: 'doc.pdf',
        mimetype: 'application/pdf',
        size: 100,
        buffer: Buffer.from('x'),
      },
    ] as Express.Multer.File[];

    await expect(
      service.submit({ email: 'user@example.com', subject: 'Help' }, files),
    ).rejects.toThrow(SUPPORT_REQUEST_INVALID_ATTACHMENT_TYPE_MSG);
  });

  it('rejects when combined attachment size exceeds 10 MB', async () => {
    const halfMax =
      Math.floor(SUPPORT_REQUEST_ATTACHMENTS_TOTAL_MAX_BYTES / 2) + 1;
    const files = [
      {
        originalname: 'a.png',
        mimetype: 'image/png',
        size: halfMax,
        buffer: Buffer.alloc(halfMax),
      },
      {
        originalname: 'b.png',
        mimetype: 'image/png',
        size: halfMax,
        buffer: Buffer.alloc(halfMax),
      },
    ] as Express.Multer.File[];

    await expect(
      service.submit({ email: 'user@example.com', subject: 'Help' }, files),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.submit({ email: 'user@example.com', subject: 'Help' }, files),
    ).rejects.toThrow(
      SUPPORT_REQUEST_ATTACHMENTS_TOTAL_MAX_SIZE_MSG(
        SUPPORT_REQUEST_ATTACHMENTS_TOTAL_MAX_BYTES / (1024 * 1024),
      ),
    );
  });

  it('uploads to S3 and emails download links when files are present', async () => {
    const files = [
      {
        originalname: 'screen.png',
        mimetype: 'image/png',
        size: 100,
        buffer: Buffer.from('png'),
      },
    ] as Express.Multer.File[];

    await service.submit(
      { email: 'user@example.com', subject: 'Help', message: 'Details' },
      files,
    );

    expect(s3Service.upload).toHaveBeenCalled();
    expect(prisma.supportRequestAttachment.createMany).toHaveBeenCalledTimes(1);
    const attachmentRows = (
      prisma.supportRequestAttachment.createMany.mock.calls as Array<
        [{ data: { supportRequestId: string; fileName: string }[] }]
      >
    )[0][0].data;
    expect(attachmentRows[0]?.supportRequestId).toBe('req-1');
    expect(attachmentRows[0]?.fileName).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/i,
    );
    expect(emailService.sendEmail).toHaveBeenCalled();
    const emailParams = emailService.sendEmail.mock.calls[0][0];
    expect(emailParams.to).toBe(supportContactEmail);
    expect(emailParams.htmlBody).toContain('https://cdn.example.com/');
    expect(emailParams.htmlBody).toContain('screen.png');
    expect(emailParams.textBody).toContain('Download links:');
  });

  it('persists plan change request and sends plan-change notification email', async () => {
    const result = await service.submitPlanChangeRequest({
      adminEmail: 'admin@example.com',
      adminName: 'Jane Admin',
      companyName: 'Acme LLC',
      currentPlan: 'Growth Monthly',
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe(PLAN_CHANGE_REQUEST_SUBMITTED_SUCCESS_MSG);
    expect(result.data).toEqual({ id: 'req-1' });
    expect(prisma.supportRequest.create).toHaveBeenCalledTimes(1);
    const createArgs = (
      prisma.supportRequest.create.mock.calls as Array<
        [{ data: { email: string; subject: string; message: string } }]
      >
    )[0][0];
    expect(createArgs.data.email).toBe('admin@example.com');
    expect(createArgs.data.subject).toBe('Subscription Plan Change Request');
    expect(createArgs.data.message).toContain('Acme LLC');
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: supportContactEmail,
        subject: PLAN_CHANGE_REQUEST_EMAIL_SUBJECT,
      }),
    );
    const emailParams = emailService.sendEmail.mock.calls.at(-1)?.[0];
    expect(emailParams?.htmlBody).toContain('Growth Monthly');
    expect(emailParams?.htmlBody).toContain('Team BSPBlueprint');
  });
});
