import { BadRequestException } from '@nestjs/common';
import {
  PROMO_CODE_INVALID_CHARSET_MSG,
  PROMO_CODE_INVALID_LENGTH_MSG,
} from './promo.constants';

const PROMO_CODE_NORMALIZED_RE = /^[A-Z0-9]([A-Z0-9_-]*[A-Z0-9])?$/;

function assertNormalizedPromoCodeShape(s: string): string {
  if (s.length < 2 || s.length > 50) {
    throw new BadRequestException(PROMO_CODE_INVALID_LENGTH_MSG);
  }
  if (!PROMO_CODE_NORMALIZED_RE.test(s)) {
    throw new BadRequestException(PROMO_CODE_INVALID_CHARSET_MSG);
  }
  return s;
}

/**
 * Normalizes and validates a non-empty promo code string (Super Admin storage rules).
 * Used when creating/updating promos and when resolving an explicit checkout code.
 */
export function normalizePromoCodeForStorage(raw: string): string {
  const s = raw.trim().toUpperCase().replace(/\s+/g, '');
  return assertNormalizedPromoCodeShape(s);
}

/**
 * For optional checkout/API fields: returns `undefined` when absent or blank after normalization.
 * Otherwise returns the same normalized string as {@link normalizePromoCodeForStorage}.
 */
export function normalizeOptionalPromoCodeInput(
  raw: string | undefined | null,
): string | undefined {
  if (raw == null) {
    return undefined;
  }
  const s = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (!s) {
    return undefined;
  }
  return assertNormalizedPromoCodeShape(s);
}
