/**
 * Ownership type of the company relative to the parent corporation.
 * Used in Step 1: Basic Info (Parent Corporation section).
 */
export const OWNERSHIP_TYPES = [
  'Wholly Owned',
  'Majority',
  'Affiliate',
  'Franchise',
] as const;
export type OwnershipType = (typeof OWNERSHIP_TYPES)[number];

/**
 * Company type (Operating Company, Subsidiary, Franchise, Division).
 */
export const COMPANY_TYPES = [
  'Operating Company',
  'Subsidiary',
  'Franchise',
  'Division',
] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

/**
 * Office type (HQ, Regional, Field, Virtual).
 */
export const OFFICE_TYPES = ['HQ', 'Regional', 'Field', 'Virtual'] as const;
export type OfficeType = (typeof OFFICE_TYPES)[number];

/**
 * Company-scoped app key contact `contact_type` values (stored on `app_key_contacts`).
 */
export const COMPANY_KEY_CONTACT_TYPES = [
  'finance_billing_contact',
  'technical_it_lead',
  'implementation_lead',
  'hr_program_owner',
] as const;
export type CompanyKeyContactType = (typeof COMPANY_KEY_CONTACT_TYPES)[number];

/** Re-export phone validation constants from common (single source of truth). */
export {
  PHONE_REGEX,
  PHONE_MIN_DIGITS,
} from '../../common/validators/phone.constants';
