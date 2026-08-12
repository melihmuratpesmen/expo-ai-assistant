import React, { createContext, useContext } from 'react';
import type { UseAiChatResult } from '../hooks/useAiChat';

export interface AiChatModalContextValue {
  isActive: boolean;
  chat: UseAiChatResult;
  open: (options?: { initialMessage?: string }) => void;
  close: () => void;
}

export const AiChatModalContext = createContext<AiChatModalContextValue | null>(null);

export function useAiChatModalSession(): AiChatModalContextValue {
  const ctx = useContext(AiChatModalContext);
  if (!ctx) {
    throw new Error(
      'useAiChatModalSession must be used within AiChatModalProvider (expo-ai-assistant/modal).'
    );
  }
  return ctx;
}
