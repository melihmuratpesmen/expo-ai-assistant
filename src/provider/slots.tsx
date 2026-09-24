import React, { createContext, useContext } from 'react';
import type { TextInputProps } from 'react-native';
import type { AiChatMessage, AiFunctionCall, AiMessageFeedback } from '../types/aiChat';
import type { AiSuggestion } from '../types/aiContext';
import type { ContentBlock } from '../types/contentBlock';

export interface AiAssistantCallbacks {
  onMessageSent?: (text: string, conversationId: string | null) => void;
  onStreamStart?: (conversationId: string | null) => void;
  onStreamEnd?: (conversationId: string | null) => void;
  onError?: (error: string) => void;
  onToolComplete?: (tool: AiFunctionCall) => void;
  onConversationCreated?: (conversationId: string) => void;
  /** An assistant reply finished streaming (final text, tool calls, usage). */
  onMessageComplete?: (message: AiChatMessage) => void;
  /**
   * The user rated a reply (`null` when the rating was cleared). Providing this
   * callback shows 👍 / 👎 actions under assistant messages.
   */
  onFeedback?: (message: AiChatMessage, feedback: AiMessageFeedback | null) => void;
}

export interface AiEmptyStateSlotProps {
  suggestions: AiSuggestion[];
  onSelectSuggestion: (suggestion: AiSuggestion) => void;
}

export interface AiInputSlotProps {
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder?: string;
  isStreaming?: boolean;
  onStop?: () => void;
  /** Surface-specific text input (the bottom sheet passes `BottomSheetTextInput`). */
  TextInputComponent?: React.ComponentType<TextInputProps>;
  /** Initial text, e.g. the message being edited. */
  defaultValue?: string;
  autoFocus?: boolean;
}

export interface AiInputAccessoryProps {
  side: 'left' | 'right';
  isStreaming: boolean;
}

export interface AiToolRendererProps {
  functionCall: AiFunctionCall;
  /** The tool's `frontendData` payload. */
  data: unknown;
}

/** Renders the body of a tool call card for one tool / payload type. */
export type AiToolRenderer = React.ComponentType<AiToolRendererProps>;

export interface AiRenderSlots {
  renderMessage?: (message: AiChatMessage) => React.ReactNode;
  /** Empty conversation state (welcome + suggestions) on every surface. */
  renderEmpty?: (props: AiEmptyStateSlotProps) => React.ReactNode;
  /** Composer on every surface. */
  renderInput?: (props: AiInputSlotProps) => React.ReactNode;
  /** Extra buttons inside the built-in composer (attachments, voice…), on either side of the text field. */
  renderInputAccessory?: (props: AiInputAccessoryProps) => React.ReactNode;
  /** Replaces the whole tool call card. */
  renderFunctionCall?: (functionCall: AiFunctionCall) => React.ReactNode;
  renderContentBlocks?: (blocks: ContentBlock[], trailingText?: string) => React.ReactNode;
  /**
   * Custom bodies for tool call cards, keyed by tool name or by the `type`
   * field of the tool's `frontendData`. Unmatched tools fall back to the
   * built-in table / key-value renderer.
   *
   * @example toolRenderers={{ getWeather: WeatherCard, TEST_RESULT: TestResultCard }}
   */
  toolRenderers?: Record<string, AiToolRenderer>;
}

const CallbacksContext = createContext<AiAssistantCallbacks>({});
const SlotsContext = createContext<AiRenderSlots>({});

export function AiCallbacksProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value?: AiAssistantCallbacks;
}) {
  return <CallbacksContext.Provider value={value ?? {}}>{children}</CallbacksContext.Provider>;
}

export function AiSlotsProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value?: AiRenderSlots;
}) {
  return <SlotsContext.Provider value={value ?? {}}>{children}</SlotsContext.Provider>;
}

export function useAiCallbacks(): AiAssistantCallbacks {
  return useContext(CallbacksContext);
}

export function useAiSlots(): AiRenderSlots {
  return useContext(SlotsContext);
}
