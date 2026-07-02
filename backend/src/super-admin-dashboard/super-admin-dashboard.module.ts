import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { UserModule } from '../user';
import { SuperAdminDashboardController } from './super-admin-dashboard.controller';
import { SuperAdminDashboardService } from './super-admin-dashboard.service';

@Module({
  /** UserModule exports UserSyncService required by CognitoAuthGuard on the controller. */
  imports: [PrismaModule, UserModule],
  controllers: [SuperAdminDashboardController],
  providers: [SuperAdminDashboardService],
})
export class SuperAdminDashboardModule {}
