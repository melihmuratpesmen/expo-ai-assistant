import { createContext, useContext, useMemo } from 'react';
import type { AiChatController } from '../core/AiChatController';
import { useAiChatFromController, type UseAiChatResult } from '../hooks/useAiChat';

export interface AiQuickAskOpenOptions {
  /** Sent as the first user message after the sheet opens. */
  initialMessage?: string;
  /**
   * Start a new conversation before opening. Default `true`, or `false` when
   * the provider shares a conversation through `chatId`.
   */
  reset?: boolean;
}

/** Sheet controls without chat state — components using it do not re-render while replies stream. */
export interface AiQuickAskControls {
  isActive: boolean;
  open: (options?: AiQuickAskOpenOptions) => void;
  close: () => void;
  /** The sheet's conversation store. */
  controller: AiChatController;
}

export interface AiQuickAskContextValue extends Omit<AiQuickAskControls, 'controller'> {
  chat: UseAiChatResult;
}

export const AiQuickAskContext = createContext<AiQuickAskControls | null>(null);

/** Open / close the sheet. Prefer this over `useAiQuickAskSession` for buttons. */
export function useAiQuickAsk(): AiQuickAskControls {
  const ctx = useContext(AiQuickAskContext);
  if (!ctx) {
    throw new Error(
      'useAiQuickAsk must be used within AiQuickAskProvider (expo-ai-assistant/bottom-sheet).'
    );
  }
  return ctx;
}

/** Controls plus live chat state (re-renders on every streamed update). */
export function useAiQuickAskSession(): AiQuickAskContextValue {
  const { isActive, open, close, controller } = useAiQuickAsk();
  const chat = useAiChatFromController(controller);
  return useMemo(() => ({ isActive, open, close, chat }), [chat, close, isActive, open]);
}
