import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma';
import { APP_USER_INVITE_PENDING_EXPIRY_MS } from '../user/constants/app-user.constants';
import { InviteManagementListService } from './invite-management-list.service';
import { ASSESSMENT_INVITE_LIST_FETCHED_MSG } from './invite-management.constants';

describe('InviteManagementListService', () => {
  let service: InviteManagementListService;
  let dateNowSpy: jest.SpiedFunction<typeof Date.now>;

  const fixedNow = new Date('2026-06-15T12:00:00.000Z');

  const prisma = {
    appUser: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNow.getTime());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteManagementListService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(InviteManagementListService);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  it('returns paginated list with summary metrics', async () => {
    const withinExpiryInviteSentAt = new Date(
      fixedNow.getTime() - APP_USER_INVITE_PENDING_EXPIRY_MS / 2,
    );
    let countCalls = 0;
    prisma.appUser.count.mockImplementation(() => {
      countCalls += 1;
      return countCalls === 1 ? 2 : 1;
    });
    prisma.appUser.findMany.mockResolvedValue([
      {
        cognitoSub: 'sub-1',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        status: 'Pending',
        invitationSentAt: withinExpiryInviteSentAt,
        createdAt: withinExpiryInviteSentAt,
        lastSeenAt: new Date('2026-06-10T15:00:00.000Z'),
        assessments: [],
      },
      {
        cognitoSub: 'sub-2',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        status: 'Active',
        invitationSentAt: new Date('2026-05-01T12:00:00.000Z'),
        createdAt: new Date('2026-05-01T12:00:00.000Z'),
        lastSeenAt: new Date('2026-05-02T08:00:00.000Z'),
        assessments: [
          {
            id: 'assess-1',
            status: AssessmentStatus.report_generated,
            startedAt: new Date('2026-05-02T12:00:00.000Z'),
            completedAt: new Date('2026-05-03T12:00:00.000Z'),
            assessmentReport: { report: 'reports/john.pdf' },
            _count: { questionResponses: 240 },
            questionResponses: [
              { updatedAt: new Date('2026-05-03T12:00:00.000Z') },
            ],
          },
        ],
      },
    ]);

    const result = await service.listAssessmentInvites({
      page: 1,
      limit: 10,
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe(ASSESSMENT_INVITE_LIST_FETCHED_MSG);
    expect(result.data?.summary).toEqual({
      totalAssessments: 2,
      completedAssessments: 1,
      completionRatePercent: 50,
    });
    expect(result.data?.items).toHaveLength(2);

    const invitedItem = result.data?.items.find(
      (item) => item.cognitoSub === 'sub-1',
    );
    const completedItem = result.data?.items.find(
      (item) => item.cognitoSub === 'sub-2',
    );

    expect(invitedItem).toMatchObject({
      cognitoSub: 'sub-1',
      status: 'invited',
      lastActivity: '2026-06-10T15:00:00.000Z',
    });
    expect(completedItem).toMatchObject({
      cognitoSub: 'sub-2',
      status: 'completed',
      progressPercent: 100,
      assessmentId: 'assess-1',
      completedAt: '2026-05-03T12:00:00.000Z',
      lastActivity: '2026-05-03T12:00:00.000Z',
      reportKey: 'reports/john.pdf',
    });
  });

  it('throws when prisma fails', async () => {
    prisma.appUser.count.mockRejectedValue(new Error('db down'));

    await expect(
      service.listAssessmentInvites({ page: 1, limit: 10 }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
