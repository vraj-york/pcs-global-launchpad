/**
 * Shared time-range filter values used across list APIs (UTC window start).
 * Aligns with corporation/company directory `createdFilter` naming.
 */
export const CREATED_DATE_FILTER = [
  'last24Hours',
  'last7Days',
  'last30Days',
  'last3Months',
  'last6Months',
  'lastYear',
] as const;

export type CreatedDateFilter = (typeof CREATED_DATE_FILTER)[number];

/** Alias for assessment admin and other list APIs using `timeFilter`. */
export const TIME_RANGE_FILTER = CREATED_DATE_FILTER;

export type TimeRangeFilter = CreatedDateFilter;

/**
 * Returns the inclusive UTC start instant for a created-date / time-range filter.
 */
export function getCreatedDateFilterStartDate(filter: CreatedDateFilter): Date {
  const now = new Date();
  switch (filter) {
    case 'last24Hours':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'last7Days':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'last30Days':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'last3Months':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'last6Months':
      return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    case 'lastYear':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(0);
  }
}

/** Alias for {@link getCreatedDateFilterStartDate}. */
export function getTimeRangeFilterStartDate(filter: TimeRangeFilter): Date {
  return getCreatedDateFilterStartDate(filter);
}
