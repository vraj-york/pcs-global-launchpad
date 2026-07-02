import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { StripeModule } from '../stripe';
import { SupportRequestModule } from '../support-request';
import { UserModule } from '../user';
import { CompanyAdminPortalController } from './company-admin-portal.controller';
import { CompanyAdminPortalService } from './company-admin-portal.service';

@Module({
  imports: [PrismaModule, StripeModule, SupportRequestModule, UserModule],
  controllers: [CompanyAdminPortalController],
  providers: [CompanyAdminPortalService],
})
export class CompanyAdminPortalModule {}
