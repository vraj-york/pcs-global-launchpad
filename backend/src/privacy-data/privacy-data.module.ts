import { Module } from '@nestjs/common';
import { EmailModule } from '../email';
import { PrismaModule } from '../prisma';
import { S3Module } from '../s3';
import { AccountSecurityModule } from '../account-security';
import { UserModule } from '../user';
import { PrivacyDataController } from './privacy-data.controller';
import { PrivacyDataService } from './privacy-data.service';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    S3Module,
    AccountSecurityModule,
    UserModule,
  ],
  controllers: [PrivacyDataController],
  providers: [PrivacyDataService],
})
export class PrivacyDataModule {}
