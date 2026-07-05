import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SentryModule } from '@sentry/nestjs/setup';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { winstonConfig } from './config/winston.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit';
import { PasswordResetModule } from './password-reset';
import { CorporationModule } from './corporation';
import { CompanyModule } from './company';
import { PricingModule } from './pricing';
import { PermissionModule } from './permission';
import { RoleModule } from './role';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma';
import { S3Module } from './s3';
import { UserModule } from './user';
import { IndividualPaymentModule } from './user/individual-payment.module';
import {
  AuthorizationGuard,
  CognitoAuthGuard,
  RbacAccessService,
  SuperAdminGuard,
} from './auth';
import { CompanyAdminPortalModule } from './company-admin-portal';
import { PromoModule } from './promo';
import { SuperAdminDashboardModule } from './super-admin-dashboard';
import { SupportRequestModule } from './support-request';
import { AccountSecurityModule } from './account-security';
import { PrivacyDataModule } from './privacy-data';
import { AssessmentModule } from './assessment';
import { InviteManagementModule } from './invite-management';
import { CoachDashboardModule } from './coach-dashboard';
import { CoachResourcesModule } from './coach-resources';
import { ProductUpdatesModule } from './product-updates';
import { EarlyAccessModule } from './early-access';
import { CoachIntegrationsModule } from './coach-integrations';

@Module({
  imports: [
    SentryModule.forRoot(),
    ScheduleModule.forRoot(),
    WinstonModule.forRoot(winstonConfig),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
    }),
    PrismaModule,
    S3Module,
    AuditModule,
    PasswordResetModule,
    CorporationModule,
    CompanyModule,
    PricingModule,
    PermissionModule,
    RoleModule,
    CompanyAdminPortalModule,
    PromoModule,
    SuperAdminDashboardModule,
    SupportRequestModule,
    CoachDashboardModule,
    CoachResourcesModule,
    ProductUpdatesModule,
    EarlyAccessModule,
    CoachIntegrationsModule,
    AssessmentModule,
    InviteManagementModule,
    IndividualPaymentModule,
    UserModule,
    AccountSecurityModule,
    PrivacyDataModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CognitoAuthGuard,
    SuperAdminGuard,
    RbacAccessService,
    AuthorizationGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
