import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { UserModule } from '../user';
import { ProductUpdatesController } from './product-updates.controller';
import { ProductUpdatesService } from './product-updates.service';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [ProductUpdatesController],
  providers: [ProductUpdatesService],
})
export class ProductUpdatesModule {}
