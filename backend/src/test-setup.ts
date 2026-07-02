/**
 * Silence Nest Logger during unit tests so expected errors
 * (e.g. NotFoundException, ConflictException) don't flood the console.
 * Only instance methods are overridden; Logger.overrideLogger is unchanged.
 */
import { Logger } from '@nestjs/common';

// Ensures Stripe SDK can construct when tests import modules without ConfigModule.forRoot.
process.env.STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY ?? 'sk_test_abcdef123456';

// EmailModule / CompanyAdminOnboardingService (Cognito) when full modules are loaded in tests.
process.env.SES_SENDER_EMAIL =
  process.env.SES_SENDER_EMAIL ?? 'test-invite@example.com';
process.env.COGNITO_USER_POOL_ID =
  process.env.COGNITO_USER_POOL_ID ?? 'us-east-1_testPoolId';
process.env.EMAIL_LOGO_URL =
  process.env.EMAIL_LOGO_URL ?? 'https://cdn.example.com/EmailHeader.png';

const noop = (): void => {};
Logger.prototype.log = noop;
Logger.prototype.error = noop;
Logger.prototype.warn = noop;
Logger.prototype.debug = noop;
Logger.prototype.verbose = noop;
