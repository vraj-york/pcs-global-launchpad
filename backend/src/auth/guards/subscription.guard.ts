import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  SKIP_SUBSCRIPTION_CHECK_KEY,
  SUBSCRIPTION_ACCESS_DENIED_MSG,
  SUBSCRIPTION_EMPLOYEE_LIMIT_MSG,
} from '../subscription.constants';
import { COGNITO_GROUP_NAMES } from '../../user/cognito-groups.constants';
import { SubscriptionAccessService } from '../../user/subscription-access.service';

export {
  ACTIVE_SUBSCRIPTION_STATUSES,
  BLOCKED_SUBSCRIPTION_STATUSES,
  PLAN_TYPE_ANNUAL,
  PLAN_TYPE_MONTHLY,
  PLAN_TYPE_ONE_TIME,
  SKIP_SUBSCRIPTION_CHECK_KEY,
  SUBSCRIPTION_ACCESS_DENIED_MSG,
  SUBSCRIPTION_EMPLOYEE_LIMIT_MSG,
  SUBSCRIPTION_PLAN_FEATURE_DENIED_MSG,
  SkipSubscriptionCheck,
} from '../subscription.constants';
export type { SubscriptionContext } from '../subscription.constants';

interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email?: string;
    groups: string[];
  };
  subscriptionContext?: Awaited<
    ReturnType<SubscriptionAccessService['resolveForUser']>
  >;
}

/**
 * Enforces subscription-based access control for end users (Cognito `User` group).
 * Must be used AFTER `CognitoAuthGuard`.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(
    private readonly subscriptionAccess: SubscriptionAccessService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.get<boolean>(
      SKIP_SUBSCRIPTION_CHECK_KEY,
      context.getHandler(),
    );
    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      return true;
    }

    const adminGroups = [
      COGNITO_GROUP_NAMES.SUPER_ADMIN,
      COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
      COGNITO_GROUP_NAMES.COMPANY_ADMIN,
    ];
    if (adminGroups.some((g) => user.groups.includes(g))) {
      return true;
    }

    const ctx = await this.subscriptionAccess.resolveForUser(user.sub);
    request.subscriptionContext = ctx;

    if (!ctx.companyId) {
      if (ctx.isIndividualUser && ctx.paymentRequired) {
        this.logger.warn(
          `SubscriptionGuard: individual payment required for user ${user.sub}`,
        );
        throw new ForbiddenException(
          'Complete payment to activate your assessment access.',
        );
      }
      return true;
    }

    if (ctx.employeeLimitExceeded) {
      this.logger.warn(
        `SubscriptionGuard: employee limit exceeded for user ${user.sub} company ${ctx.companyId}`,
      );
      throw new ForbiddenException(SUBSCRIPTION_EMPLOYEE_LIMIT_MSG);
    }

    if (ctx.isBlocked) {
      this.logger.warn(
        `SubscriptionGuard: blocked status "${ctx.subscriptionStatus}" for user ${user.sub} company ${ctx.companyId}`,
      );
      throw new ForbiddenException(SUBSCRIPTION_ACCESS_DENIED_MSG);
    }

    if (ctx.subscriptionStatus !== null && !ctx.isActive) {
      this.logger.warn(
        `SubscriptionGuard: inactive status "${ctx.subscriptionStatus}" for user ${user.sub} company ${ctx.companyId}`,
      );
      throw new ForbiddenException(SUBSCRIPTION_ACCESS_DENIED_MSG);
    }

    return true;
  }
}
