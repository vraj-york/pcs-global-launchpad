import {
  GROWTH_SPARK_DOMINANT_MIND_STATE_LABELS,
  GROWTH_SPARK_MVP_TEAM_CONTEXT,
  GROWTH_SPARK_TEMPLATE_FIRST_NAME_PLACEHOLDER,
  GROWTH_SPARK_TEMPLATE_TEAM_CONTEXT_PLACEHOLDER,
} from './constants/growth-spark.constants';

/**
 * Formats an instant as `YYYY-MM-DD` in the given IANA timezone. Falls back to
 * the UTC calendar date when the timezone is invalid.
 */
function formatSparkDateInTimezone(
  instant: Date,
  timezone?: string | null,
): string {
  const tz = timezone?.trim() || 'UTC';
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(instant);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // fall through to UTC
  }
  return instant.toISOString().slice(0, 10);
}

/**
 * Returns today's Growth Spark calendar date (`YYYY-MM-DD`) in the user's
 * timezone, or UTC when no timezone is provided.
 */
export function resolveSparkDate(timezone?: string | null): string {
  return formatSparkDateInTimezone(new Date(), timezone);
}

/**
 * Returns the Growth Spark calendar date (`YYYY-MM-DD`) for a stored instant
 * interpreted in the user's timezone.
 */
export function resolveSparkDateFromInstant(
  instant: Date,
  timezone?: string | null,
): string {
  return formatSparkDateInTimezone(instant, timezone);
}

/**
 * Maps overall stressful score breakdown fields to the dominant mind-state
 * label used in Growth Spark prompts (`Control`, `Affiliate`, or `Retreat`).
 */
export function resolveDominantMindState(
  scoreBreakdown: Record<string, unknown> | null | undefined,
): string | null {
  if (!scoreBreakdown) {
    return null;
  }

  const cred = Number(scoreBreakdown.cred);
  const cgreen = Number(scoreBreakdown.cgreen);
  const cgrey = Number(scoreBreakdown.cgrey);

  if (![cred, cgreen, cgrey].every(Number.isFinite)) {
    return null;
  }

  if (cred >= cgreen && cred >= cgrey) {
    return GROWTH_SPARK_DOMINANT_MIND_STATE_LABELS.control;
  }
  if (cgreen >= cgrey) {
    return GROWTH_SPARK_DOMINANT_MIND_STATE_LABELS.affiliate;
  }
  return GROWTH_SPARK_DOMINANT_MIND_STATE_LABELS.retreat;
}

/**
 * Returns a trimmed BSP style description capped at `maxLen` characters for
 * LLM context, or `null` when the input is empty.
 */
export function truncateStyleSummary(
  description: string | null | undefined,
  maxLen = 600,
): string | null {
  const trimmed = description?.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length <= maxLen) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

/**
 * Replaces Growth Spark template placeholders for the user's first name and
 * MVP team context copy.
 */
export function substituteGrowthSparkTemplate(
  body: string,
  firstName: string | null | undefined,
): string {
  const name = firstName?.trim() || 'there';
  return body
    .split(GROWTH_SPARK_TEMPLATE_FIRST_NAME_PLACEHOLDER)
    .join(name)
    .split(GROWTH_SPARK_TEMPLATE_TEAM_CONTEXT_PLACEHOLDER)
    .join(GROWTH_SPARK_MVP_TEAM_CONTEXT);
}
