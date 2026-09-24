export { AiAssistantProvider, useAiTransport } from './provider/AiAssistantProvider';
export type { AiAssistantConfig, AiAssistantProviderProps } from './provider/types';
export type {
  AiAssistantCallbacks,
  AiRenderSlots,
  AiEmptyStateSlotProps,
  AiInputSlotProps,
  AiToolRenderer,
  AiToolRendererProps,
} from './provider/slots';
export { useAiCallbacks, useAiSlots } from './provider/slots';

export { AiChatController, toTransportHistory } from './core/AiChatController';
export type { AiChatState, AiChatControllerOptions } from './core/AiChatController';
export {
  useAiChat,
  useAiChatController,
  useAiChatState,
  useAiChatSelector,
  useAiChatFromController,
} from './hooks/useAiChat';
export type { UseAiChatOptions, UseAiChatResult } from './hooks/useAiChat';
export { useAiConversations } from './hooks/useAiConversations';
export type { UseAiConversationsResult } from './hooks/useAiConversations';
export { useScreenBottomKeyboardLift } from './hooks/useScreenBottomKeyboardLift';

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
export type { AiMessageBubbleProps } from './components/AiMessageBubble';
export { AiMessageList } from './components/AiMessageList';
export type { AiMessageListProps, AiMessageListHandle } from './components/AiMessageList';
export { AiConversationView } from './components/AiConversationView';
export type { AiConversationViewProps } from './components/AiConversationView';
export { AiChatFooter, AiComposer } from './components/AiChatFooter';
export type { AiChatFooterProps } from './components/AiChatFooter';
export { AiEmptyState } from './components/AiEmptyState';
export type { AiEmptyStateProps } from './components/AiEmptyState';
export { AiMessageContent } from './components/AiMessageContent';
export { AiSuggestionGrid } from './components/AiSuggestionGrid';
export { AiFunctionCallCard } from './components/AiFunctionCallCard';
export type { AiFunctionCallCardProps } from './components/AiFunctionCallCard';
export { AiFrontendDataRenderer } from './components/AiFrontendDataRenderer';
export type { AiFrontendDataRendererProps } from './components/AiFrontendDataRenderer';
export { AiDataTable } from './components/AiDataTable';
export { AiText } from './components/AiText';
export { AiTypingIndicator } from './components/AiTypingIndicator';
export { AiMessageActions } from './components/AiMessageActions';
export { AiReasoningBadge } from './components/AiReasoningBadge';
export { AiMarkdownText, isMarkdownRendererAvailable } from './components/AiMarkdownText';
export { copyTextToClipboard } from './lib/clipboard';

export { useAiTheme, mergeTheme } from './theme/AiThemeContext';
export { lightTheme, darkTheme } from './theme/defaultTheme';
export type { AiTheme, AiThemeOverride, AiThemeColors, AiThemeFontFamily } from './theme/types';
export { spacing, radius, fontSize, defaultFontFamily } from './theme/tokens';

export { useAiStrings } from './i18n/AiStringsContext';
export { defaultStrings, mergeStrings } from './i18n/strings';
export type { AiStrings, AiStringsOverride } from './i18n/strings';

export type {
  AiChatMessage,
  AiConversationSummary,
  AiConversation,
  AiFunctionCall,
  AiFunctionCallStatus,
  AiMessageRole,
  AiMessageStatus,
} from './types/aiChat';
export type { AiSuggestion } from './types/aiContext';
export type { ContentBlock } from './types/contentBlock';
export { normalizeContentBlocks, contentBlocksToPlainString } from './types/contentBlock';

export { DEFAULT_SUGGESTIONS } from './constants/aiAssistant.constants';
