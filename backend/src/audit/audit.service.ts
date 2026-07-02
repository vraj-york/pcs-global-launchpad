import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { QueryAuditLogsDto } from './dto';
import { ResponseHelper, ApiResponse } from '../common';
import { AuditLog } from '@prisma/client';
import { AUDIT_LOGS_FETCHED_SUCCESS_MSG } from './constants';
import { LogEventOptions } from './types';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs an audit event for any domain.
   * No passwords, tokens, or sensitive data should ever be logged.
   * Records are append-only (immutable) for compliance.
   *
   * @param options - Audit log options
   * @param options.domain - The domain (e.g., 'corporation', 'company', 'role', 'permission')
   * @param options.eventType - The event type (e.g., 'VIEW', 'ADD', 'EDIT', 'REMOVE')
   * @param options.userId - User ID (e.g., Cognito sub) when available, null otherwise
   * @param options.entityId - Optional entity ID being acted upon
   * @param options.ipAddress - Optional IP address of the actor
   * @param options.metadata - Optional target/before/after for role/permission audits
   */
  async logEvent(options: LogEventOptions): Promise<void> {
    const { domain, eventType, userId, entityId, ipAddress, metadata } =
      options;

    try {
      await this.prisma.auditLog.create({
        data: {
          domain,
          eventType,
          userId,
          entityId: entityId ?? null,
          ipAddress: ipAddress ?? null,
          metadata:
            metadata == null
              ? undefined
              : (metadata as unknown as Prisma.InputJsonValue),
        },
      });
      this.logger.debug(
        `Audit: ${domain}/${eventType} for userId=${userId ?? 'null'} entityId=${entityId ?? 'null'}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log audit event: ${domain}/${eventType}`,
        error,
      );
      // Do not throw - audit logging should not break the main flow
    }
  }

  /**
   * Fetches audit logs for SuperAdmin visibility.
   * Supports filtering by domain, event type, user ID, and entity ID, with pagination and sorting.
   *
   * @param query - Query parameters for filtering, pagination, and sorting
   * @returns Audit logs with pagination metadata
   */
  async findAuditLogs(query: QueryAuditLogsDto): Promise<
    ApiResponse<{
      items: AuditLog[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>
  > {
    const {
      domain,
      eventType,
      userId,
      entityId,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: {
      domain?: string;
      eventType?: string;
      userId?: string;
      entityId?: string;
    } = {};
    if (domain) where.domain = domain;
    if (eventType) where.eventType = eventType;
    if (userId) where.userId = userId;
    if (entityId) where.entityId = entityId;

    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy,
        take: limit,
        skip,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    this.logger.log(
      `Fetched ${logs.length} audit logs for SuperAdmin (page ${page}/${totalPages})`,
    );

    return ResponseHelper.success(AUDIT_LOGS_FETCHED_SUCCESS_MSG, {
      items: logs,
      total,
      page,
      limit,
      totalPages,
    });
  }
}
