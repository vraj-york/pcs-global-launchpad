import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { COGNITO_GROUP_NAMES } from '../user/cognito-groups.constants';
import { CreateCorporationAdminDto } from './dto';
import {
  addUserToCognitoGroup,
  generateCognitoCompliantTempPassword,
  getCognitoSubByUsername,
  resolveInviteTemporaryPassword as resolvePoolInviteTemporaryPassword,
} from '../common';

const COGNITO_SUB_NOT_RESOLVED_MESSAGE =
  'Could not resolve Cognito user sub after provisioning corporation admin';

/**
 * Cognito-side setup for corporation onboarding: creates or reuses the admin user and assigns
 * them to the CorporationAdmin pool group (group must exist in Cognito and in
 * `cognito_user_groups`).
 */
@Injectable()
export class CorporationCognitoProvisioningService {
  private readonly logger = new Logger(
    CorporationCognitoProvisioningService.name,
  );
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;

  /**
   * Builds the regional Cognito client (optional explicit AWS credentials) and requires
   * `COGNITO_USER_POOL_ID`.
   */
  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>('AWS_REGION') ?? 'us-east-1';
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');
    const baseConfig: {
      region: string;
      credentials?: { accessKeyId: string; secretAccessKey: string };
    } = { region };
    if (accessKeyId && secretAccessKey) {
      baseConfig.credentials = { accessKeyId, secretAccessKey };
    }
    this.cognitoClient = new CognitoIdentityProviderClient(baseConfig);

    const poolId = this.config.get<string>('COGNITO_USER_POOL_ID')?.trim();
    if (!poolId) {
      throw new Error('COGNITO_USER_POOL_ID environment variable is not set');
    }
    this.userPoolId = poolId;
  }

  /**
   * Creates a Cognito user with a suppressed invite email and temporary password, or on
   * `UsernameExistsException` reuses the existing user. Ensures membership in the
   * CorporationAdmin group, then returns the user’s `sub`.
   *
   * @throws InternalServerErrorException if `sub` cannot be read from attributes after create.
   */
  async provisionCorporationAdminUser(
    corporationAdmin: CreateCorporationAdminDto,
  ): Promise<{ cognitoSub: string }> {
    const email = corporationAdmin.email.trim().toLowerCase();
    const temporaryPassword = generateCognitoCompliantTempPassword();

    try {
      await this.cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: this.userPoolId,
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
        this.cognitoClient,
        this.userPoolId,
        email,
        COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
        this.logger,
      );
    } catch (err) {
      const name = (err as Error).name;
      if (name === 'UsernameExistsException') {
        await addUserToCognitoGroup(
          this.cognitoClient,
          this.userPoolId,
          email,
          COGNITO_GROUP_NAMES.CORPORATION_ADMIN,
          this.logger,
        );
      } else {
        this.logger.error(
          `Cognito AdminCreateUser failed for ${email}: ${(err as Error).message}`,
          (err as Error).stack,
        );
        throw err;
      }
    }

    const cognitoSub = await getCognitoSubByUsername(
      this.cognitoClient,
      this.userPoolId,
      email,
      COGNITO_SUB_NOT_RESOLVED_MESSAGE,
    );
    return { cognitoSub };
  }

  /**
   * For invitation emails after corporation activation: users already in `CONFIRMED` state keep
   * their password (returns null for email copy). New or not-yet-confirmed users get a fresh
   * temporary password via AdminSetUserPassword with `Permanent: false`.
   */
  async resolveInviteTemporaryPassword(email: string): Promise<string | null> {
    return resolvePoolInviteTemporaryPassword(
      this.cognitoClient,
      this.userPoolId,
      email,
    );
  }
}
