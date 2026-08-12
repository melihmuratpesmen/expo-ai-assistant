/**
 * Lightweight suggestion model for empty states / follow-ups.
 * Host apps own context; the library does not assume a product domain.
 */
export interface AiSuggestion {
  id: string;
  label: string;
  prompt: string;
  /** Optional Ionicons glyph name. */
  icon?: string;
}

/** Optional FAB visibility hint for host-driven overlays. */
export type AiFabPolicy = 'inherit' | 'show' | 'hide';
