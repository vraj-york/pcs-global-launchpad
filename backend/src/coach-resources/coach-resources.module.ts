import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { UserModule } from '../user';
import { CoachResourcesController } from './coach-resources.controller';
import { CoachResourcesService } from './coach-resources.service';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [CoachResourcesController],
  providers: [CoachResourcesService],
})
export class CoachResourcesModule {}
