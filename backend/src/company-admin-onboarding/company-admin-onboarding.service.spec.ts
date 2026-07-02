import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { CompanyAdminOnboardingService } from './company-admin-onboarding.service';
import { PrismaService } from '../prisma';
import { EmailService } from '../email';
import { UserSyncService } from '../user/user-sync.service';
import { COMPANY_STATUS } from '../company/constants/company.status';
import { COMPANY_ADMIN_INVITE_SUBJECT } from './company-admin-onboarding.constants';

const cognitoSend = jest.fn();

jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
    send: cognitoSend,
  })),
  AdminCreateUserCommand: jest.fn().mockImplementation((input: unknown) => ({
    input,
  })),
  AdminGetUserCommand: jest.fn().mockImplementation((input: unknown) => ({
    input,
  })),
  AdminSetUserPasswordCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({
      input,
    })),
  AdminAddUserToGroupCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({
      input,
    })),
}));

function cognitoDefaultSuccessChain() {
  cognitoSend.mockImplementation((cmd: { input?: Record<string, unknown> }) => {
    const input = cmd.input ?? {};
    if ('Password' in input && 'Permanent' in input) {
      return Promise.resolve({});
    }
    if ('TemporaryPassword' in input) {
      return Promise.resolve({});
    }
    if ('GroupName' in input) {
      return Promise.resolve({});
    }
    return Promise.resolve({
      UserStatus: 'FORCE_CHANGE_PASSWORD',
      UserAttributes: [{ Name: 'sub', Value: 'cognito-sub-test' }],
    });
  });
}

