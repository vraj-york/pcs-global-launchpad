/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest expect.objectContaining matchers */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import Stripe from 'stripe';
import { PrismaService } from '../prisma';
import { StripeService } from '../stripe/stripe.service';
import type { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { PromoService } from './promo.service';
import type { ListPromoCodeUsageQueryDto } from './dto/list-promo-code-usage-query.dto';
import type { ListAvailablePromoCodesForSetupQueryDto } from './dto/list-available-promo-codes-for-setup-query.dto';
import type { ListPromoCodesQueryDto } from './dto/list-promo-codes-query.dto';
import {
  PROMO_CANNOT_ACTIVATE_EXPIRED_MSG,
  PROMO_CODE_CREATED_MSG,
  PROMO_CODE_DETAIL_FETCHED_MSG,
  PROMO_CODE_MISSING_STRIPE_PROMOTION_MSG,
  PROMO_CODE_NOT_FOUND_MSG,
  PROMO_CODE_PROMOTION_ACTIVE_UPDATED_MSG,
  PROMO_CODE_UPDATED_MSG,
  PROMO_CODES_AVAILABLE_FOR_SETUP_FETCHED_MSG,
  PROMO_CODES_LIST_FETCHED_MSG,
  PROMO_COMPANY_NOT_IN_CORPORATION_MSG,
  PROMO_DUPLICATE_CODE_MSG,
  PROMO_EXPIRY_IN_PAST_MSG,
  PROMO_INVALID_FIXED_MSG,
  PROMO_INVALID_PERCENT_MSG,
  PROMO_LIMIT_REQUIRES_CORPORATION_MSG,
  PROMO_NO_FIELDS_TO_UPDATE_MSG,
  PROMO_PLAN_TYPE_NOT_FOUND_MSG,
  PROMO_USAGE_LIST_FETCHED_MSG,
} from './promo.constants';

function baseDto(over?: Partial<CreatePromoCodeDto>): CreatePromoCodeDto {
  return {
    code: 'BSP15',
    planTypeId: 'monthly',
    discountType: 'percent',
    discountValue: 15,
    duration: 'once',
    ...over,
  } as CreatePromoCodeDto;
}

describe('PromoService', () => {
  let service: PromoService;
  let prisma: jest.Mocked<
    Pick<
      PrismaService,
      | 'planType'
      | 'pricingPlan'
      | 'corporation'
      | 'corporationCompany'
      | 'promoCode'
    >
  >;
  let stripeService: jest.Mocked<
    Pick<
      StripeService,
      | 'createCouponAndPromotionCode'
      | 'deleteCouponAndPromotionCode'
      | 'createPromotionCodeForCoupon'
      | 'updatePromotionCodeSchedule'
      | 'deactivatePromotionCode'
      | 'resolveProductIdsFromPriceIds'
      | 'retrievePromotionCodeSummary'
      | 'setPromotionCodeActiveState'
      | 'listCompletedCheckoutSessionsForPromotionCode'
      | 'couponAppliesToProduct'
    >
  >;

  const planRow = { id: 'monthly', name: 'Monthly' };
  const stripeIds = { couponId: 'co_test', promotionCodeId: 'promo_test' };

  beforeEach(async () => {
    const mockPrisma = {
      planType: { findUnique: jest.fn() },
      pricingPlan: { findMany: jest.fn() },
      corporation: { findUnique: jest.fn() },
      corporationCompany: { findFirst: jest.fn(), findMany: jest.fn() },
      promoCode: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const mockStripe = {
      createCouponAndPromotionCode: jest.fn(),
      deleteCouponAndPromotionCode: jest.fn(),
      createPromotionCodeForCoupon: jest.fn(),
      updatePromotionCodeSchedule: jest.fn(),
      deactivatePromotionCode: jest.fn(),
      setPromotionCodeActiveState: jest.fn(),
      resolveProductIdsFromPriceIds: jest.fn(),
      retrievePromotionCodeSummary: jest.fn(),
      listCompletedCheckoutSessionsForPromotionCode: jest.fn(),
      couponAppliesToProduct: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromoService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StripeService, useValue: mockStripe },
      ],
    }).compile();

    service = module.get(PromoService);
    prisma = module.get(PrismaService);
    stripeService = module.get(StripeService);

    (prisma.planType.findUnique as jest.Mock).mockResolvedValue(planRow);
    (prisma.pricingPlan.findMany as jest.Mock).mockResolvedValue([
      { stripePriceId: 'price_test' },
    ]);
    (
      stripeService.resolveProductIdsFromPriceIds as jest.Mock
    ).mockResolvedValue(['prod_test']);
    (stripeService.createCouponAndPromotionCode as jest.Mock).mockResolvedValue(
      stripeIds,
    );
    (prisma.promoCode.create as jest.Mock).mockResolvedValue({
      id: 'row-id-1',
      code: 'BSP15',
    });
    (prisma.promoCode.update as jest.Mock).mockResolvedValue({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      code: 'BSP15',
    });
    (stripeService.retrievePromotionCodeSummary as jest.Mock).mockResolvedValue(
      {
        active: true,
        timesRedeemed: 0,
        maxRedemptions: null,
      },
    );
    (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue(null);
  });

  const existingPromoRow = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    code: 'BSP15',
    description: null as string | null,
    planTypeId: 'monthly',
    discountType: 'percent' as const,
    percentOff: new Prisma.Decimal(15),
    amountOffMinor: null as number | null,
    currency: null as string | null,
    duration: 'once' as const,
    expiresAt: null as Date | null,
    maxRedemptions: null as number | null,
    limitToAssignment: false,
    corporationId: null as string | null,
    companyId: null as string | null,
    stripeCouponId: 'co_old',
    stripePromotionCodeId: 'promo_old',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listPromoCodes', () => {
    const listRow = {
      id: 'id-1',
      code: 'BSP10',
      description: 'Ten off',
      planTypeId: 'monthly',
      discountType: 'percent' as const,
      percentOff: new Prisma.Decimal(10),
      amountOffMinor: null,
      currency: null,
      duration: 'once' as const,
      expiresAt: new Date(Date.now() + 86400000),
      maxRedemptions: 5,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
      stripePromotionCodeId: 'promo_pc_1',
      planType: { name: 'BSPBlueprint (Monthly)' },
    };

    beforeEach(() => {
      (prisma.promoCode.count as jest.Mock).mockResolvedValue(1);
    });

    it('returns items with Stripe summary merged and pagination', async () => {
      (prisma.promoCode.findMany as jest.Mock).mockResolvedValue([listRow]);
      (
        stripeService.retrievePromotionCodeSummary as jest.Mock
      ).mockResolvedValue({
        active: true,
        timesRedeemed: 3,
        maxRedemptions: 5,
      });

      const query: ListPromoCodesQueryDto = { page: 2, limit: 5 };
      const result = await service.listPromoCodes(query);

      expect(result.success).toBe(true);
      expect(result.message).toBe(PROMO_CODES_LIST_FETCHED_MSG);
      expect(result.data?.pagination).toEqual({
        total: 1,
        page: 2,
        pageSize: 5,
        totalPages: 1,
      });
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0]).toMatchObject({
        id: 'id-1',
        code: 'BSP10',
        planTypeName: 'BSPBlueprint (Monthly)',
        discountSummary: '10%',
        discountType: 'percent',
        status: 'active',
        maxRedemptions: 5,
        timesRedeemed: 3,
      });
      expect(prisma.promoCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(stripeService.retrievePromotionCodeSummary).toHaveBeenCalledWith(
        'promo_pc_1',
      );
    });

    it('applies search, plan, discount, and createdAfter filters', async () => {
      (prisma.promoCode.findMany as jest.Mock).mockResolvedValue([]);
      const query: ListPromoCodesQueryDto = {
        page: 1,
        limit: 10,
        search: '  bsp  ',
        planTypeId: 'monthly',
        discountType: 'percent',
        createdAfter: '2026-01-01T00:00:00.000Z',
      };
      await service.listPromoCodes(query);

      expect(prisma.promoCode.count).toHaveBeenCalledWith({
        where: {
          AND: [
            { deletedAt: null },
            {
              OR: [
                { code: { contains: 'bsp', mode: 'insensitive' } },
                { description: { contains: 'bsp', mode: 'insensitive' } },
              ],
            },
            { planTypeId: 'monthly' },
            { discountType: 'percent' },
            { createdAt: { gte: new Date('2026-01-01T00:00:00.000Z') } },
          ],
        },
      });
    });

    it('uses sortBy code ascending', async () => {
      (prisma.promoCode.findMany as jest.Mock).mockResolvedValue([]);
      await service.listPromoCodes({
        sortBy: 'code',
        sortOrder: 'asc',
      } as ListPromoCodesQueryDto);

      expect(prisma.promoCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { code: 'asc' },
        }),
      );
    });
  });

  describe('listAvailablePromoCodesForCompanySetup', () => {
    it('returns mapped items and drops exhausted promos', async () => {
      (prisma.promoCode.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'p1',
          code: 'BSP10',
          planTypeId: 'annual',
          discountType: 'percent',
          percentOff: new Prisma.Decimal(10),
          amountOffMinor: null,
          currency: null,
          maxRedemptions: 1,
          timesRedeemedSnapshot: 0,
        },
        {
          id: 'p2',
          code: 'BSP99',
          planTypeId: 'annual',
          discountType: 'percent',
          percentOff: new Prisma.Decimal(99),
          amountOffMinor: null,
          currency: null,
          maxRedemptions: 1,
          timesRedeemedSnapshot: 1,
        },
      ]);

      const query: ListAvailablePromoCodesForSetupQueryDto = {
        planTypeId: 'annual',
        corporationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      };
      const result =
        await service.listAvailablePromoCodesForCompanySetup(query);

      expect(result.success).toBe(true);
      expect(result.message).toBe(PROMO_CODES_AVAILABLE_FOR_SETUP_FETCHED_MSG);
      expect(result.data?.items).toEqual([
        {
          id: 'p1',
          code: 'BSP10',
          planTypeId: 'annual',
          discountType: 'percent',
          discountValue: 10,
          currency: null,
        },
      ]);
      expect(prisma.promoCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { planTypeId: 'annual' },
              { companyId: null },
            ]),
          }),
          orderBy: { code: 'asc' },
        }),
      );
    });
  });

  describe('listAvailablePromoCodesForIndividualAssessment', () => {
    it('returns one_time promos whose coupon applies to the Stripe product', async () => {
      stripeService.resolveProductIdsFromPriceIds.mockResolvedValue([
        'prod_individual',
      ]);
      (prisma.promoCode.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'p1',
          code: 'BSP10',
          planTypeId: 'one_time',
          discountType: 'percent',
          percentOff: new Prisma.Decimal(10),
          amountOffMinor: null,
          currency: null,
          maxRedemptions: null,
          timesRedeemedSnapshot: 0,
          stripeCouponId: 'co_ok',
        },
        {
          id: 'p2',
          code: 'OTHER',
          planTypeId: 'one_time',
          discountType: 'percent',
          percentOff: new Prisma.Decimal(5),
          amountOffMinor: null,
          currency: null,
          maxRedemptions: null,
          timesRedeemedSnapshot: 0,
          stripeCouponId: 'co_skip',
        },
      ]);
      stripeService.couponAppliesToProduct
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result =
        await service.listAvailablePromoCodesForIndividualAssessment(
          'price_one_time',
        );

      expect(result.data?.items).toEqual([
        {
          id: 'p1',
          code: 'BSP10',
          planTypeId: 'one_time',
          discountType: 'percent',
          discountValue: 10,
          currency: null,
        },
      ]);
      expect(stripeService.resolveProductIdsFromPriceIds).toHaveBeenCalledWith([
        'price_one_time',
      ]);
      expect(stripeService.couponAppliesToProduct).toHaveBeenCalledWith(
        'co_ok',
        'prod_individual',
      );
    });
  });

  describe('setPromoStripePromotionActive', () => {
    it('updates Stripe promotion active flag', async () => {
      const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue({
        id,
        code: 'BSP15',
        stripePromotionCodeId: 'promo_old',
        expiresAt: null,
      });

      const result = await service.setPromoStripePromotionActive(id, false);

      expect(result.success).toBe(true);
      expect(result.message).toBe(PROMO_CODE_PROMOTION_ACTIVE_UPDATED_MSG);
      expect(result.data).toEqual({ id, code: 'BSP15' });
      expect(stripeService.setPromotionCodeActiveState).toHaveBeenCalledWith(
        'promo_old',
        false,
      );
    });

    it('throws NotFound when promo row is missing', async () => {
      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.setPromoStripePromotionActive(
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          true,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(stripeService.setPromotionCodeActiveState).not.toHaveBeenCalled();
    });

    it('throws BadRequest when Stripe promotion id is missing', async () => {
      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        code: 'BSP15',
        stripePromotionCodeId: '  ',
        expiresAt: null,
      });

      await expect(
        service.setPromoStripePromotionActive(
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          true,
        ),
      ).rejects.toThrow(PROMO_CODE_MISSING_STRIPE_PROMOTION_MSG);
      expect(stripeService.setPromotionCodeActiveState).not.toHaveBeenCalled();
    });

    it('throws BadRequest when activating an expired-by-schedule promo', async () => {
      const past = new Date(Date.now() - 86400000);
      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        code: 'BSP15',
        stripePromotionCodeId: 'promo_old',
        expiresAt: past,
      });

      await expect(
        service.setPromoStripePromotionActive(
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          true,
        ),
      ).rejects.toThrow(PROMO_CANNOT_ACTIVATE_EXPIRED_MSG);
      expect(stripeService.setPromotionCodeActiveState).not.toHaveBeenCalled();
    });

    it('propagates Stripe errors from setPromotionCodeActiveState', async () => {
      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue({
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        code: 'BSP15',
        stripePromotionCodeId: 'promo_old',
        expiresAt: null,
      });
      const stripeErr = new Error('Stripe API unavailable');
      (
        stripeService.setPromotionCodeActiveState as jest.Mock
      ).mockRejectedValue(stripeErr);

      await expect(
        service.setPromoStripePromotionActive(
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          true,
        ),
      ).rejects.toThrow('Stripe API unavailable');
    });
  });

  describe('listPromoCodeUsage', () => {
    const promoId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const query: ListPromoCodeUsageQueryDto = { page: 1, pageSize: 10 };

    it('throws NotFound when promo is missing', async () => {
      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.listPromoCodeUsage(promoId, query)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequest when Stripe promotion id is missing on the row', async () => {
      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue({
        id: promoId,
        stripePromotionCodeId: '   ',
        createdAt: new Date('2020-01-01'),
      });

      await expect(service.listPromoCodeUsage(promoId, query)).rejects.toThrow(
        PROMO_CODE_MISSING_STRIPE_PROMOTION_MSG,
      );
      expect(
        stripeService.listCompletedCheckoutSessionsForPromotionCode,
      ).not.toHaveBeenCalled();
    });

    it('returns paginated items and filter options from Stripe sessions', async () => {
      const createdSec = Math.floor(
        new Date('2026-01-01T12:00:00.000Z').getTime() / 1000,
      );
      const session = {
        id: 'cs_test_1',
        object: 'checkout.session',
        mode: 'subscription',
        created: createdSec,
        metadata: { companyId: 'comp-uuid-1' },
        customer_details: { name: 'Jane', email: 'j@example.com' },
        discounts: [{ promotion_code: 'promo_old' }],
      } as unknown as Stripe.Checkout.Session;

      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue({
        id: promoId,
        stripePromotionCodeId: 'promo_old',
        createdAt: new Date('2020-01-01T00:00:00.000Z'),
      });
      (
        stripeService.listCompletedCheckoutSessionsForPromotionCode as jest.Mock
      ).mockResolvedValue([session]);
      (prisma.corporationCompany.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'comp-uuid-1',
          corporationId: 'corp-1',
          legalName: 'Widget Co',
          country: 'North America',
          deletedAt: null,
          corporation: {
            corporationCode: 1,
            legalName: 'Acme LLC',
            dataResidencyRegion: null,
          },
        },
      ]);

      const result = await service.listPromoCodeUsage(promoId, query);

      expect(
        stripeService.listCompletedCheckoutSessionsForPromotionCode,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          stripePromotionCodeId: 'promo_old',
          createdGte: expect.any(Number) as number,
        }),
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe(PROMO_USAGE_LIST_FETCHED_MSG);
      expect(result.data?.pagination).toEqual({
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.items[0]).toMatchObject({
        id: 'cs_test_1',
        outcome: 'success',
        userDisplayName: 'Jane',
        userEmail: 'j@example.com',
      });
      expect(result.data?.filterOptions.corporations).toEqual([
        { id: 'corp-1', name: 'Acme LLC' },
      ]);
      expect(result.data?.filterOptions.companies).toEqual([
        { id: 'comp-uuid-1', name: 'Widget Co' },
      ]);
    });
  });

  describe('getPromoCodeById', () => {
    it('throws NotFound when missing', async () => {
      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getPromoCodeById('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns detail and Stripe summary', async () => {
      const future = new Date(Date.now() + 86400000);
      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue({
        ...existingPromoRow,
        description: 'Note',
        expiresAt: future,
        planType: { id: 'monthly', name: 'BSPBlueprint (Monthly)' },
        corporation: null,
        company: null,
      });
      (
        stripeService.retrievePromotionCodeSummary as jest.Mock
      ).mockResolvedValue({
        active: true,
        timesRedeemed: 3,
        maxRedemptions: 100,
      });

      const result = await service.getPromoCodeById(
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe(PROMO_CODE_DETAIL_FETCHED_MSG);
      expect(result.data?.timesRedeemed).toBe(3);
      expect(result.data?.status).toBe('active');
      expect(result.data?.planTypeName).toBe('BSPBlueprint (Monthly)');
      expect(result.data?.discountTypeDisplay).toBe('% (Percentage)');
    });

    it('marks inactive when Stripe promotion is not active', async () => {
      const future = new Date(Date.now() + 86400000);
      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue({
        ...existingPromoRow,
        expiresAt: future,
        planType: { id: 'monthly', name: 'Monthly' },
        corporation: null,
        company: null,
      });
      (
        stripeService.retrievePromotionCodeSummary as jest.Mock
      ).mockResolvedValue({
        active: false,
        timesRedeemed: 0,
        maxRedemptions: null,
      });

      const result = await service.getPromoCodeById(
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      );

      expect(result.data?.status).toBe('inactive');
    });
  });

  describe('createPromoCode', () => {
    it('creates a percent promo, normalizes code, and scopes DB row without assignment', async () => {
      const dto = baseDto({ code: '  bsp-99  ' });

      const result = await service.createPromoCode(dto);

      expect(result.success).toBe(true);
      expect(result.message).toBe(PROMO_CODE_CREATED_MSG);
      expect(result.data).toEqual({ id: 'row-id-1', code: 'BSP-99' });

      expect(stripeService.createCouponAndPromotionCode).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'BSP-99',
          discountType: 'percent',
          percentOff: 15,
          amountOffMinor: undefined,
          currency: undefined,
          duration: 'once',
          appliesToProductIds: ['prod_test'],
        }),
      );
      expect(stripeService.resolveProductIdsFromPriceIds).toHaveBeenCalledWith([
        'price_test',
      ]);

      expect(prisma.promoCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'BSP-99',
          planTypeId: 'monthly',
          limitToAssignment: false,
          corporationId: null,
          companyId: null,
        }),
      });
    });

    it('creates fixed_amount promo with USD minor units', async () => {
      const dto = baseDto({
        discountType: 'fixed_amount',
        discountValue: 10.5,
      });

      await service.createPromoCode(dto);

      expect(stripeService.createCouponAndPromotionCode).toHaveBeenCalledWith(
        expect.objectContaining({
          discountType: 'fixed_amount',
          amountOffMinor: 1050,
          currency: 'usd',
        }),
      );
      expect(prisma.promoCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          currency: 'usd',
          amountOffMinor: 1050,
          percentOff: null,
        }),
      });
    });

    it('stores description when provided and null when blank', async () => {
      await service.createPromoCode(baseDto({ description: '  Note  ' }));
      expect(prisma.promoCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ description: 'Note' }),
      });

      jest.mocked(prisma.promoCode.create).mockClear();
      await service.createPromoCode(baseDto({ description: '   ' }));
      expect(prisma.promoCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ description: null }),
      });
    });

    it('rejects invalid promo code format', async () => {
      await expect(
        service.createPromoCode(baseDto({ code: 'NO@' })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.planType.findUnique).not.toHaveBeenCalled();
    });

    it('rejects when plan type does not exist', async () => {
      (prisma.planType.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.createPromoCode(baseDto())).rejects.toMatchObject({
        response: expect.objectContaining({
          message: PROMO_PLAN_TYPE_NOT_FOUND_MSG,
        }),
      });
    });

    it('rejects expiry in the past', async () => {
      await expect(
        service.createPromoCode(baseDto({ expiresAt: '2000-01-01' })),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: PROMO_EXPIRY_IN_PAST_MSG,
        }),
      });
    });

    it('requires corporation when limitToAssignment is true', async () => {
      await expect(
        service.createPromoCode(
          baseDto({ limitToAssignment: true, corporationId: undefined }),
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: PROMO_LIMIT_REQUIRES_CORPORATION_MSG,
        }),
      });
    });

    it('returns NotFound when corporation does not exist', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createPromoCode(
          baseDto({
            limitToAssignment: true,
            corporationId: '11111111-1111-1111-1111-111111111111',
          }),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects company that does not belong to corporation', async () => {
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: '11111111-1111-1111-1111-111111111111',
      });
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.createPromoCode(
          baseDto({
            limitToAssignment: true,
            corporationId: '11111111-1111-1111-1111-111111111111',
            companyId: '22222222-2222-2222-2222-222222222222',
          }),
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: PROMO_COMPANY_NOT_IN_CORPORATION_MSG,
        }),
      });
    });

    it('validates company in corporation when both set', async () => {
      const corpId = '11111111-1111-1111-1111-111111111111';
      const coId = '22222222-2222-2222-2222-222222222222';
      (prisma.corporation.findUnique as jest.Mock).mockResolvedValue({
        id: corpId,
      });
      (prisma.corporationCompany.findFirst as jest.Mock).mockResolvedValue({
        id: coId,
      });

      await service.createPromoCode(
        baseDto({
          limitToAssignment: true,
          corporationId: corpId,
          companyId: coId,
        }),
      );

      expect(prisma.corporationCompany.findFirst).toHaveBeenCalledWith({
        where: { id: coId, corporationId: corpId, deletedAt: null },
        select: { id: true },
      });
      expect(prisma.promoCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          corporationId: corpId,
          companyId: coId,
          limitToAssignment: true,
        }),
      });
    });

    it('rejects percent discount out of range', async () => {
      await expect(
        service.createPromoCode(baseDto({ discountValue: 0 })),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: PROMO_INVALID_PERCENT_MSG,
        }),
      });
      await expect(
        service.createPromoCode(baseDto({ discountValue: 100.01 })),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: PROMO_INVALID_PERCENT_MSG,
        }),
      });
    });

    it('rejects fixed discount that rounds to zero minor units', async () => {
      await expect(
        service.createPromoCode(
          baseDto({ discountType: 'fixed_amount', discountValue: 0.001 }),
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ message: PROMO_INVALID_FIXED_MSG }),
      });
    });

    it('maps Prisma unique violation to conflict', async () => {
      (prisma.promoCode.create as jest.Mock).mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      try {
        await service.createPromoCode(baseDto());
        throw new Error('expected ConflictException');
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictException);
        expect((e as ConflictException).getResponse()).toEqual(
          expect.objectContaining({ message: PROMO_DUPLICATE_CODE_MSG }),
        );
      }
    });

    it('maps Stripe duplicate-style error to conflict', async () => {
      const err = Object.assign(
        new Stripe.errors.StripeInvalidRequestError({
          message: 'already exists',
          type: 'invalid_request_error',
        }),
        { code: 'resource_already_exists' as const },
      );
      (
        stripeService.createCouponAndPromotionCode as jest.Mock
      ).mockRejectedValueOnce(err);

      try {
        await service.createPromoCode(baseDto());
        throw new Error('expected ConflictException');
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictException);
        expect((e as ConflictException).getResponse()).toEqual(
          expect.objectContaining({ message: PROMO_DUPLICATE_CODE_MSG }),
        );
      }
    });

    it('deletes Stripe coupon when DB create fails after Stripe succeeds', async () => {
      (prisma.promoCode.create as jest.Mock).mockRejectedValueOnce(
        new Error('database unavailable'),
      );

      await expect(service.createPromoCode(baseDto())).rejects.toThrow(
        'database unavailable',
      );

      expect(stripeService.deleteCouponAndPromotionCode).toHaveBeenCalledWith(
        stripeIds.couponId,
        stripeIds.promotionCodeId,
      );
    });
  });

  describe('updatePromoCode', () => {
    const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    beforeEach(() => {
      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValue(
        existingPromoRow,
      );
    });

    it('rejects empty payload', async () => {
      await expect(service.updatePromoCode(id, {})).rejects.toMatchObject({
        response: expect.objectContaining({
          message: PROMO_NO_FIELDS_TO_UPDATE_MSG,
        }),
      });
    });

    it('returns 404 when promo does not exist', async () => {
      (prisma.promoCode.findFirst as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.updatePromoCode(id, { description: 'x' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: PROMO_CODE_NOT_FOUND_MSG,
        }),
      });
    });

    it('updates description without replacing Stripe coupon', async () => {
      const result = await service.updatePromoCode(id, {
        description: 'Internal note',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe(PROMO_CODE_UPDATED_MSG);
      expect(stripeService.createCouponAndPromotionCode).not.toHaveBeenCalled();
      expect(stripeService.createPromotionCodeForCoupon).not.toHaveBeenCalled();
      expect(prisma.promoCode.update).toHaveBeenCalledWith({
        where: { id },
        data: expect.objectContaining({
          description: 'Internal note',
          code: 'BSP15',
          stripeCouponId: 'co_old',
          stripePromotionCodeId: 'promo_old',
        }),
      });
    });

    it('recreates Stripe coupon when percent discount changes', async () => {
      await service.updatePromoCode(id, { discountValue: 20 });

      expect(stripeService.deactivatePromotionCode).toHaveBeenCalledWith(
        'promo_old',
      );
      expect(stripeService.createCouponAndPromotionCode).toHaveBeenCalled();
      expect(stripeService.deleteCouponAndPromotionCode).toHaveBeenCalledWith(
        'co_old',
        'promo_old',
      );
      expect(prisma.promoCode.update).toHaveBeenCalledWith({
        where: { id },
        data: expect.objectContaining({
          stripeCouponId: 'co_test',
          stripePromotionCodeId: 'promo_test',
        }),
      });
    });

    it('does not pre-deactivate when replacing coupon and the customer code changes', async () => {
      (stripeService.deactivatePromotionCode as jest.Mock).mockClear();
      await service.updatePromoCode(id, { discountValue: 20, code: 'ZEP10' });

      expect(stripeService.deactivatePromotionCode).not.toHaveBeenCalled();
      expect(stripeService.createCouponAndPromotionCode).toHaveBeenCalled();
    });
  });
});
