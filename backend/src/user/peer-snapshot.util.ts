/**
 * Returns the first sentence/statement from a BSP style description.
 * Splits on `.`, `!`, or `?` when followed by whitespace or end of string.
 */
export function truncateToFirstStatement(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^[\s\S]*?[.!?](?=\s|$)/);
  if (match) {
    return match[0].trim();
  }

  return trimmed;
}
