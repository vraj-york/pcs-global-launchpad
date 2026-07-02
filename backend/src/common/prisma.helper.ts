/**
 * Type guard to check if error is a Prisma unique constraint violation
 */
export function isPrismaUniqueConstraintError(
  error: unknown,
): error is { code: string; meta?: { target?: string[] } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    (error as { code: string }).code === 'P2002'
  );
}
