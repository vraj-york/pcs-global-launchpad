import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AdminAddUserToGroupCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminGetUserCommand,
  AdminRemoveUserFromGroupCommand,
  AdminSetUserPasswordCommand,
  AdminUserGlobalSignOutCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { generateCognitoCompliantTempPassword } from './cognito-password.util';

/** Minimal logger for {@link addUserToCognitoGroup} (e.g. Nest `Logger`). */
export type CognitoGroupLogger = { warn: (message: string) => void };

/**
 * Adds a user to a Cognito group. Swallows `ResourceNotFoundException` (missing group) and
 * `UserNotFoundException` after logging so callers can proceed when the pool is misconfigured.
 */
export async function addUserToCognitoGroup(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  username: string,
  groupName: string,
  logger: CognitoGroupLogger,
  logMessages?: {
    groupNotFound?: string;
    userNotFound?: string;
  },
): Promise<void> {
  const groupNotFound =
    logMessages?.groupNotFound ??
    `Cognito group "${groupName}" not found when adding user`;
  const userNotFound =
    logMessages?.userNotFound ??
    `Cannot add ${username} to ${groupName}: user not found`;
  try {
    await client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: userPoolId,
        Username: username,
        GroupName: groupName,
      }),
    );
  } catch (err) {
    const n = (err as Error).name;
    if (n === 'ResourceNotFoundException') {
      logger.warn(groupNotFound);
      return;
    }
    if (n === 'UserNotFoundException') {
      logger.warn(userNotFound);
      return;
    }
    logger.warn(
      `AdminAddUserToGroup failed for ${username}: ${(err as Error).message}`,
    );
  }
}

/**
 * Removes a user from a Cognito group. Swallows `ResourceNotFoundException` (missing group) and
 * `UserNotFoundException` after logging; rethrows other errors.
 */
export async function removeUserFromCognitoGroup(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  username: string,
  groupName: string,
  logger: CognitoGroupLogger,
): Promise<void> {
  try {
    await client.send(
      new AdminRemoveUserFromGroupCommand({
        UserPoolId: userPoolId,
        Username: username,
        GroupName: groupName,
      }),
    );
  } catch (err) {
    const n = (err as Error).name;
    if (n === 'ResourceNotFoundException') {
      logger.warn(`Cognito group "${groupName}" not found when removing user`);
      return;
    }
    if (n === 'UserNotFoundException') {
      logger.warn(
        `Cannot remove ${username} from ${groupName}: user not found in Cognito`,
      );
      return;
    }
    throw err;
  }
}

/**
 * Signs the user out of all devices and revokes all refresh tokens for that user
 * (`AdminUserGlobalSignOut`). Swallows `UserNotFoundException` after logging; rethrows other errors.
 */
export async function adminUserGlobalSignOut(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  username: string,
  logger: CognitoGroupLogger,
): Promise<void> {
  try {
    await client.send(
      new AdminUserGlobalSignOutCommand({
        UserPoolId: userPoolId,
        Username: username,
      }),
    );
  } catch (err) {
    const n = (err as Error).name;
    if (n === 'UserNotFoundException') {
      logger.warn(
        `Cannot global sign-out Cognito user ${username}: user not found in pool`,
      );
      return;
    }
    throw err;
  }
}

/**
 * Sets Cognito user enabled/disabled state. Swallows `UserNotFoundException` after logging;
 * rethrows other errors.
 */
export async function setCognitoUserEnabled(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  username: string,
  enabled: boolean,
  logger: CognitoGroupLogger,
): Promise<void> {
  try {
    await client.send(
      enabled
        ? new AdminEnableUserCommand({
            UserPoolId: userPoolId,
            Username: username,
          })
        : new AdminDisableUserCommand({
            UserPoolId: userPoolId,
            Username: username,
          }),
    );
  } catch (err) {
    const n = (err as Error).name;
    if (n === 'UserNotFoundException') {
      logger.warn(
        `Cannot ${enabled ? 'enable' : 'disable'} Cognito user ${username}: user not found in pool`,
      );
      return;
    }
    throw err;
  }
}

/**
 * Deletes a user from the Cognito user pool (`AdminDeleteUser`). Swallows `UserNotFoundException`
 * after logging; rethrows other errors.
 */
export async function deleteCognitoUser(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  username: string,
  logger: CognitoGroupLogger,
): Promise<void> {
  try {
    await client.send(
      new AdminDeleteUserCommand({
        UserPoolId: userPoolId,
        Username: username,
      }),
    );
  } catch (err) {
    const n = (err as Error).name;
    if (n === 'UserNotFoundException') {
      logger.warn(
        `Cannot delete Cognito user ${username}: user not found in pool`,
      );
      return;
    }
    throw err;
  }
}

/**
 * Fetches a Cognito user by pool username and returns the `sub` attribute from user attributes.
 *
 * @param missingSubMessage - Used for {@link InternalServerErrorException} when `sub` is absent
 */
export async function getCognitoSubByUsername(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  username: string,
  missingSubMessage: string,
): Promise<string> {
  const res = await client.send(
    new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: username,
    }),
  );
  const sub = res.UserAttributes?.find((a) => a.Name === 'sub')?.Value;
  if (!sub?.trim()) {
    throw new InternalServerErrorException(missingSubMessage);
  }
  return sub.trim();
}

/** Default public web app origin when `ACCEPT_INVITE_ORIGIN` is unset (invite emails, login links). */
export const DEFAULT_INVITE_APP_ORIGIN = 'https://bspblueprint.com';

/**
 * Base URL of the public web app (no trailing slash). Reads {@link ConfigService} key
 * `ACCEPT_INVITE_ORIGIN` when set; otherwise {@link DEFAULT_INVITE_APP_ORIGIN}.
 */
export function getInvitePublicAppOrigin(config: ConfigService): string {
  const raw = config.get<string>('ACCEPT_INVITE_ORIGIN')?.trim();
  if (raw) {
    return raw.replace(/\/+$/, '');
  }
  return DEFAULT_INVITE_APP_ORIGIN;
}

/** `https://{origin}/login` — used in invite emails (Cognito temp password flow). */
export function buildInviteLoginUrl(config: ConfigService): string {
  const origin = getInvitePublicAppOrigin(config);
  return new URL('/login', `${origin}/`).toString();
}

/**
 * For invite emails when the Cognito user already exists: confirmed users keep their password
 * (returns null). Otherwise sets a fresh temporary password via `AdminSetUserPassword`.
 */
export async function resolveInviteTemporaryPassword(
  client: CognitoIdentityProviderClient,
  userPoolId: string,
  emailNormalized: string,
): Promise<string | null> {
  const username = emailNormalized.trim().toLowerCase();
  const user = await client.send(
    new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: username,
    }),
  );
  if (user.UserStatus === 'CONFIRMED') {
    return null;
  }
  const temporaryPassword = generateCognitoCompliantTempPassword();
  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: username,
      Password: temporaryPassword,
      Permanent: false,
    }),
  );
  return temporaryPassword;
}
