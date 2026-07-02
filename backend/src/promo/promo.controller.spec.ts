import {
  BadRequestException,
  type ArgumentMetadata,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationGuard, CognitoAuthGuard, SuperAdminGuard } from '../auth';
import type { ListPromoCodeUsageQueryDto } from './dto/list-promo-code-usage-query.dto';
import type { ListPromoCodesQueryDto } from './dto/list-promo-codes-query.dto';
import { PromoController } from './promo.controller';
import { PromoService } from './promo.service';
import {
  PROMO_CODE_CREATED_MSG,
  PROMO_CODE_DETAIL_FETCHED_MSG,
  PROMO_CODE_PROMOTION_ACTIVE_UPDATED_MSG,
  PROMO_CODE_UPDATED_MSG,
  PROMO_CODES_AVAILABLE_FOR_SETUP_FETCHED_MSG,
  PROMO_CODES_LIST_FETCHED_MSG,
  PROMO_USAGE_LIST_FETCHED_MSG,
} from './promo.constants';
import type { ListAvailablePromoCodesForSetupQueryDto } from './dto/list-available-promo-codes-for-setup-query.dto';
import type { CreatePromoCodeDto } from './dto/create-promo-code.dto';

describe('PromoController', () => {
  let controller: PromoController;
  let promoService: jest.Mocked<
    Pick<
      PromoService,
      | 'createPromoCode'
      | 'updatePromoCode'
      | 'listPromoCodes'
      | 'listAvailablePromoCodesForCompanySetup'
      | 'listPromoCodeUsage'
      | 'getPromoCodeById'
      | 'setPromoStripePromotionActive'
    >
  >;

  const dto: CreatePromoCodeDto = {
    code: 'BSP20',
    planTypeId: 'monthly',
    discountType: 'percent',
    discountValue: 20,
    duration: 'once',
  };

  beforeEach(async () => {
    const mockPromoService = {
      createPromoCode: jest.fn(),
      updatePromoCode: jest.fn(),
      listPromoCodes: jest.fn(),
      listAvailablePromoCodesForCompanySetup: jest.fn(),
      listPromoCodeUsage: jest.fn(),
      getPromoCodeById: jest.fn(),
      setPromoStripePromotionActive: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromoController],
      providers: [{ provide: PromoService, useValue: mockPromoService }],
    })
      .overrideGuard(CognitoAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthorizationGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SuperAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PromoController);
    promoService = module.get(PromoService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('returns service list result with query', async () => {
      const query: ListPromoCodesQueryDto = { page: 2, limit: 15 };
      const apiResponse = {
        success: true,
        message: PROMO_CODES_LIST_FETCHED_MSG,
        data: {
          items: [],
          pagination: { total: 0, page: 2, pageSize: 15, totalPages: 0 },
        },
      };
      (promoService.listPromoCodes as jest.Mock).mockResolvedValue(apiResponse);

      const result = await controller.list(query);

      expect(promoService.listPromoCodes).toHaveBeenCalledWith(query);
      expect(result).toEqual(apiResponse);
    });

    it('rethrows when listPromoCodes fails', async () => {
      const err = new Error('Database unavailable');
      (promoService.listPromoCodes as jest.Mock).mockRejectedValue(err);

      await expect(
        controller.list({} as ListPromoCodesQueryDto),
      ).rejects.toThrow('Database unavailable');
    });
  });

  describe('listAvailableForCompanySetup', () => {
    it('returns service result with query', async () => {
      const query: ListAvailablePromoCodesForSetupQueryDto = {
        planTypeId: 'annual',
        corporationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      };
      const apiResponse = {
        success: true,
        message: PROMO_CODES_AVAILABLE_FOR_SETUP_FETCHED_MSG,
        data: { items: [] },
      };
      (
        promoService.listAvailablePromoCodesForCompanySetup as jest.Mock
      ).mockResolvedValue(apiResponse);

      const result = await controller.listAvailableForCompanySetup(query);

      expect(
        promoService.listAvailablePromoCodesForCompanySetup,
      ).toHaveBeenCalledWith(query);
      expect(result).toEqual(apiResponse);
    });

    it('rethrows when listAvailablePromoCodesForCompanySetup fails', async () => {
      const err = new Error('db down');
      (
        promoService.listAvailablePromoCodesForCompanySetup as jest.Mock
      ).mockRejectedValue(err);

      await expect(
        controller.listAvailableForCompanySetup(
          {} as ListAvailablePromoCodesForSetupQueryDto,
        ),
      ).rejects.toThrow('db down');
    });
  });

  describe('listUsage', () => {
    const promoId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    it('returns service usage list with query', async () => {
      const query: ListPromoCodeUsageQueryDto = { page: 1, pageSize: 10 };
      const apiResponse = {
        success: true,
        message: PROMO_USAGE_LIST_FETCHED_MSG,
        data: {
          items: [],
          pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
          filterOptions: { corporations: [], companies: [] },
        },
      };
      (promoService.listPromoCodeUsage as jest.Mock).mockResolvedValue(
        apiResponse,
      );

      const result = await controller.listUsage(promoId, query);

      expect(promoService.listPromoCodeUsage).toHaveBeenCalledWith(
        promoId,
        query,
      );
      expect(result).toEqual(apiResponse);
    });
  });

  describe('getById', () => {
    const promoId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    it('returns service detail result', async () => {
      const apiResponse = {
        success: true,
        message: PROMO_CODE_DETAIL_FETCHED_MSG,
        data: { id: promoId, code: 'BSP20' },
      };
      (promoService.getPromoCodeById as jest.Mock).mockResolvedValue(
        apiResponse,
      );

      const result = await controller.getById(promoId);

      expect(promoService.getPromoCodeById).toHaveBeenCalledWith(promoId);
      expect(result).toEqual(apiResponse);
    });

    it('rethrows when getPromoCodeById fails', async () => {
      const err = new Error('Lookup failed');
      (promoService.getPromoCodeById as jest.Mock).mockRejectedValue(err);

      await expect(
        controller.getById('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      ).rejects.toThrow('Lookup failed');
    });
  });

  describe('create', () => {
    it('returns service result on success', async () => {
      const apiResponse = {
        success: true,
        message: PROMO_CODE_CREATED_MSG,
        data: { id: 'promo-id', code: 'BSP20' },
      };
      (promoService.createPromoCode as jest.Mock).mockResolvedValue(
        apiResponse,
      );

      const result = await controller.create(dto);

      expect(promoService.createPromoCode).toHaveBeenCalledWith(dto);
      expect(result).toEqual(apiResponse);
    });

    it('rethrows when service throws', async () => {
      const err = new Error('Stripe unavailable');
      (promoService.createPromoCode as jest.Mock).mockRejectedValue(err);

      await expect(controller.create(dto)).rejects.toThrow(
        'Stripe unavailable',
      );
    });
  });

  describe('setPromotionActive', () => {
    const promoId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    it('returns service result', async () => {
      const apiResponse = {
        success: true,
        message: PROMO_CODE_PROMOTION_ACTIVE_UPDATED_MSG,
        data: { id: promoId, code: 'BSP20' },
      };
      (
        promoService.setPromoStripePromotionActive as jest.Mock
      ).mockResolvedValue(apiResponse);

      const result = await controller.setPromotionActive(promoId, {
        active: false,
      });

      expect(promoService.setPromoStripePromotionActive).toHaveBeenCalledWith(
        promoId,
        false,
      );
      expect(result).toEqual(apiResponse);
    });

    it('rethrows when setPromoStripePromotionActive fails', async () => {
      const err = new Error('Stripe rejected the update');
      (
        promoService.setPromoStripePromotionActive as jest.Mock
      ).mockRejectedValue(err);

      await expect(
        controller.setPromotionActive('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', {
          active: true,
        }),
      ).rejects.toThrow('Stripe rejected the update');
    });
  });

  describe('update', () => {
    const promoId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    it('returns service result on success', async () => {
      const apiResponse = {
        success: true,
        message: PROMO_CODE_UPDATED_MSG,
        data: { id: promoId, code: 'BSP20' },
      };
      (promoService.updatePromoCode as jest.Mock).mockResolvedValue(
        apiResponse,
      );

      const result = await controller.update(promoId, { description: 'Note' });

      expect(promoService.updatePromoCode).toHaveBeenCalledWith(promoId, {
        description: 'Note',
      });
      expect(result).toEqual(apiResponse);
    });
  });

  describe('ParseUUIDPipe (promo id path params)', () => {
    const pipe = new ParseUUIDPipe({ version: '4' });
    const paramMeta: ArgumentMetadata = {
      type: 'param',
      metatype: String,
      data: 'id',
    };

    it('rejects a malformed UUID before the handler runs', async () => {
      await expect(pipe.transform('not-a-uuid', paramMeta)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
