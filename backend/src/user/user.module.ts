import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { EmailModule } from '../email';
import { S3Module } from '../s3/s3.module';
import { ChatbotModule } from '../chatbot';
import { UserSyncService } from './user-sync.service';
import { AppUserService } from './app-user.service';
import { AppUserController } from './app-user.controller';
import { AppKeyContactService } from './app-key-contact.service';
import { AppKeyContactController } from './app-key-contact.controller';
import { GrowthSparkService } from './growth-spark.service';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';
import { MonthlyPlanGuard } from '../auth/guards/monthly-plan.guard';
import { AuthorizationGuard } from '../auth/rbac/authorization.guard';
import { RbacAccessService } from '../auth/rbac/rbac-access.service';
import { SubscriptionAccessService } from './subscription-access.service';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [PrismaModule, EmailModule, S3Module, ChatbotModule],
  controllers: [AppUserController, AppKeyContactController],
  providers: [
    UserSyncService,
    AppUserService,
    AppKeyContactService,
    GrowthSparkService,
    SubscriptionAccessService,
    RbacAccessService,
    SubscriptionGuard,
    MonthlyPlanGuard,
    AuthorizationGuard,
    Reflector,
  ],
  exports: [
    UserSyncService,
    AppUserService,
    AppKeyContactService,
    GrowthSparkService,
    SubscriptionAccessService,
    RbacAccessService,
    SubscriptionGuard,
    MonthlyPlanGuard,
    AuthorizationGuard,
  ],
})
export class UserModule {}
