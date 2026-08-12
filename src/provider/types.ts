import type { ReactNode } from 'react';
import type { AiTransport } from '../transport/types';
import type { OpenAICompatibleTransportOptions } from '../transport/openaiCompatible';
import type { AiAssistantCallbacks, AiRenderSlots } from './slots';
import type { AiStringsOverride } from '../i18n/strings';
import type { AiThemeOverride } from '../theme/types';

/**
 * Library configuration.
 *
 * Prefer passing a `transport` (custom or `createOpenAICompatibleTransport`).
 * The `openai` shorthand builds the default public OpenAI-compatible transport.
 */
export interface AiAssistantConfig {
  /** Fully custom backend. Takes precedence over `openai`. */
  transport?: AiTransport;
  /**
   * Shortcut for the default OpenAI-compatible Chat Completions transport.
   * Ignored when `transport` is provided.
   */
  openai?: OpenAICompatibleTransportOptions;
}

export interface AiAssistantProviderProps {
  children: ReactNode;
  config: AiAssistantConfig;
  theme?: AiThemeOverride;
  colorScheme?: 'light' | 'dark';
  /** Override UI copy (English defaults). */
  strings?: AiStringsOverride;
  /** Lifecycle hooks for analytics / logging. */
  callbacks?: AiAssistantCallbacks;
  /** Replace built-in UI pieces. */
  slots?: AiRenderSlots;
}
