import { Module, forwardRef } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyDirectoryController } from './company-directory.controller';
import { GetCompanyController } from './get-company.controller';
import { CompanyService } from './company.service';
import { PrismaModule } from '../prisma';
import { S3Module } from '../s3';
import { StripeModule } from '../stripe';
import { CompanyAdminOnboardingModule } from '../company-admin-onboarding';
import { EmailModule } from '../email';
import { UserModule } from '../user';

@Module({
  imports: [
    PrismaModule,
    S3Module,
    forwardRef(() => StripeModule),
    CompanyAdminOnboardingModule,
    EmailModule,
    UserModule,
  ],

  controllers: [
    GetCompanyController,
    CompanyController,
    CompanyDirectoryController,
  ],
  providers: [CompanyService],
  exports: [CompanyService, forwardRef(() => StripeModule)],
})
export class CompanyModule {}
