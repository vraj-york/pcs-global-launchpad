import { Module } from '@nestjs/common';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { PrismaModule } from '../prisma';
import { UserModule } from '../user';

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [PermissionController],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
