import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssessmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  BLOCKED_SUBSCRIPTION_STATUSES,
  PLAN_TYPE_ANNUAL,
  PLAN_TYPE_MONTHLY,
  PLAN_TYPE_ONE_TIME,
  SUBSCRIPTION_EMPLOYEE_LIMIT_MSG,
} from '../auth/subscription.constants';
import {
  APP_USER_INVITE_COMPANY_NO_PLAN_MSG,
  APP_USER_INVITE_TYPE,
  APP_USER_STATUS,
  INDIVIDUAL_APP_USER_TYPE,
} from './constants/app-user.constants';
import { INDIVIDUAL_PAYMENT_STATUS } from './constants/individual-payment.constants';
import { SUBSCRIPTION_ACCESS_NO_COMPANY } from './constants/subscription-access.constants';
import type { SubscriptionAccessResult } from './subscription-access.types';

export type { SubscriptionAccessResult } from './subscription-access.types';

const DEFAULT_ONE_TIME_ASSESSMENT_QUANTITY = 1;

@Injectable()
export class SubscriptionAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForUser(cognitoSub: string): Promise<SubscriptionAccessResult> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      return {
        ...SUBSCRIPTION_ACCESS_NO_COMPANY,
        canAccessFullApp: false,
        canAccessChatbot: false,
        canStartAssessment: false,
      };
    }

    const access = await this.prisma.userCompanyAccess.findFirst({
      where: {
        userId: trimmedSub,
        company: { deletedAt: null },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        companyId: true,
        company: {
          select: {
            subscriptionStatus: true,
            assessmentQuantity: true,
            plan: {
              select: {
                planTypeId: true,
                employeeRangeMax: true,
              },
            },
          },
        },
      },
    });

    if (!access) {
      return this.resolveNoCompanyAccess(trimmedSub);
    }

    const status = access.company.subscriptionStatus?.toLowerCase() ?? null;
    const planTypeId = access.company.plan?.planTypeId ?? null;
    const employeeRangeMax = access.company.plan?.employeeRangeMax ?? null;
    const assessmentQuantity =
      access.company.assessmentQuantity ?? DEFAULT_ONE_TIME_ASSESSMENT_QUANTITY;
    const isActive =
      status !== null && ACTIVE_SUBSCRIPTION_STATUSES.has(status);
    const isBlocked =
      status !== null && BLOCKED_SUBSCRIPTION_STATUSES.has(status);

    let activeEmployeeCount: number | null = null;
    let employeeLimitExceeded = false;
    if (employeeRangeMax != null) {
      activeEmployeeCount = await this.countActiveEmployees(access.companyId);
      employeeLimitExceeded = activeEmployeeCount > employeeRangeMax;
    }

    const subscriptionOk = isActive && !isBlocked && !employeeLimitExceeded;

    let companyAssessmentCount: number | null = null;
    let assessmentCreditsRemaining: number | null = null;
    if (planTypeId === PLAN_TYPE_ONE_TIME && subscriptionOk) {
      companyAssessmentCount = await this.countCompanyAssessments(
        access.companyId,
      );
      assessmentCreditsRemaining = Math.max(
        0,
        assessmentQuantity - companyAssessmentCount,
      );
    }

    let canStartAssessment = false;
    if (subscriptionOk && planTypeId) {
      if (planTypeId === PLAN_TYPE_MONTHLY || planTypeId === PLAN_TYPE_ANNUAL) {
        canStartAssessment = true;
      } else if (planTypeId === PLAN_TYPE_ONE_TIME) {
        canStartAssessment = await this.resolveCanStartOneTimeCompanyUser(
          trimmedSub,
          access.companyId,
          assessmentQuantity,
        );
      }
    }

    const canAccessFullApp = subscriptionOk && planTypeId === PLAN_TYPE_MONTHLY;
    let canAccessChatbot = false;
    if (canAccessFullApp) {
      const assessmentCompletionCount =
        await this.countCompletedAssessments(trimmedSub);
      canAccessChatbot = assessmentCompletionCount > 0;
    }

    return {
      companyId: access.companyId,
      subscriptionStatus: status,
      planTypeId,
      employeeRangeMax,
      assessmentQuantity:
        planTypeId === PLAN_TYPE_ONE_TIME ? assessmentQuantity : null,
      companyAssessmentCount,
      assessmentCreditsRemaining,
      isActive,
      isBlocked,
      activeEmployeeCount,
      employeeLimitExceeded,
      canAccessFullApp,
      canAccessChatbot,
      canStartAssessment,
      canViewResults: true,
    };
  }

  /**
   * Returns the subscription access result for users with no company assignment.
   * Assessment-only users may start assessments but not chatbot.
   */
  private async resolveNoCompanyAccess(
    cognitoSub: string,
  ): Promise<SubscriptionAccessResult> {
    const user = await this.prisma.appUser.findFirst({
      where: { cognitoSub, deletedAt: null },
      select: { inviteType: true, userType: true, paymentStatus: true },
    });

    const isIndividualUser =
      user?.userType?.trim() === INDIVIDUAL_APP_USER_TYPE;

    if (isIndividualUser) {
      const isPaid =
        user?.paymentStatus?.trim().toLowerCase() ===
        INDIVIDUAL_PAYMENT_STATUS.PAID;
      const canStartAssessment =
        isPaid && (await this.resolveCanStartSingleAssessmentUser(cognitoSub));

      return {
        companyId: null,
        subscriptionStatus: isPaid ? 'active' : null,
        planTypeId: PLAN_TYPE_ONE_TIME,
        employeeRangeMax: null,
        assessmentQuantity: null,
        companyAssessmentCount: null,
        assessmentCreditsRemaining: null,
        isActive: isPaid,
        isBlocked: false,
        activeEmployeeCount: null,
        employeeLimitExceeded: false,
        canAccessFullApp: false,
        canAccessChatbot: false,
        canStartAssessment,
        canViewResults: true,
        isIndividualUser: true,
        paymentRequired: !isPaid,
        paymentStatus: user?.paymentStatus ?? null,
      };
    }

    const isAssessmentOnly =
      user?.inviteType?.trim().toLowerCase() ===
      APP_USER_INVITE_TYPE.ASSESSMENT_ONLY.toLowerCase();

    if (!isAssessmentOnly) {
      return SUBSCRIPTION_ACCESS_NO_COMPANY;
    }

    return {
      ...SUBSCRIPTION_ACCESS_NO_COMPANY,
      canAccessFullApp: false,
      canAccessChatbot: false,
      canStartAssessment:
        await this.resolveCanStartSingleAssessmentUser(cognitoSub),
    };
  }

  /** Counts assessments with `report_generated` for the user (profile field). */
  private async countCompletedAssessments(cognitoSub: string): Promise<number> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      return 0;
    }

    return this.prisma.assessment.count({
      where: {
        userId: trimmedSub,
        status: AssessmentStatus.report_generated,
      },
    });
  }

  /**
   * One-time B2C and assessment-only users may start only when they have no
   * assessments yet, or an in-progress assessment to continue.
   */
  private async resolveCanStartSingleAssessmentUser(
    cognitoSub: string,
  ): Promise<boolean> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      return false;
    }

    const [totalCount, unfinished] = await Promise.all([
      this.prisma.assessment.count({ where: { userId: trimmedSub } }),
      this.prisma.assessment.findFirst({
        where: {
          userId: trimmedSub,
          status: { not: AssessmentStatus.report_generated },
        },
        select: { id: true },
      }),
    ]);

    return totalCount === 0 || unfinished !== null;
  }

  /**
   * Company `one_time` users share a pool of purchased assessment credits.
   * Users may continue an in-progress assessment or start a new one while credits remain.
   */
  private async resolveCanStartOneTimeCompanyUser(
    cognitoSub: string,
    companyId: string,
    assessmentQuantity: number,
  ): Promise<boolean> {
    const trimmedSub = cognitoSub?.trim();
    if (!trimmedSub) {
      return false;
    }

    const unfinished = await this.prisma.assessment.findFirst({
      where: {
        userId: trimmedSub,
        status: { not: AssessmentStatus.report_generated },
      },
      select: { id: true },
    });
    if (unfinished) {
      return true;
    }

    const companyAssessmentCount =
      await this.countCompanyAssessments(companyId);
    return companyAssessmentCount < assessmentQuantity;
  }

  /** Counts all assessments started by users assigned to the company. */
  async countCompanyAssessments(companyId: string): Promise<number> {
    const trimmedId = companyId?.trim();
    if (!trimmedId) {
      return 0;
    }

    return this.prisma.assessment.count({
      where: {
        user: {
          companyAccess: { some: { companyId: trimmedId } },
        },
      },
    });
  }

  async countActiveEmployees(companyId: string): Promise<number> {
    return this.prisma.appUser.count({
      where: {
        deletedAt: null,
        status: { equals: 'Active', mode: 'insensitive' },
        companyAccess: { some: { companyId } },
      },
    });
  }

  /**
   * Company members that consume a plan seat (invites, pending activation, active users).
   * Excludes soft-deleted and Cancelled users only.
   */
  async countCompanySeatAssignments(companyId: string): Promise<number> {
    return this.prisma.appUser.count({
      where: {
        deletedAt: null,
        status: { not: APP_USER_STATUS.CANCELLED },
        companyAccess: { some: { companyId } },
      },
    });
  }

  /**
   * Returns the company's plan seat capacity and the number of seats in use.
   */
  private async getCompanyPlanSeatCapacity(companyId: string): Promise<{
    employeeRangeMax: number | null;
    seatsInUse: number;
  }> {
    const trimmedId = companyId?.trim();
    if (!trimmedId) {
      throw new NotFoundException('Company not found');
    }

    const company = await this.prisma.corporationCompany.findFirst({
      where: { id: trimmedId, deletedAt: null },
      select: {
        planId: true,
        plan: { select: { employeeRangeMax: true } },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (!company.planId || !company.plan) {
      throw new BadRequestException(APP_USER_INVITE_COMPANY_NO_PLAN_MSG);
    }

    const seatsInUse = await this.countCompanySeatAssignments(trimmedId);
    return {
      employeeRangeMax: company.plan.employeeRangeMax,
      seatsInUse,
    };
  }

  /**
   * Throws when inviting `additionalCount` users would exceed `employee_range_max`.
   * Uses all in-use seats (including Pending), not only Active — required for bulk CSV/invite.
   */
  async assertCanAddCompanySeats(
    companyId: string,
    additionalCount: number,
  ): Promise<void> {
    if (additionalCount <= 0) {
      return;
    }

    const { employeeRangeMax, seatsInUse } =
      await this.getCompanyPlanSeatCapacity(companyId);

    if (employeeRangeMax == null) {
      return;
    }

    if (seatsInUse + additionalCount > employeeRangeMax) {
      throw new BadRequestException(SUBSCRIPTION_EMPLOYEE_LIMIT_MSG);
    }
  }
}
