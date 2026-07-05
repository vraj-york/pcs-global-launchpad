/**
 * Cognito User Pool group names — must match AWS Cognito exactly (see cloudformation/04-cognito.yaml).
 * Use these for JWT `cognito:groups` checks and DB `CognitoUserGroup.name`.
 */
export const COGNITO_GROUP_NAMES = {
  SUPER_ADMIN: 'SuperAdmin',
  CORPORATION_ADMIN: 'CorporationAdmin',
  COMPANY_ADMIN: 'CompanyAdmin',
  USER: 'User',
  COACH: 'pcs-coach',
} as const;

export const COGNITO_USER_GROUP_COMPANY_ADMIN_MISSING_MESSAGE = `CognitoUserGroup "${COGNITO_GROUP_NAMES.COMPANY_ADMIN}" is missing; apply migrations.`;

/** Thrown at service construction when `COGNITO_USER_POOL_ID` is missing. */
export const COGNITO_USER_POOL_ID_ENV_NOT_SET_MESSAGE =
  'COGNITO_USER_POOL_ID environment variable is not set';

export type CognitoGroupName =
  (typeof COGNITO_GROUP_NAMES)[keyof typeof COGNITO_GROUP_NAMES];
