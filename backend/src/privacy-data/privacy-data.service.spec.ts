import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrivacyDataService } from './privacy-data.service';
import { PrismaService } from '../prisma';
import { EmailService } from '../email';
import { S3Service } from '../s3';
import { AccountSecurityService } from '../account-security/account-security.service';
import {
  DATA_EXPORT_ALREADY_IN_PROGRESS_MSG,
  DATA_EXPORT_DOWNLOAD_ALREADY_USED_MSG,
  DATA_EXPORT_DOWNLOAD_EXPIRED_MSG,
  DATA_EXPORT_REQUEST_SUBMITTED_MSG,
  DATA_EXPORT_STATUS,
} from './constants';

jest.mock('exceljs', () => {
  class MockWorkbook {
    creator = '';
    created = new Date();
    addWorksheet() {
      return { addRow: jest.fn() };
    }
    xlsx = {
      writeBuffer: jest.fn().mockResolvedValue(Buffer.from('xlsx')),
    };
  }
  return { Workbook: MockWorkbook, default: { Workbook: MockWorkbook } };
});

type MockArchiver = {
  on: jest.Mock<MockArchiver, [string, (arg?: Buffer) => void]>;
  append: jest.Mock;
  finalize: jest.Mock;
};

jest.mock('archiver', () => ({
  default: jest.fn((): MockArchiver => {
    const handlers: Record<string, Array<(arg?: Buffer) => void>> = {};
    const archive: MockArchiver = {
      on: jest.fn((event: string, cb: (arg?: Buffer) => void): MockArchiver => {
        handlers[event] = handlers[event] ?? [];
        handlers[event].push(cb);
        return archive;
      }),
      append: jest.fn(),
      finalize: jest.fn(() => {
        handlers.data?.forEach((cb) => cb(Buffer.from('zip-chunk')));
        handlers.end?.forEach((cb) => cb());
      }),
    };
    return archive;
  }),
}));

describe('PrivacyDataService', () => {
  let service: PrivacyDataService;
  let prisma: {
    appUser: { findFirst: jest.Mock };
    dataExportRequest: {
      count: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    dataExportDownloadToken: {
      findUnique: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let accountSecurityService: {
    sendDataDownloadOtp: jest.Mock;
    resendDataDownloadOtp: jest.Mock;
    consumeSecurityOtp: jest.Mock;
  };
  let s3Service: {
    upload: jest.Mock;
    buildUserDataExportKey: jest.Mock;
    getPresignedDownloadUrl: jest.Mock;
  };
  let emailService: { sendEmail: jest.Mock };

  const cognitoSub = 'sub-abc';
  const email = 'user@example.com';

  beforeEach(async () => {
    prisma = {
      appUser: {
        findFirst: jest.fn(),
      },
      dataExportRequest: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({
          id: 'req-1',
          cognitoSub,
          email,
          status: DATA_EXPORT_STATUS.PENDING,
        }),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      dataExportDownloadToken: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    accountSecurityService = {
      sendDataDownloadOtp: jest.fn().mockResolvedValue({
        success: true,
        message: 'sent',
        data: { email },
      }),
      resendDataDownloadOtp: jest.fn().mockResolvedValue({
        success: true,
        message: 'sent',
        data: { email },
      }),
      consumeSecurityOtp: jest.fn().mockResolvedValue(undefined),
    };

    s3Service = {
      upload: jest.fn().mockResolvedValue(undefined),
      buildUserDataExportKey: jest
        .fn()
        .mockReturnValue('user-data-exports/file.zip'),
      getPresignedDownloadUrl: jest
        .fn()
        .mockResolvedValue('https://s3.example.com/file.zip'),
    };

    emailService = {
      sendEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivacyDataService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
        { provide: S3Service, useValue: s3Service },
        { provide: AccountSecurityService, useValue: accountSecurityService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'API_PUBLIC_BASE_URL')
                return 'https://api.example.com';
              if (key === 'SUPPORT_CONTACT_EMAIL') return 'support@example.com';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(PrivacyDataService);
  });

  it('delegates send OTP to account security service', async () => {
    const result = await service.sendDataDownloadOtp(cognitoSub, email);
    expect(accountSecurityService.sendDataDownloadOtp).toHaveBeenCalledWith(
      cognitoSub,
      email,
    );
    expect(result.data).toEqual({ email });
  });

  it('submits export request after OTP verification', async () => {
    prisma.appUser.findFirst.mockResolvedValueOnce({ email });

    const result = await service.verifyAndSubmitDataExportRequest(
      cognitoSub,
      { otp: '123456' },
      email,
    );

    expect(accountSecurityService.consumeSecurityOtp).toHaveBeenCalled();
    expect(prisma.dataExportRequest.create).toHaveBeenCalled();
    expect(result.message).toBe(DATA_EXPORT_REQUEST_SUBMITTED_MSG);
  });

  it('rejects when an export is already in progress', async () => {
    prisma.appUser.findFirst.mockResolvedValueOnce({ email });
    prisma.dataExportRequest.count.mockResolvedValueOnce(1);

    await expect(
      service.verifyAndSubmitDataExportRequest(
        cognitoSub,
        { otp: '123456' },
        email,
      ),
    ).rejects.toThrow(
      new BadRequestException(DATA_EXPORT_ALREADY_IN_PROGRESS_MSG),
    );
  });

  it('rejects unauthorized user on verify', async () => {
    prisma.appUser.findFirst.mockResolvedValueOnce(null);

    await expect(
      service.verifyAndSubmitDataExportRequest(
        cognitoSub,
        { otp: '123456' },
        email,
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects expired download token', async () => {
    prisma.dataExportDownloadToken.findUnique.mockResolvedValueOnce({
      token: 'tok',
      expiresAt: Math.floor(Date.now() / 1000) - 10,
      downloadedAt: null,
      request: {
        cognitoSub,
        s3Key: 'user-data-exports/file.zip',
        status: DATA_EXPORT_STATUS.COMPLETED,
      },
    });

    await expect(service.resolveDownloadRedirect('tok')).rejects.toThrow(
      new BadRequestException(DATA_EXPORT_DOWNLOAD_EXPIRED_MSG),
    );
  });

  it('rejects already-used download token', async () => {
    prisma.dataExportDownloadToken.findUnique.mockResolvedValueOnce({
      token: 'tok',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      downloadedAt: new Date(),
      request: {
        cognitoSub,
        s3Key: 'user-data-exports/file.zip',
        status: DATA_EXPORT_STATUS.COMPLETED,
      },
    });

    await expect(service.resolveDownloadRedirect('tok')).rejects.toThrow(
      new BadRequestException(DATA_EXPORT_DOWNLOAD_ALREADY_USED_MSG),
    );
  });

  it('returns presigned URL for valid token', async () => {
    prisma.dataExportDownloadToken.findUnique.mockResolvedValueOnce({
      token: 'tok',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      downloadedAt: null,
      request: {
        cognitoSub,
        s3Key: 'user-data-exports/file.zip',
        status: DATA_EXPORT_STATUS.COMPLETED,
      },
    });
    prisma.dataExportDownloadToken.updateMany.mockResolvedValueOnce({
      count: 1,
    });

    const url = await service.resolveDownloadRedirect('tok');

    expect(url).toBe('https://s3.example.com/file.zip');
    expect(s3Service.getPresignedDownloadUrl).toHaveBeenCalled();
  });

  it('throws not found for missing token', async () => {
    prisma.dataExportDownloadToken.findUnique.mockResolvedValueOnce(null);

    await expect(service.resolveDownloadRedirect('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
