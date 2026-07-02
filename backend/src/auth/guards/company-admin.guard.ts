import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { COGNITO_GROUP_NAMES } from '../../user/cognito-groups.constants';

const COMPANY_ADMIN_ROLE_REQUIRED_MESSAGE = 'Company admin role required';

interface UserPayload {
  sub: string;
  email?: string;
  groups: string[];
}

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

/**
 * Requires Cognito {@link COGNITO_GROUP_NAMES.COMPANY_ADMIN} (use after {@link CognitoAuthGuard}).
 */
@Injectable()
export class CompanyAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const groups = user?.groups ?? [];
    if (!groups.includes(COGNITO_GROUP_NAMES.COMPANY_ADMIN)) {
      throw new ForbiddenException(COMPANY_ADMIN_ROLE_REQUIRED_MESSAGE);
    }
    return true;
  }
}
