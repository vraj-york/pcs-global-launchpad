import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CorporationController } from './corporation.controller';
import { CorporationService } from './corporation.service';
import { CorporationCognitoProvisioningService } from './corporation-cognito-provisioning.service';
import { CorporationAdminOnboardingService } from './corporation-admin-onboarding.service';
import { PrismaModule } from '../prisma';
import { UserModule } from '../user';
import { EmailModule } from '../email';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [ConfigModule, PrismaModule, UserModule, EmailModule, CompanyModule],
  controllers: [CorporationController],
  providers: [
    CorporationService,
    CorporationCognitoProvisioningService,
    CorporationAdminOnboardingService,
  ],
  exports: [CorporationService],
})
export class CorporationModule {}
