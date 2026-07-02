import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { COGNITO_GROUP_NAMES } from '../../user/cognito-groups.constants';
import { SubscriptionAccessService } from '../../user/subscription-access.service';
import {
  SUBSCRIPTION_ACCESS_DENIED_MSG,
  SUBSCRIPTION_EMPLOYEE_LIMIT_MSG,
  SUBSCRIPTION_PLAN_FEATURE_DENIED_MSG,
} from '../subscription.constants';

interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email?: string;
    groups: string[];
  };
}

/**
 * Restricts a route to users on the **monthly** plan with an active subscription
 * who have at least one completed assessment (`report_generated`).
 *
 * Use this on BiSPy Bot (chatbot) endpoints.
 * SuperAdmin role always passes.
 * Users with no company assignment don't pass (assessment-only).
 *
 * Must be used AFTER `CognitoAuthGuard`.
 */
@Injectable()
export class MonthlyPlanGuard implements CanActivate {
  private readonly logger = new Logger(MonthlyPlanGuard.name);

  constructor(private readonly subscriptionAccess: SubscriptionAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      return true;
    }

    if (user.groups.includes(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
      return true;
    }

    const ctx = await this.subscriptionAccess.resolveForUser(user.sub);

    if (ctx.employeeLimitExceeded) {
      throw new ForbiddenException(SUBSCRIPTION_EMPLOYEE_LIMIT_MSG);
    }

    if (ctx.isBlocked || (ctx.subscriptionStatus !== null && !ctx.isActive)) {
      throw new ForbiddenException(SUBSCRIPTION_ACCESS_DENIED_MSG);
    }

    if (!ctx.canAccessChatbot) {
      this.logger.warn(
        `MonthlyPlanGuard: user ${user.sub} on plan "${ctx.planTypeId}" attempted to access monthly-only feature`,
      );
      throw new ForbiddenException(SUBSCRIPTION_PLAN_FEATURE_DENIED_MSG);
    }

    return true;
  }
}
