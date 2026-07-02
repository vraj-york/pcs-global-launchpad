/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { LogEventOptions } from './types';
import { PrismaService } from '../prisma';
import { QueryAuditLogsDto } from './dto';
import { AUDIT_DOMAINS } from './constants';

describe('AuditService', () => {
  let service: AuditService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockAuditLogs = [
    {
      id: 'audit-uuid-1',
      domain: 'corporation',
      eventType: 'VIEW',
      entityId: 'corp-uuid-1',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      createdAt: new Date('2025-01-15T10:00:00Z'),
    },
    {
      id: 'audit-uuid-2',
      domain: 'password_reset',
      eventType: 'RESET_REQUEST',
      entityId: null,
      userId: 'user-456',
      ipAddress: '192.168.1.2',
      createdAt: new Date('2025-01-15T09:30:00Z'),
    },
  ];

  beforeEach(async () => {
    const mockPrismaService = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logEvent', () => {
    it('should create an audit log entry', async () => {
      const options: LogEventOptions = {
        domain: AUDIT_DOMAINS.CORPORATION,
        eventType: 'VIEW',
        userId: 'user-123',
        entityId: 'corp-uuid-1',
        ipAddress: '192.168.1.1',
      };

      (prismaService.auditLog.create as jest.Mock).mockResolvedValue(
        mockAuditLogs[0],
      );

      await service.logEvent(options);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          domain: 'corporation',
          eventType: 'VIEW',
          userId: 'user-123',
          entityId: 'corp-uuid-1',
          ipAddress: '192.168.1.1',
        },
      });
    });

    it('should handle null values for optional fields', async () => {
      const options: LogEventOptions = {
        domain: AUDIT_DOMAINS.PASSWORD_RESET,
        eventType: 'RESET_FAILED',
        userId: null,
        entityId: null,
        ipAddress: null,
      };

      (prismaService.auditLog.create as jest.Mock).mockResolvedValue(
        mockAuditLogs[1],
      );

      await service.logEvent(options);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          domain: 'password_reset',
          eventType: 'RESET_FAILED',
          userId: null,
          entityId: null,
          ipAddress: null,
        },
      });
    });

    it('should not throw error when audit logging fails', async () => {
      const options: LogEventOptions = {
        domain: AUDIT_DOMAINS.CORPORATION,
        eventType: 'VIEW',
        userId: 'user-123',
      };

      (prismaService.auditLog.create as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      // Should not throw
      await expect(service.logEvent(options)).resolves.toBeUndefined();
    });
  });

  describe('findAuditLogs', () => {
    it('should return paginated audit logs with default parameters', async () => {
      const query: QueryAuditLogsDto = {};

      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue(
        mockAuditLogs,
      );
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(2);

      const result = await service.findAuditLogs(query);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
      expect(prismaService.auditLog.count).toHaveBeenCalledWith({ where: {} });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.items).toEqual(mockAuditLogs);
      expect(result.data!.total).toBe(2);
      expect(result.data!.page).toBe(1);
      expect(result.data!.limit).toBe(50);
      expect(result.data!.totalPages).toBe(1);
    });

    it('should filter by domain', async () => {
      const query: QueryAuditLogsDto = {
        domain: 'corporation',
        page: 1,
        limit: 50,
      };

      const filteredLogs = [mockAuditLogs[0]];
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue(
        filteredLogs,
      );
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAuditLogs(query);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { domain: 'corporation' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
      expect(result.data).toBeDefined();
      expect(result.data!.items).toEqual(filteredLogs);
      expect(result.data!.total).toBe(1);
    });

    it('should filter by multiple criteria', async () => {
      const query: QueryAuditLogsDto = {
        domain: 'corporation',
        eventType: 'VIEW',
        userId: 'user-123',
        entityId: 'corp-uuid-1',
        page: 2,
        limit: 25,
        sortBy: 'domain',
        sortOrder: 'asc',
      };

      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLogs[0],
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAuditLogs(query);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          domain: 'corporation',
          eventType: 'VIEW',
          userId: 'user-123',
          entityId: 'corp-uuid-1',
        },
        orderBy: { domain: 'asc' },
        take: 25,
        skip: 25, // (page 2 - 1) * limit 25
      });
      expect(result.data).toBeDefined();
      expect(result.data!.page).toBe(2);
      expect(result.data!.limit).toBe(25);
    });

    it('should calculate total pages correctly', async () => {
      const query: QueryAuditLogsDto = { limit: 1 };

      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLogs[0],
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(2);

      const result = await service.findAuditLogs(query);

      expect(result.data).toBeDefined();
      expect(result.data!.totalPages).toBe(2); // Math.ceil(2 / 1)
    });
  });
});
