import { Test, TestingModule } from '@nestjs/testing';
import { PromoService } from '../promo';
import { StripeService } from '../stripe/stripe.service';
import { AppUserService } from '../user/app-user.service';
import {
  APP_USER_INVITE_TYPE,
  INDIVIDUAL_APP_USER_TYPE,
} from '../user/constants/app-user.constants';
import { IndividualPaymentService } from '../user/individual-payment.service';
import { InviteManagementService } from './invite-management.service';

describe('InviteManagementService', () => {
  let service: InviteManagementService;
  let stripeService: {
    retrieveConfiguredPrice: jest.Mock;
  };
  let promoService: {
    listAvailablePromoCodesForIndividualAssessment: jest.Mock;
  };
  let appUserService: { inviteAppUser: jest.Mock };
  let individualPaymentService: {
    resolveIndividualPricingPlanIdForInvite: jest.Mock;
  };

  beforeEach(async () => {
    stripeService = {
      retrieveConfiguredPrice: jest.fn().mockResolvedValue({
        id: 'price_one_time',
        unit_amount: 19500,
      }),
    };
    promoService = {
      listAvailablePromoCodesForIndividualAssessment: jest
        .fn()
        .mockResolvedValue({
          data: { items: [] },
        }),
    };
    appUserService = {
      inviteAppUser: jest.fn(),
    };
    individualPaymentService = {
      resolveIndividualPricingPlanIdForInvite: jest
        .fn()
        .mockResolvedValue('plan-individual-1'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteManagementService,
        { provide: StripeService, useValue: stripeService },
        { provide: PromoService, useValue: promoService },
        { provide: AppUserService, useValue: appUserService },
        {
          provide: IndividualPaymentService,
          useValue: individualPaymentService,
        },
      ],
    }).compile();

    service = module.get(InviteManagementService);
  });

  it('creates individual Assessment Only invite', async () => {
    appUserService.inviteAppUser.mockResolvedValue({
      success: true,
      message: 'User invited successfully.',
      data: { cognitoSub: 'sub-1' },
    });

    await service.sendAssessmentInvite({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      workPhone: '+1 555-0100',
      timezone: 'UTC',
      hasPromoCode: false,
    });

    expect(stripeService.retrieveConfiguredPrice).toHaveBeenCalledWith(
      'STRIPE_ONE_TIME_PRICE_ID',
      expect.any(String),
    );
    expect(appUserService.inviteAppUser).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteType: APP_USER_INVITE_TYPE.ASSESSMENT_ONLY,
        userType: INDIVIDUAL_APP_USER_TYPE,
        email: 'jane@example.com',
      }),
    );
  });

  it('returns invoice amount from STRIPE_ONE_TIME_PRICE_ID unit_amount', async () => {
    const result = await service.getAssessmentInviteOptions();

    expect(result.data?.invoiceAmount).toBe(195);
    expect(
      promoService.listAvailablePromoCodesForIndividualAssessment,
    ).toHaveBeenCalledWith('price_one_time');
  });
});
