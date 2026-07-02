import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';
import { EmailService } from '../email';
import { PrismaService } from '../prisma';
import { RequestResetDto } from './dto/request-reset.dto';
import { ConfirmResetDto } from './dto/confirm-reset.dto';
import { ValidateResetDto } from './dto/validate-reset.dto';
import {
  PASSWORD_RESET_SUCCESS_MSG,
  RESET_CODE_VALID_MSG,
  INVALID_RESET_CODE_MSG,
  RESET_CODE_EXPIRED_MSG,
  RESET_CODE_EXPIRED_MSG_USER,
  PASSWORD_RESET_DB_ERROR_MSG,
  PASSWORD_RESET_RATE_LIMIT_MSG,
} from './constants';
import { PASSWORD_UPDATED_SUBJECT } from './templates';

type CreateTokenCallArg = {
  data: { email: string; token: string; expiresAt: number };
};

const cognitoSend = jest.fn();
jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
    send: cognitoSend,
  })),
  AdminGetUserCommand: jest.fn(),
  AdminSetUserPasswordCommand: jest.fn(),
  AdminUserGlobalSignOutCommand: jest.fn(),
}));

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let prisma: {
    passwordResetToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      deleteMany: jest.Mock;
    };
    appUser: {
      findFirst: jest.Mock;
    };
    auditLog: {
      count: jest.Mock;
    };
  };
  let emailService: { sendEmail: jest.Mock };

  const poolId = 'test-pool-id';
  const validUserResponse = {
    UserAttributes: [{ Name: 'sub', Value: 'user-123' }],
  };

  beforeEach(async () => {
    process.env.COGNITO_USER_POOL_ID = poolId;
    process.env.SUPPORT_CONTACT_EMAIL = 'support@bspblueprint.com';
    cognitoSend.mockReset();

    const mockPrisma = {
      passwordResetToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
      },
      appUser: {
        findFirst: jest.fn().mockResolvedValue({ firstName: 'Jane' }),
      },
      auditLog: {
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get(PasswordResetService);
    prisma = module.get<typeof mockPrisma>(PrismaService);
    emailService = module.get<typeof mockEmailService>(EmailService);
  });

  afterEach(() => {
    delete process.env.COGNITO_USER_POOL_ID;
    delete process.env.SUPPORT_CONTACT_EMAIL;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestReset', () => {
    it('should store token, invalidate existing, and send email when user exists', async () => {
      cognitoSend.mockResolvedValue(validUserResponse);
      prisma.passwordResetToken.deleteMany.mockResolvedValue({
        count: 0,
      });
      prisma.passwordResetToken.create.mockResolvedValue({});

      const dto: RequestResetDto = { email: 'user@example.com' };
      const result: { success: boolean } = await service.requestReset(dto);

      expect(result.success).toBe(true);
      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      const createCalls = prisma.passwordResetToken.create.mock
        .calls as unknown as [CreateTokenCallArg][];
      const createCall = createCalls[0][0];
      expect(createCall.data).toMatchObject({
        email: 'user@example.com',
      });
      expect(createCall.data.token).toMatch(/^\d{6}$/);
      expect(typeof createCall.data.expiresAt).toBe('number');
      // Jest matchers return any; extract to variable for toHaveBeenCalledWith
      const expectedEmailArg = expect.objectContaining({
        to: 'user@example.com',
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
        subject: expect.any(String),
      }) as unknown as Record<string, unknown>;
      expect(emailService.sendEmail).toHaveBeenCalledWith(expectedEmailArg);
    });

    it('should return success without storing token when user does not exist', async () => {
      const err = new Error('UserNotFoundException');
      err.name = 'UserNotFoundException';
      cognitoSend.mockRejectedValue(err);

      const dto: RequestResetDto = { email: 'nobody@example.com' };
      const result = await service.requestReset(dto);

      expect(result.success).toBe(true);
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(prisma.auditLog.count).not.toHaveBeenCalled();
    });

    it('should reject when hourly reset request limit is exceeded', async () => {
      cognitoSend.mockResolvedValue(validUserResponse);
      prisma.auditLog.count.mockResolvedValue(5);

      const dto: RequestResetDto = { email: 'user@example.com' };

      await expect(service.requestReset(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.requestReset(dto)).rejects.toThrow(
        PASSWORD_RESET_RATE_LIMIT_MSG,
      );
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when storeToken (create) fails', async () => {
      cognitoSend.mockResolvedValue(validUserResponse);
      prisma.passwordResetToken.deleteMany.mockResolvedValue({
        count: 0,
      });
      prisma.passwordResetToken.create.mockRejectedValue(
        new Error('Connection refused'),
      );

      const dto: RequestResetDto = { email: 'user@example.com' };

      await expect(service.requestReset(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.requestReset(dto)).rejects.toThrow(
        PASSWORD_RESET_DB_ERROR_MSG,
      );
    });

    it('should throw InternalServerErrorException when invalidateExistingTokens (deleteMany) fails', async () => {
      cognitoSend.mockResolvedValue(validUserResponse);
      prisma.passwordResetToken.deleteMany.mockRejectedValue(
        new Error('Database unavailable'),
      );

      const dto: RequestResetDto = { email: 'user@example.com' };

      await expect(service.requestReset(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.requestReset(dto)).rejects.toThrow(
        PASSWORD_RESET_DB_ERROR_MSG,
      );
    });
  });

  describe('validateResetCode', () => {
    it('should return success when token is valid and not expired', async () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 600;
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        token: '123456',
        email: 'user@example.com',
        expiresAt: futureExpiry,
      });

      const dto: ValidateResetDto = {
        email: 'user@example.com',
        token: '123456',
      };
      const result = await service.validateResetCode(dto);

      expect(result.success).toBe(true);
      expect(result.message).toBe(RESET_CODE_VALID_MSG);
      expect(prisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
        where: { token: '123456' },
      });
    });

    it('should throw BadRequestException when token is not found', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      const dto: ValidateResetDto = {
        email: 'user@example.com',
        token: '999999',
      };

      await expect(service.validateResetCode(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateResetCode(dto)).rejects.toThrow(
        INVALID_RESET_CODE_MSG,
      );
    });

    it('should throw BadRequestException when token email does not match', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        token: '123456',
        email: 'other@example.com',
        expiresAt: Math.floor(Date.now() / 1000) + 600,
      });

      const dto: ValidateResetDto = {
        email: 'user@example.com',
        token: '123456',
      };

      await expect(service.validateResetCode(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateResetCode(dto)).rejects.toThrow(
        INVALID_RESET_CODE_MSG,
      );
    });

    it('should throw BadRequestException when token is expired', async () => {
      const pastExpiry = Math.floor(Date.now() / 1000) - 60;
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        token: '123456',
        email: 'user@example.com',
        expiresAt: pastExpiry,
      });
      prisma.passwordResetToken.deleteMany.mockResolvedValue({
        count: 1,
      });

      const dto: ValidateResetDto = {
        email: 'user@example.com',
        token: '123456',
      };

      await expect(service.validateResetCode(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.validateResetCode(dto)).rejects.toThrow(
        RESET_CODE_EXPIRED_MSG,
      );
      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { token: '123456' },
      });
    });

    it('should throw InternalServerErrorException when getToken (findUnique) fails', async () => {
      prisma.passwordResetToken.findUnique.mockRejectedValue(
        new Error('Connection timeout'),
      );

      const dto: ValidateResetDto = {
        email: 'user@example.com',
        token: '123456',
      };

      await expect(service.validateResetCode(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.validateResetCode(dto)).rejects.toThrow(
        PASSWORD_RESET_DB_ERROR_MSG,
      );
    });
  });

  describe('confirmReset', () => {
    it('should throw BadRequestException when token is not found', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      const dto: ConfirmResetDto = {
        email: 'user@example.com',
        token: '999999',
        newPassword: 'NewSecureP@ss1',
      };

      await expect(service.confirmReset(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.confirmReset(dto)).rejects.toThrow(
        INVALID_RESET_CODE_MSG,
      );
    });

    it('should throw BadRequestException when token is expired', async () => {
      const pastExpiry = Math.floor(Date.now() / 1000) - 60;
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        token: '123456',
        email: 'user@example.com',
        expiresAt: pastExpiry,
      });
      prisma.passwordResetToken.deleteMany.mockResolvedValue({
        count: 1,
      });
      cognitoSend.mockResolvedValue(undefined);

      const dto: ConfirmResetDto = {
        email: 'user@example.com',
        token: '123456',
        newPassword: 'NewSecureP@ss1',
      };

      await expect(service.confirmReset(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.confirmReset(dto)).rejects.toThrow(
        RESET_CODE_EXPIRED_MSG_USER,
      );
    });

    it('should set password, invalidate sessions, delete token, send confirmation email and return success when token valid', async () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 600;
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        token: '123456',
        email: 'user@example.com',
        expiresAt: futureExpiry,
      });
      cognitoSend
        .mockResolvedValueOnce(undefined) // AdminSetUserPassword
        .mockResolvedValueOnce(undefined); // AdminUserGlobalSignOut
      prisma.passwordResetToken.deleteMany.mockResolvedValue({
        count: 1,
      });
      emailService.sendEmail.mockResolvedValue(true);

      const dto: ConfirmResetDto = {
        email: 'user@example.com',
        token: '123456',
        newPassword: 'NewSecureP@ss1',
      };
      const result = await service.confirmReset(dto);

      expect(result.success).toBe(true);
      expect(result.message).toBe(PASSWORD_RESET_SUCCESS_MSG);
      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { token: '123456' },
      });
      expect(prisma.appUser.findFirst).toHaveBeenCalledWith({
        where: { email: 'user@example.com', deletedAt: null },
        select: { firstName: true },
      });
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: PASSWORD_UPDATED_SUBJECT,
        }),
      );
    });

    it('should throw InternalServerErrorException when getToken fails during confirm', async () => {
      prisma.passwordResetToken.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      const dto: ConfirmResetDto = {
        email: 'user@example.com',
        token: '123456',
        newPassword: 'NewSecureP@ss1',
      };

      await expect(service.confirmReset(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.confirmReset(dto)).rejects.toThrow(
        PASSWORD_RESET_DB_ERROR_MSG,
      );
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens and log count when some exist', async () => {
      prisma.passwordResetToken.deleteMany.mockResolvedValue({
        count: 5,
      });

      await service.cleanupExpiredTokens();

      const anyNumber: number = expect.any(Number) as unknown as number;
      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: anyNumber } },
      });
    });

    it('should not throw when deleteMany fails (scheduled job)', async () => {
      prisma.passwordResetToken.deleteMany.mockRejectedValue(
        new Error('Database temporarily unavailable'),
      );

      await expect(service.cleanupExpiredTokens()).resolves.toBeUndefined();
    });

    it('should log at error level after consecutive failures reach threshold', async () => {
      prisma.passwordResetToken.deleteMany.mockRejectedValue(
        new Error('DB down'),
      );
      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.cleanupExpiredTokens();
      await service.cleanupExpiredTokens();
      expect(errorSpy).not.toHaveBeenCalled();
      await service.cleanupExpiredTokens();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Repeated password reset cleanup failures'),
        expect.any(String),
      );
    });

    it('should reset consecutive failure count on success', async () => {
      prisma.passwordResetToken.deleteMany
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce({ count: 0 })
        .mockRejectedValueOnce(new Error('fail again'));
      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.cleanupExpiredTokens();
      await service.cleanupExpiredTokens(); // success resets counter
      await service.cleanupExpiredTokens();
      await service.cleanupExpiredTokens();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('integration: token persistence across request -> validate -> confirm', () => {
    it('should support full flow: request reset stores token, validate finds it, confirm consumes it', async () => {
      const email = 'flow@example.com';
      const storedTokens: Record<string, { email: string; expiresAt: number }> =
        {};

      cognitoSend.mockResolvedValue(validUserResponse);
      prisma.passwordResetToken.deleteMany.mockResolvedValue({
        count: 0,
      });
      prisma.passwordResetToken.create.mockImplementation(
        (args: CreateTokenCallArg) => {
          storedTokens[args.data.token] = {
            email: args.data.email,
            expiresAt: args.data.expiresAt,
          };
          return Promise.resolve(args.data);
        },
      );
      prisma.passwordResetToken.findUnique.mockImplementation(
        (args: { where: { token: string } }) => {
          const row = storedTokens[args.where.token];
          if (!row) return Promise.resolve(null);
          return Promise.resolve({
            token: args.where.token,
            ...row,
          });
        },
      );
      cognitoSend
        .mockResolvedValueOnce(validUserResponse)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);
      prisma.passwordResetToken.deleteMany.mockImplementation(
        (args: { where: { token?: string; email?: string } }) => {
          let count = 0;
          if (args.where.token) {
            if (storedTokens[args.where.token]) count = 1;
            delete storedTokens[args.where.token];
          }
          if (args.where.email) {
            for (const t of Object.keys(storedTokens)) {
              if (storedTokens[t].email === args.where.email) {
                delete storedTokens[t];
                count++;
              }
            }
          }
          return Promise.resolve({ count: count || 1 });
        },
      );

      const requestDto: RequestResetDto = { email };
      const requestResult: { success: boolean } =
        await service.requestReset(requestDto);
      expect(requestResult.success).toBe(true);
      const createCalls = prisma.passwordResetToken.create.mock
        .calls as unknown as [CreateTokenCallArg][];
      const createCall = createCalls[0][0];
      const token: string = createCall.data.token;
      expect(createCall.data.email).toBe(email.toLowerCase());
      expect(storedTokens[token]).toBeDefined();

      const validateDto: ValidateResetDto = { email, token };
      const validateResult = await service.validateResetCode(validateDto);
      expect(validateResult.success).toBe(true);

      const confirmDto: ConfirmResetDto = {
        email,
        token,
        newPassword: 'NewSecureP@ss1',
      };
      const confirmResult: { success: boolean } =
        await service.confirmReset(confirmDto);
      expect(confirmResult.success).toBe(true);
      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { token },
      });
    });
  });

  describe('getToken / storeToken persistence (edge cases)', () => {
    it('should normalise email to lowercase when storing and when invalidating', async () => {
      cognitoSend.mockResolvedValue(validUserResponse);
      prisma.passwordResetToken.deleteMany.mockResolvedValue({
        count: 0,
      });
      prisma.passwordResetToken.create.mockResolvedValue({});

      const dto: RequestResetDto = { email: 'User@Example.COM' };
      await service.requestReset(dto);

      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      const expectedData = expect.objectContaining({
        email: 'user@example.com',
      }) as Record<string, unknown>;
      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: expectedData,
      });
    });
  });
});
