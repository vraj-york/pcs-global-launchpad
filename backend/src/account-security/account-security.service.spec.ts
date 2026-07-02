import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import {
  AccountSecurityService,
  extractBearerAccessToken,
} from './account-security.service';
import { EmailService } from '../email';
import { PrismaService } from '../prisma';
import {
  INVALID_CURRENT_PASSWORD_MSG,
  INVALID_OR_EXPIRED_MFA_OTP_MSG,
  MFA_ALREADY_ENABLED_MSG,
  MFA_DISABLED_SUCCESS_MSG,
  MFA_ENABLED_SUCCESS_MSG,
  MFA_NOT_ENABLED_MSG,
  MFA_OTP_RESEND_LIMIT_MSG,
  MFA_OTP_SENT_MSG,
  PASSWORD_CHANGED_SUCCESS_MSG,
  PASSWORDS_DO_NOT_MATCH_MSG,
  SECURITY_OTP_PURPOSE_MFA_DISABLE,
  SECURITY_OTP_PURPOSE_MFA_ENABLE,
} from './constants';
import { PASSWORD_UPDATED_SUBJECT } from '../password-reset/templates';

const cognitoSend = jest.fn();
jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
    send: cognitoSend,
  })),
  AdminGetUserCommand: jest.fn(),
  AdminSetUserMFAPreferenceCommand: jest.fn(),
  ChangePasswordCommand: jest.fn(),
}));

