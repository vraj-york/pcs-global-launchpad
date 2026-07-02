import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CompanyModule } from '../company/company.module';
import { EmailModule } from '../email';
import { PrismaModule } from '../prisma';
import { UserModule } from '../user';
import { StripeFinanceController } from './stripe-finance.controller';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    UserModule,
    EmailModule,
    forwardRef(() => CompanyModule),
  ],
  controllers: [StripeWebhookController, StripeFinanceController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
