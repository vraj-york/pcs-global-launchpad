/**
 * Formats a date as MM-DD-YYYY using UTC calendar components.
 */
export function formatUsDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const y = d.getUTCFullYear();
  return `${m}-${day}-${y}`;
}

export function formatEmployeeRange(
  min: number | null,
  max: number | null,
): string | null {
  if (min == null || max == null) return null;
  return `${min}-${max} employees`;
}

/** Plan tier label; aligns with frontend `formatPlanEmployeeRange`. */
export function formatPlanEmployeeRange(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  if (min != null && max != null) {
    return `${min}-${max} employees`;
  }
  if (min != null) {
    return `${min}+ employees`;
  }
  return 'Custom';
}

export function decimalToString(
  value: { toString(): string } | null | undefined,
): string {
  if (value == null) return '0';
  return value.toString();
}
