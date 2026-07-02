import { Module } from '@nestjs/common';
import { PromoModule } from '../promo';
import { StripeModule } from '../stripe';
import { UserModule } from '../user';
import { IndividualPaymentModule } from '../user/individual-payment.module';
import { InviteManagementController } from './invite-management.controller';
import { InviteManagementListService } from './invite-management-list.service';
import { InviteManagementService } from './invite-management.service';

@Module({
  imports: [StripeModule, PromoModule, UserModule, IndividualPaymentModule],
  controllers: [InviteManagementController],
  providers: [InviteManagementService, InviteManagementListService],
  exports: [InviteManagementService, InviteManagementListService],
})
export class InviteManagementModule {}
