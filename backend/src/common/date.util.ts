import { BadRequestException } from '@nestjs/common';

/**
 * First instant of the current calendar month in UTC (00:00:00.000 on day 1).
 * Use as the inclusive lower bound for “new this month” counts so results stay
 * stable regardless of the server’s local timezone.
 */
export function startOfCurrentUtcMonth(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Parses an ISO date string to a {@link Date} for DB date columns (e.g. Prisma `@db.Date`).
 * Throws {@link BadRequestException} if the value is blank or not a valid date.
 */
export function parseRequiredDateString(
  value: string,
  fieldName: string,
): Date {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new BadRequestException(
      `${fieldName} is required and cannot be empty`,
    );
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid date`);
  }
  return d;
}

/**
 * Formats a date as MM-DD-YYYY (en-US short format with dashes).
 */
export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
    .format(typeof date === 'string' ? new Date(date) : date)
    .replace(/\//g, '-');
}

/**
 * Formats a date as MM-DD-YYYY with time in en-US 12-hour form (UTC), e.g. `05-18-2026, 10:30 AM`.
 */
export function formatDateTimeShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(d);
  return `${formatDateShort(d)}, ${time}`;
}
