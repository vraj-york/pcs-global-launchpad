import { COGNITO_GROUP_NAMES } from '../user/cognito-groups.constants';
import type { BillingHistoryActorKind } from './stripe-billing-history.types';

export type BillingSubscriptionActorContext = {
  actorKind: BillingHistoryActorKind;
  actorCognitoSub: string;
  actorName: string;
  actorRole: string;
};

/** Maps Cognito groups to billing-history actor kind (priority: SuperAdmin > CorporationAdmin > CompanyAdmin). */
export function resolveBillingActorKind(
  groups: string[],
): BillingHistoryActorKind {
  if (groups.includes(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
    return 'super_admin';
  }
  if (groups.includes(COGNITO_GROUP_NAMES.CORPORATION_ADMIN)) {
    return 'corporation_admin';
  }
  if (groups.includes(COGNITO_GROUP_NAMES.COMPANY_ADMIN)) {
    return 'company_admin';
  }
  return 'super_admin';
}

/** Human-readable role label for billing history and audit rows. */
export function billingActorRoleLabel(
  actorKind: BillingHistoryActorKind,
): string {
  switch (actorKind) {
    case 'super_admin':
      return 'Super Admin';
    case 'corporation_admin':
      return 'Corporation Admin';
    case 'company_admin':
      return 'Company Admin';
    default:
      return 'System';
  }
}
