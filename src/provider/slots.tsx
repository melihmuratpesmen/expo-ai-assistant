import React, { createContext, useContext } from 'react';
import type { AiChatMessage, AiFunctionCall } from '../types/aiChat';
import type { AiSuggestion } from '../types/aiContext';
import type { ContentBlock } from '../types/contentBlock';

export interface AiAssistantCallbacks {
  onMessageSent?: (text: string, conversationId: string | null) => void;
  onStreamStart?: (conversationId: string | null) => void;
  onStreamEnd?: (conversationId: string | null) => void;
  onError?: (error: string) => void;
  onToolComplete?: (tool: AiFunctionCall) => void;
  onConversationCreated?: (conversationId: string) => void;
}

export interface AiRenderSlots {
  renderMessage?: (message: AiChatMessage) => React.ReactNode;
  renderEmpty?: (props: {
    suggestions: AiSuggestion[];
    onSelectSuggestion: (suggestion: AiSuggestion) => void;
  }) => React.ReactNode;
  renderInput?: (props: {
    onSend: (text: string) => void;
    disabled: boolean;
    placeholder?: string;
    isStreaming?: boolean;
    onStop?: () => void;
  }) => React.ReactNode;
  renderFunctionCall?: (functionCall: AiFunctionCall) => React.ReactNode;
  renderContentBlocks?: (blocks: ContentBlock[], trailingText?: string) => React.ReactNode;
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
  return (
    <CallbacksContext.Provider value={value ?? {}}>{children}</CallbacksContext.Provider>
  );
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