describe('extractBearerAccessToken', () => {
  it('returns token when Bearer header is valid', () => {
    expect(extractBearerAccessToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('throws when header is missing', () => {
    expect(() => extractBearerAccessToken(undefined)).toThrow(
      UnauthorizedException,
    );
  });
});

describe('AccountSecurityService', () => {
  let service: AccountSecurityService;
  let prisma: {
    appUser: { findUnique: jest.Mock; findFirst: jest.Mock };
    securityOtpToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      deleteMany: jest.Mock;
      count: jest.Mock;
    };
  };
  let emailService: { sendEmail: jest.Mock };

  const poolId = 'test-pool-id';
  const cognitoSub = 'sub-abc';
  const email = 'user@example.com';

  beforeEach(async () => {
    process.env.COGNITO_USER_POOL_ID = poolId;
    process.env.SUPPORT_CONTACT_EMAIL = 'support@bspblueprint.com';
    cognitoSend.mockReset();

    const mockPrisma = {
      appUser: {
        findUnique: jest.fn().mockResolvedValue({
          email,
          deletedAt: null,
        }),
        findFirst: jest.fn().mockResolvedValue({ firstName: 'Jane' }),
      },
      securityOtpToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountSecurityService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get(AccountSecurityService);
    prisma = module.get(PrismaService);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    delete process.env.COGNITO_USER_POOL_ID;
    delete process.env.SUPPORT_CONTACT_EMAIL;
  });

  describe('getSecurityStatus', () => {
    it('returns mfaEnabled true when EMAIL_OTP is in UserMFASettingList', async () => {
      cognitoSend.mockResolvedValueOnce({
        UserMFASettingList: ['EMAIL_OTP'],
      });

      const result = await service.getSecurityStatus(cognitoSub, email);

      expect(result.data?.mfaEnabled).toBe(true);
      expect(result.data?.mfaMethod).toBe('email');
      expect(result.data?.email).toBe(email);
    });

    it('returns mfaEnabled false when MFA is not configured', async () => {
      cognitoSend.mockResolvedValueOnce({
        UserMFASettingList: [],
      });

      const result = await service.getSecurityStatus(cognitoSub, email);

      expect(result.data?.mfaEnabled).toBe(false);
      expect(result.data?.mfaMethod).toBeNull();
    });
  });

  describe('changePassword', () => {
    it('rejects when confirm password does not match', async () => {
      await expect(
        service.changePassword('access-token', {
          currentPassword: 'OldP@ss1',
          newPassword: 'NewP@ss2',
          confirmPassword: 'Different',
        }),
      ).rejects.toThrow(new BadRequestException(PASSWORDS_DO_NOT_MATCH_MSG));
    });

    it('updates password via Cognito ChangePassword and sends confirmation email', async () => {
      cognitoSend.mockResolvedValueOnce({});
      emailService.sendEmail.mockResolvedValue(true);

      const result = await service.changePassword(
        'access-token',
        {
          currentPassword: 'OldP@ss1',
          newPassword: 'NewP@ss2',
          confirmPassword: 'NewP@ss2',
        },
        email,
      );

      expect(result.message).toBe(PASSWORD_CHANGED_SUCCESS_MSG);
      expect(cognitoSend).toHaveBeenCalled();
      expect(prisma.appUser.findFirst).toHaveBeenCalledWith({
        where: { email, deletedAt: null },
        select: { firstName: true },
      });
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: PASSWORD_UPDATED_SUBJECT,
        }),
      );
    });

    it('maps NotAuthorizedException to invalid current password', async () => {
      cognitoSend.mockRejectedValueOnce(
        Object.assign(new Error('bad'), { name: 'NotAuthorizedException' }),
      );

      await expect(
        service.changePassword('access-token', {
          currentPassword: 'wrong',
          newPassword: 'NewP@ss2',
          confirmPassword: 'NewP@ss2',
        }),
      ).rejects.toThrow(new BadRequestException(INVALID_CURRENT_PASSWORD_MSG));
    });
  });

  describe('sendMfaEnableOtp', () => {
    it('rejects when MFA is already enabled', async () => {
      cognitoSend.mockResolvedValueOnce({
        UserMFASettingList: ['EMAIL_OTP'],
      });

      await expect(service.sendMfaEnableOtp(cognitoSub, email)).rejects.toThrow(
        new BadRequestException(MFA_ALREADY_ENABLED_MSG),
      );
    });

    it('stores token and sends email when MFA is off', async () => {
      cognitoSend.mockResolvedValueOnce({ UserMFASettingList: [] });

      const result = await service.sendMfaEnableOtp(cognitoSub, email);

      expect(result.message).toBe(MFA_OTP_SENT_MSG);
      expect(result.data?.email).toBe(email);
      expect(prisma.securityOtpToken.create).toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('resendMfaEnableOtp', () => {
    it('rejects when hourly resend limit is exceeded', async () => {
      cognitoSend.mockResolvedValueOnce({ UserMFASettingList: [] });
      prisma.securityOtpToken.count.mockResolvedValueOnce(5);

      await expect(
        service.resendMfaEnableOtp(cognitoSub, email),
      ).rejects.toThrow(new BadRequestException(MFA_OTP_RESEND_LIMIT_MSG));
    });
  });

  describe('verifyMfaEnableOtp', () => {
    it('enables MFA and deletes token on valid OTP', async () => {
      cognitoSend
        .mockResolvedValueOnce({ UserMFASettingList: [] })
        .mockResolvedValueOnce({});

      prisma.securityOtpToken.findUnique.mockResolvedValueOnce({
        token: '123456',
        cognitoSub,
        email,
        purpose: SECURITY_OTP_PURPOSE_MFA_ENABLE,
        expiresAt: Math.floor(Date.now() / 1000) + 600,
      });

      const result = await service.verifyMfaEnableOtp(
        cognitoSub,
        { otp: '123456' },
        email,
      );

      expect(result.message).toBe(MFA_ENABLED_SUCCESS_MSG);
      expect(prisma.securityOtpToken.deleteMany).toHaveBeenCalledWith({
        where: { token: '123456' },
      });
    });

    it('rejects invalid OTP', async () => {
      cognitoSend.mockResolvedValueOnce({ UserMFASettingList: [] });
      prisma.securityOtpToken.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.verifyMfaEnableOtp(cognitoSub, { otp: '000000' }, email),
      ).rejects.toThrow(
        new BadRequestException(INVALID_OR_EXPIRED_MFA_OTP_MSG),
      );
    });
  });

  describe('sendMfaDisableOtp', () => {
    it('rejects when MFA is not enabled', async () => {
      cognitoSend.mockResolvedValueOnce({ UserMFASettingList: [] });

      await expect(
        service.sendMfaDisableOtp(cognitoSub, email),
      ).rejects.toThrow(new BadRequestException(MFA_NOT_ENABLED_MSG));
    });

    it('stores token and sends email when MFA is on', async () => {
      cognitoSend.mockResolvedValueOnce({
        UserMFASettingList: ['EMAIL_OTP'],
      });

      const result = await service.sendMfaDisableOtp(cognitoSub, email);

      expect(result.message).toBe(MFA_OTP_SENT_MSG);
      const createMock = prisma.securityOtpToken.create as jest.Mock<
        Promise<void>,
        [{ data: { purpose: string } }]
      >;
      expect(createMock).toHaveBeenCalled();
      expect(createMock.mock.calls[0]?.[0].data.purpose).toBe(
        SECURITY_OTP_PURPOSE_MFA_DISABLE,
      );
      expect(emailService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('verifyMfaDisableOtp', () => {
    it('disables MFA and deletes token on valid OTP', async () => {
      cognitoSend
        .mockResolvedValueOnce({ UserMFASettingList: ['EMAIL_OTP'] })
        .mockResolvedValueOnce({});

      prisma.securityOtpToken.findUnique.mockResolvedValueOnce({
        token: '654321',
        cognitoSub,
        email,
        purpose: SECURITY_OTP_PURPOSE_MFA_DISABLE,
        expiresAt: Math.floor(Date.now() / 1000) + 600,
      });

      const result = await service.verifyMfaDisableOtp(
        cognitoSub,
        { otp: '654321' },
        email,
      );

      expect(result.message).toBe(MFA_DISABLED_SUCCESS_MSG);
      expect(prisma.securityOtpToken.deleteMany).toHaveBeenCalledWith({
        where: { token: '654321' },
      });
    });
  });
});
