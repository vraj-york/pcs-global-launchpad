import { type Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  addUserToCognitoGroup,
  buildInviteLoginUrl,
  generateCognitoCompliantTempPassword,
  resolveInviteTemporaryPassword,
} from '../common';
import type { EmailService } from '../email';
import { APP_USER_INVITE_EMAIL_SUBJECT } from './constants/app-user.constants';
import {
  getUserInviteHtml,
  getUserInviteText,
} from './templates/user-invite.template';

/**
 * Creates Cognito user with suppressed email, adds to the given pool group, or on
 * `UsernameExistsException` re-adds to group and resolves a temporary password when needed.
 */
export async function provisionCognitoForAppUserInvite(
  cognitoClient: CognitoIdentityProviderClient,
  userPoolId: string,
  logger: Pick<Logger, 'error' | 'warn'>,
  email: string,
  userGroupName: string,
): Promise<{ temporaryPassword: string | null }> {
  const temporaryPassword = generateCognitoCompliantTempPassword();
  const groupLogs = {
    groupNotFound: `Cognito group "${userGroupName}" not found; add it to the user pool or deploy the updated CloudFormation template.`,
    userNotFound: `Cannot add ${email} to ${userGroupName}: user not found`,
  };
  try {
    await cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
        ],
        TemporaryPassword: temporaryPassword,
        MessageAction: 'SUPPRESS',
      }),
    );
    await addUserToCognitoGroup(
      cognitoClient,
      userPoolId,
      email,
      userGroupName,
      logger,
      groupLogs,
    );
    return { temporaryPassword };
  } catch (err) {
    const name = (err as Error).name;
    if (name === 'UsernameExistsException') {
      await addUserToCognitoGroup(
        cognitoClient,
        userPoolId,
        email,
        userGroupName,
        logger,
        groupLogs,
      );
      const temp = await resolveInviteTemporaryPassword(
        cognitoClient,
        userPoolId,
        email,
      );
      return { temporaryPassword: temp };
    }
    logger.error(
      `Cognito AdminCreateUser failed for ${email}: ${(err as Error).message}`,
      (err as Error).stack,
    );
    throw err;
  }
}

export interface SendAppUserInviteEmailParams {
  toEmail: string;
  temporaryPassword: string | null;
  firstName: string;
  lastName: string;
}

/**
 * Builds invite HTML/text from config and {@link EmailService.sendEmail} (SES).
 * Returns whether SES accepted the message (same contract as {@link EmailService.sendEmail}).
 */
export async function sendAppUserInviteEmail(
  emailService: EmailService,
  config: ConfigService,
  params: SendAppUserInviteEmailParams,
): Promise<boolean> {
  const loginUrl = buildInviteLoginUrl(config);
  const firstName = params.firstName.trim() || 'there';
  const supportEmail = config.get<string>('SUPPORT_CONTACT_EMAIL')?.trim();

  const templateFields = {
    loginUrl,
    temporaryPassword: params.temporaryPassword,
    firstName,
    supportEmail,
  };

  return emailService.sendEmail({
    to: params.toEmail,
    subject: APP_USER_INVITE_EMAIL_SUBJECT,
    htmlBody: getUserInviteHtml(templateFields),
    textBody: getUserInviteText(templateFields),
  });
}
