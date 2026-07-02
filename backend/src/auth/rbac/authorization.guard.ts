import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RbacAccessService } from './rbac-access.service';
import {
  AUTHORIZATION_CONTEXT_MISSING_MSG,
  REQUIRE_ANY_SUBMODULE_KEY,
  REQUIRE_SUBMODULE_KEY,
  SKIP_AUTHORIZATION_CHECK_KEY,
} from './rbac.constants';
import type { AuthorizationContext } from './rbac.types';

interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email?: string;
    groups: string[];
  };
  authorizationContext?: AuthorizationContext;
}

/**
 * Resolves submodule-based RBAC after {@link CognitoAuthGuard}.
 * Enforces {@link RequireSubmodule} when present on the handler.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  private readonly logger = new Logger(AuthorizationGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbacAccess: RbacAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_AUTHORIZATION_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user?.sub) {
      throw new UnauthorizedException(AUTHORIZATION_CONTEXT_MISSING_MSG);
    }

    const authorizationContext = await this.rbacAccess.resolveForUser(
      user.sub,
      user.groups ?? [],
    );
    request.authorizationContext = authorizationContext;

    if (skip) {
      return true;
    }

    const requiredAnySubmodules = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_ANY_SUBMODULE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredAnySubmodules?.length) {
      this.rbacAccess.assertAnySubmoduleEnabled(
        authorizationContext,
        requiredAnySubmodules,
      );
      return true;
    }

    const requiredSubmodule = this.reflector.getAllAndOverride<string>(
      REQUIRE_SUBMODULE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredSubmodule) {
      this.rbacAccess.assertSubmoduleEnabled(
        authorizationContext,
        requiredSubmodule,
      );
    }

    return true;
  }
}
