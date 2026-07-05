import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { COGNITO_GROUP_NAMES } from '../../user/cognito-groups.constants';

const COACH_ROLE_REQUIRED_MESSAGE = 'Coach role required';

interface UserPayload {
  sub: string;
  email?: string;
  groups: string[];
}

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

/**
 * Requires Cognito {@link COGNITO_GROUP_NAMES.COACH} (use after {@link CognitoAuthGuard}).
 * SuperAdmin is allowed for local E2E testing without a pcs-coach group assignment.
 */
@Injectable()
export class CoachGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const groups = user?.groups ?? [];
    const isCoach = groups.includes(COGNITO_GROUP_NAMES.COACH);
    const isSuperAdmin = groups.includes(COGNITO_GROUP_NAMES.SUPER_ADMIN);
    if (!isCoach && !isSuperAdmin) {
      throw new ForbiddenException(COACH_ROLE_REQUIRED_MESSAGE);
    }
    return true;
  }
}
