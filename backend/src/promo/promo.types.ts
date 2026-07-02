import type { Prisma, PromoCode, PromoDiscountType } from '@prisma/client';

/** Stored promo row fields used to compute a checkout discount amount. */
export type PromoDiscountTerms = {
  discountType: PromoDiscountType;
  percentOff: Prisma.Decimal | null;
  amountOffMinor: number | null;
  currency: string | null;
};

/** Payload returned when a promo code is created or updated successfully. */
export type PromoCodeCreatedData = {
  id: string;
  code: string;
};

/** Super Admin validate-before-save (no Stripe coupon / DB row created). */
export type PromoCodeValidatedData = { valid: true };

export type PromoCodeListStatus = 'active' | 'inactive' | 'expired';

export type PromoCodesListPagination = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PromoCodesListData = {
  items: PromoCodeListItemData[];
  pagination: PromoCodesListPagination;
};

/** Minimal promo row for Add Company Plan & Seats dropdown (Super Admin). */
export type PromoCodeAvailableForCompanySetupItem = {
  id: string;
  code: string;
  planTypeId: string;
  discountType: 'percent' | 'fixed_amount';
  /** Percent 0–100 when discountType is percent; major currency units when fixed_amount. */
  discountValue: number;
  currency: string | null;
};

export type PromoCodesAvailableForCompanySetupData = {
  items: PromoCodeAvailableForCompanySetupItem[];
};

/** Row for promo management list (includes Stripe promotion summary per row). */
export type PromoCodeListItemData = {
  id: string;
  code: string;
  description: string | null;
  planTypeId: string;
  planTypeName: string;
  discountType: 'percent' | 'fixed_amount';
  discountSummary: string;
  duration: 'once' | 'forever';
  expiresAt: string | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  status: PromoCodeListStatus;
  createdAt: string;
};

export type PromoCodeDetailStatus = PromoCodeListStatus;

/** Full promo detail for the admin view screen (includes Stripe promotion state). */
export type PromoCodeDetailData = Omit<PromoCodeListItemData, 'status'> & {
  status: PromoCodeDetailStatus;
  /** Human-readable discount type for the Basic Info panel. */
  discountTypeDisplay: string;
  discountValue: number;
  currency: string | null;
  limitToAssignment: boolean;
  corporationId: string | null;
  corporationDisplayName: string | null;
  companyId: string | null;
  companyDisplayName: string | null;
  stripePromotionCodeActive: boolean;
};

export type PromoCodeUsageListItem = {
  id: string;
  outcome: 'success' | 'failed';
  userDisplayName: string | null;
  userEmail: string | null;
  corporationName: string | null;
  corporationCodeLabel: string | null;
  companyName: string | null;
  companyRegion: string | null;
  occurredAt: string;
};

export type PromoCodeUsageFilterOption = {
  id: string;
  name: string;
};

export type PromoCodeUsageListData = {
  items: PromoCodeUsageListItem[];
  pagination: PromoCodesListPagination;
  filterOptions: {
    corporations: PromoCodeUsageFilterOption[];
    companies: PromoCodeUsageFilterOption[];
  };
};

/** Columns loaded for `updatePromoCode` merge and Stripe diff (avoid fetching the full row). */
export type PromoCodeRowForUpdate = Pick<
  PromoCode,
  | 'code'
  | 'description'
  | 'planTypeId'
  | 'discountType'
  | 'percentOff'
  | 'amountOffMinor'
  | 'currency'
  | 'duration'
  | 'expiresAt'
  | 'maxRedemptions'
  | 'limitToAssignment'
  | 'corporationId'
  | 'companyId'
  | 'stripeCouponId'
  | 'stripePromotionCodeId'
>;

/** Merged state after applying a partial `UpdatePromoCodeDto` onto an existing `PromoCode` row. */
export type MergedPromoInput = {
  code: string;
  planTypeId: string;
  description: string | null;
  discountType: 'percent' | 'fixed_amount';
  discountValue: number;
  duration: 'once' | 'forever';
  expiresAt: Date | null;
  maxRedemptions: number | null;
  limitToAssignment: boolean;
  corporationId: string | null;
  companyId: string | null;
};
