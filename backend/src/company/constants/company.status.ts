/** Company setup progress status (stored on company record). */
export const COMPANY_STATUS = {
  INCOMPLETE: 'INCOMPLETE',
  ACTIVE: 'ACTIVE',
  /** Rare in app flows; may exist in DB or future suspend-company feature. */
  SUSPENDED: 'SUSPENDED',
  CLOSED: 'CLOSED',
} as const;
export type CompanyStatus =
  (typeof COMPANY_STATUS)[keyof typeof COMPANY_STATUS];
