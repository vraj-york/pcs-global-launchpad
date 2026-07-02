import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma';
import { EmailModule } from '../email';
import { UserModule } from '../user';
import { CompanyAdminOnboardingService } from './company-admin-onboarding.service';

@Module({
  imports: [ConfigModule, PrismaModule, EmailModule, UserModule],
  providers: [CompanyAdminOnboardingService],
  exports: [CompanyAdminOnboardingService],
})
export class CompanyAdminOnboardingModule {}
