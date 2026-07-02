import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { PrismaModule } from '../prisma';
import { UserModule } from '../user';
import { StripeModule } from '../stripe';

@Module({
  imports: [PrismaModule, UserModule, StripeModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
