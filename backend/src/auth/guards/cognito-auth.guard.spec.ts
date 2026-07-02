import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { CognitoAuthGuard } from './cognito-auth.guard';
import { UserSyncService } from '../../user/user-sync.service';
import { PrismaService } from '../../prisma';
import { APP_USER_STATUS } from '../../user/constants/app-user.constants';
import {
  COGNITO_AUTH_INVALID_OR_EXPIRED_TOKEN_MSG,
  COGNITO_AUTH_TOKEN_MISSING_MSG,
} from '../auth.constants';

jest.mock('jwks-rsa', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    getSigningKey: jest.fn(
      (_kid: string, cb: (err: Error | null, key: unknown) => void) => {
        cb(null, { getPublicKey: () => 'mock-public-key' });
      },
    ),
  })),
}));

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('@aws-sdk/client-cognito-identity-provider', () => {
  const actual = jest.requireActual<
    typeof import('@aws-sdk/client-cognito-identity-provider')
  >('@aws-sdk/client-cognito-identity-provider');
  return {
    ...actual,
    CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockImplementation((cmd: unknown) => {
        if (cmd instanceof actual.AdminGetUserCommand) {
          return Promise.resolve({
            UserAttributes: [
              { Name: 'email', Value: 'pool-only-admin@example.com' },
            ],
          });
        }
        return Promise.resolve({ Groups: [{ GroupName: 'SuperAdmin' }] });
      }),
    })),
  };
});

import * as jwt from 'jsonwebtoken';

