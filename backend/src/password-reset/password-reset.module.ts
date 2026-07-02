import { Module } from '@nestjs/common';
import { EmailModule } from '../email';
import { PrismaModule } from '../prisma';
import { PasswordResetController } from './password-reset.controller';
import { PasswordResetService } from './password-reset.service';

@Module({
  imports: [EmailModule, PrismaModule],
  controllers: [PasswordResetController],
  providers: [PasswordResetService],
  exports: [PasswordResetService],
})
export class PasswordResetModule {}
