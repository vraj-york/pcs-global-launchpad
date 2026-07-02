import type { PromoDiscountTerms } from '../promo/promo.types';

export type PromoDiscountLookup = Map<string, PromoDiscountTerms>;

export type OnsiteTrainingOption = 'off' | '1_day' | '2_days';

export const ONSITE_TRAINING_OPTIONS = new Set<OnsiteTrainingOption>([
  'off',
  '1_day',
  '2_days',
]);

/** Shape loaded for {@link CompanyAdminPortalService.getOnboardingReview} (minimal columns). */
export type CompanyWithRelations = {
  id: string;
  corporationId: string;
  subscriptionStatus: string | null;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  legalName: string;
  dbaName: string | null;
  website: string | null;
  companyType: string;
  officeType: string;
  industry: string;
  phoneNo: string | null;
  planId: string | null;
  corporation: {
    legalName: string;
    ownershipType: string;
    dataResidencyRegion: string;
  };
  plan: {
    id: string;
    planTypeId: string;
    stripePriceId: string | null;
    customerType: string;
    employeeRangeMin: number | null;
    employeeRangeMax: number | null;
    price: { toString(): string };
    planType: { name: string };
  } | null;
  planSeat: {
    zeroTrial: boolean;
    trialLengthDuration: number;
    trialStartDate: Date | null;
    trialEndDate: Date | null;
    autoConvertTrial: boolean;
    planPrice: { toString(): string };
    discount: { toString(): string };
    onsiteTrainingOption: string;
    invoiceAmount: { toString(): string };
    billingCurrency: string;
    checkoutPromoCode: string | null;
  } | null;
};
