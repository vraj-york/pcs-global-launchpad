/**
 * Calendar time filters for invite-management listing (`invitedOn` window, UTC).
 */
export const INVITE_MANAGEMENT_TIME_FILTER = [
  'thisWeek',
  'lastWeek',
  'thisMonth',
  'lastMonth',
] as const;

export type InviteManagementTimeFilter =
  (typeof INVITE_MANAGEMENT_TIME_FILTER)[number];

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** ISO week start (Monday) at 00:00:00.000 UTC. */
function startOfUtcWeek(date: Date): Date {
  const day = date.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const start = startOfUtcDay(date);
  start.setUTCDate(start.getUTCDate() - daysFromMonday);
  return start;
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * Returns inclusive UTC bounds for invite `invitedOn` filtering.
 */
export function getInviteManagementTimeFilterRange(
  filter: InviteManagementTimeFilter,
  now: Date = new Date(),
): { gte: Date; lte: Date } {
  switch (filter) {
    case 'thisWeek': {
      return { gte: startOfUtcWeek(now), lte: now };
    }
    case 'lastWeek': {
      const thisWeekStart = startOfUtcWeek(now);
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);
      const lastWeekEnd = new Date(thisWeekStart.getTime() - 1);
      return { gte: lastWeekStart, lte: lastWeekEnd };
    }
    case 'thisMonth': {
      return { gte: startOfUtcMonth(now), lte: now };
    }
    case 'lastMonth': {
      const thisMonthStart = startOfUtcMonth(now);
      const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);
      const lastMonthStart = startOfUtcMonth(lastMonthEnd);
      return { gte: lastMonthStart, lte: lastMonthEnd };
    }
    default: {
      return { gte: new Date(0), lte: now };
    }
  }
}
