import type { SubscriptionAccessResult } from '../subscription-access.types';

/** Default access when the user has no company assignment (assessment-only / onboarding). */
export const SUBSCRIPTION_ACCESS_NO_COMPANY: SubscriptionAccessResult = {
  companyId: null,
  subscriptionStatus: null,
  planTypeId: null,
  employeeRangeMax: null,
  isActive: false,
  isBlocked: false,
  activeEmployeeCount: null,
  employeeLimitExceeded: false,
  canAccessFullApp: false,
  canAccessChatbot: false,
  canStartAssessment: false,
  canViewResults: true,
};
