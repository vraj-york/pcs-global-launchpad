import type { SubscriptionContext } from '../auth/subscription.constants';

export type SubscriptionAccessResult = SubscriptionContext & {
  activeEmployeeCount: number | null;
  employeeLimitExceeded: boolean;
  canAccessFullApp: boolean;
  canAccessChatbot: boolean;
  canStartAssessment: boolean;
  canViewResults: boolean;
  /** True when `app_users.user_type` is individual (B2C assessment invite). */
  isIndividualUser?: boolean;
  /** True when individual user has not completed payment yet. */
  paymentRequired?: boolean;
  /** `app_users.payment_status` for individual users. */
  paymentStatus?: string | null;
};
