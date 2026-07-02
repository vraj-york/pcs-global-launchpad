import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

interface UserPayload {
  sub: string;
  email?: string;
  groups: string[];
}

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserPayload => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new Error('User not found in request');
    }
    return request.user;
  },
);
