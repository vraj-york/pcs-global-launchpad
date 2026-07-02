import type { BulkInviteAppUserFailedItem } from './dto/bulk-invite-app-users.dto';

/**
 * RFC4180-style escaping for a single CSV field (quotes, commas, newlines).
 */
export function escapeBulkInviteCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Builds a UTF-8 CSV of failed invite rows (`row` = 1-based file line; `email`; `message`).
 */
export function buildBulkInviteFailedRowsCsvBuffer(
  failed: readonly BulkInviteAppUserFailedItem[],
): Buffer {
  const lines: string[] = ['row,email,message'];
  for (const f of failed) {
    lines.push(
      [
        String(f.rowIndex),
        escapeBulkInviteCsvField(f.email),
        escapeBulkInviteCsvField(f.message),
      ].join(','),
    );
  }
  return Buffer.from(lines.join('\n'), 'utf-8');
}
