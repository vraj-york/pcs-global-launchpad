import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditService } from '../audit.service';
import {
  AUDITABLE_KEY,
  AuditableOptions,
} from '../decorators/auditable.decorator';
import { getAuditBeforeFromRequest } from '../context/audit.context';

interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email?: string;
    groups: string[];
  };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditableOptions>(
      AUDITABLE_KEY,
      context.getHandler(),
    );

    // Skip if not marked as auditable or explicitly disabled
    if (!auditOptions || auditOptions.enabled === false) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const ipAddress = this.extractIpAddress(request);

    // "Before" snapshots are stored on the Express request (see setAuditBefore) so they
    // survive RxJS subscription boundaries; AsyncLocalStorage does not reliably do so.
    return next.handle().pipe(
      tap({
        next: (response) => {
          void this.createAuditLog(
            auditOptions,
            request,
            response,
            user,
            ipAddress,
          );
        },
        error: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.debug(
            `Skipping audit log for failed request: ${message}`,
          );
        },
      }),
    );
  }

  private async createAuditLog(
    options: AuditableOptions,
    request: AuthenticatedRequest,
    response: unknown,
    user: AuthenticatedRequest['user'],
    ipAddress: string | null,
  ): Promise<void> {
    try {
      const entityId = this.extractEntityId(options, request, response);

      let metadata:
        | {
            target: string;
            before?: Record<string, unknown>;
            after?: Record<string, unknown>;
          }
        | null
        | undefined;
      if (options.target) {
        const before = getAuditBeforeFromRequest(request);
        const after =
          response &&
          typeof response === 'object' &&
          'data' in response &&
          (response as { data?: unknown }).data != null
            ? ((response as { data: unknown }).data as Record<string, unknown>)
            : undefined;
        metadata = {
          target: options.target,
          ...(before !== undefined && { before }),
          ...(after !== undefined && { after }),
        };
      }

      await this.auditService.logEvent({
        domain: options.domain,
        eventType: options.eventType,
        userId: user?.sub || null,
        entityId,
        ipAddress,
        ...(metadata != null ? { metadata } : {}),
      });

      this.logger.debug(
        `Auto-audit: ${options.domain}/${options.eventType} for user=${user?.sub || 'null'} entity=${entityId || 'null'}`,
      );
    } catch (error) {
      this.logger.error('Failed to create automatic audit log', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  private extractEntityId(
    options: AuditableOptions,
    request: AuthenticatedRequest,
    response: unknown,
  ): string | null {
    // Try to extract from request parameters first
    if (options.entityIdParam) {
      const paramValue = request.params[options.entityIdParam];
      if (paramValue) {
        return paramValue;
      }
    }

    // Try to extract from request body
    if (options.entityIdBodyField) {
      if (
        request.body &&
        typeof request.body === 'object' &&
        !Array.isArray(request.body)
      ) {
        const raw = (request.body as Record<string, unknown>)[
          options.entityIdBodyField
        ];
        if (typeof raw === 'string' && raw.trim()) {
          return raw.trim().toLowerCase();
        }
      }
    }

    // Try to extract from response data
    if (options.entityIdPath && response && typeof response === 'object') {
      const raw = this.getNestedValue(
        response as Record<string, unknown>,
        options.entityIdPath,
      );
      if (typeof raw === 'string') return raw;
      if (typeof raw === 'number') return String(raw);
    }

    return null;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      const curr = current as Record<string, unknown> | undefined;
      // Handle array access like 'items[0]'
      const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayKey, index] = arrayMatch;
        const arr = curr?.[arrayKey];
        return Array.isArray(arr) ? arr[parseInt(index, 10)] : undefined;
      }
      return curr?.[key];
    }, obj);
  }

  private extractIpAddress(request: Request): string | null {
    // Check X-Forwarded-For header first (for proxied requests)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }

    // Fall back to request.ip
    return request.ip || null;
  }
}
