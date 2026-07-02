import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { COGNITO_GROUP_NAMES } from '../../user/cognito-groups.constants';

interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email?: string;
    groups: string[];
  };
}

@Injectable()
export class SuperAdminGuard implements CanActivate {
  private readonly logger = new Logger(SuperAdminGuard.name);
  private readonly superAdminGroupName = COGNITO_GROUP_NAMES.SUPER_ADMIN;

  /**
   * Checks if the authenticated user has the SuperAdmin group membership.
   *
   * This guard verifies that:
   * - The user is authenticated (user object exists in request)
   * - The user belongs to the 'SuperAdmin' Cognito group
   *
   * The user information (including groups) should be attached to the request
   * by the CognitoAuthGuard which must be applied before this guard.
   *
   * @param context - The execution context containing the HTTP request
   * @returns {boolean} Returns true if the user has SuperAdmin access
   * @throws {ForbiddenException} If user is not authenticated or doesn't have SuperAdmin group membership
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      this.logger.warn('SuperAdminGuard: No user found in request');
      throw new ForbiddenException('User not authenticated');
    }

    const userGroups = user.groups || [];
    const isSuperAdmin = userGroups.includes(this.superAdminGroupName);

    // Log detailed information for debugging
    this.logger.debug(
      `SuperAdminGuard: User ${user.email || user.sub} - Groups: ${JSON.stringify(userGroups)}, Looking for: ${this.superAdminGroupName}`,
    );

    if (!isSuperAdmin) {
      this.logger.warn(
        `SuperAdminGuard: User ${user.email || user.sub} is not a SuperAdmin. Found groups: ${JSON.stringify(userGroups)}. Expected group: ${this.superAdminGroupName}`,
      );
      throw new ForbiddenException('Access denied. SuperAdmin role required.');
    }

    this.logger.log(
      `SuperAdminGuard: User ${user.email || user.sub} has SuperAdmin access`,
    );
    return true;
  }
}
