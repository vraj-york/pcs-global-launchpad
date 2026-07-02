import { Module } from '@nestjs/common';
import { EmailModule } from '../email';
import { PrismaModule } from '../prisma';
import { UserModule } from '../user';
import { AccountSecurityController } from './account-security.controller';
import { AccountSecurityService } from './account-security.service';

@Module({
  /** UserModule exports UserSyncService required by CognitoAuthGuard on the controller. */
  imports: [PrismaModule, EmailModule, UserModule],
  controllers: [AccountSecurityController],
  providers: [AccountSecurityService],
  exports: [AccountSecurityService],
})
export class AccountSecurityModule {}
