import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Extracts the client IP address from the request.
 * Checks X-Forwarded-For header first (for proxied requests), then falls back to request.ip
 */
export const ClientIp = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<Request>();

    // Check X-Forwarded-For header (common in load balancers/proxies)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }

    // Fall back to request.ip
    return request.ip || null;
  },
);
