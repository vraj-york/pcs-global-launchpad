import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type PromoDiscountType } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma';
import { ApiResponse, ResponseHelper } from '../common';
import { StripeService } from '../stripe/stripe.service';
import type { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import type {
  ListPromoCodeUsageQueryDto,
  PromoUsageSortBy,
  PromoUsageTimeFilter,
} from './dto/list-promo-code-usage-query.dto';
import type { ListAvailablePromoCodesForSetupQueryDto } from './dto/list-available-promo-codes-for-setup-query.dto';
import type { ListPromoCodesQueryDto } from './dto/list-promo-codes-query.dto';
import type { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import type {
  MergedPromoInput,
  PromoCodeCreatedData,
  PromoCodeDetailData,
  PromoCodeListItemData,
  PromoCodeListStatus,
  PromoCodeRowForUpdate,
  PromoCodeUsageListData,
  PromoCodeUsageListItem,
  PromoCodeValidatedData,
  PromoCodesAvailableForCompanySetupData,
  PromoCodesListData,
} from './promo.types';
import { normalizePromoCodeForStorage } from './promo-code-input.util';
import {
  discountMajorFromRow,
  majorUnitsToMinorUnits,
  minorUnitsToMajorUnits,
} from './promo-money.util';
import {
  PROMO_CODE_CREATED_MSG,
  PROMO_CODE_DELETED_MSG,
  PROMO_CODE_DETAIL_FETCHED_MSG,
  PROMO_CODE_MISSING_STRIPE_PROMOTION_MSG,
  PROMO_CANNOT_ACTIVATE_EXPIRED_MSG,
  PROMO_CODE_NOT_FOUND_MSG,
  PROMO_CODE_PROMOTION_ACTIVE_UPDATED_MSG,
  PROMO_CODE_UPDATED_MSG,
  PROMO_CODE_VALIDATED_MSG,
  PROMO_CODES_AVAILABLE_FOR_SETUP_FETCHED_MSG,
  PROMO_CODES_LIST_FETCHED_MSG,
  PROMO_USAGE_LIST_FETCHED_MSG,
  PROMO_COMPANY_NOT_IN_CORPORATION_MSG,
  PROMO_DISCOUNT_VALUE_WHEN_TYPE_CHANGE_MSG,
  PROMO_DUPLICATE_CODE_MSG,
  PROMO_EXPIRY_IN_PAST_MSG,
  PROMO_INVALID_FIXED_MSG,
  PROMO_INVALID_PERCENT_MSG,
  PROMO_LIMIT_REQUIRES_CORPORATION_MSG,
  PROMO_NO_FIELDS_TO_UPDATE_MSG,
  PROMO_PLAN_NO_STRIPE_PRICES_MSG,
  PROMO_PLAN_TYPE_NOT_FOUND_MSG,
  PROMO_SCHEDULE_NOT_EDITABLE_MSG,
} from './promo.constants';

/* -------------------------------------------------------------------------- */
/* Pure helpers: normalization, dates, merge/diff for PATCH */
/* -------------------------------------------------------------------------- */

/** Parses API date string; `YYYY-MM-DD` is treated as end-of-day UTC for comparison with `now`. */
function parseExpiresAt(input?: string): Date | null {
  if (!input?.trim()) return null;
  const t = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return new Date(`${t}T23:59:59.999Z`);
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException('Invalid expiry date format.');
  }
  return d;
}

/** Overlays PATCH fields onto the current row; omitted DTO keys keep existing values. */
function mergePromoUpdate(
  existing: PromoCodeRowForUpdate,
  dto: UpdatePromoCodeDto,
): MergedPromoInput {
  const discountType = dto.discountType ?? existing.discountType;
  const discountValue = dto.discountValue ?? discountMajorFromRow(existing);

  let expiresAt: Date | null = existing.expiresAt;
  if (dto.expiresAt !== undefined) {
    expiresAt = parseExpiresAt(dto.expiresAt);
  }

  let maxRedemptions = existing.maxRedemptions;
  if (dto.maxRedemptions !== undefined) {
    maxRedemptions = dto.maxRedemptions;
  }

  const limitToAssignment =
    dto.limitToAssignment !== undefined
      ? Boolean(dto.limitToAssignment)
      : existing.limitToAssignment;

  let corporationId: string | null;
  let companyId: string | null;
  if (!limitToAssignment) {
    corporationId = null;
    companyId = null;
  } else {
    corporationId =
      dto.corporationId !== undefined
        ? dto.corporationId.trim() || null
        : existing.corporationId;
    companyId =
      dto.companyId !== undefined
        ? dto.companyId.trim() || null
        : existing.companyId;
  }

  const description =
    dto.description === undefined
      ? existing.description
      : dto.description.trim() === ''
        ? null
        : dto.description.trim();

  return {
    code:
      dto.code !== undefined
        ? normalizePromoCodeForStorage(dto.code)
        : existing.code,
    planTypeId: dto.planTypeId ?? existing.planTypeId,
    description,
    discountType,
    discountValue,
    duration: dto.duration ?? existing.duration,
    expiresAt,
    maxRedemptions,
    limitToAssignment,
    corporationId,
    companyId,
  };
}

/** True when discount shape or duration changed enough to require a new Stripe Coupon (immutable fields). */
function couponTermsDiffer(
  existing: PromoCodeRowForUpdate,
  merged: MergedPromoInput,
): boolean {
  if (existing.duration !== merged.duration) return true;
  if (existing.discountType !== merged.discountType) return true;
  if (merged.discountType === 'percent') {
    return (
      Number(existing.percentOff ?? 0).toFixed(4) !==
      merged.discountValue.toFixed(4)
    );
  }
  const newMinor = majorUnitsToMinorUnits(merged.discountValue, 'usd');
  return (existing.amountOffMinor ?? 0) !== newMinor;
}

/** True when only promotion-code schedule fields differ (can PATCH Stripe without new coupon). */
function promotionScheduleDiffer(
  existing: PromoCodeRowForUpdate,
  merged: MergedPromoInput,
): boolean {
  const ex = existing.expiresAt?.getTime() ?? null;
  const nx = merged.expiresAt?.getTime() ?? null;
  if (ex !== nx) return true;
  return existing.maxRedemptions !== merged.maxRedemptions;
}

/* -------------------------------------------------------------------------- */
/* Usage history + list status: Stripe sessions, in-memory sort, admin labels */
/* -------------------------------------------------------------------------- */

/** True when `expiresAt` is set and not after `Date.now()` (promo treated as schedule-expired). */
function isExpiredBySchedule(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() <= Date.now();
}

/**
 * Lower bound for Stripe Checkout session `created[gte]` when the UI filters usage by relative time.
 * Returns `undefined` for `all` / missing filter so callers can fall back to promo creation time.
 */
function usageOccurredAtLowerBound(
  time?: PromoUsageTimeFilter,
): Date | undefined {
  if (!time || time === 'all') {
    return undefined;
  }
  const now = Date.now();
  const day = 86400000;
  let ms = 0;
  switch (time) {
    case '7d':
      ms = 7 * day;
      break;
    case '30d':
      ms = 30 * day;
      break;
    case '90d':
      ms = 90 * day;
      break;
    case '1y':
      ms = 365 * day;
      break;
    default:
      return undefined;
  }
  return new Date(now - ms);
}

/** Company + parent corporation rows joined for Stripe Checkout `metadata.companyId` enrichment. */
type CompanyForPromoUsageEnrichment = {
  id: string;
  corporationId: string;
  legalName: string;
  country: string;
  deletedAt: Date | null;
  corporation: {
    corporationCode: number;
    legalName: string;
    dataResidencyRegion: string | null;
  };
};

/**
 * Maps a completed Checkout Session to a usage row: buyer display from Stripe customer details,
 * org/company labels from DB when `metadata.companyId` resolves, else those fields stay null.
 */
function mapCheckoutSessionToUsageItem(
  session: Stripe.Checkout.Session,
  companyRow: CompanyForPromoUsageEnrichment | undefined,
): PromoCodeUsageListItem {
  const details = session.customer_details;
  const email =
    details?.email?.trim() ?? session.customer_email?.trim() ?? null;
  let userDisplayName = details?.name?.trim() ?? null;
  if (!userDisplayName && email) {
    userDisplayName = email.split('@')[0] ?? null;
  }

  let corporationName: string | null = null;
  let corporationCodeLabel: string | null = null;
  let companyName: string | null = null;
  let companyRegion: string | null = null;

  if (companyRow?.corporation) {
    const corp = companyRow.corporation;
    // Admin surfaces use registered legal names (`legal_name`), not DBA fallbacks.
    corporationName = corp.legalName.trim();
    corporationCodeLabel = `CORP-${String(corp.corporationCode).padStart(3, '0')}`;
    companyName = companyRow.legalName.trim();
    companyRegion = companyRow.corporation?.dataResidencyRegion ?? null;
  }

  const occurredAtSec = session.created ?? Math.floor(Date.now() / 1000);

  return {
    id: session.id,
    outcome: 'success',
    userDisplayName,
    userEmail: email,
    corporationName,
    corporationCodeLabel,
    companyName,
    companyRegion,
    occurredAt: new Date(occurredAtSec * 1000).toISOString(),
  };
}

/** Comparator for in-memory usage sorting after Stripe sessions are merged (string cols case-insensitive). */
function comparePromoUsageItems(
  a: PromoCodeUsageListItem,
  b: PromoCodeUsageListItem,
  sortBy: PromoUsageSortBy | undefined,
  sortOrder: 'asc' | 'desc',
): number {
  const dir = sortOrder === 'asc' ? 1 : -1;
  const col = sortBy ?? 'occurredAt';
  const str = (v: string | null | undefined) => (v ?? '').toLowerCase();

  switch (col) {
    case 'userDisplayName':
      return str(a.userDisplayName).localeCompare(str(b.userDisplayName)) * dir;
    case 'outcome':
      return str(a.outcome).localeCompare(str(b.outcome)) * dir;
    case 'corporationName':
      return str(a.corporationName).localeCompare(str(b.corporationName)) * dir;
    case 'companyName':
      return str(a.companyName).localeCompare(str(b.companyName)) * dir;
    case 'occurredAt':
    default:
      return (
        (new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()) *
        dir
      );
  }
}

/** Derives admin list/detail status: schedule-expired first, then Stripe-disabled, else active. */
function promoStatusFromStripeAndExpiry(
  stripeActive: boolean,
  expiresAt: Date | null,
): PromoCodeListStatus {
  if (isExpiredBySchedule(expiresAt)) {
    return 'expired';
  }
  if (!stripeActive) {
    return 'inactive';
  }
  return 'active';
}

/** Fixed copy for the promo detail "Basic Info" discount-type control. */
function discountTypeDisplayLabel(dt: PromoDiscountType): string {
  return dt === 'percent' ? '% (Percentage)' : 'Fixed amount (USD)';
}

/** One-line discount text for list and detail (percent as human number; fixed from minor units + currency). */
function formatDiscountSummary(row: {
  discountType: PromoDiscountType;
  percentOff: Prisma.Decimal | null;
  amountOffMinor: number | null;
  currency: string | null;
}): string {
  if (row.discountType === 'percent') {
    return `${Number(row.percentOff ?? 0)}%`;
  }
  const major = minorUnitsToMajorUnits(
    row.amountOffMinor,
    row.currency ?? 'usd',
  );
  const cur = (row.currency ?? 'usd').toUpperCase();
  if (cur === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(major);
  }
  return `${major.toFixed(2)} ${cur}`;
}

/** Super Admin promos: validates input, writes `promo_codes`, and keeps Stripe coupon + promotion code aligned. */
@Injectable()
export class PromoService {
  private readonly logger = new Logger(PromoService.name);

  /** Injects Prisma for `promo_codes` / assignment entities and StripeService for coupons, promos, and usage sessions. */
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Collects Stripe Product IDs for all pricing rows under a plan type by resolving each `stripe_price_id` → Price → Product.
   */
  private async resolveAppliesToProductIdsForPlanType(
    planTypeId: string,
  ): Promise<string[]> {
    const rows = await this.prisma.pricingPlan.findMany({
      where: {
        planTypeId,
        stripePriceId: { not: null },
      },
      select: { stripePriceId: true },
    });
    const priceIds = [
      ...new Set(
        rows
          .map((r) => r.stripePriceId)
          .filter((id): id is string => id != null && id.trim() !== ''),
      ),
    ];
    if (priceIds.length === 0) {
      throw new BadRequestException(PROMO_PLAN_NO_STRIPE_PRICES_MSG);
    }
    const productIds =
      await this.stripeService.resolveProductIdsFromPriceIds(priceIds);
    if (productIds.length === 0) {
      throw new BadRequestException(PROMO_PLAN_NO_STRIPE_PRICES_MSG);
    }
    return productIds;
  }

  /** Maps API `sortBy` / `sortOrder` to a Prisma `orderBy` clause (including composite `discount` sort). */
  private buildPromoListOrderBy(
    sortBy: NonNullable<ListPromoCodesQueryDto['sortBy']>,
    sortOrder: NonNullable<ListPromoCodesQueryDto['sortOrder']>,
  ):
    | Prisma.PromoCodeOrderByWithRelationInput
    | Prisma.PromoCodeOrderByWithRelationInput[] {
    switch (sortBy) {
      case 'code':
        return { code: sortOrder };
      case 'planTypeName':
        return { planType: { name: sortOrder } };
      case 'expiresAt':
        return { expiresAt: sortOrder };
      case 'discountType':
        return { discountType: sortOrder };
      case 'discount':
        return [
          { discountType: sortOrder },
          { percentOff: sortOrder },
          { amountOffMinor: sortOrder },
        ];
      case 'status':
        return [{ stripePromotionActive: sortOrder }, { expiresAt: sortOrder }];
      case 'usageLimit':
        return [
          { timesRedeemedSnapshot: sortOrder },
          { maxRedemptions: sortOrder },
        ];
      case 'createdAt':
      default:
        return { createdAt: sortOrder };
    }
  }

  /**
   * Paginated promo list for the admin home table.
   * Merges each row with Stripe promotion `active` and `times_redeemed` (best-effort per row).
   */
  async listPromoCodes(
    query: ListPromoCodesQueryDto,
  ): Promise<ApiResponse<PromoCodesListData>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const now = new Date();
    const andParts: Prisma.PromoCodeWhereInput[] = [{ deletedAt: null }];

    if (query.status === 'active') {
      andParts.push({
        stripePromotionActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      });
    } else if (query.status === 'inactive') {
      andParts.push({
        stripePromotionActive: false,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      });
    } else if (query.status === 'expired') {
      andParts.push({ expiresAt: { lt: now } });
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      andParts.push({
        OR: [
          { code: { contains: s, mode: 'insensitive' } },
          { description: { contains: s, mode: 'insensitive' } },
        ],
      });
    }

    if (query.planTypeId?.trim()) {
      andParts.push({ planTypeId: query.planTypeId.trim() });
    }

    if (query.discountType) {
      andParts.push({ discountType: query.discountType });
    }

    if (query.createdAfter) {
      const d = new Date(query.createdAfter);
      if (!Number.isNaN(d.getTime())) {
        andParts.push({ createdAt: { gte: d } });
      }
    }

    const where: Prisma.PromoCodeWhereInput =
      andParts.length === 1 ? andParts[0] : { AND: andParts };

    const orderBy = this.buildPromoListOrderBy(sortBy, sortOrder);

    const [total, rows] = await Promise.all([
      this.prisma.promoCode.count({ where }),
      this.prisma.promoCode.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          code: true,
          description: true,
          planTypeId: true,
          discountType: true,
          percentOff: true,
          amountOffMinor: true,
          currency: true,
          duration: true,
          expiresAt: true,
          maxRedemptions: true,
          createdAt: true,
          stripePromotionCodeId: true,
          planType: { select: { name: true } },
        },
      }),
    ]);

    const defaultSummary = {
      active: true,
      timesRedeemed: 0,
      maxRedemptions: null as number | null,
    };

    const summaries = await Promise.all(
      rows.map(async (r) => {
        try {
          return await this.stripeService.retrievePromotionCodeSummary(
            r.stripePromotionCodeId,
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(
            `Stripe promotion summary failed for promo ${r.id}: ${msg}`,
          );
          return { ...defaultSummary };
        }
      }),
    );

    await Promise.all(
      rows.map((r, i) => {
        const s = summaries[i] ?? defaultSummary;
        return this.prisma.promoCode.update({
          where: { id: r.id },
          data: {
            stripePromotionActive: s.active,
            timesRedeemedSnapshot: s.timesRedeemed,
          },
        });
      }),
    );

    const items: PromoCodeListItemData[] = rows.map((r, i) => {
      const s = summaries[i] ?? defaultSummary;
      return {
        id: r.id,
        code: r.code,
        description: r.description,
        planTypeId: r.planTypeId,
        planTypeName: r.planType.name,
        discountType: r.discountType,
        discountSummary: formatDiscountSummary(r),
        duration: r.duration,
        expiresAt: r.expiresAt?.toISOString() ?? null,
        maxRedemptions: r.maxRedemptions,
        timesRedeemed: s.timesRedeemed,
        status: promoStatusFromStripeAndExpiry(s.active, r.expiresAt),
        createdAt: r.createdAt.toISOString(),
      };
    });

    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

    return ResponseHelper.success(PROMO_CODES_LIST_FETCHED_MSG, {
      items,
      pagination: {
        total,
        page,
        pageSize: limit,
        totalPages,
      },
    });
  }

  /**
   * Non-paginated list of promos redeemable when configuring a company (Add Company → Plan & Seats).
   * Uses DB mirrors of Stripe state (`stripePromotionActive`, redemption snapshots); excludes
   * soft-deleted rows, schedule-expired promos, company-scoped rows, and exhausted redemptions.
   */
  async listAvailablePromoCodesForCompanySetup(
    query: ListAvailablePromoCodesForSetupQueryDto,
  ): Promise<ApiResponse<PromoCodesAvailableForCompanySetupData>> {
    const now = new Date();
    const corpId = query.corporationId?.trim();

    const assignmentOr: Prisma.PromoCodeWhereInput[] = [
      { limitToAssignment: false },
    ];
    if (corpId) {
      assignmentOr.push({
        limitToAssignment: true,
        corporationId: corpId,
        companyId: null,
      });
    }

    const andParts: Prisma.PromoCodeWhereInput[] = [
      { deletedAt: null },
      { stripePromotionActive: true },
      { stripePromotionCodeId: { not: '' } },
      {
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      { companyId: null },
      { OR: assignmentOr },
    ];

    if (query.planTypeId?.trim()) {
      andParts.push({ planTypeId: query.planTypeId.trim() });
    }

    const where: Prisma.PromoCodeWhereInput =
      andParts.length === 1 ? andParts[0] : { AND: andParts };

    const rows = await this.prisma.promoCode.findMany({
      where,
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        planTypeId: true,
        discountType: true,
        percentOff: true,
        amountOffMinor: true,
        currency: true,
        maxRedemptions: true,
        timesRedeemedSnapshot: true,
      },
    });

    const eligible = rows.filter((r) => {
      if (r.maxRedemptions == null) return true;
      return r.timesRedeemedSnapshot < r.maxRedemptions;
    });

    const items = eligible.map((r) => ({
      id: r.id,
      code: r.code,
      planTypeId: r.planTypeId,
      discountType: r.discountType as 'percent' | 'fixed_amount',
      discountValue: discountMajorFromRow(r),
      currency: r.currency,
    }));

    return ResponseHelper.success(PROMO_CODES_AVAILABLE_FOR_SETUP_FETCHED_MSG, {
      items,
    });
  }

  /**
   * Promos redeemable for the Individual Assessment (`one_time`) Stripe product behind
   * `STRIPE_ONE_TIME_PRICE_ID`. Filters by plan type, availability, and coupon `applies_to.products`.
   */
  async listAvailablePromoCodesForIndividualAssessment(
    stripePriceId: string,
  ): Promise<ApiResponse<PromoCodesAvailableForCompanySetupData>> {
    const trimmedPriceId = stripePriceId?.trim();
    if (!trimmedPriceId) {
      throw new BadRequestException(PROMO_PLAN_NO_STRIPE_PRICES_MSG);
    }

    const productIds = await this.stripeService.resolveProductIdsFromPriceIds([
      trimmedPriceId,
    ]);
    const productId = productIds[0];
    if (!productId) {
      throw new BadRequestException(PROMO_PLAN_NO_STRIPE_PRICES_MSG);
    }

    const now = new Date();
    const rows = await this.prisma.promoCode.findMany({
      where: {
        deletedAt: null,
        stripePromotionActive: true,
        stripePromotionCodeId: { not: '' },
        planTypeId: 'one_time',
        companyId: null,
        limitToAssignment: false,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        planTypeId: true,
        discountType: true,
        percentOff: true,
        amountOffMinor: true,
        currency: true,
        maxRedemptions: true,
        timesRedeemedSnapshot: true,
        stripeCouponId: true,
      },
    });

    const redemptionEligible = rows.filter((r) => {
      if (r.maxRedemptions == null) return true;
      return r.timesRedeemedSnapshot < r.maxRedemptions;
    });

    const items: PromoCodesAvailableForCompanySetupData['items'] = [];
    for (const row of redemptionEligible) {
      const applies = await this.stripeService.couponAppliesToProduct(
        row.stripeCouponId,
        productId,
      );
      if (!applies) {
        continue;
      }
      items.push({
        id: row.id,
        code: row.code,
        planTypeId: row.planTypeId,
        discountType: row.discountType as 'percent' | 'fixed_amount',
        discountValue: discountMajorFromRow(row),
        currency: row.currency,
      });
    }

    return ResponseHelper.success(PROMO_CODES_AVAILABLE_FOR_SETUP_FETCHED_MSG, {
      items,
    });
  }

  /**
   * Enables or disables the Stripe promotion code while keeping the coupon row intact.
   * Super Admin authorization is enforced at the controller (guards); this method validates row state.
   */
  async setPromoStripePromotionActive(
    id: string,
    active: boolean,
  ): Promise<ApiResponse<PromoCodeCreatedData>> {
    const row = await this.prisma.promoCode.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        code: true,
        stripePromotionCodeId: true,
        expiresAt: true,
      },
    });
    if (!row) {
      throw new NotFoundException(PROMO_CODE_NOT_FOUND_MSG);
    }
    if (active && isExpiredBySchedule(row.expiresAt)) {
      throw new BadRequestException(PROMO_CANNOT_ACTIVATE_EXPIRED_MSG);
    }
    const promotionId = row.stripePromotionCodeId?.trim();
    if (!promotionId) {
      throw new BadRequestException(PROMO_CODE_MISSING_STRIPE_PROMOTION_MSG);
    }
    await this.stripeService.setPromotionCodeActiveState(promotionId, active);
    await this.prisma.promoCode.update({
      where: { id: row.id },
      data: { stripePromotionActive: active },
    });
    return ResponseHelper.success(PROMO_CODE_PROMOTION_ACTIVE_UPDATED_MSG, {
      id: row.id,
      code: row.code,
    });
  }

  /**
   * Usage history for the Usage History tab: derived on the fly from Stripe Checkout
   * Sessions (completed subscription checkouts that applied this promotion code), then
   * enriched from `corporation_companies` using session `metadata.companyId`.
   */
  async listPromoCodeUsage(
    promoCodeId: string,
    query: ListPromoCodeUsageQueryDto,
  ): Promise<ApiResponse<PromoCodeUsageListData>> {
    const row = await this.prisma.promoCode.findFirst({
      where: { id: promoCodeId, deletedAt: null },
      select: {
        id: true,
        stripePromotionCodeId: true,
        createdAt: true,
      },
    });
    if (!row) {
      throw new NotFoundException(PROMO_CODE_NOT_FOUND_MSG);
    }

    const promotionId = row.stripePromotionCodeId?.trim();
    if (!promotionId) {
      throw new BadRequestException(PROMO_CODE_MISSING_STRIPE_PROMOTION_MSG);
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const tMin = usageOccurredAtLowerBound(query.time);
    const promoCreatedSec = Math.floor(row.createdAt.getTime() / 1000);
    const createdGte =
      tMin != null ? Math.floor(tMin.getTime() / 1000) : promoCreatedSec;

    const sessions =
      await this.stripeService.listCompletedCheckoutSessionsForPromotionCode({
        stripePromotionCodeId: promotionId,
        createdGte,
      });

    const companyIds = new Set<string>();
    for (const s of sessions) {
      const cid = s.metadata?.companyId?.trim();
      if (cid) {
        companyIds.add(cid);
      }
    }

    // Join only columns needed for table columns, search text, and corp/company filter dropdowns.
    const companies =
      companyIds.size === 0
        ? []
        : await this.prisma.corporationCompany.findMany({
            where: { id: { in: [...companyIds] } },
            select: {
              id: true,
              corporationId: true,
              legalName: true,
              country: true,
              deletedAt: true,
              corporation: {
                select: {
                  corporationCode: true,
                  legalName: true,
                  dataResidencyRegion: true,
                },
              },
            },
          });

    const companyMap = new Map(
      companies.map((c) => [c.id, c as CompanyForPromoUsageEnrichment]),
    );

    const sessionCompanyBySessionId = new Map<
      string,
      CompanyForPromoUsageEnrichment | undefined
    >();
    for (const session of sessions) {
      const cid = session.metadata?.companyId?.trim();
      sessionCompanyBySessionId.set(
        session.id,
        cid ? companyMap.get(cid) : undefined,
      );
    }

    let allItems: PromoCodeUsageListItem[] = sessions.map((session) =>
      mapCheckoutSessionToUsageItem(
        session,
        sessionCompanyBySessionId.get(session.id),
      ),
    );

    if (query.outcome === 'failed') {
      allItems = [];
    } else if (query.outcome === 'success') {
      allItems = allItems.filter((r) => r.outcome === 'success');
    }

    const filterCorporations = new Map<string, string>();
    const filterCompanies = new Map<string, string>();
    for (const co of sessionCompanyBySessionId.values()) {
      if (co?.corporation) {
        filterCorporations.set(
          co.corporationId,
          co.corporation.legalName.trim(),
        );
        filterCompanies.set(co.id, co.legalName.trim());
      }
    }

    const filterOptions = {
      corporations: [...filterCorporations.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      companies: [...filterCompanies.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };

    if (query.corporationId) {
      allItems = allItems.filter((item) => {
        const co = sessionCompanyBySessionId.get(item.id);
        return co?.corporationId === query.corporationId;
      });
    }
    if (query.companyId) {
      allItems = allItems.filter((item) => {
        const co = sessionCompanyBySessionId.get(item.id);
        return co?.id === query.companyId;
      });
    }

    const search = query.search?.trim().toLowerCase();
    if (search) {
      allItems = allItems.filter((item) => {
        const hay = [
          item.userDisplayName,
          item.userEmail,
          item.corporationName,
          item.corporationCodeLabel,
          item.companyName,
          item.companyRegion,
        ]
          .map((x) => (x ?? '').toLowerCase())
          .join(' ');
        return hay.includes(search);
      });
    }

    const sortCol = query.sortBy ?? 'occurredAt';
    const sortDir =
      query.sortOrder ?? (sortCol === 'occurredAt' ? 'desc' : 'asc');
    allItems.sort((a, b) => comparePromoUsageItems(a, b, sortCol, sortDir));

    const total = allItems.length;
    const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
    const start = (page - 1) * pageSize;
    const items = allItems.slice(start, start + pageSize);

    return ResponseHelper.success(PROMO_USAGE_LIST_FETCHED_MSG, {
      items,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
      },
      filterOptions,
    });
  }

  /**
   * Single promo for detail view: explicit `select` keeps the read narrow (detail fields + assignment
   * `legal_name` only), then Stripe promotion `active` / redemption counts.
   */
  async getPromoCodeById(
    id: string,
  ): Promise<ApiResponse<PromoCodeDetailData>> {
    const row = await this.prisma.promoCode.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        code: true,
        description: true,
        planTypeId: true,
        discountType: true,
        percentOff: true,
        amountOffMinor: true,
        currency: true,
        duration: true,
        expiresAt: true,
        maxRedemptions: true,
        createdAt: true,
        limitToAssignment: true,
        corporationId: true,
        companyId: true,
        stripePromotionCodeId: true,
        planType: { select: { name: true } },
        corporation: { select: { legalName: true } },
        company: { select: { legalName: true } },
      },
    });
    if (!row) {
      throw new NotFoundException(PROMO_CODE_NOT_FOUND_MSG);
    }

    const stripeSummary = await this.stripeService.retrievePromotionCodeSummary(
      row.stripePromotionCodeId,
    );

    const status = promoStatusFromStripeAndExpiry(
      stripeSummary.active,
      row.expiresAt,
    );

    const data: PromoCodeDetailData = {
      id: row.id,
      code: row.code,
      description: row.description,
      planTypeId: row.planTypeId,
      planTypeName: row.planType.name,
      discountTypeDisplay: discountTypeDisplayLabel(row.discountType),
      discountSummary: formatDiscountSummary(row),
      duration: row.duration,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      maxRedemptions: row.maxRedemptions,
      status,
      createdAt: row.createdAt.toISOString(),
      discountType: row.discountType,
      discountValue: discountMajorFromRow(row),
      currency: row.currency,
      limitToAssignment: row.limitToAssignment,
      corporationId: row.corporationId,
      corporationDisplayName: row.corporation
        ? row.corporation.legalName.trim()
        : null,
      companyId: row.companyId,
      companyDisplayName: row.company ? row.company.legalName.trim() : null,
      stripePromotionCodeActive: stripeSummary.active,
      timesRedeemed: stripeSummary.timesRedeemed,
    };

    return ResponseHelper.success(PROMO_CODE_DETAIL_FETCHED_MSG, data);
  }

  /**
   * Shared create-path validation: assignment, discount math, duplicate code, and Stripe product scope.
   * Does not create Stripe coupons or DB rows.
   */
  private async preparePromoCreate(dto: CreatePromoCodeDto): Promise<{
    normalizedCode: string;
    expiresAt: Date | null;
    description: string | null;
    planTypeId: string;
    limitToAssignment: boolean;
    corporationId: string | null;
    companyId: string | null;
    percentOff: number | undefined;
    amountOffMinor: number | undefined;
    currency: string | null;
    appliesToProductIds: string[];
  }> {
    const normalizedCode = normalizePromoCodeForStorage(dto.code);
    const expiresAt = parseExpiresAt(dto.expiresAt);
    const now = new Date();
    if (expiresAt && expiresAt.getTime() <= now.getTime()) {
      throw new BadRequestException(PROMO_EXPIRY_IN_PAST_MSG);
    }

    const planType = await this.prisma.planType.findUnique({
      where: { id: dto.planTypeId },
      select: { id: true },
    });
    if (!planType) {
      throw new BadRequestException(PROMO_PLAN_TYPE_NOT_FOUND_MSG);
    }

    const limitToAssignment = Boolean(dto.limitToAssignment);
    let corporationId: string | null = dto.corporationId?.trim() ?? null;
    let companyId: string | null = dto.companyId?.trim() ?? null;

    if (!limitToAssignment) {
      corporationId = null;
      companyId = null;
    } else {
      if (!corporationId) {
        throw new BadRequestException(PROMO_LIMIT_REQUIRES_CORPORATION_MSG);
      }
      const corporation = await this.prisma.corporation.findUnique({
        where: { id: corporationId },
        select: { id: true },
      });
      if (!corporation) {
        throw new NotFoundException('Corporation not found.');
      }
      if (companyId) {
        const company = await this.prisma.corporationCompany.findFirst({
          where: {
            id: companyId,
            corporationId,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (!company) {
          throw new BadRequestException(PROMO_COMPANY_NOT_IN_CORPORATION_MSG);
        }
      }
    }

    const currency = 'usd';

    let percentOff: number | undefined;
    let amountOffMinor: number | undefined;

    if (dto.discountType === 'percent') {
      if (dto.discountValue > 100 || dto.discountValue < 0.01) {
        throw new BadRequestException(PROMO_INVALID_PERCENT_MSG);
      }
      percentOff = Number(dto.discountValue.toFixed(4));
    } else {
      if (dto.discountValue <= 0) {
        throw new BadRequestException(PROMO_INVALID_FIXED_MSG);
      }
      amountOffMinor = majorUnitsToMinorUnits(dto.discountValue, currency);
      if (amountOffMinor < 1) {
        throw new BadRequestException(PROMO_INVALID_FIXED_MSG);
      }
    }

    const description =
      dto.description != null && dto.description.trim() !== ''
        ? dto.description.trim()
        : null;

    const duplicate = await this.prisma.promoCode.findFirst({
      where: { code: normalizedCode },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(PROMO_DUPLICATE_CODE_MSG);
    }

    const appliesToProductIds =
      await this.resolveAppliesToProductIdsForPlanType(dto.planTypeId);

    return {
      normalizedCode,
      expiresAt,
      description,
      planTypeId: dto.planTypeId,
      limitToAssignment,
      corporationId,
      companyId,
      percentOff,
      amountOffMinor,
      currency: dto.discountType === 'fixed_amount' ? currency : null,
      appliesToProductIds,
    };
  }

  /** Validates create payload and Stripe plan linkage without creating coupons or persisting. */
  async validatePromoCodeCreate(
    dto: CreatePromoCodeDto,
  ): Promise<ApiResponse<PromoCodeValidatedData>> {
    await this.preparePromoCreate(dto);
    return ResponseHelper.success(PROMO_CODE_VALIDATED_MSG, { valid: true });
  }

  /** Validates merged PATCH payload (same checks as update) without Stripe writes or DB updates. */
  async validatePromoCodeUpdate(
    id: string,
    dto: UpdatePromoCodeDto,
  ): Promise<ApiResponse<PromoCodeValidatedData>> {
    const definedKeys = Object.keys(dto).filter(
      (key) => (dto as Record<string, unknown>)[key] !== undefined,
    );
    if (definedKeys.length === 0) {
      throw new BadRequestException(PROMO_NO_FIELDS_TO_UPDATE_MSG);
    }

    const existing = await this.prisma.promoCode.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException(PROMO_CODE_NOT_FOUND_MSG);
    }

    if (
      dto.discountType !== undefined &&
      dto.discountType !== existing.discountType &&
      dto.discountValue === undefined
    ) {
      throw new BadRequestException(PROMO_DISCOUNT_VALUE_WHEN_TYPE_CHANGE_MSG);
    }

    if (dto.expiresAt !== undefined && !dto.expiresAt.trim()) {
      throw new BadRequestException(
        'Removing expiry is not supported for synced promo codes.',
      );
    }

    const merged = mergePromoUpdate(existing, dto);

    if (promotionScheduleDiffer(existing, merged)) {
      throw new BadRequestException(PROMO_SCHEDULE_NOT_EDITABLE_MSG);
    }

    const now = new Date();
    if (merged.expiresAt && merged.expiresAt.getTime() <= now.getTime()) {
      throw new BadRequestException(PROMO_EXPIRY_IN_PAST_MSG);
    }

    const planType = await this.prisma.planType.findUnique({
      where: { id: merged.planTypeId },
      select: { id: true },
    });
    if (!planType) {
      throw new BadRequestException(PROMO_PLAN_TYPE_NOT_FOUND_MSG);
    }

    if (merged.limitToAssignment) {
      if (!merged.corporationId) {
        throw new BadRequestException(PROMO_LIMIT_REQUIRES_CORPORATION_MSG);
      }
      const corporation = await this.prisma.corporation.findUnique({
        where: { id: merged.corporationId },
        select: { id: true },
      });
      if (!corporation) {
        throw new NotFoundException('Corporation not found.');
      }
      if (merged.companyId) {
        const company = await this.prisma.corporationCompany.findFirst({
          where: {
            id: merged.companyId,
            corporationId: merged.corporationId,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (!company) {
          throw new BadRequestException(PROMO_COMPANY_NOT_IN_CORPORATION_MSG);
        }
      }
    }

    const currency = 'usd';
    if (merged.discountType === 'percent') {
      if (merged.discountValue > 100 || merged.discountValue < 0.01) {
        throw new BadRequestException(PROMO_INVALID_PERCENT_MSG);
      }
    } else {
      if (merged.discountValue <= 0) {
        throw new BadRequestException(PROMO_INVALID_FIXED_MSG);
      }
      const minor = majorUnitsToMinorUnits(merged.discountValue, currency);
      if (minor < 1) {
        throw new BadRequestException(PROMO_INVALID_FIXED_MSG);
      }
    }

    if (couponTermsDiffer(existing, merged)) {
      await this.resolveAppliesToProductIdsForPlanType(merged.planTypeId);
    }

    if (merged.code !== existing.code) {
      const other = await this.prisma.promoCode.findFirst({
        where: { code: merged.code, id: { not: id } },
        select: { id: true },
      });
      if (other) {
        throw new ConflictException(PROMO_DUPLICATE_CODE_MSG);
      }
    }

    return ResponseHelper.success(PROMO_CODE_VALIDATED_MSG, { valid: true });
  }

  /**
   * Validates plan type and optional corp/company assignment, creates Stripe coupon + promotion code first,
   * then persists `promo_codes` (rolls back Stripe on duplicate or DB failure after Stripe success).
   */
  async createPromoCode(
    dto: CreatePromoCodeDto,
  ): Promise<ApiResponse<PromoCodeCreatedData>> {
    const prepared = await this.preparePromoCreate(dto);

    let couponId: string | null = null;
    let promotionCodeId: string | null = null;

    try {
      // Order: Stripe first so we never persist IDs without a live coupon+promo pair.
      const stripeIds = await this.stripeService.createCouponAndPromotionCode({
        code: prepared.normalizedCode,
        discountType: dto.discountType,
        percentOff: prepared.percentOff,
        amountOffMinor: prepared.amountOffMinor,
        currency:
          dto.discountType === 'fixed_amount'
            ? (prepared.currency ?? undefined)
            : undefined,
        duration: dto.duration,
        expiresAt: prepared.expiresAt,
        maxRedemptions: dto.maxRedemptions ?? null,
        appliesToProductIds: prepared.appliesToProductIds,
      });
      couponId = stripeIds.couponId;
      promotionCodeId = stripeIds.promotionCodeId;

      const row = await this.prisma.promoCode.create({
        data: {
          code: prepared.normalizedCode,
          description: prepared.description,
          planTypeId: prepared.planTypeId,
          discountType: dto.discountType,
          percentOff:
            prepared.percentOff != null
              ? new Prisma.Decimal(prepared.percentOff)
              : null,
          amountOffMinor: prepared.amountOffMinor ?? null,
          currency:
            dto.discountType === 'fixed_amount' ? prepared.currency : null,
          duration: dto.duration,
          expiresAt: prepared.expiresAt,
          maxRedemptions: dto.maxRedemptions ?? null,
          limitToAssignment: prepared.limitToAssignment,
          corporationId: prepared.corporationId,
          companyId: prepared.companyId,
          stripeCouponId: stripeIds.couponId,
          stripePromotionCodeId: stripeIds.promotionCodeId,
          stripePromotionActive: true,
          timesRedeemedSnapshot: 0,
        },
      });

      return ResponseHelper.success(PROMO_CODE_CREATED_MSG, {
        id: row.id,
        code: prepared.normalizedCode,
      });
    } catch (e) {
      // Roll back Stripe if DB failed after coupon+promo were created.
      if (couponId && promotionCodeId) {
        await this.stripeService.deleteCouponAndPromotionCode(
          couponId,
          promotionCodeId,
        );
      }
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(PROMO_DUPLICATE_CODE_MSG);
      }
      if (e instanceof Stripe.errors.StripeInvalidRequestError) {
        const m = (e.message ?? '').toLowerCase();
        if (
          e.code === 'resource_already_exists' ||
          m.includes('already') ||
          m.includes('duplicate')
        ) {
          throw new ConflictException(PROMO_DUPLICATE_CODE_MSG);
        }
      }
      throw e;
    }
  }

  /**
   * Partial update: merges DTO onto row, re-validates, then applies the smallest Stripe change
   * (schedule-only PATCH, new promotion code for rename, or full coupon replace when discount/duration change).
   */
  async updatePromoCode(
    id: string,
    dto: UpdatePromoCodeDto,
  ): Promise<ApiResponse<PromoCodeCreatedData>> {
    const definedKeys = Object.keys(dto).filter(
      (key) => (dto as Record<string, unknown>)[key] !== undefined,
    );
    if (definedKeys.length === 0) {
      throw new BadRequestException(PROMO_NO_FIELDS_TO_UPDATE_MSG);
    }

    const existing = await this.prisma.promoCode.findFirst({
      where: { id, deletedAt: null },
      select: {
        code: true,
        description: true,
        planTypeId: true,
        discountType: true,
        percentOff: true,
        amountOffMinor: true,
        currency: true,
        duration: true,
        expiresAt: true,
        maxRedemptions: true,
        limitToAssignment: true,
        corporationId: true,
        companyId: true,
        stripeCouponId: true,
        stripePromotionCodeId: true,
      },
    });
    if (!existing) {
      throw new NotFoundException(PROMO_CODE_NOT_FOUND_MSG);
    }

    if (
      dto.discountType !== undefined &&
      dto.discountType !== existing.discountType &&
      dto.discountValue === undefined
    ) {
      throw new BadRequestException(PROMO_DISCOUNT_VALUE_WHEN_TYPE_CHANGE_MSG);
    }

    if (dto.expiresAt !== undefined && !dto.expiresAt.trim()) {
      throw new BadRequestException(
        'Removing expiry is not supported for synced promo codes.',
      );
    }

    const merged = mergePromoUpdate(existing, dto);

    if (promotionScheduleDiffer(existing, merged)) {
      throw new BadRequestException(PROMO_SCHEDULE_NOT_EDITABLE_MSG);
    }

    const now = new Date();
    if (merged.expiresAt && merged.expiresAt.getTime() <= now.getTime()) {
      throw new BadRequestException(PROMO_EXPIRY_IN_PAST_MSG);
    }

    const planType = await this.prisma.planType.findUnique({
      where: { id: merged.planTypeId },
      select: { id: true },
    });
    if (!planType) {
      throw new BadRequestException(PROMO_PLAN_TYPE_NOT_FOUND_MSG);
    }

    if (merged.limitToAssignment) {
      if (!merged.corporationId) {
        throw new BadRequestException(PROMO_LIMIT_REQUIRES_CORPORATION_MSG);
      }
      const corporation = await this.prisma.corporation.findUnique({
        where: { id: merged.corporationId },
        select: { id: true },
      });
      if (!corporation) {
        throw new NotFoundException('Corporation not found.');
      }
      if (merged.companyId) {
        const company = await this.prisma.corporationCompany.findFirst({
          where: {
            id: merged.companyId,
            corporationId: merged.corporationId,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (!company) {
          throw new BadRequestException(PROMO_COMPANY_NOT_IN_CORPORATION_MSG);
        }
      }
    }

    const currency = 'usd';
    let percentOff: number | undefined;
    let amountOffMinor: number | undefined;
    if (merged.discountType === 'percent') {
      if (merged.discountValue > 100 || merged.discountValue < 0.01) {
        throw new BadRequestException(PROMO_INVALID_PERCENT_MSG);
      }
      percentOff = Number(merged.discountValue.toFixed(4));
    } else {
      if (merged.discountValue <= 0) {
        throw new BadRequestException(PROMO_INVALID_FIXED_MSG);
      }
      amountOffMinor = majorUnitsToMinorUnits(merged.discountValue, currency);
      if (amountOffMinor < 1) {
        throw new BadRequestException(PROMO_INVALID_FIXED_MSG);
      }
    }

    const replaceCoupon = couponTermsDiffer(existing, merged);
    const codeChanged = merged.code !== existing.code;

    // Stripe targets for this request (default: unchanged until a branch runs).
    let nextCouponId = existing.stripeCouponId;
    let nextPromotionId = existing.stripePromotionCodeId;
    let newPairForCleanup: {
      couponId: string;
      promotionCodeId: string;
    } | null = null;
    let orphanNewPromotionId: string | null = null;
    let oldPromotionToDeactivate: string | null = null;
    /** When set, we deactivated this promotion before creating a replacement with the same code; roll back on failure until DB update succeeds. */
    let sameCodeReplaceEarlyDeactivatedPromotionId: string | null = null;

    try {
      if (replaceCoupon) {
        // New coupon (discount/duration immutable on Stripe); product scope follows merged plan type.
        const appliesToProductIds =
          await this.resolveAppliesToProductIdsForPlanType(merged.planTypeId);
        // Stripe rejects creating a promotion `code` that is still active on another promotion in the account.
        // Reuse the same customer-facing string only after the old promotion is inactive.
        if (merged.code === existing.code) {
          await this.stripeService.deactivatePromotionCode(
            existing.stripePromotionCodeId,
          );
          sameCodeReplaceEarlyDeactivatedPromotionId =
            existing.stripePromotionCodeId;
        }
        const stripeIds = await this.stripeService.createCouponAndPromotionCode(
          {
            code: merged.code,
            discountType: merged.discountType,
            percentOff,
            amountOffMinor,
            currency:
              merged.discountType === 'fixed_amount' ? currency : undefined,
            duration: merged.duration,
            expiresAt: merged.expiresAt,
            maxRedemptions: merged.maxRedemptions,
            appliesToProductIds,
          },
        );
        newPairForCleanup = stripeIds;
        nextCouponId = stripeIds.couponId;
        nextPromotionId = stripeIds.promotionCodeId;
      } else if (codeChanged) {
        // Same coupon, new customer-facing code; old promotion deactivated only after DB succeeds.
        const { promotionCodeId } =
          await this.stripeService.createPromotionCodeForCoupon({
            couponId: existing.stripeCouponId,
            code: merged.code,
            expiresAt: merged.expiresAt,
            maxRedemptions: merged.maxRedemptions,
          });
        nextPromotionId = promotionCodeId;
        orphanNewPromotionId = promotionCodeId;
        oldPromotionToDeactivate = existing.stripePromotionCodeId;
      }
      // Note: schedule-only changes (expiry / max redemptions) are not supported
      // and are rejected earlier by the PROMO_SCHEDULE_NOT_EDITABLE_MSG guard,
      // because Stripe's promotion-code update endpoint does not accept those fields.

      const row = await this.prisma.promoCode.update({
        where: { id },
        data: {
          code: merged.code,
          description: merged.description,
          planTypeId: merged.planTypeId,
          discountType: merged.discountType,
          percentOff:
            percentOff != null ? new Prisma.Decimal(percentOff) : null,
          amountOffMinor: amountOffMinor ?? null,
          currency: merged.discountType === 'fixed_amount' ? currency : null,
          duration: merged.duration,
          expiresAt: merged.expiresAt,
          maxRedemptions: merged.maxRedemptions,
          limitToAssignment: merged.limitToAssignment,
          corporationId: merged.corporationId,
          companyId: merged.companyId,
          stripeCouponId: nextCouponId,
          stripePromotionCodeId: nextPromotionId,
        },
      });
      sameCodeReplaceEarlyDeactivatedPromotionId = null;

      if (replaceCoupon) {
        // Remove previous Stripe objects only after the row points at the new pair.
        await this.stripeService.deleteCouponAndPromotionCode(
          existing.stripeCouponId,
          existing.stripePromotionCodeId,
        );
      }
      if (oldPromotionToDeactivate) {
        await this.stripeService.deactivatePromotionCode(
          oldPromotionToDeactivate,
        );
        orphanNewPromotionId = null;
      }

      return ResponseHelper.success(PROMO_CODE_UPDATED_MSG, {
        id: row.id,
        code: merged.code,
      });
    } catch (e) {
      // Undo partial Stripe work so we do not leave duplicate or orphan codes.
      if (newPairForCleanup) {
        await this.stripeService.deleteCouponAndPromotionCode(
          newPairForCleanup.couponId,
          newPairForCleanup.promotionCodeId,
        );
      }
      if (sameCodeReplaceEarlyDeactivatedPromotionId) {
        try {
          await this.stripeService.setPromotionCodeActiveState(
            sameCodeReplaceEarlyDeactivatedPromotionId,
            true,
          );
        } catch (reactivateErr) {
          const msg =
            reactivateErr instanceof Error
              ? reactivateErr.message
              : String(reactivateErr);
          this.logger.warn(
            `Failed to reactivate Stripe promotion ${sameCodeReplaceEarlyDeactivatedPromotionId} after failed update: ${msg}`,
          );
        }
      }
      if (orphanNewPromotionId) {
        await this.stripeService.deactivatePromotionCode(orphanNewPromotionId);
      }
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(PROMO_DUPLICATE_CODE_MSG);
      }
      if (e instanceof Stripe.errors.StripeInvalidRequestError) {
        const m = (e.message ?? '').toLowerCase();
        if (
          e.code === 'resource_already_exists' ||
          m.includes('already') ||
          m.includes('duplicate')
        ) {
          throw new ConflictException(PROMO_DUPLICATE_CODE_MSG);
        }
      }
      throw e;
    }
  }

  /**
   * Soft-deletes a promo: removes Stripe coupon + deactivates promotion, sets `deletedAt`.
   */
  async softDeletePromoCode(
    id: string,
  ): Promise<ApiResponse<PromoCodeCreatedData>> {
    const row = await this.prisma.promoCode.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        code: true,
        stripeCouponId: true,
        stripePromotionCodeId: true,
      },
    });
    if (!row) {
      throw new NotFoundException(PROMO_CODE_NOT_FOUND_MSG);
    }
    const couponId = row.stripeCouponId?.trim();
    const promotionId = row.stripePromotionCodeId?.trim();
    if (!couponId || !promotionId) {
      throw new BadRequestException(PROMO_CODE_MISSING_STRIPE_PROMOTION_MSG);
    }
    await this.stripeService.deleteCouponAndPromotionCode(
      couponId,
      promotionId,
    );
    await this.prisma.promoCode.update({
      where: { id: row.id },
      data: {
        deletedAt: new Date(),
        stripePromotionActive: false,
        timesRedeemedSnapshot: 0,
      },
    });
    return ResponseHelper.success(PROMO_CODE_DELETED_MSG, {
      id: row.id,
      code: row.code,
    });
  }
}
