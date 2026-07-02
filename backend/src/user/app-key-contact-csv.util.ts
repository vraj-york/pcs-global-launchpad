/**
 * RFC4180-style CSV parse: quoted fields, embedded commas, CRLF. Cell values
 * are not trimmed; the bulk service trims per field.
 */
export function parseKeyContactCsvToRows(fileContent: string): {
  headers: string[];
  dataRows: string[][];
} {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < fileContent.length; i++) {
    const c = fileContent[i];
    if (inQuotes) {
      if (c === '"') {
        if (fileContent[i + 1] === '"') {
          field += '"';
          i += 1;
          continue;
        }
        inQuotes = false;
        continue;
      }
      field += c;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (c === '\r') {
      continue;
    }
    if (c === '\n') {
      row.push(field);
      if (row.some((cell) => cell.length > 0) || row.length > 1) {
        rows.push(row);
      }
      row = [];
      field = '';
      continue;
    }
    field += c;
  }
  row.push(field);
  if (row.some((cell) => cell.length > 0) || row.length > 1) {
    rows.push(row);
  }
  if (rows.length === 0) {
    return { headers: [], dataRows: [] };
  }
  const [headers, ...dataRows] = rows;
  return { headers, dataRows };
}

/** Map header (trimmed, lowercased) to column index. */
export function buildKeyContactHeaderIndex(
  headers: string[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].trim().toLowerCase();
    if (h && !map.has(h)) {
      map.set(h, i);
    }
  }
  return map;
}

export const KEY_CONTACT_CSV_REQUIRED_HEADER_KEYS = [
  'firstname',
  'lastname',
  'email',
  'workphone',
  'contacttype',
] as const;

export const KEY_CONTACT_CSV_OPTIONAL_HEADER_KEYS = [
  'nickname',
  'timezone',
  'cellphone',
  'jobrole',
  'corporationname',
  'companyname',
] as const;
