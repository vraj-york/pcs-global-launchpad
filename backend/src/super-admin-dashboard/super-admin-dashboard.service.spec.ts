import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma';
import { SuperAdminDashboardService } from './super-admin-dashboard.service';

describe('SuperAdminDashboardService', () => {
  let service: SuperAdminDashboardService;

  const prisma = {
    $transaction: jest.fn(),
    corporation: { count: jest.fn() },
    corporationCompany: { count: jest.fn() },
    appUser: { count: jest.fn() },
    assessment: { count: jest.fn(), findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminDashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SuperAdminDashboardService);
  });

  describe('getSystemAnalytics', () => {
    it('returns status breakdown totals from parallel counts', async () => {
      prisma.$transaction.mockImplementation(async (ops: Promise<number>[]) =>
        Promise.all(ops),
      );
      prisma.corporation.count
        .mockResolvedValueOnce(12)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);
      prisma.corporationCompany.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(1);
      prisma.appUser.count
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(4);
      prisma.assessment.count
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(7);
      prisma.assessment.findMany.mockResolvedValueOnce([
        {
          startedAt: new Date('2026-06-01T00:00:00.000Z'),
          completedAt: new Date('2026-06-03T00:00:00.000Z'),
        },
        {
          startedAt: new Date('2026-06-01T00:00:00.000Z'),
          completedAt: new Date('2026-06-05T00:00:00.000Z'),
        },
      ]);

      const result = await service.getSystemAnalytics({
        corporationId: '550e8400-e29b-41d4-a716-446655440000',
        timeFilter: 'last7Days',
      });

      expect(result.corporations).toEqual({
        active: 12,
        incomplete: 8,
        suspended: 3,
        closed: 2,
        total: 25,
      });
      expect(result.companies).toEqual({
        active: 20,
        incomplete: 5,
        suspended: 4,
        closed: 1,
        total: 30,
      });
      expect(result.users).toEqual({
        active: 30,
        pending: 10,
        blocked: 2,
        cancelled: 1,
        expired: 3,
        deleted: 4,
        total: 50,
      });
      expect(result.assessments).toEqual({
        completed: 15,
        inprogress: 7,
        avgTimeToComplete: 3,
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