describe('CognitoAuthGuard', () => {
  let guard: CognitoAuthGuard;
  let prisma: { appUser: { findUnique: jest.Mock } };
  let userSync: { syncFromCognito: jest.Mock };

  const createMockContext = (headers: Record<string, string>) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers: headers }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CognitoAuthGuard,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'COGNITO_USER_POOL_ID') return 'us-east-1_ABC123';
              if (key === 'AWS_REGION') return 'us-east-1';
              return undefined;
            }),
          },
        },
        {
          provide: UserSyncService,
          useValue: {
            syncFromCognito: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            appUser: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
          },
        },
      ],
    }).compile();

    guard = module.get<CognitoAuthGuard>(CognitoAuthGuard);
    prisma = module.get(PrismaService);
    userSync = module.get(UserSyncService);
    prisma.appUser.findUnique.mockReset();
    prisma.appUser.findUnique.mockResolvedValue(null);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw when COGNITO_USER_POOL_ID is not set', async () => {
    await expect(
      Test.createTestingModule({
        providers: [
          CognitoAuthGuard,
          {
            provide: ConfigService,
            useValue: { get: jest.fn(() => undefined) },
          },
          {
            provide: UserSyncService,
            useValue: { syncFromCognito: jest.fn() },
          },
          {
            provide: PrismaService,
            useValue: {
              appUser: { findUnique: jest.fn().mockResolvedValue(null) },
            },
          },
        ],
      }).compile(),
    ).rejects.toThrow('COGNITO_USER_POOL_ID environment variable is not set');
  });

  describe('canActivate', () => {
    it('should throw UnauthorizedException when Authorization header is missing', async () => {
      const context = createMockContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        COGNITO_AUTH_TOKEN_MISSING_MSG,
      );
    });

    it('should throw UnauthorizedException when Authorization is not Bearer', async () => {
      const context = createMockContext({
        authorization: 'Basic some-credentials',
      } as Record<string, string>);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        COGNITO_AUTH_TOKEN_MISSING_MSG,
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      const context = createMockContext({
        authorization: 'Bearer invalid-token',
      });
      (jwt.decode as jest.Mock).mockReturnValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        COGNITO_AUTH_INVALID_OR_EXPIRED_TOKEN_MSG,
      );
    });

    it('should attach user to request and return true when token is valid', async () => {
      const request: {
        headers: { authorization: string };
        user?: { sub: string; email: string; groups: string[] };
      } = { headers: { authorization: 'Bearer valid-jwt' } };
      const context = {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;

      (jwt.decode as jest.Mock).mockReturnValue({
        header: { kid: 'key-id' },
        payload: {},
      });
      (jwt.verify as jest.Mock).mockReturnValue({
        sub: 'user-sub-123',
        email: 'user@example.com',
        'cognito:groups': ['SuperAdmin'],
        token_use: 'access',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toEqual({
        sub: 'user-sub-123',
        email: 'user@example.com',
        groups: ['SuperAdmin'],
      });
      expect(userSync.syncFromCognito).not.toHaveBeenCalled();
    });

    it('should resolve email from Cognito when JWT has no email and user is not in app_users', async () => {
      const request: {
        headers: { authorization: string };
        user?: { sub: string; email?: string; groups: string[] };
      } = { headers: { authorization: 'Bearer valid-jwt' } };
      const context = {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;

      prisma.appUser.findUnique.mockResolvedValue(null);

      (jwt.decode as jest.Mock).mockReturnValue({
        header: { kid: 'key-id' },
        payload: {},
      });
      (jwt.verify as jest.Mock).mockReturnValue({
        sub: 'cognito-only-sub',
        'cognito:groups': ['SuperAdmin'],
        token_use: 'access',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toEqual({
        sub: 'cognito-only-sub',
        email: 'pool-only-admin@example.com',
        groups: ['SuperAdmin'],
      });
      expect(userSync.syncFromCognito).not.toHaveBeenCalled();
    });

    it('should prefer app_users email over Cognito when JWT has no email', async () => {
      prisma.appUser.findUnique
        .mockResolvedValueOnce({
          deletedAt: null,
          status: APP_USER_STATUS.ACTIVE,
        })
        .mockResolvedValueOnce({
          email: 'synced-from-db@example.com',
          deletedAt: null,
        });

      const request: {
        headers: { authorization: string };
        user?: { sub: string; email?: string; groups: string[] };
      } = { headers: { authorization: 'Bearer valid-jwt' } };
      const context = {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;

      (jwt.decode as jest.Mock).mockReturnValue({
        header: { kid: 'key-id' },
        payload: {},
      });
      (jwt.verify as jest.Mock).mockReturnValue({
        sub: 'app-user-sub',
        'cognito:groups': ['User'],
        token_use: 'access',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user?.email).toBe('synced-from-db@example.com');
      expect(userSync.syncFromCognito).toHaveBeenCalledWith(
        'app-user-sub',
        'synced-from-db@example.com',
        ['User'],
      );
    });

    it('should throw when app user status is Blocked', async () => {
      prisma.appUser.findUnique.mockResolvedValue({
        deletedAt: null,
        status: APP_USER_STATUS.BLOCKED,
      });
      const request: {
        headers: { authorization: string };
        user?: unknown;
      } = { headers: { authorization: 'Bearer valid-jwt' } };
      const context = {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;

      (jwt.decode as jest.Mock).mockReturnValue({
        header: { kid: 'key-id' },
        payload: {},
      });
      (jwt.verify as jest.Mock).mockReturnValue({
        sub: 'blocked-sub',
        email: 'b@example.com',
        'cognito:groups': ['User'],
        token_use: 'access',
      });

      await expect(guard.canActivate(context)).rejects.toMatchObject({
        response: { message: COGNITO_AUTH_INVALID_OR_EXPIRED_TOKEN_MSG },
      });
      expect(request.user).toBeUndefined();
    });

    it('should throw when app user is soft-deleted', async () => {
      prisma.appUser.findUnique.mockResolvedValue({
        deletedAt: new Date(),
        status: APP_USER_STATUS.ACTIVE,
      });
      const request = { headers: { authorization: 'Bearer valid-jwt' } };
      const context = {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;

      (jwt.decode as jest.Mock).mockReturnValue({
        header: { kid: 'key-id' },
        payload: {},
      });
      (jwt.verify as jest.Mock).mockReturnValue({
        sub: 'deleted-sub',
        email: 'd@example.com',
        'cognito:groups': ['User'],
        token_use: 'access',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
