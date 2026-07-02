import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SUBSCRIPTION_EMPLOYEE_LIMIT_MSG } from '../auth/subscription.constants';
import { PrismaService } from '../prisma';
import { SubscriptionAccessService } from './subscription-access.service';

describe('SubscriptionAccessService', () => {
  let service: SubscriptionAccessService;
  let prisma: {
    userCompanyAccess: { findFirst: jest.Mock };
    corporationCompany: { findFirst: jest.Mock };
    appUser: { count: jest.Mock; findFirst: jest.Mock };
    assessment: { count: jest.Mock; findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      userCompanyAccess: { findFirst: jest.fn() },
      corporationCompany: { findFirst: jest.fn() },
      appUser: { count: jest.fn(), findFirst: jest.fn() },
      assessment: { count: jest.fn(), findFirst: jest.fn() },
    };

    prisma.assessment.count.mockResolvedValue(0);
    prisma.assessment.findFirst.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SubscriptionAccessService);
  });

  it('denies assessment for users with no company and unknown profile', async () => {
    prisma.userCompanyAccess.findFirst.mockResolvedValue(null);
    prisma.appUser.findFirst.mockResolvedValue(null);

    const result = await service.resolveForUser('user-1');

    expect(result.companyId).toBeNull();
    expect(result.canAccessChatbot).toBe(false);
    expect(result.canStartAssessment).toBe(false);
    expect(result.canAccessFullApp).toBe(false);
  });

  it('grants full app access for active monthly plan', async () => {
    prisma.userCompanyAccess.findFirst.mockResolvedValue({
      companyId: 'co-1',
      company: {
        subscriptionStatus: 'active',
        plan: { planTypeId: 'monthly', employeeRangeMax: 25 },
      },
    });
    prisma.appUser.count.mockResolvedValue(10);
    prisma.assessment.count.mockResolvedValue(1);

    const result = await service.resolveForUser('user-1');

    expect(result.canAccessFullApp).toBe(true);
    expect(result.canAccessChatbot).toBe(true);
    expect(result.canStartAssessment).toBe(true);
    expect(result.employeeLimitExceeded).toBe(false);
  });

  it('denies chatbot for monthly plan users with no completed assessments', async () => {
    prisma.userCompanyAccess.findFirst.mockResolvedValue({
      companyId: 'co-1',
      company: {
        subscriptionStatus: 'active',
        plan: { planTypeId: 'monthly', employeeRangeMax: 25 },
      },
    });
    prisma.appUser.count.mockResolvedValue(10);
    prisma.assessment.count.mockResolvedValue(0);

    const result = await service.resolveForUser('user-1');

    expect(result.canAccessFullApp).toBe(true);
    expect(result.canAccessChatbot).toBe(false);
    expect(result.canStartAssessment).toBe(true);
  });

  it('allows assessments but not full app for annual plan', async () => {
    prisma.userCompanyAccess.findFirst.mockResolvedValue({
      companyId: 'co-1',
      company: {
        subscriptionStatus: 'active',
        plan: { planTypeId: 'annual', employeeRangeMax: 50 },
      },
    });
    prisma.appUser.count.mockResolvedValue(5);

    const result = await service.resolveForUser('user-1');

    expect(result.canAccessFullApp).toBe(false);
    expect(result.canAccessChatbot).toBe(false);
    expect(result.canStartAssessment).toBe(true);
  });

  it('blocks one_time company users when all purchased credits are used', async () => {
    prisma.userCompanyAccess.findFirst.mockResolvedValue({
      companyId: 'co-1',
      company: {
        subscriptionStatus: 'active',
        assessmentQuantity: 2,
        plan: { planTypeId: 'one_time', employeeRangeMax: null },
      },
    });
    prisma.appUser.count.mockResolvedValue(1);
    prisma.assessment.count.mockResolvedValue(2);
    prisma.assessment.findFirst.mockResolvedValue(null);

    const result = await service.resolveForUser('user-1');

    expect(result.canStartAssessment).toBe(false);
    expect(result.assessmentQuantity).toBe(2);
    expect(result.companyAssessmentCount).toBe(2);
    expect(result.assessmentCreditsRemaining).toBe(0);
  });

  it('allows one_time company users while assessment credits remain', async () => {
    prisma.userCompanyAccess.findFirst.mockResolvedValue({
      companyId: 'co-1',
      company: {
        subscriptionStatus: 'active',
        assessmentQuantity: 5,
        plan: { planTypeId: 'one_time', employeeRangeMax: null },
      },
    });
    prisma.appUser.count.mockResolvedValue(1);
    prisma.assessment.count.mockResolvedValue(2);
    prisma.assessment.findFirst.mockResolvedValue(null);

    const result = await service.resolveForUser('user-1');

    expect(result.canStartAssessment).toBe(true);
    expect(result.assessmentCreditsRemaining).toBe(3);
  });

  it('allows one_time users with an unfinished assessment to continue', async () => {
    prisma.userCompanyAccess.findFirst.mockResolvedValue({
      companyId: 'co-1',
      company: {
        subscriptionStatus: 'active',
        assessmentQuantity: 1,
        plan: { planTypeId: 'one_time', employeeRangeMax: null },
      },
    });
    prisma.appUser.count.mockResolvedValue(1);
    prisma.assessment.count.mockResolvedValue(1);
    prisma.assessment.findFirst.mockResolvedValue({ id: 'a-1' });

    const result = await service.resolveForUser('user-1');

    expect(result.canStartAssessment).toBe(true);
  });

  it('blocks Assessment Only users without company who already have an assessment', async () => {
    prisma.userCompanyAccess.findFirst.mockResolvedValue(null);
    prisma.appUser.findFirst.mockResolvedValue({
      inviteType: 'Assessment Only',
      userType: 'employee',
      paymentStatus: null,
    });
    prisma.assessment.count.mockResolvedValue(1);
    prisma.assessment.findFirst.mockResolvedValue(null);

    const result = await service.resolveForUser('user-ao-1');

    expect(result.canStartAssessment).toBe(false);
    expect(result.canAccessFullApp).toBe(false);
    expect(result.canAccessChatbot).toBe(false);
    expect(result.canViewResults).toBe(true);
    expect(result.companyId).toBeNull();
  });

  it('allows Assessment Only users without company who have no assessments', async () => {
    prisma.userCompanyAccess.findFirst.mockResolvedValue(null);
    prisma.appUser.findFirst.mockResolvedValue({
      inviteType: 'Assessment Only',
      userType: 'employee',
      paymentStatus: null,
    });
    const result = await service.resolveForUser('user-ao-2');

    expect(result.canStartAssessment).toBe(true);
    expect(result.canAccessFullApp).toBe(false);
    expect(result.canAccessChatbot).toBe(false);
    expect(result.companyId).toBeNull();
  });

  it('denies individual users who have not paid', async () => {
    prisma.userCompanyAccess.findFirst.mockResolvedValue(null);
    prisma.appUser.findFirst.mockResolvedValue({
      inviteType: 'Assessment Only',
      userType: 'individual',
      paymentStatus: 'pending',
    });

    const result = await service.resolveForUser('user-ind-1');

    expect(result.isIndividualUser).toBe(true);
    expect(result.paymentRequired).toBe(true);
    expect(result.canStartAssessment).toBe(false);
    expect(result.canAccessFullApp).toBe(false);
  });

  it('allows individual users after payment', async () => {
    prisma.userCompanyAccess.findFirst.mockResolvedValue(null);
    prisma.appUser.findFirst.mockResolvedValue({
      inviteType: 'Assessment Only',
      userType: 'individual',
      paymentStatus: 'paid',
    });
    prisma.assessment.count.mockResolvedValue(0);
    prisma.assessment.findFirst.mockResolvedValue(null);

    const result = await service.resolveForUser('user-ind-2');

    expect(result.isIndividualUser).toBe(true);
    expect(result.paymentRequired).toBe(false);
    expect(result.canStartAssessment).toBe(true);
    expect(result.isActive).toBe(true);
  });

  it('flags employee limit exceeded when active count is above plan max', async () => {
    prisma.userCompanyAccess.findFirst.mockResolvedValue({
      companyId: 'co-1',
      company: {
        subscriptionStatus: 'active',
        plan: { planTypeId: 'monthly', employeeRangeMax: 25 },
      },
    });
    prisma.appUser.count.mockResolvedValue(26);

    const result = await service.resolveForUser('user-1');

    expect(result.employeeLimitExceeded).toBe(true);
    expect(result.canAccessFullApp).toBe(false);
    expect(result.canStartAssessment).toBe(false);
  });

  describe('assertCanAddCompanySeats', () => {
    beforeEach(() => {
      prisma.corporationCompany.findFirst.mockResolvedValue({
        planId: 'plan-1',
        plan: { employeeRangeMax: 25 },
      });
    });

    it('allows invite when seats in use plus additions stays within cap', async () => {
      prisma.appUser.count.mockResolvedValue(24);

      await expect(
        service.assertCanAddCompanySeats('co-1', 1),
      ).resolves.toBeUndefined();
    });

    it('rejects when additions would exceed employee_range_max', async () => {
      prisma.appUser.count.mockResolvedValue(25);

      await expect(
        service.assertCanAddCompanySeats('co-1', 1),
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: SUBSCRIPTION_EMPLOYEE_LIMIT_MSG,
      });
    });

    it('rejects bulk batch when pending users already fill the plan', async () => {
      prisma.appUser.count.mockResolvedValue(20);

      await expect(
        service.assertCanAddCompanySeats('co-1', 10),
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: SUBSCRIPTION_EMPLOYEE_LIMIT_MSG,
      });
    });

    it('rejects bulk batch of 1000 when plan cap is 25', async () => {
      prisma.appUser.count.mockResolvedValue(5);

      await expect(
        service.assertCanAddCompanySeats('co-1', 1000),
      ).rejects.toMatchObject({
        constructor: BadRequestException,
        message: SUBSCRIPTION_EMPLOYEE_LIMIT_MSG,
      });
    });
  });
});
