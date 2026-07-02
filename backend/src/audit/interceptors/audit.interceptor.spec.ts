/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from '../audit.service';
import {
  AUDITABLE_KEY,
  AuditableOptions,
} from '../decorators/auditable.decorator';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let auditService: jest.Mocked<AuditService>;
  let reflector: jest.Mocked<Reflector>;

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn(),
    }),
    getHandler: jest.fn(),
  } as unknown as ExecutionContext;

  const mockCallHandler = {
    handle: jest.fn(),
  } as unknown as CallHandler;

  const mockRequest = {
    user: { sub: 'user-123', email: 'admin@test.com', groups: ['SuperAdmin'] },
    params: { id: 'corp-uuid-1' },
    ip: '192.168.1.1',
    headers: {},
  };

  const mockResponse = {
    success: true,
    data: { id: 'corp-uuid-1', name: 'Test Corp' },
  };

  beforeEach(async () => {
    const mockAuditService = {
      logEvent: jest.fn().mockResolvedValue(undefined),
    };

    const mockReflector = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditInterceptor,
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    interceptor = module.get<AuditInterceptor>(AuditInterceptor);
    auditService = module.get(AuditService);
    reflector = module.get(Reflector);

    // Reset mocks
    jest.clearAllMocks();
    (
      mockExecutionContext.switchToHttp().getRequest as jest.Mock
    ).mockReturnValue(mockRequest);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should skip audit logging when no @Auditable decorator', async () => {
      reflector.get.mockReturnValue(undefined);
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockResponse));

      const result = (await firstValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      )) as typeof mockResponse;

      expect(reflector.get).toHaveBeenCalledWith(
        AUDITABLE_KEY,
        mockExecutionContext.getHandler(),
      );
      expect(auditService.logEvent).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should skip audit logging when explicitly disabled', async () => {
      const auditOptions: AuditableOptions = {
        domain: 'corporation',
        eventType: 'VIEW',
        enabled: false,
      };
      reflector.get.mockReturnValue(auditOptions);
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockResponse));

      const result = (await firstValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      )) as typeof mockResponse;

      expect(auditService.logEvent).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should create audit log with entity ID from request params', async () => {
      const auditOptions: AuditableOptions = {
        domain: 'corporation',
        eventType: 'VIEW',
        entityIdParam: 'id',
      };
      reflector.get.mockReturnValue(auditOptions);
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockResponse));

      const result = (await firstValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      )) as typeof mockResponse;

      expect(auditService.logEvent).toHaveBeenCalledWith({
        domain: 'corporation',
        eventType: 'VIEW',
        userId: 'user-123',
        entityId: 'corp-uuid-1',
        ipAddress: '192.168.1.1',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should create audit log with entity ID from request body', async () => {
      const requestWithBody = {
        ...mockRequest,
        body: { email: 'User@Example.com' },
      };
      (
        mockExecutionContext.switchToHttp().getRequest as jest.Mock
      ).mockReturnValue(requestWithBody);

      const auditOptions: AuditableOptions = {
        domain: 'password_reset',
        eventType: 'RESET_REQUEST',
        entityIdBodyField: 'email',
      };
      reflector.get.mockReturnValue(auditOptions);
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockResponse));

      await firstValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      );

      expect(auditService.logEvent).toHaveBeenCalledWith({
        domain: 'password_reset',
        eventType: 'RESET_REQUEST',
        userId: 'user-123',
        entityId: 'user@example.com',
        ipAddress: '192.168.1.1',
      });
    });

    it('should create audit log with entity ID from response data', async () => {
      const auditOptions: AuditableOptions = {
        domain: 'corporation',
        eventType: 'ADD',
        entityIdPath: 'data.id',
      };
      reflector.get.mockReturnValue(auditOptions);
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockResponse));

      const result = (await firstValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      )) as typeof mockResponse;

      expect(auditService.logEvent).toHaveBeenCalledWith({
        domain: 'corporation',
        eventType: 'ADD',
        userId: 'user-123',
        entityId: 'corp-uuid-1',
        ipAddress: '192.168.1.1',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle X-Forwarded-For header for IP address', async () => {
      const requestWithProxy = {
        ...mockRequest,
        headers: { 'x-forwarded-for': '203.0.113.1, 192.168.1.1' },
      };
      (
        mockExecutionContext.switchToHttp().getRequest as jest.Mock
      ).mockReturnValue(requestWithProxy);

      const auditOptions: AuditableOptions = {
        domain: 'corporation',
        eventType: 'VIEW',
        entityIdParam: 'id',
      };
      reflector.get.mockReturnValue(auditOptions);
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockResponse));

      await firstValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      );

      expect(auditService.logEvent).toHaveBeenCalledWith({
        domain: 'corporation',
        eventType: 'VIEW',
        userId: 'user-123',
        entityId: 'corp-uuid-1',
        ipAddress: '203.0.113.1', // First IP from X-Forwarded-For
      });
    });

    it('should handle missing user information', async () => {
      const requestWithoutUser = {
        ...mockRequest,
        user: undefined,
      };
      (
        mockExecutionContext.switchToHttp().getRequest as jest.Mock
      ).mockReturnValue(requestWithoutUser);

      const auditOptions: AuditableOptions = {
        domain: 'corporation',
        eventType: 'VIEW',
        entityIdParam: 'id',
      };
      reflector.get.mockReturnValue(auditOptions);
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockResponse));

      await firstValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      );

      expect(auditService.logEvent).toHaveBeenCalledWith({
        domain: 'corporation',
        eventType: 'VIEW',
        userId: null,
        entityId: 'corp-uuid-1',
        ipAddress: '192.168.1.1',
      });
    });

    it('should extract nested entity ID from response', async () => {
      const nestedResponse = {
        success: true,
        data: {
          items: [{ id: 'nested-id-1' }, { id: 'nested-id-2' }],
        },
      };

      const auditOptions: AuditableOptions = {
        domain: 'corporation',
        eventType: 'VIEW',
        entityIdPath: 'data.items[0].id',
      };
      reflector.get.mockReturnValue(auditOptions);
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(nestedResponse));

      await firstValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      );

      expect(auditService.logEvent).toHaveBeenCalledWith({
        domain: 'corporation',
        eventType: 'VIEW',
        userId: 'user-123',
        entityId: 'nested-id-1',
        ipAddress: '192.168.1.1',
      });
    });

    it('should not create audit log on error responses', async () => {
      const auditOptions: AuditableOptions = {
        domain: 'corporation',
        eventType: 'VIEW',
        entityIdParam: 'id',
      };
      reflector.get.mockReturnValue(auditOptions);
      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        throwError(new Error('Test error')),
      );

      try {
        await firstValueFrom(
          interceptor.intercept(mockExecutionContext, mockCallHandler),
        );
      } catch {
        // Expected to throw
      }

      expect(auditService.logEvent).not.toHaveBeenCalled();
    });

    it('should continue execution even if audit logging fails', async () => {
      const auditOptions: AuditableOptions = {
        domain: 'corporation',
        eventType: 'VIEW',
        entityIdParam: 'id',
      };
      reflector.get.mockReturnValue(auditOptions);
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockResponse));
      auditService.logEvent.mockRejectedValue(new Error('Audit service error'));

      const result = (await firstValueFrom(
        interceptor.intercept(mockExecutionContext, mockCallHandler),
      )) as typeof mockResponse;

      expect(auditService.logEvent).toHaveBeenCalled();
      expect(result).toEqual(mockResponse); // Should still return the response
    });
  });
});
