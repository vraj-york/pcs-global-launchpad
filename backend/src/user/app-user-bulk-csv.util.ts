import {
  buildKeyContactHeaderIndex,
  parseKeyContactCsvToRows,
} from './app-key-contact-csv.util';
import {
  APP_USER_INVITE_TYPE,
  type AppUserInviteTypeName,
} from './constants/app-user.constants';

export { parseKeyContactCsvToRows as parseAppUserBulkInviteCsvToRows };

/** Same header indexing rules as key contact CSV (trimmed, lowercased keys). */
export function buildAppUserBulkInviteHeaderIndex(
  headers: string[],
): Map<string, number> {
  return buildKeyContactHeaderIndex(headers);
}

export const APP_USER_BULK_CSV_REQUIRED_HEADER_KEYS = [
  'firstname',
  'lastname',
  'email',
  'workphone',
  'timezone',
  'invitetype',
] as const;

export const APP_USER_BULK_CSV_OPTIONAL_HEADER_KEYS = [
  'cellphone',
  'nickname',
  'corporationname',
  'companyname',
  'rolename',
  'categoryname',
] as const;

/**
 * Maps a CSV cell to a stored invite type; accepts case-insensitive values
 * matching {@link APP_USER_INVITE_TYPE}.
 */
export function parseAppUserInviteTypeFromCsvCell(
  raw: string,
): AppUserInviteTypeName | null {
  const t = raw.trim().toLowerCase();
  if (t === APP_USER_INVITE_TYPE.BSP_BLUEPRINT.toLowerCase()) {
    return APP_USER_INVITE_TYPE.BSP_BLUEPRINT;
  }
  if (t === APP_USER_INVITE_TYPE.ASSESSMENT_ONLY.toLowerCase()) {
    return APP_USER_INVITE_TYPE.ASSESSMENT_ONLY;
  }
  return null;
}
