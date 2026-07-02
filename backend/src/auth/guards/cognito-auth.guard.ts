import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import type { JwksClient } from 'jwks-rsa';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { PrismaService } from '../../prisma';
import { UserSyncService } from '../../user/user-sync.service';
import { COGNITO_GROUP_NAMES } from '../../user/cognito-groups.constants';
import { APP_USER_STATUS } from '../../user/constants/app-user.constants';
import {
  COGNITO_AUTH_APP_USER_LOOKUP_ERROR_LOG_MSG,
  COGNITO_AUTH_BLOCKED_APP_USER_LOG_MSG,
  COGNITO_AUTH_COGNITO_EMAIL_LOOKUP_WARN_LOG_MSG,
  COGNITO_AUTH_INVALID_OR_EXPIRED_TOKEN_MSG,
  COGNITO_AUTH_SOFT_DELETED_APP_USER_LOG_MSG,
  COGNITO_AUTH_TOKEN_MISSING_MSG,
} from '../auth.constants';

interface CognitoTokenPayload {
  sub: string;
  email?: string;
  'cognito:groups'?: string[];
  token_use: string;
  iss: string;
  exp: number;
  iat: number;
}

interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email?: string;
    groups: string[];
  };
}

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  private readonly logger = new Logger(CognitoAuthGuard.name);
  private readonly userPoolId: string;
  private readonly region: string;
  private readonly jwksClient: JwksClient;
  private readonly cognitoClient: CognitoIdentityProviderClient;

  /**
   * Initializes the CognitoAuthGuard with required configuration and clients.
   *
   * Sets up:
   * - Cognito User Pool ID from environment variables
   * - AWS Region (defaults to us-east-1)
   * - JWKS client for token verification with caching enabled
   * - Cognito Identity Provider client for fetching user groups
   *
   * @param configService - NestJS configuration service for accessing environment variables
   * @throws {Error} If COGNITO_USER_POOL_ID environment variable is not set
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly userSyncService: UserSyncService,
    private readonly prisma: PrismaService,
  ) {
    const userPoolId = this.configService.get<string>('COGNITO_USER_POOL_ID');
    if (!userPoolId) {
      throw new Error('COGNITO_USER_POOL_ID environment variable is not set');
    }
    this.userPoolId = userPoolId;
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';

    const jwksUri = `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}/.well-known/jwks.json`;

    this.jwksClient = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });

    // Initialize Cognito client for fetching groups when missing from token
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.region,
    });
  }

  /**
   * Validates the Cognito JWT token from the request and attaches user information to the request object.
   *
   * This method:
   * - Extracts the Bearer token from the Authorization header
   * - Verifies the token signature using Cognito's JWKS (JSON Web Key Set)
   * - Validates token issuer and expiration
   * - Fetches user groups from Cognito if not present in the token
   * - Rejects if a matching `app_users` row is soft-deleted or status Blocked (JWT can remain valid after Cognito disable or until `exp`)
   * - Resolves `email` for `request.user`: JWT claim (ID token), else `app_users.email`, else Cognito
   *   user attributes (covers Super Admins who exist only in the user pool)
   * - Mirrors Cognito into `app_users` via {@link UserSyncService.syncFromCognito} except for
   *   {@link COGNITO_GROUP_NAMES.SUPER_ADMIN} (pool-only; no `app_users` row)
   * - Attaches user information (sub, email, groups) to the request object for use in controllers
   *
   * @param context - The execution context containing the HTTP request
   * @returns {Promise<boolean>} Returns true if authentication succeeds
   * @throws {UnauthorizedException} If token is missing, invalid, or expired
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(COGNITO_AUTH_TOKEN_MISSING_MSG);
    }

    try {
      const decoded = await this.verifyToken(token);
      await this.assertAppUserMayAuthenticate(decoded.sub);
      let groups = decoded['cognito:groups'] || [];

      const resolvedEmail =
        await this.resolveEmailForAuthenticatedUser(decoded);

      this.logger.debug(
        `Token verified - Type: ${decoded.token_use}, User: ${resolvedEmail || decoded.sub}, Groups from token: ${JSON.stringify(groups)}`,
      );

      // If groups are missing (typically when using access token), fetch from Cognito
      if (groups.length === 0) {
        this.logger.debug(
          `No groups found in token. Fetching groups from Cognito for user: ${decoded.sub}`,
        );
        try {
          groups = await this.fetchUserGroups(decoded.sub);
          this.logger.debug(
            `Fetched groups from Cognito: ${JSON.stringify(groups)}`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(
            `Failed to fetch groups from Cognito: ${errorMessage}. Continuing without groups.`,
          );
          // Continue without groups - will fail authorization if required
        }
      }

      // Attach user info to request for use in controllers
      request.user = {
        sub: decoded.sub,
        email: resolvedEmail,
        groups: groups,
      };

      if (!groups.includes(COGNITO_GROUP_NAMES.SUPER_ADMIN)) {
        void this.userSyncService.syncFromCognito(
          decoded.sub,
          resolvedEmail,
          groups,
        );
      }

      return true;
    } catch (error) {
      this.logger.error('Token verification failed', error);
      throw new UnauthorizedException(
        COGNITO_AUTH_INVALID_OR_EXPIRED_TOKEN_MSG,
      );
    }
  }

  /**
   * Resolves the user’s email for `request.user`: ID-token claim first, then `app_users`, then
   * Cognito `AdminGetUser` attributes (pool-only users such as Super Admin).
   */
  private async resolveEmailForAuthenticatedUser(
    decoded: CognitoTokenPayload,
  ): Promise<string | undefined> {
    const fromJwt = decoded.email?.trim();
    if (fromJwt) {
      return fromJwt;
    }

    const row = await this.prisma.appUser.findUnique({
      where: { cognitoSub: decoded.sub },
      select: { email: true, deletedAt: true },
    });
    if (row != null && row.deletedAt == null) {
      const dbEmail = row.email?.trim();
      if (dbEmail) {
        return dbEmail;
      }
    }

    try {
      const res = await this.cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: this.userPoolId,
          Username: decoded.sub,
        }),
      );
      const emailAttr = res.UserAttributes?.find(
        (a) => a.Name === 'email',
      )?.Value?.trim();
      if (emailAttr) {
        return emailAttr;
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `${COGNITO_AUTH_COGNITO_EMAIL_LOOKUP_WARN_LOG_MSG} (sub=${decoded.sub}): ${detail}`,
      );
    }

    return undefined;
  }

  /**
   * Ensures the Cognito subject is allowed to call authenticated APIs: no row yet is OK;
   * an existing non-deleted user must not be Blocked or soft-deleted.
   */
  private async assertAppUserMayAuthenticate(
    cognitoSub: string,
  ): Promise<void> {
    try {
      const row = await this.prisma.appUser.findUnique({
        where: { cognitoSub },
        select: { deletedAt: true, status: true },
      });
      if (!row) {
        return;
      }
      if (row.deletedAt != null) {
        this.logger.warn(
          `${COGNITO_AUTH_SOFT_DELETED_APP_USER_LOG_MSG} (cognitoSub=${cognitoSub})`,
        );
        throw new UnauthorizedException(
          COGNITO_AUTH_INVALID_OR_EXPIRED_TOKEN_MSG,
        );
      }
      const statusNorm = row.status?.trim().toLowerCase() ?? '';
      if (statusNorm === APP_USER_STATUS.BLOCKED.toLowerCase()) {
        this.logger.warn(
          `${COGNITO_AUTH_BLOCKED_APP_USER_LOG_MSG} (cognitoSub=${cognitoSub})`,
        );
        throw new UnauthorizedException(
          COGNITO_AUTH_INVALID_OR_EXPIRED_TOKEN_MSG,
        );
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error(COGNITO_AUTH_APP_USER_LOOKUP_ERROR_LOG_MSG, err);
      throw new UnauthorizedException(
        COGNITO_AUTH_INVALID_OR_EXPIRED_TOKEN_MSG,
      );
    }
  }

  /**
   * Extracts the Bearer token from the Authorization header of the HTTP request.
   *
   * @param request - Express request object containing HTTP headers
   * @returns {string | null} The token string if found, null otherwise
   */
  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }

  /**
   * Retrieves the public signing key from Cognito's JWKS endpoint using the key ID (kid) from the token header.
   *
   * This key is used to verify the JWT token signature. The JWKS client handles caching
   * to minimize requests to the Cognito endpoint.
   *
   * @param header - JWT header containing the key ID (kid) used to identify the signing key
   * @returns {Promise<string>} The public key in PEM format
   * @throws {Error} If the key cannot be retrieved or is not found
   */
  private async getKey(header: jwt.JwtHeader): Promise<string> {
    return new Promise((resolve, reject) => {
      this.jwksClient.getSigningKey(header.kid, (err, key) => {
        if (err) {
          reject(err);
          return;
        }
        if (!key) {
          reject(new Error('Signing key not found'));
          return;
        }
        const signingKey = key.getPublicKey();
        resolve(signingKey);
      });
    });
  }

  /**
   * Verifies and decodes a Cognito JWT token.
   *
   * This method:
   * - Decodes the token to extract the header and payload
   * - Retrieves the appropriate public key from Cognito's JWKS endpoint
   * - Verifies the token signature using RS256 algorithm
   * - Validates the token issuer matches the expected Cognito issuer
   * - Ensures the token use is either 'access' or 'id'
   *
   * @param token - The JWT token string to verify
   * @returns {Promise<CognitoTokenPayload>} The decoded and verified token payload
   * @throws {Error} If the token format is invalid, signature verification fails, issuer doesn't match, or token use is invalid
   */
  private async verifyToken(token: string): Promise<CognitoTokenPayload> {
    const decoded = jwt.decode(token, { complete: true }) as jwt.JwtPayload & {
      header: jwt.JwtHeader;
    };

    if (!decoded || !decoded.header) {
      throw new Error('Invalid token format');
    }

    const key = await this.getKey(decoded.header);
    const expectedIssuer = `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`;

    const payload = jwt.verify(token, key, {
      algorithms: ['RS256'],
      issuer: expectedIssuer,
    }) as CognitoTokenPayload;

    if (payload.token_use !== 'access' && payload.token_use !== 'id') {
      throw new Error('Invalid token use');
    }

    return payload;
  }

  /**
   * Fetches user groups from Cognito when not present in the token.
   *
   * This is useful when using access tokens which don't include groups in the payload.
   * Uses the Cognito AdminListGroupsForUserCommand to retrieve all groups associated with the user.
   *
   * @param username - The Cognito user ID (sub) to fetch groups for
   * @returns {Promise<string[]>} Array of group names the user belongs to
   * @throws {Error} If the Cognito API call fails
   */
  private async fetchUserGroups(username: string): Promise<string[]> {
    try {
      const command = new AdminListGroupsForUserCommand({
        UserPoolId: this.userPoolId,
        Username: username,
      });

      const response = await this.cognitoClient.send(command);
      const groups =
        response.Groups?.map((group) => group.GroupName || '').filter(
          (name) => name.length > 0,
        ) || [];

      return groups;
    } catch (error) {
      this.logger.error(`Error fetching groups for user ${username}:`, error);
      throw error;
    }
  }
}
