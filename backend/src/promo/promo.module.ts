import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { StripeModule } from '../stripe';
import { UserModule } from '../user';
import { PromoController } from './promo.controller';
import { PromoService } from './promo.service';

@Module({
  imports: [PrismaModule, forwardRef(() => StripeModule), UserModule],
  controllers: [PromoController],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromoModule {}
