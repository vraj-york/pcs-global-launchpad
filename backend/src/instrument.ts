import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
    sendDefaultPii: true,
    tracesSampleRate: 1.0,
    enableLogs: true,
    integrations: [Sentry.prismaIntegration()],
    ignoreTransactions: [/^GET \/health$/],
  });
}
