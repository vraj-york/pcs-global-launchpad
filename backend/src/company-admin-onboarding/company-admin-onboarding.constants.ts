import { COGNITO_GROUP_NAMES } from '../user/cognito-groups.constants';

export const COMPANY_ADMIN_GROUP_NAME = COGNITO_GROUP_NAMES.COMPANY_ADMIN;

export const COMPANY_ADMIN_INVITE_SUBJECT =
  'Invitation to BSPBlueprint Platform';

export const COMPANY_ADMIN_INVITE_EMAIL_FAILED_MESSAGE =
  'Company was updated but the invitation email could not be sent. Please try again.';

export const COGNITO_USER_SUB_NOT_RESOLVED_MESSAGE =
  'Could not resolve Cognito user sub after provisioning';

/** Shown in invite email (matches product branding). */
export const INVITE_EMAIL_SENDER_LABEL = 'BSPBlueprint Platform';
