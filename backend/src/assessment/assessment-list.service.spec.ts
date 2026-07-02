/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- Jest asymmetric matchers and mock.calls are typed loosely */
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import { COGNITO_GROUP_NAMES } from '../user/cognito-groups.constants';
import { AssessmentListService } from './assessment-list.service';
import {
  ASSESSMENT_LIST_BY_USER_FETCHED_MSG,
  ASSESSMENT_LIST_BY_USER_FORBIDDEN_MSG,
  ASSESSMENT_LIST_INDIVIDUAL_USER_FORBIDDEN_MSG,
  ASSESSMENT_LIST_FETCHED_MSG,
} from './assessment.constants';
import { AppUserService } from '../user/app-user.service';

describe('AssessmentListService', () => {
  let service: AssessmentListService;

  const prisma = {
    appUser: { findFirst: jest.fn() },
    userCompanyAccess: { findMany: jest.fn(), findFirst: jest.fn() },
    assessment: { findMany: jest.fn(), count: jest.fn() },
    $queryRaw: jest.fn(),
  };

  const appUserService = {
    findByCognitoSubForRequester: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$queryRaw.mockImplementation(() => Promise.resolve([]));
    appUserService.findByCognitoSubForRequester.mockResolvedValue({
      success: true,
      data: { cognitoSub: 'target-user-sub' },
    });
    prisma.appUser.findFirst.mockResolvedValue({
      cognitoSub: 'target-user-sub',
    });
    prisma.userCompanyAccess.findFirst.mockResolvedValue({
      userId: 'target-user-sub',
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentListService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppUserService, useValue: appUserService },
      ],
    }).compile();

    service = module.get(AssessmentListService);
  });

  describe('findAllPaginatedForRequester', () => {
    it.each([['SuperAdmin'], ['CorporationAdmin'], ['CompanyAdmin'], ['User']])(
      'returns only the caller own assessments for %s',
      async () => {
        prisma.appUser.findFirst.mockResolvedValue({
          cognitoSub: 'caller-sub',
        });
        prisma.assessment.findMany.mockResolvedValue([]);
        prisma.assessment.count.mockResolvedValue(0);

        await service.findAllPaginatedForRequester({}, 'caller-sub');

        expect(prisma.assessment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ userId: 'caller-sub' }),
          }),
        );
      },
    );

    it('rejects when app user is not found', async () => {
      prisma.appUser.findFirst.mockResolvedValue(null);
      await expect(
        service.findAllPaginatedForRequester({}, 'user-sub'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns paginated assessments for the authenticated user only', async () => {
      const startedAt = new Date('2026-06-01T10:00:00.000Z');
      prisma.appUser.findFirst.mockResolvedValue({ cognitoSub: 'user-sub' });
      prisma.assessment.findMany.mockResolvedValue([
        {
          id: 'assessment-uuid-3',
          userId: 'user-sub',
          startedAt,
          completedAt: null,
          status: AssessmentStatus.in_progress,
          assessmentReport: null,
        },
      ]);
      prisma.assessment.count.mockResolvedValue(1);
      prisma.$queryRaw.mockResolvedValue([
        { id: 'assessment-uuid-3', assessment_code: 3 },
      ]);

      const result = await service.findAllPaginatedForRequester(
        { page: 1, limit: 10 },
        'user-sub',
      );

      expect(result.message).toBe(ASSESSMENT_LIST_FETCHED_MSG);
      expect(result.data?.items[0]).toMatchObject({
        uuid: 'assessment-uuid-3',
        assessmentName: 'Assessment 3',
        status: 'incomplete',
      });
    });

    it('applies time filter when started_at or completed_at falls within the window', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ cognitoSub: 'user-sub' });
      prisma.assessment.findMany.mockResolvedValue([]);
      prisma.assessment.count.mockResolvedValue(0);

      await service.findAllPaginatedForRequester(
        { timeFilter: 'last24Hours' },
        'user-sub',
      );

      const call = prisma.assessment.findMany.mock.calls[0][0];
      expect(call.where.AND).toHaveLength(2);
      expect(call.where.AND[0]).toEqual({ userId: 'user-sub' });
      expect(call.where.AND[1].OR).toEqual([
        {
          startedAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        },
        {
          completedAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        },
      ]);
    });

    it('includes in_progress assessments when started_at is in the time window', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ cognitoSub: 'user-sub' });
      prisma.assessment.findMany.mockResolvedValue([
        {
          id: 'in-progress-id',
          userId: 'user-sub',
          startedAt: new Date(),
          completedAt: null,
          status: AssessmentStatus.in_progress,
          assessmentReport: null,
        },
      ]);
      prisma.assessment.count.mockResolvedValue(1);
      prisma.$queryRaw.mockResolvedValue([
        { id: 'in-progress-id', assessment_code: 2 },
      ]);

      const result = await service.findAllPaginatedForRequester(
        {
          status: 'incomplete',
          timeFilter: 'last6Months',
        },
        'user-sub',
      );

      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0]).toMatchObject({
        uuid: 'in-progress-id',
        assessmentName: 'Assessment 2',
        status: 'incomplete',
        completedAt: null,
      });
    });

    it('applies complete status filter as report_generated', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ cognitoSub: 'user-sub' });
      prisma.assessment.findMany.mockResolvedValue([]);
      prisma.assessment.count.mockResolvedValue(0);

      await service.findAllPaginatedForRequester(
        { status: 'complete' },
        'user-sub',
      );

      const call = prisma.assessment.findMany.mock.calls[0][0];
      expect(call.where.AND).toEqual([
        { userId: 'user-sub' },
        { status: AssessmentStatus.report_generated },
      ]);
    });

    it('applies incomplete status filter', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ cognitoSub: 'user-sub' });
      prisma.assessment.findMany.mockResolvedValue([]);
      prisma.assessment.count.mockResolvedValue(0);

      await service.findAllPaginatedForRequester(
        { status: 'incomplete' },
        'user-sub',
      );

      const call = prisma.assessment.findMany.mock.calls[0][0];
      expect(call.where.AND).toEqual([
        { userId: 'user-sub' },
        {
          status: {
            in: [
              AssessmentStatus.in_progress,
              AssessmentStatus.completed,
              AssessmentStatus.scored,
            ],
          },
        },
      ]);
    });

    it('combines status and time filters with AND', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ cognitoSub: 'user-sub' });
      prisma.assessment.findMany.mockResolvedValue([]);
      prisma.assessment.count.mockResolvedValue(0);

      await service.findAllPaginatedForRequester(
        {
          status: 'incomplete',
          timeFilter: 'last7Days',
        },
        'user-sub',
      );

      const call = prisma.assessment.findMany.mock.calls[0][0];
      expect(call.where.AND).toHaveLength(3);
      expect(call.where.AND[0]).toEqual({ userId: 'user-sub' });
      expect(call.where.AND[1]).toEqual({
        status: {
          in: [
            AssessmentStatus.in_progress,
            AssessmentStatus.completed,
            AssessmentStatus.scored,
          ],
        },
      });
      expect(call.where.AND[2].OR).toHaveLength(2);
    });

    it('sorts by assessmentName via userId and startedAt', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ cognitoSub: 'user-sub' });
      prisma.assessment.findMany.mockResolvedValue([]);
      prisma.assessment.count.mockResolvedValue(0);

      await service.findAllPaginatedForRequester(
        { sortBy: 'assessmentName', sortOrder: 'asc' },
        'user-sub',
      );

      expect(prisma.assessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ userId: 'asc' }, { startedAt: 'asc' }],
        }),
      );
    });

    it('sorts by display status using a two-step id fetch', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ cognitoSub: 'user-sub' });
      prisma.assessment.findMany
        .mockResolvedValueOnce([
          { id: 'complete-id', status: AssessmentStatus.report_generated },
          { id: 'incomplete-id', status: AssessmentStatus.in_progress },
        ])
        .mockResolvedValueOnce([
          {
            id: 'incomplete-id',
            userId: 'user-sub',
            startedAt: new Date('2026-06-01T10:00:00.000Z'),
            completedAt: null,
            status: AssessmentStatus.in_progress,
            assessmentReport: null,
          },
          {
            id: 'complete-id',
            userId: 'user-sub',
            startedAt: new Date('2026-05-01T10:00:00.000Z'),
            completedAt: new Date('2026-05-02T10:00:00.000Z'),
            status: AssessmentStatus.report_generated,
            assessmentReport: null,
          },
        ]);
      prisma.assessment.count.mockResolvedValue(2);
      prisma.$queryRaw.mockResolvedValue([
        { id: 'incomplete-id', assessment_code: 2 },
        { id: 'complete-id', assessment_code: 1 },
      ]);

      const result = await service.findAllPaginatedForRequester(
        { sortBy: 'status', sortOrder: 'asc' },
        'user-sub',
      );

      expect(result.data?.items).toHaveLength(2);
      expect(result.data?.items[0]?.status).toBe('incomplete');
      expect(result.data?.items[1]?.status).toBe('complete');
      expect(prisma.assessment.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          select: { id: true, status: true },
        }),
      );
    });

    it('combines complete status and time filters for the current user', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ cognitoSub: 'user-sub' });
      prisma.assessment.findMany.mockResolvedValue([]);
      prisma.assessment.count.mockResolvedValue(0);

      await service.findAllPaginatedForRequester(
        {
          status: 'complete',
          timeFilter: 'last30Days',
        },
        'user-sub',
      );

      const call = prisma.assessment.findMany.mock.calls[0][0];
      expect(call.where.AND).toHaveLength(3);
      expect(call.where.AND[0]).toEqual({ userId: 'user-sub' });
      expect(call.where.AND[1]).toEqual({
        status: AssessmentStatus.report_generated,
      });
      expect(call.where.AND[2].OR).toHaveLength(2);
    });

    it('throws internal error when prisma fails', async () => {
      prisma.appUser.findFirst.mockResolvedValue({ cognitoSub: 'user-sub' });
      prisma.assessment.findMany.mockRejectedValue(new Error('db down'));

      await expect(
        service.findAllPaginatedForRequester({}, 'user-sub'),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('listByUserIdForAdmin', () => {
    it('rejects non-admin callers', async () => {
      await expect(
        service.listByUserIdForAdmin('target-user-sub', {}, 'user-sub', [
          COGNITO_GROUP_NAMES.USER,
        ]),
      ).rejects.toMatchObject({
        response: { message: ASSESSMENT_LIST_BY_USER_FORBIDDEN_MSG },
      });
      expect(
        appUserService.findByCognitoSubForRequester,
      ).not.toHaveBeenCalled();
    });

    it('rejects empty target cognito sub', async () => {
      await expect(
        service.listByUserIdForAdmin('  ', {}, 'admin-sub', [
          COGNITO_GROUP_NAMES.SUPER_ADMIN,
        ]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('delegates target scope to user directory before listing assessments', async () => {
      const startedAt = new Date('2026-06-01T10:00:00.000Z');
      prisma.assessment.findMany.mockResolvedValue([
        {
          id: 'assessment-uuid-target',
          userId: 'target-user-sub',
          startedAt,
          completedAt: null,
          status: AssessmentStatus.report_generated,
          assessmentReport: { report: 'assessment_report/key.pdf' },
        },
      ]);
      prisma.assessment.count.mockResolvedValue(1);
      prisma.$queryRaw.mockResolvedValue([
        { id: 'assessment-uuid-target', assessment_code: 1 },
      ]);

      const result = await service.listByUserIdForAdmin(
        'target-user-sub',
        { page: 1, limit: 10 },
        'corp-admin-sub',
        [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
      );

      expect(appUserService.findByCognitoSubForRequester).toHaveBeenCalledWith(
        'target-user-sub',
        'corp-admin-sub',
        [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
      );
      expect(result.message).toBe(ASSESSMENT_LIST_BY_USER_FETCHED_MSG);
      expect(result.data?.items[0]).toMatchObject({
        uuid: 'assessment-uuid-target',
        assessmentName: 'Assessment 1',
        status: 'complete',
        reportKey: 'assessment_report/key.pdf',
      });
      expect(prisma.assessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'target-user-sub' }),
        }),
      );
    });

    it('propagates forbidden from user directory scope check', async () => {
      appUserService.findByCognitoSubForRequester.mockRejectedValue(
        new ForbiddenException('outside scope'),
      );

      await expect(
        service.listByUserIdForAdmin(
          'target-user-sub',
          {},
          'company-admin-sub',
          [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.assessment.findMany).not.toHaveBeenCalled();
    });

    it('rejects corporation admin for individual assessment user', async () => {
      prisma.userCompanyAccess.findFirst.mockResolvedValue(null);

      await expect(
        service.listByUserIdForAdmin(
          'individual-user-sub',
          {},
          'corp-admin-sub',
          [COGNITO_GROUP_NAMES.CORPORATION_ADMIN],
        ),
      ).rejects.toMatchObject({
        response: { message: ASSESSMENT_LIST_INDIVIDUAL_USER_FORBIDDEN_MSG },
      });

      expect(
        appUserService.findByCognitoSubForRequester,
      ).not.toHaveBeenCalled();
      expect(prisma.assessment.findMany).not.toHaveBeenCalled();
    });

    it('rejects company admin for individual assessment user', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'individual-user-sub',
      });
      prisma.userCompanyAccess.findFirst.mockResolvedValue(null);

      await expect(
        service.listByUserIdForAdmin(
          'individual-user-sub',
          {},
          'company-admin-sub',
          [COGNITO_GROUP_NAMES.COMPANY_ADMIN],
        ),
      ).rejects.toMatchObject({
        response: { message: ASSESSMENT_LIST_INDIVIDUAL_USER_FORBIDDEN_MSG },
      });
    });

    it('allows super admin for individual assessment user', async () => {
      prisma.appUser.findFirst.mockResolvedValue({
        cognitoSub: 'individual-user-sub',
      });
      prisma.userCompanyAccess.findFirst.mockResolvedValue(null);
      prisma.assessment.findMany.mockResolvedValue([]);
      prisma.assessment.count.mockResolvedValue(0);

      await service.listByUserIdForAdmin(
        'individual-user-sub',
        {},
        'super-admin-sub',
        [COGNITO_GROUP_NAMES.SUPER_ADMIN],
      );

      expect(
        appUserService.findByCognitoSubForRequester,
      ).not.toHaveBeenCalled();
      expect(prisma.assessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'individual-user-sub' }),
        }),
      );
    });

    it('lists assessments for super admin without extra scope filter', async () => {
      prisma.assessment.findMany.mockResolvedValue([]);
      prisma.assessment.count.mockResolvedValue(0);

      await service.listByUserIdForAdmin(
        'target-user-sub',
        {},
        'super-admin-sub',
        [COGNITO_GROUP_NAMES.SUPER_ADMIN],
      );

      expect(
        appUserService.findByCognitoSubForRequester,
      ).not.toHaveBeenCalled();
      expect(prisma.assessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'target-user-sub' }),
        }),
      );
    });
  });
});
