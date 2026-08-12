/**
 * Structured content blocks for rich assistant messages.
 * Backend-agnostic — map your provider payloads into these shapes.
 */

export type ContentBlock =
  | TextBlock
  | TableBlock
  | ListBlock
  | CodeBlock
  | HeadingBlock
  | DividerBlock
  | BlockquoteBlock
  | AlertBlock
  | MetricBlock;

export interface TextBlock {
  type: 'text';
  content: string;
}

export interface TableBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export interface ListBlock {
  type: 'list';
  items: string[];
  ordered: boolean;
}

export interface CodeBlock {
  type: 'code';
  content: string;
  language?: string;
}

export interface HeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  content: string;
}

export interface DividerBlock {
  type: 'divider';
}

export interface BlockquoteBlock {
  type: 'blockquote';
  content: string;
}

export interface AlertBlock {
  type: 'alert';
  variant: 'info' | 'warning' | 'success' | 'error';
  content: string;
}

export interface MetricBlock {
  type: 'metric';
  label: string;
  value: string;
  description?: string;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => (item == null ? '' : String(item)));
}

function asStringMatrix(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];
  return value.map(row =>
    Array.isArray(row) ? row.map(cell => (cell == null ? '' : String(cell))) : []
  );
}

function asHeadingLevel(value: unknown): 1 | 2 | 3 | 4 | 5 | 6 {
  const n = typeof value === 'number' ? value : Number(value);
  if (n >= 1 && n <= 6) return n as 1 | 2 | 3 | 4 | 5 | 6;
  return 2;
}

function asAlertVariant(value: unknown): AlertBlock['variant'] {
  if (value === 'info' || value === 'warning' || value === 'success' || value === 'error') {
    return value;
  }
  return 'info';
}

/** Normalize loose provider block payloads into typed ContentBlock[]. */
export function normalizeContentBlocks(raw: unknown[] | null | undefined): ContentBlock[] | undefined {
  if (!raw?.length) return undefined;

  const blocks: ContentBlock[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const block = item as Record<string, unknown>;
    const type = typeof block.type === 'string' ? block.type : '';

    switch (type) {
      case 'text':
        if (typeof block.content === 'string' && block.content.length > 0) {
          blocks.push({ type: 'text', content: block.content });
        }
        break;
      case 'table': {
        const headers = asStringArray(block.headers);
        const rows = asStringMatrix(block.rows);
        if (headers.length > 0 || rows.length > 0) {
          blocks.push({ type: 'table', headers, rows });
        }
        break;
      }
      case 'list': {
        const items = asStringArray(block.items);
        if (items.length > 0) {
          blocks.push({
            type: 'list',
            items,
            ordered: Boolean(block.ordered),
          });
        }
        break;
      }
      case 'code':
        if (typeof block.content === 'string') {
          blocks.push({
            type: 'code',
            content: block.content,
            language: typeof block.language === 'string' ? block.language : undefined,
          });
        }
        break;
      case 'heading':
        if (typeof block.content === 'string') {
          blocks.push({
            type: 'heading',
            level: asHeadingLevel(block.level),
            content: block.content,
          });
        }
        break;
      case 'divider':
        blocks.push({ type: 'divider' });
        break;
      case 'blockquote':
        if (typeof block.content === 'string') {
          blocks.push({ type: 'blockquote', content: block.content });
        }
        break;
      case 'alert':
        if (typeof block.content === 'string') {
          blocks.push({
            type: 'alert',
            variant: asAlertVariant(block.variant),
            content: block.content,
          });
        }
        break;
      case 'metric':
        if (typeof block.label === 'string' && typeof block.value === 'string') {
          blocks.push({
            type: 'metric',
            label: block.label,
            value: block.value,
            description: typeof block.description === 'string' ? block.description : undefined,
          });
        }
        break;
      default:
        if (typeof block.content === 'string' && block.content.length > 0) {
          blocks.push({ type: 'text', content: block.content });
        }
        break;
    }
  }

  return blocks.length > 0 ? blocks : undefined;
}

export function contentBlocksToPlainString(blocks: ContentBlock[]): string {
  return blocks
    .map(block => {
      switch (block.type) {
        case 'text':
        case 'blockquote':
        case 'alert':
        case 'code':
        case 'heading':
          return block.content;
        case 'list':
          return block.items
            .map((item, i) => (block.ordered ? `${i + 1}. ${item}` : `• ${item}`))
            .join('\n');
        case 'table': {
          const header = block.headers.join(' | ');
          const rows = block.rows.map(r => r.join(' | ')).join('\n');
          return [header, rows].filter(Boolean).join('\n');
        }
        case 'metric':
          return `${block.label}: ${block.value}${block.description ? ` (${block.description})` : ''}`;
        case 'divider':
          return '---';
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n\n');
}