describe('CompanyAdminOnboardingService', () => {
  let service: CompanyAdminOnboardingService;
  let prisma: {
    corporationCompany: { findFirst: jest.Mock };
    userCompanyAccess: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let emailService: { sendEmail: jest.Mock };
  let userSync: { recordCompanyAdminProvisioned: jest.Mock };
  let configGet: jest.Mock;

  const companyId = 'company-uuid-1';
  const baseCompany = {
    id: companyId,
    companyAdminInviteSentAt: null as Date | null,
  };

  const defaultAdminAccessUser = {
    user: {
      email: 'admin@example.com',
      firstName: 'Pat',
      lastName: 'Lee',
    },
  };

  beforeEach(async () => {
    cognitoSend.mockReset();
    configGet = jest.fn((key: string) => {
      if (key === 'COGNITO_USER_POOL_ID') return 'test-user-pool-id';
      if (key === 'AWS_REGION') return 'us-east-1';
      if (key === 'ACCEPT_INVITE_ORIGIN') return undefined;
      if (key === 'EMAIL_LOGO_URL') return undefined;
      if (key === 'AWS_ACCESS_KEY_ID') return undefined;
      if (key === 'AWS_SECRET_ACCESS_KEY') return undefined;
      return undefined;
    });

    const mockPrisma = {
      corporationCompany: { findFirst: jest.fn() },
      userCompanyAccess: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(),
    };
    const mockEmail = { sendEmail: jest.fn().mockResolvedValue(true) };
    const mockUserSync = {
      recordCompanyAdminProvisioned: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyAdminOnboardingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmail },
        { provide: UserSyncService, useValue: mockUserSync },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = moduleRef.get(CompanyAdminOnboardingService);
    prisma = moduleRef.get(PrismaService);
    emailService = moduleRef.get(EmailService);
    userSync = moduleRef.get(UserSyncService);

    prisma.userCompanyAccess.findFirst.mockResolvedValue(
      defaultAdminAccessUser,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws when COGNITO_USER_POOL_ID is missing from config', async () => {
    const missingPoolConfig = jest.fn(() => undefined);
    await expect(
      Test.createTestingModule({
        providers: [
          CompanyAdminOnboardingService,
          {
            provide: PrismaService,
            useValue: {
              corporationCompany: { findFirst: jest.fn() },
              userCompanyAccess: {
                findFirst: jest.fn().mockResolvedValue(null),
              },
              $transaction: jest.fn(),
            },
          },
          { provide: EmailService, useValue: { sendEmail: jest.fn() } },
          {
            provide: UserSyncService,
            useValue: { recordCompanyAdminProvisioned: jest.fn() },
          },
          { provide: ConfigService, useValue: { get: missingPoolConfig } },
        ],
      }).compile(),
    ).rejects.toThrow('COGNITO_USER_POOL_ID');
  });

  describe('onCompanyActivated', () => {
    it('returns without work when newStatus is not ACTIVE', async () => {
      prisma.corporationCompany.findFirst.mockResolvedValue(baseCompany);
      await service.onCompanyActivated(
        companyId,
        COMPANY_STATUS.INCOMPLETE,
        COMPANY_STATUS.INCOMPLETE,
      );
      expect(prisma.corporationCompany.findFirst).not.toHaveBeenCalled();
      expect(cognitoSend).not.toHaveBeenCalled();
    });

    it('returns without work when company was already ACTIVE', async () => {
      prisma.corporationCompany.findFirst.mockResolvedValue(baseCompany);
      await service.onCompanyActivated(
        companyId,
        COMPANY_STATUS.ACTIVE,
        COMPANY_STATUS.ACTIVE,
      );
      expect(prisma.corporationCompany.findFirst).not.toHaveBeenCalled();
      expect(cognitoSend).not.toHaveBeenCalled();
    });

    it('provisions Cognito, sends email, and updates DB when transitioning to ACTIVE', async () => {
      cognitoDefaultSuccessChain();
      prisma.corporationCompany.findFirst.mockResolvedValue(baseCompany);
      const txUpdate = jest.fn().mockResolvedValue({});
      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<void>) => {
          await fn({
            corporationCompany: { update: txUpdate },
          });
        },
      );

      await service.onCompanyActivated(
        companyId,
        COMPANY_STATUS.INCOMPLETE,
        COMPANY_STATUS.ACTIVE,
      );

      expect(prisma.corporationCompany.findFirst).toHaveBeenCalledWith({
        where: { id: companyId, deletedAt: null },
        select: {
          id: true,
          companyAdminInviteSentAt: true,
        },
      });
      expect(cognitoSend).toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@example.com',
          subject: COMPANY_ADMIN_INVITE_SUBJECT,
          htmlBody: expect.stringContaining(
            'https://bspblueprint.com/login',
          ) as string,
          textBody: expect.stringContaining(
            'https://bspblueprint.com/login',
          ) as string,
        }),
      );
      expect(txUpdate).toHaveBeenCalledWith({
        where: { id: companyId },
        data: { companyAdminInviteSentAt: expect.any(Date) as Date },
      });
      expect(userSync.recordCompanyAdminProvisioned).toHaveBeenCalledWith(
        expect.anything(),
        {
          cognitoSub: 'cognito-sub-test',
          email: 'admin@example.com',
          firstName: 'Pat',
          lastName: 'Lee',
          companyId,
          isAdmin: true,
        },
      );
    });

    it('uses ACCEPT_INVITE_ORIGIN for login link when set', async () => {
      configGet.mockImplementation((key: string) => {
        if (key === 'COGNITO_USER_POOL_ID') return 'test-user-pool-id';
        if (key === 'ACCEPT_INVITE_ORIGIN') return 'https://app.example.com/';
        if (key === 'AWS_REGION') return 'us-east-1';
        return undefined;
      });
      const moduleRef = await Test.createTestingModule({
        providers: [
          CompanyAdminOnboardingService,
          { provide: PrismaService, useValue: prisma },
          { provide: EmailService, useValue: emailService },
          { provide: UserSyncService, useValue: userSync },
          { provide: ConfigService, useValue: { get: configGet } },
        ],
      }).compile();
      const svc = moduleRef.get(CompanyAdminOnboardingService);

      cognitoDefaultSuccessChain();
      prisma.corporationCompany.findFirst.mockResolvedValue(baseCompany);
      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<void>) => {
          await fn({ corporationCompany: { update: jest.fn() } });
        },
      );

      await svc.onCompanyActivated(
        companyId,
        COMPANY_STATUS.INCOMPLETE,
        COMPANY_STATUS.ACTIVE,
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          htmlBody: expect.stringContaining(
            'https://app.example.com/login',
          ) as string,
        }),
      );
    });

    it('skips when company is not found', async () => {
      prisma.corporationCompany.findFirst.mockResolvedValue(null);
      await service.onCompanyActivated(
        companyId,
        COMPANY_STATUS.INCOMPLETE,
        COMPANY_STATUS.ACTIVE,
      );
      expect(cognitoSend).not.toHaveBeenCalled();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('skips when invite was already sent', async () => {
      prisma.corporationCompany.findFirst.mockResolvedValue({
        ...baseCompany,
        companyAdminInviteSentAt: new Date('2024-01-01'),
      });
      await service.onCompanyActivated(
        companyId,
        COMPANY_STATUS.INCOMPLETE,
        COMPANY_STATUS.ACTIVE,
      );
      expect(cognitoSend).not.toHaveBeenCalled();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('skips when company has no email', async () => {
      prisma.userCompanyAccess.findFirst.mockResolvedValue({
        user: { email: '  ' },
      });
      prisma.corporationCompany.findFirst.mockResolvedValue(baseCompany);
      await service.onCompanyActivated(
        companyId,
        COMPANY_STATUS.INCOMPLETE,
        COMPANY_STATUS.ACTIVE,
      );
      expect(cognitoSend).not.toHaveBeenCalled();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('throws when email send fails', async () => {
      cognitoDefaultSuccessChain();
      prisma.corporationCompany.findFirst.mockResolvedValue(baseCompany);
      prisma.$transaction.mockImplementation(async () => {});
      emailService.sendEmail.mockResolvedValue(false);

      await expect(
        service.onCompanyActivated(
          companyId,
          COMPANY_STATUS.INCOMPLETE,
          COMPANY_STATUS.ACTIVE,
        ),
      ).rejects.toThrow(InternalServerErrorException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('when admin was pre-provisioned (userCompanyAccess), resolves temp password and sends email', async () => {
      cognitoDefaultSuccessChain();
      prisma.corporationCompany.findFirst.mockResolvedValue(baseCompany);
      prisma.userCompanyAccess.findFirst.mockResolvedValue({
        user: {
          cognitoSub: 'pre-prov-sub',
          email: 'admin@example.com',
          firstName: 'Pat',
          lastName: 'Lee',
        },
      });
      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<void>) => {
          await fn({ corporationCompany: { update: jest.fn() } });
        },
      );

      await service.onCompanyActivated(
        companyId,
        COMPANY_STATUS.INCOMPLETE,
        COMPANY_STATUS.ACTIVE,
      );

      expect(cognitoSend).toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          htmlBody: expect.stringContaining(
            'Your temporary password is:',
          ) as string,
        }),
      );
      expect(userSync.recordCompanyAdminProvisioned).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ cognitoSub: 'pre-prov-sub' }),
      );
    });

    it('when admin was pre-provisioned and Cognito user is CONFIRMED, sends email without temp password', async () => {
      cognitoSend.mockImplementation(
        (cmd: { input?: Record<string, unknown> }) => {
          const input = cmd.input ?? {};
          if ('Password' in input && 'Permanent' in input) {
            return Promise.resolve({});
          }
          return Promise.resolve({
            UserStatus: 'CONFIRMED',
            UserAttributes: [{ Name: 'sub', Value: 'corp-admin-sub' }],
          });
        },
      );
      prisma.corporationCompany.findFirst.mockResolvedValue(baseCompany);
      prisma.userCompanyAccess.findFirst.mockResolvedValue({
        user: {
          cognitoSub: 'corp-admin-sub',
          email: 'admin@example.com',
          firstName: 'Pat',
          lastName: 'Lee',
        },
      });
      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<void>) => {
          await fn({ corporationCompany: { update: jest.fn() } });
        },
      );

      await service.onCompanyActivated(
        companyId,
        COMPANY_STATUS.INCOMPLETE,
        COMPANY_STATUS.ACTIVE,
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          htmlBody: expect.not.stringContaining(
            'Your temporary password is:',
          ) as string,
        }),
      );
    });

    it('uses UsernameExists path: adds group and sends email without new temp password in body', async () => {
      cognitoSend.mockImplementation(
        (cmd: { input?: Record<string, unknown> }) => {
          const input = cmd.input ?? {};
          if ('TemporaryPassword' in input) {
            const err = new Error('exists');
            err.name = 'UsernameExistsException';
            return Promise.reject(err);
          }
          if ('GroupName' in input) {
            return Promise.resolve({});
          }
          return Promise.resolve({
            UserAttributes: [{ Name: 'sub', Value: 'existing-sub' }],
          });
        },
      );
      prisma.corporationCompany.findFirst.mockResolvedValue(baseCompany);
      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<void>) => {
          await fn({ corporationCompany: { update: jest.fn() } });
        },
      );

      await service.onCompanyActivated(
        companyId,
        COMPANY_STATUS.INCOMPLETE,
        COMPANY_STATUS.ACTIVE,
      );

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          htmlBody: expect.not.stringContaining(
            'Your temporary password is:',
          ) as string,
        }),
      );
      expect(userSync.recordCompanyAdminProvisioned).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ cognitoSub: 'existing-sub', isAdmin: true }),
      );
    });

    it('throws when Cognito sub is missing after provisioning', async () => {
      cognitoSend.mockImplementation(
        (cmd: { input?: Record<string, unknown> }) => {
          const input = cmd.input ?? {};
          if ('TemporaryPassword' in input) {
            return Promise.resolve({});
          }
          if ('GroupName' in input) {
            return Promise.resolve({});
          }
          return Promise.resolve({ UserAttributes: [] });
        },
      );
      prisma.corporationCompany.findFirst.mockResolvedValue(baseCompany);

      await expect(
        service.onCompanyActivated(
          companyId,
          COMPANY_STATUS.INCOMPLETE,
          COMPANY_STATUS.ACTIVE,
        ),
      ).rejects.toThrow(InternalServerErrorException);
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('includes EMAIL_LOGO_URL in HTML when configured', async () => {
      const logoUrl = 'https://cdn.example.com/EmailHeader.png';
      const previousLogoUrl = process.env.EMAIL_LOGO_URL;
      process.env.EMAIL_LOGO_URL = logoUrl;
      try {
        configGet.mockImplementation((key: string) => {
          if (key === 'COGNITO_USER_POOL_ID') return 'test-user-pool-id';
          if (key === 'AWS_REGION') return 'us-east-1';
          return undefined;
        });
        const moduleRef = await Test.createTestingModule({
          providers: [
            CompanyAdminOnboardingService,
            { provide: PrismaService, useValue: prisma },
            { provide: EmailService, useValue: emailService },
            { provide: UserSyncService, useValue: userSync },
            { provide: ConfigService, useValue: { get: configGet } },
          ],
        }).compile();
        const svc = moduleRef.get(CompanyAdminOnboardingService);
        cognitoDefaultSuccessChain();
        prisma.corporationCompany.findFirst.mockResolvedValue(baseCompany);
        prisma.$transaction.mockImplementation(
          async (fn: (tx: unknown) => Promise<void>) => {
            await fn({ corporationCompany: { update: jest.fn() } });
          },
        );
        await svc.onCompanyActivated(
          companyId,
          COMPANY_STATUS.INCOMPLETE,
          COMPANY_STATUS.ACTIVE,
        );
        expect(emailService.sendEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            htmlBody: expect.stringContaining(
              logoUrl.split('/').pop()!,
            ) as string,
          }),
        );
      } finally {
        process.env.EMAIL_LOGO_URL = previousLogoUrl;
      }
    });
  });
});
