import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { PromoModule } from '../promo';
import { StripeModule } from '../stripe';
import { UserModule } from '../user';
import { IndividualPaymentController } from './individual-payment.controller';
import { IndividualPaymentService } from './individual-payment.service';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    forwardRef(() => PromoModule),
    forwardRef(() => StripeModule),
  ],
  controllers: [IndividualPaymentController],
  providers: [IndividualPaymentService],
  exports: [IndividualPaymentService],
})
export class IndividualPaymentModule {}
