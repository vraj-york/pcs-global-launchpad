import { Module } from '@nestjs/common';
import { EmailModule } from '../email';
import { PrismaModule } from '../prisma';
import { S3Module } from '../s3';
import { SupportRequestController } from './support-request.controller';
import { SupportRequestService } from './support-request.service';

@Module({
  imports: [PrismaModule, S3Module, EmailModule],
  controllers: [SupportRequestController],
  providers: [SupportRequestService],
  exports: [SupportRequestService],
})
export class SupportRequestModule {}
