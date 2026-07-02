import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email';
import { PrismaService } from '../prisma';
import { AssessmentReportService } from './assessment-report.service';
import { AssessmentReportsS3Service } from './assessment-reports-s3.service';

describe('AssessmentReportService', () => {
  let service: AssessmentReportService;
  const prisma = {
    assessment: { findUnique: jest.fn() },
  };
  const assessmentReportsS3 = { getReportPdfBuffer: jest.fn() };
  const emailService = { sendEmailWithPdfAttachments: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentReportService,
        { provide: PrismaService, useValue: prisma },
        { provide: AssessmentReportsS3Service, useValue: assessmentReportsS3 },
        { provide: EmailService, useValue: emailService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => undefined) },
        },
      ],
    }).compile();

    service = module.get(AssessmentReportService);
  });

  it('rejects when assessment is missing', async () => {
    prisma.assessment.findUnique.mockResolvedValue(null);
    await expect(
      service.shareReportWithRecipients('aid', 'sub-1', ['a@b.com']),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects when requester does not own assessment', async () => {
    prisma.assessment.findUnique.mockResolvedValue({
      id: 'aid',
      userId: 'other-sub',
      status: AssessmentStatus.report_generated,
      assessmentReport: { report: 'assessment_report/u/report.pdf' },
    });
    await expect(
      service.shareReportWithRecipients('aid', 'sub-1', ['a@b.com']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sends PDF to each recipient when report is ready', async () => {
    prisma.assessment.findUnique.mockResolvedValue({
      id: 'aid',
      userId: 'sub-1',
      status: AssessmentStatus.report_generated,
      assessmentReport: { report: 'assessment_report/u/report.pdf' },
    });
    assessmentReportsS3.getReportPdfBuffer.mockResolvedValue(
      Buffer.from('%PDF'),
    );
    emailService.sendEmailWithPdfAttachments.mockResolvedValue(true);

    await service.shareReportWithRecipients('aid', 'sub-1', [
      'One@Example.com',
      'one@example.com',
      'two@example.com',
    ]);

    expect(assessmentReportsS3.getReportPdfBuffer).toHaveBeenCalledWith(
      'assessment_report/u/report.pdf',
    );
    expect(emailService.sendEmailWithPdfAttachments).toHaveBeenCalledTimes(2);
    expect(emailService.sendEmailWithPdfAttachments).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'one@example.com' }),
    );
    expect(emailService.sendEmailWithPdfAttachments).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'two@example.com' }),
    );
  });
});
