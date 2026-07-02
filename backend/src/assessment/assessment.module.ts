import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from '../email';
import { PrismaModule } from '../prisma';
import { UserModule } from '../user';
import { AssessmentListService } from './assessment-list.service';
import { AssessmentReportController } from './assessment-report.controller';
import { AssessmentReportService } from './assessment-report.service';
import { AssessmentReportsS3Service } from './assessment-reports-s3.service';
import { AssessmentsController } from './assessments.controller';

@Module({
  imports: [ConfigModule, PrismaModule, EmailModule, UserModule],
  controllers: [AssessmentReportController, AssessmentsController],
  providers: [
    AssessmentReportService,
    AssessmentReportsS3Service,
    AssessmentListService,
  ],
  exports: [AssessmentReportService, AssessmentListService],
})
export class AssessmentModule {}
