import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { UserModule } from '../user';
import { CoachController } from './coach.controller';
import { CoachDashboardController } from './coach-dashboard.controller';
import { CoachDashboardService } from './coach-dashboard.service';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [CoachDashboardController, CoachController],
  providers: [CoachDashboardService],
  exports: [CoachDashboardService],
})
export class CoachDashboardModule {}
