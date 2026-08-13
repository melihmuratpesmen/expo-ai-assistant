export { AiAssistantProvider, useAiTransport, useAiAssistantConfig } from './provider/AiAssistantProvider';
export type { AiAssistantConfig, AiAssistantProviderProps } from './provider/types';
export type { AiAssistantCallbacks, AiRenderSlots } from './provider/slots';
export { useAiCallbacks, useAiSlots } from './provider/slots';

export { useAiChat } from './hooks/useAiChat';
export type { UseAiChatOptions, UseAiChatResult } from './hooks/useAiChat';
export { useAiConversations } from './hooks/useAiConversations';
export { useScreenBottomKeyboardLift } from './hooks/useScreenBottomKeyboardLift';
export {
  useKeyboardBottomInset,
  chatInputBottomPadding,
} from './hooks/useKeyboardBottomInset';

export {
  createOpenAICompatibleTransport,
  createMockTransport,
  AiHttpError,
  joinUrl,
} from './transport';
export type {
  AiTransport,
  AiTransportStreamHandlers,
  AiTransportStreamParams,
  AiTransportStreamResult,
  AiTransportHistoryResult,
  OpenAICompatibleTransportOptions,
  MockTransportOptions,
} from './transport';

export { AiChatInput } from './components/AiChatInput';
export type { AiChatInputProps } from './components/AiChatInput';
export { AiMessageBubble } from './components/AiMessageBubble';
export { AiMessageContent } from './components/AiMessageContent';
export { AiSuggestionGrid } from './components/AiSuggestionGrid';
export { AiFunctionCallCard } from './components/AiFunctionCallCard';
export { AiFrontendDataRenderer } from './components/AiFrontendDataRenderer';
export { AiDataTable } from './components/AiDataTable';
export { AiText } from './components/AiText';
export { AiTypingIndicator } from './components/AiTypingIndicator';
export { AiMessageActions } from './components/AiMessageActions';
export { AiReasoningBadge } from './components/AiReasoningBadge';
export { AiMarkdownText, isMarkdownRendererAvailable } from './components/AiMarkdownText';
export { copyTextToClipboard } from './lib/clipboard';

export { useAiTheme } from './theme/AiThemeContext';
export { lightTheme, darkTheme } from './theme/defaultTheme';
export type { AiTheme, AiThemeOverride, AiThemeColors } from './theme/types';
export { spacing, radius, fontSize, defaultFontFamily } from './theme/tokens';

export { useAiStrings } from './i18n/AiStringsContext';
export { defaultStrings, mergeStrings } from './i18n/strings';
export type { AiStrings, AiStringsOverride } from './i18n/strings';

export type {
  AiChatMessage,
  AiConversationSummary,
  AiConversation,
  AiFunctionCall,
  AiMessageRole,
  AiMessageStatus,
} from './types/aiChat';
export type { AiSuggestion, AiFabPolicy } from './types/aiContext';
export type { ContentBlock } from './types/contentBlock';
export { normalizeContentBlocks, contentBlocksToPlainString } from './types/contentBlock';

export {
  DEFAULT_SUGGESTIONS,
  SHOW_AI_ACTIONS,
  AI_WELCOME_TITLE,
  AI_WELCOME_SUBTITLE,
  AI_DISCLAIMER,
} from './constants/aiAssistant.constants';
