/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dto';
import { AuthorizationGuard, CognitoAuthGuard, SuperAdminGuard } from '../auth';

describe('AuditController', () => {
  let controller: AuditController;
  let auditService: jest.Mocked<AuditService>;

  const mockAuditLogsResponse = {
    success: true,
    message: 'Audit logs fetched successfully',
    data: {
      items: [
        {
          id: 'audit-uuid-1',
          domain: 'corporation',
          eventType: 'VIEW',
          entityId: 'corp-uuid-1',
          userId: 'user-123',
          ipAddress: '192.168.1.1',
          metadata: null,
          createdAt: new Date('2025-01-15T10:00:00Z'),
        },
        {
          id: 'audit-uuid-2',
          domain: 'password_reset',
          eventType: 'RESET_REQUEST',
          entityId: null,
          userId: 'user-456',
          ipAddress: '192.168.1.2',
          metadata: null,
          createdAt: new Date('2025-01-15T09:30:00Z'),
        },
      ],
      total: 2,
      page: 1,
      limit: 50,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    const mockAuditService = {
      findAuditLogs: jest.fn(),
      logEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    })
      .overrideGuard(CognitoAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SuperAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditController>(AuditController);
    auditService = module.get(AuditService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      const query: QueryAuditLogsDto = {
        page: 1,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      auditService.findAuditLogs.mockResolvedValue(mockAuditLogsResponse);

      const result = await controller.findAuditLogs(query);

      expect(auditService.findAuditLogs).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockAuditLogsResponse);
    });

    it('should return filtered audit logs by domain', async () => {
      const query: QueryAuditLogsDto = {
        domain: 'corporation',
        page: 1,
        limit: 50,
      };
      const filteredResponse = {
        ...mockAuditLogsResponse,
        data: {
          ...mockAuditLogsResponse.data,
          items: [mockAuditLogsResponse.data.items[0]], // Only corporation logs
          total: 1,
        },
      };
      auditService.findAuditLogs.mockResolvedValue(filteredResponse);

      const result = await controller.findAuditLogs(query);

      expect(auditService.findAuditLogs).toHaveBeenCalledWith(query);
      expect(result).toEqual(filteredResponse);
    });

    it('should return filtered audit logs by user ID', async () => {
      const query: QueryAuditLogsDto = {
        userId: 'user-123',
        page: 1,
        limit: 50,
      };
      auditService.findAuditLogs.mockResolvedValue(mockAuditLogsResponse);

      const result = await controller.findAuditLogs(query);

      expect(auditService.findAuditLogs).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockAuditLogsResponse);
    });

    it('should return filtered audit logs by entity ID', async () => {
      const query: QueryAuditLogsDto = {
        entityId: 'corp-uuid-1',
        page: 1,
        limit: 50,
      };
      auditService.findAuditLogs.mockResolvedValue(mockAuditLogsResponse);

      const result = await controller.findAuditLogs(query);

      expect(auditService.findAuditLogs).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockAuditLogsResponse);
    });

    it('should rethrow error from service', async () => {
      const query: QueryAuditLogsDto = { page: 1, limit: 50 };
      auditService.findAuditLogs.mockRejectedValue(new Error('Database error'));

      await expect(controller.findAuditLogs(query)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
