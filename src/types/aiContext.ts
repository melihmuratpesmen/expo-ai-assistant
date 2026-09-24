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
