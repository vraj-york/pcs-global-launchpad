import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { UserModule } from '../user';
import { EarlyAccessController } from './early-access.controller';
import { EarlyAccessService } from './early-access.service';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [EarlyAccessController],
  providers: [EarlyAccessService],
})
export class EarlyAccessModule {}
