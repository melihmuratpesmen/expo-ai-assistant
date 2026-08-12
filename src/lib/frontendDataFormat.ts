/** Generic helpers for rendering structured tool / table payloads. */

export const AI_DATA_TABLE_PAGE_SIZE = 10;
export const AI_DATA_TABLE_MAX_COLUMNS = 6;

const HIDDEN_AI_TABLE_COLUMN_KEYS = new Set(['id', '_id']);

const normalizeTableColumnKey = (key: string): string =>
  key.toLowerCase().replace(/_/g, '');

export function isHiddenAiTableColumn(key: string): boolean {
  return HIDDEN_AI_TABLE_COLUMN_KEYS.has(normalizeTableColumnKey(key));
}

export function formatColumnLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

export function toDisplayString(value: unknown, fallback = '-'): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value) ?? fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function formatCellValue(value: unknown, _key: string): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    if (value.every(item => typeof item === 'string' || typeof item === 'number')) {
      return value.join(', ');
    }
    return `${value.length} items`;
  }
  return toDisplayString(value);
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getTypedFrontendDataType(data: unknown): string | null {
  if (!isPlainRecord(data) || typeof data.type !== 'string') return null;
  return data.type;
}
